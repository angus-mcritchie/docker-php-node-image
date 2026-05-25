# Base image pinned to playwright v1.52.0 — matches rebrowser-playwright 1.52.0,
# which forks from playwright-core 1.52.0 and expects that exact chromium
# revision. Bump in lockstep with the npm rebrowser-playwright version, not the
# upstream playwright version.
FROM mcr.microsoft.com/playwright:v1.52.0-jammy

# Install bun — project standard for JS package management.
RUN apt-get update \
    && apt-get install -y --no-install-recommends unzip ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && curl -fsSL https://bun.sh/install | bash \
    && ln -s /root/.bun/bin/bun /usr/local/bin/bun

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

COPY server.js ./

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD wget --spider -q http://localhost:3000/health || exit 1

# bun runs JS faster than node; the script itself is node-compatible.
CMD ["bun", "server.js"]
