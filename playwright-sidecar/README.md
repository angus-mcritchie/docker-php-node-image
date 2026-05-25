### Build for multiple architectures and push to registry
```bash
cd playwright-sidecar && docker buildx build --no-cache --platform linux/amd64,linux/arm64 -t goolaman/playwright-sidecar:0.1.0 --push .
```

### Tag history
- `0.1.0` — initial build. Fastify + rebrowser-playwright 1.52.0 + stealth plugin. One-shot `/fetch` + persistent `/session/*` surface. Pool of N Chromium contexts, UA + viewport rotation, bearer-token auth.
