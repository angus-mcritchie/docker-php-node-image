````markdown
## Build (linux/arm64)

- Native on ARM host:
```bash
docker build -t <docker_hub_username>/serversideup-php-8.4-fpm-apache-arm64:<tag> .
```

- From x86_64 host using buildx:
```bash
docker buildx build --platform linux/arm64 -t <docker_hub_username>/serversideup-php-8.4-fpm-apache-arm64:<tag> .
```

## Push
```bash
docker push <docker_hub_username>/serversideup-php-8.4-fpm-apache-arm64:<tag>
```

Notes:
- Base image `ghcr.io/serversideup/php:8.4-fpm-apache` is multi-arch; specifying `--platform linux/arm64` ensures the correct variant when building on a non-ARM machine.
````