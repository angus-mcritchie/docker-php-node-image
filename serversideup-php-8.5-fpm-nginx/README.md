### Build for multiple architectures and push to registry
```bash
cd serversideup-php-8.5-fpm-nginx && docker buildx build --no-cache --platform linux/amd64,linux/arm64 -t goolaman/serversideup-php-8.5-fpm-nginx:1.9.0 --push .
```

### Tag history
- `1.9.0` — adds nginx's brotli filter module at `/usr/lib/nginx/modules/ngx_http_brotli_filter_module.so` (google/ngx_brotli a71f9312, vendored in `nginx-brotli/`), compiled against the upstream image's own nginx (version read from `nginx -v`; source checked against nginx.org's signing keys in `nginx-brotli/keys/`). Nothing loads it by default: an app adds `load_module /usr/lib/nginx/modules/ngx_http_brotli_filter_module.so;` to its `nginx.conf` and `brotli on;` (+ `brotli_types`) to its config. If the upstream nginx moves, a rebuild picks the new version up; add a new release key to `nginx-brotli/keys/` if nginx.org starts signing with one.
- `1.8.0` — rebuild on the current serversideup v4 base: PHP 8.5.8 → 8.5.10 (CVE-2026-17544 bcmath OOB write, CVE-2026-9672 libgd, CVE-2026-17543, CVE-2026-7260) plus Debian 13 package updates. No Dockerfile changes.
- `1.7.0` — rebuild on serversideup v4.5.1 (PHP 8.5.8, nginx 1.30.4 security fix, Debian 13 trixie); mydumper `0.21.3-1` → `1.0.3-1` with the Debian codename now derived at build time (the pinned `.deb` was still the bookworm build).
- `1.6.0` — adds `libheif-plugin-aomenc` + `libheif-plugin-svtenc` so Imagick can encode AVIF (writeImage previously failed with `no encode delegate`).
- `1.5.0` — baseline.
