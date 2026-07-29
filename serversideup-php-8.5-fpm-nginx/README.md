### Build for multiple architectures and push to registry
```bash
cd serversideup-php-8.5-fpm-nginx && docker buildx build --no-cache --platform linux/amd64,linux/arm64 -t goolaman/serversideup-php-8.5-fpm-nginx:1.7.0 --push .
```

### Tag history
- `1.7.0` — rebuild on serversideup v4.5.1 (PHP 8.5.8, nginx 1.30.4 security fix, Debian 13 trixie); mydumper `0.21.3-1` → `1.0.3-1` with the Debian codename now derived at build time (the pinned `.deb` was still the bookworm build).
- `1.6.0` — adds `libheif-plugin-aomenc` + `libheif-plugin-svtenc` so Imagick can encode AVIF (writeImage previously failed with `no encode delegate`).
- `1.5.0` — baseline.
