### Build for multiple architectures and push to registry
```bash
cd serversideup-php-8.4-fpm-nginx && docker buildx build --platform linux/amd64,linux/arm64 -t goolaman/serversideup-php-8.4-fpm-nginx:1.2 --push .
```
