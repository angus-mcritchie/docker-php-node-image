### Build for multiple architectures and push to registry
```bash
cd serversideup-php-8.5-fpm-nginx && docker buildx build --platform linux/amd64,linux/arm64 -t goolaman/serversideup-php-8.5-fpm-nginx:1.0.1 --push .
```
