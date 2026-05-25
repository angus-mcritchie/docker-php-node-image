// Launchpad Playwright sidecar.
// Contract: app/Launchpad/Services/Fetchers/PlaywrightSourceFetcher.php.
// Two surfaces share one context pool:
//   POST /fetch        — one-shot navigate+content+close
//   POST /session/...  — persistent context+page for step-by-step AI driving
// A session holds its pool slot until DELETE or idle expiry.
//
// Stealth stack:
//   - rebrowser-playwright patches the CDP `Runtime.Enable` leak that modern
//     bot fingerprinters (Cloudflare Bot Management, DataDome, PerimeterX) use
//     as the primary tell.
//   - puppeteer-extra-plugin-stealth (via playwright-extra) patches the older
//     leak surface: navigator.webdriver, navigator.plugins, chrome.runtime,
//     WebGL vendor, permissions API, etc.
//   - Each context spins up with a real Chrome UA + viewport + locale +
//     timezone drawn from a small pool, so successive fetches don't share the
//     same fingerprint across the whole pool lifetime.

const Fastify = require('fastify');
const { addExtra } = require('playwright-extra');
const stealthPlugin = require('puppeteer-extra-plugin-stealth')();
const { chromium: rebrowserChromium } = require('rebrowser-playwright');
const crypto = require('crypto');

const chromium = addExtra(rebrowserChromium);
chromium.use(stealthPlugin);

const PORT = parseInt(process.env.PORT || '3000', 10);
const POOL_SIZE = parseInt(process.env.POOL_SIZE || '3', 10);
const AUTH_TOKEN = process.env.PLAYWRIGHT_AUTH_TOKEN || '';
// Lowered from 50 — same fingerprint hammering one origin is its own signal.
const MAX_USES_PER_CONTEXT = 10;
const DEFAULT_TIMEOUT_MS = 25_000;
const SESSION_IDLE_MS = parseInt(process.env.SESSION_IDLE_MS || '120000', 10);
const SESSION_SWEEP_MS = 30_000;
const SCREENSHOT_MAX_BYTES = 5 * 1024 * 1024;
const EVALUATE_TIMEOUT_MS = 5_000;
const NAV_LOAD_STATES = new Set(['networkidle', 'load', 'domcontentloaded']);

// Real Chrome stable UAs. Rotated per context spin-up.
const UA_POOL = [
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
];

// Common desktop resolutions. Avoids the 1280x720 headless default that
// fingerprinters flag.
const VIEWPORT_POOL = [
    { width: 1920, height: 1080 },
    { width: 1536, height: 864 },
    { width: 1440, height: 900 },
    { width: 1366, height: 768 },
];

const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

if (AUTH_TOKEN === '') {
    console.warn(JSON.stringify({
        level: 'warn',
        msg: 'PLAYWRIGHT_AUTH_TOKEN is empty; auth is disabled. Do not run this way in production.',
    }));
}

const fastify = Fastify({ logger: false });

/** @type {import('playwright').Browser | null} */
let browser = null;

const pool = Array.from({ length: POOL_SIZE }, () => ({ context: null, inUse: false, uses: 0 }));

/** @type {Map<string, {context, page, slot, lastNavigationStatus: number|null, expiresAt: number}>} */
const sessions = new Map();

async function ensureContext(slot) {
    if (slot.context && slot.uses < MAX_USES_PER_CONTEXT) {
        return slot.context;
    }
    if (slot.context) {
        try { await slot.context.close(); } catch (_) {}
    }
    // Fresh fingerprint every spin-up. UA + viewport rotate independently so the
    // 12-cell product (3 UAs × 4 viewports) gives enough variety that CF can't
    // cluster our traffic on a fixed shape.
    slot.context = await browser.newContext({
        userAgent: pickRandom(UA_POOL),
        viewport: pickRandom(VIEWPORT_POOL),
        locale: 'en-AU',
        timezoneId: 'Australia/Melbourne',
        colorScheme: 'light',
        deviceScaleFactor: 1,
        extraHTTPHeaders: { 'Accept-Language': 'en-AU,en;q=0.9' },
    });
    slot.uses = 0;
    return slot.context;
}

function acquireSlot() {
    for (const slot of pool) {
        if (!slot.inUse) { slot.inUse = true; return slot; }
    }
    return null;
}

function poolStats() {
    return { size: pool.length, in_use: pool.filter((s) => s.inUse).length };
}

const log = (entry) => console.log(JSON.stringify(entry));
const authOk = (req) => AUTH_TOKEN === '' || req.headers['authorization'] === `Bearer ${AUTH_TOKEN}`;
const errMsg = (err) => (err && err.message ? err.message : String(err));
const clamp = (v, fallback = DEFAULT_TIMEOUT_MS, cap = 120_000) =>
    (Number.isFinite(v) && v > 0) ? Math.min(v, cap) : fallback;
const touch = (session) => { session.expiresAt = Date.now() + SESSION_IDLE_MS; };
const str = (v) => typeof v === 'string' ? v : '';

/**
 * Open a page in a slot with optional per-request header overrides. Increments
 * slot.uses.
 *
 * Note on userAgent: Playwright sets navigator.userAgent at context creation,
 * not per-page. The context already carries a real Chrome UA from UA_POOL, so
 * caller-supplied UAs only override the network-level User-Agent header — JS
 * fingerprinting still sees the context UA. For typical anti-bot checks both
 * are realistic, so this is acceptable. Callers wanting a polite bot UA
 * (e.g. for robots.txt-respecting sites) should pass it; the network header
 * is what crawlers identify themselves by.
 */
async function newPageInSlot(slot, { userAgent, acceptLanguage, referer }) {
    const context = await ensureContext(slot);
    const page = await context.newPage();
    slot.uses += 1;

    const headers = {};
    if (userAgent) { headers['User-Agent'] = userAgent; }
    if (acceptLanguage) { headers['Accept-Language'] = acceptLanguage; }
    if (referer) { headers['Referer'] = referer; }
    if (Object.keys(headers).length > 0) {
        await page.setExtraHTTPHeaders(headers);
    }
    return { context, page };
}

async function applyWait(page, waitFor, timeoutMs) {
    if (!waitFor) { return; }
    if (NAV_LOAD_STATES.has(waitFor)) {
        await page.waitForLoadState(waitFor, { timeout: timeoutMs }).catch(() => {});
    } else {
        await page.waitForSelector(waitFor, { timeout: Math.min(timeoutMs, 5_000) }).catch(() => {});
    }
}

fastify.get('/health', async () => ({
    ok: true,
    pool: poolStats(),
    sessions: sessions.size,
}));

// ---------------------------------------------------------------------------
// One-shot fetch
// ---------------------------------------------------------------------------

fastify.post('/fetch', async (request, reply) => {
    const requestId = crypto.randomUUID();
    const startedAt = Date.now();

    if (!authOk(request)) { return reply.code(401).send({ error: 'unauthorized' }); }

    const body = request.body || {};
    const targetUrl = str(body.url);
    if (targetUrl === '') { return reply.code(400).send({ error: 'url required' }); }

    const slot = acquireSlot();
    if (!slot) { return reply.code(429).send({ error: 'pool busy', pool: poolStats() }); }

    const timeoutMs = clamp(body.timeout_ms);
    const waitFor = str(body.wait_for) || null;
    const captureScreenshot = body.capture_screenshot === true;
    const consoleErrors = [];
    const redirects = [];
    let page = null;
    let status = null;
    let finalUrl = targetUrl;
    let html = '';
    let screenshotPngBase64 = null;
    let errorMessage = null;

    try {
        ({ page } = await newPageInSlot(slot, {
            userAgent: str(body.user_agent),
            acceptLanguage: str(body.accept_language),
            referer: str(body.referer),
        }));

        page.on('console', (msg) => {
            if (msg.type() === 'error') { consoleErrors.push(msg.text()); }
        });
        page.on('response', (response) => {
            const s = response.status();
            if (s >= 300 && s < 400) { redirects.push({ url: response.url(), status: s }); }
        });

        const response = await page.goto(targetUrl, { timeout: timeoutMs, waitUntil: 'domcontentloaded' });
        if (response) { status = response.status(); }
        await applyWait(page, waitFor, timeoutMs);
        html = await page.content();
        finalUrl = page.url() || targetUrl;

        if (captureScreenshot) {
            try {
                // Above-the-fold viewport only — full-page screenshots on Magento/SFCC
                // pages can be 5MB+ which kills the prompt budget downstream. The
                // operator only needs visual confidence the source is real.
                const buf = await page.screenshot({ type: 'png', fullPage: false });
                if (buf.length <= 4_000_000) {
                    screenshotPngBase64 = buf.toString('base64');
                }
            } catch (err) {
                // Screenshot failure is non-fatal — log + return without it.
                log({ request_id: requestId, endpoint: '/fetch.screenshot', error: errMsg(err) });
            }
        }
    } catch (err) {
        errorMessage = errMsg(err);
    } finally {
        if (page) {
            try { await page.close(); } catch (_) {}
        }
        slot.inUse = false;
    }

    const durationMs = Date.now() - startedAt;
    log({
        request_id: requestId,
        endpoint: '/fetch',
        url: targetUrl,
        final_url: finalUrl,
        status,
        duration_ms: durationMs,
        error: errorMessage,
    });

    const payload = {
        final_url: finalUrl,
        status,
        html,
        console_errors: consoleErrors,
        duration_ms: durationMs,
        redirects,
    };
    if (screenshotPngBase64) { payload.screenshot_png_base64 = screenshotPngBase64; }
    if (errorMessage) { payload.error = errorMessage; }
    return reply.code(200).send(payload);
});

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

/**
 * Wrap a session-scoped handler: enforce auth, resolve session, refresh idle
 * timer, log JSON line, surface unhandled errors as 500. Handler returns the
 * response body (duration_ms is added automatically).
 */
function sessionRoute(endpoint, handler) {
    return async (request, reply) => {
        const requestId = crypto.randomUUID();
        const startedAt = Date.now();
        const sessionId = request.params.id;

        if (!authOk(request)) {
            log({ request_id: requestId, session_id: sessionId, endpoint, status: 401, duration_ms: 0 });
            return reply.code(401).send({ error: 'unauthorized' });
        }
        const session = sessions.get(sessionId);
        if (!session) {
            log({ request_id: requestId, session_id: sessionId, endpoint, status: 404, duration_ms: 0 });
            return reply.code(404).send({ error: 'session not found' });
        }

        let httpStatus = 200;
        let errorMessage = null;
        let result;
        try {
            result = await handler({ request, session });
            touch(session);
        } catch (err) {
            errorMessage = errMsg(err);
            httpStatus = 500;
            result = { error: errorMessage };
        }

        const durationMs = Date.now() - startedAt;
        log({
            request_id: requestId,
            session_id: sessionId,
            endpoint,
            duration_ms: durationMs,
            status: httpStatus,
            error: errorMessage,
        });
        return reply.code(httpStatus).send({ ...result, duration_ms: durationMs });
    };
}

fastify.post('/session', async (request, reply) => {
    const requestId = crypto.randomUUID();
    const startedAt = Date.now();

    if (!authOk(request)) { return reply.code(401).send({ error: 'unauthorized' }); }

    const body = request.body || {};
    const slot = acquireSlot();
    if (!slot) { return reply.code(429).send({ error: 'pool busy', pool: poolStats() }); }

    let sessionId = null;
    let errorMessage = null;
    let expiresAt = 0;

    try {
        const { context, page } = await newPageInSlot(slot, {
            userAgent: str(body.user_agent),
            acceptLanguage: str(body.accept_language),
            referer: str(body.referer),
        });
        sessionId = crypto.randomUUID();
        expiresAt = Date.now() + SESSION_IDLE_MS;
        sessions.set(sessionId, { context, page, slot, lastNavigationStatus: null, expiresAt });
    } catch (err) {
        errorMessage = errMsg(err);
        slot.inUse = false;
    }

    log({
        request_id: requestId,
        session_id: sessionId,
        endpoint: 'POST /session',
        duration_ms: Date.now() - startedAt,
        status: errorMessage ? 500 : 201,
        error: errorMessage,
    });

    if (errorMessage) { return reply.code(500).send({ error: errorMessage }); }
    return reply.code(201).send({
        session_id: sessionId,
        expires_at: new Date(expiresAt).toISOString(),
    });
});

fastify.post('/session/:id/navigate', sessionRoute('POST /session/:id/navigate', async ({ request, session }) => {
    const body = request.body || {};
    const url = str(body.url);
    if (url === '') { return { error: 'url required' }; }
    const timeout = clamp(body.timeout_ms);
    const waitFor = str(body.wait_for) || null;

    const response = await session.page.goto(url, { timeout, waitUntil: 'domcontentloaded' });
    const status = response ? response.status() : null;
    session.lastNavigationStatus = status;
    await applyWait(session.page, waitFor, timeout);
    return { final_url: session.page.url(), status };
}));

fastify.post('/session/:id/click', sessionRoute('POST /session/:id/click', async ({ request, session }) => {
    const body = request.body || {};
    const selector = str(body.selector);
    if (selector === '') { return { clicked: false, error: 'selector required' }; }
    try {
        await session.page.click(selector, { timeout: clamp(body.timeout_ms, 5_000, 60_000) });
        return { clicked: true };
    } catch (err) {
        return { clicked: false, error: errMsg(err) };
    }
}));

fastify.post('/session/:id/wait', sessionRoute('POST /session/:id/wait', async ({ request, session }) => {
    const body = request.body || {};
    const selector = str(body.selector);
    const state = str(body.state) || 'visible';
    const timeout = clamp(body.timeout_ms, 5_000, 60_000);
    try {
        if (selector !== '') {
            if (NAV_LOAD_STATES.has(selector)) {
                await session.page.waitForLoadState(selector, { timeout });
            } else {
                await session.page.waitForSelector(selector, { state, timeout });
            }
            return { ready: true };
        }
        if (NAV_LOAD_STATES.has(state)) {
            await session.page.waitForLoadState(state, { timeout });
            return { ready: true };
        }
        return { ready: false, error: 'selector or load-state required' };
    } catch (err) {
        return { ready: false, error: errMsg(err) };
    }
}));

fastify.post('/session/:id/fill', sessionRoute('POST /session/:id/fill', async ({ request, session }) => {
    const body = request.body || {};
    const selector = str(body.selector);
    const value = str(body.value);
    if (selector === '') { return { filled: false, error: 'selector required' }; }
    try {
        await session.page.fill(selector, value, { timeout: clamp(body.timeout_ms, 5_000, 60_000) });
        return { filled: true };
    } catch (err) {
        return { filled: false, error: errMsg(err) };
    }
}));

fastify.post('/session/:id/content', sessionRoute('POST /session/:id/content', async ({ session }) => ({
    html: await session.page.content(),
    final_url: session.page.url(),
    status: session.lastNavigationStatus,
})));

fastify.post('/session/:id/screenshot', sessionRoute('POST /session/:id/screenshot', async ({ request, session }) => {
    const body = request.body || {};
    const selector = str(body.selector);
    const fullPage = body.full_page === true;
    const timeout = clamp(body.timeout_ms, 10_000, 60_000);
    let buffer;
    try {
        buffer = selector !== ''
            ? await session.page.locator(selector).screenshot({ timeout })
            : await session.page.screenshot({ fullPage, timeout });
    } catch (err) {
        return { error: errMsg(err) };
    }
    if (buffer.length > SCREENSHOT_MAX_BYTES) {
        return { error: 'screenshot too large', size_bytes: buffer.length };
    }
    return { png_base64: buffer.toString('base64') };
}));

fastify.post('/session/:id/evaluate', sessionRoute('POST /session/:id/evaluate', async ({ request, session }) => {
    const body = request.body || {};
    const expression = str(body.expression);
    if (expression === '') { return { error: 'expression required' }; }
    // Wrap so caller can pass a bare expression or an async expression.
    const wrapped = `(async () => { return (${expression}); })()`;
    let timer;
    const timeoutPromise = new Promise((_, rej) => {
        timer = setTimeout(() => rej(new Error('evaluate timeout')), EVALUATE_TIMEOUT_MS);
    });
    try {
        const result = await Promise.race([session.page.evaluate(wrapped), timeoutPromise]);
        return { result };
    } catch (err) {
        return { error: errMsg(err) };
    } finally {
        clearTimeout(timer);
    }
}));

fastify.delete('/session/:id', async (request, reply) => {
    const requestId = crypto.randomUUID();
    const startedAt = Date.now();
    const sessionId = request.params.id;

    if (!authOk(request)) { return reply.code(401).send({ error: 'unauthorized' }); }

    if (!sessions.has(sessionId)) {
        log({ request_id: requestId, session_id: sessionId, endpoint: 'DELETE /session/:id',
            duration_ms: Date.now() - startedAt, status: 404 });
        return reply.code(404).send({ error: 'session not found' });
    }

    await closeSession(sessionId, 'client');
    log({ request_id: requestId, session_id: sessionId, endpoint: 'DELETE /session/:id',
        duration_ms: Date.now() - startedAt, status: 204 });
    return reply.code(204).send();
});

async function closeSession(sessionId, reason) {
    const session = sessions.get(sessionId);
    if (!session) { return; }
    sessions.delete(sessionId);
    try { await session.page.close(); } catch (_) {}
    session.slot.inUse = false;
    if (reason === 'idle') {
        log({ level: 'info', msg: 'session expired', session_id: sessionId });
    }
}

const sweeper = setInterval(() => {
    const now = Date.now();
    for (const [id, session] of sessions.entries()) {
        if (session.expiresAt < now) {
            closeSession(id, 'idle').catch(() => {});
        }
    }
}, SESSION_SWEEP_MS);

async function start() {
    browser = await chromium.launch({
        headless: true,
        args: [
            // The most important anti-detection flag in modern Chromium —
            // removes the `Navigator.webdriver` exposure flag even before the
            // stealth plugin patches it.
            '--disable-blink-features=AutomationControlled',
            // Container hygiene; not stealth-related.
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
        ],
    });
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    log({
        level: 'info',
        msg: 'sidecar listening',
        port: PORT,
        pool_size: POOL_SIZE,
        auth_enabled: AUTH_TOKEN !== '',
        session_idle_ms: SESSION_IDLE_MS,
        stealth: true,
    });
}

async function shutdown(signal) {
    log({ level: 'info', msg: 'shutdown', signal });
    clearInterval(sweeper);
    try { await fastify.close(); } catch (_) {}
    for (const id of Array.from(sessions.keys())) {
        await closeSession(id, 'shutdown');
    }
    for (const slot of pool) {
        if (slot.context) {
            try { await slot.context.close(); } catch (_) {}
        }
    }
    if (browser) {
        try { await browser.close(); } catch (_) {}
    }
    process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start().catch((err) => {
    console.error(JSON.stringify({ level: 'fatal', msg: 'startup failed', error: err.message }));
    process.exit(1);
});
