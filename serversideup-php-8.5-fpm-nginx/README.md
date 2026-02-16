### Build for multiple architectures and push to registry
```bash
cd serversideup-php-8.5-fpm-nginx && docker buildx build --no-cache --platform linux/amd64,linux/arm64 -t goolaman/serversideup-php-8.5-fpm-nginx:1.2.0 --push .
```
