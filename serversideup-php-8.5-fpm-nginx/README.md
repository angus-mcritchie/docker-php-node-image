### Build for multiple architectures and push to registry
```bash
cd serversideup-php-8.5-fpm-nginx && docker buildx build --no-cache --platform linux/amd64,linux/arm64 -t goolaman/serversideup-php-8.5-fpm-nginx:1.6.0 --push .
```

### Tag history
- `1.6.0` — adds `libheif-plugin-aomenc` + `libheif-plugin-svtenc` so Imagick can encode AVIF (writeImage previously failed with `no encode delegate`).
- `1.5.0` — baseline.
