# Copilot Instructions

## Build, test, and lint commands

- Build the active image for local validation:
  ```bash
  docker build ./serversideup-php-8.5-fpm-nginx
  ```
- Build and publish the active image for amd64+arm64 (from `serversideup-php-8.5-fpm-nginx/README.md`):
  ```bash
  cd serversideup-php-8.5-fpm-nginx && docker buildx build --no-cache --platform linux/amd64,linux/arm64 -t goolaman/serversideup-php-8.5-fpm-nginx:1.5.0 --push .
  ```
- Build any single archived image (use this as the "single test" equivalent in this repo):
  ```bash
  docker build ./archive/<image-folder>
  ```
- There are no repo-defined lint or automated test suite commands in this repository.

## High-level architecture

- This repository is a collection of Docker image recipes rather than an application codebase.
- `serversideup-php-8.5-fpm-nginx/` is the current active image definition.
- `archive/` contains historical image definitions (Laravel-focused images, older `serversideup` variants, and older PHP pack images).
- Each image folder is self-contained, usually with:
  - `Dockerfile` (image definition),
  - `README.md` (build/tag/push workflow),
  - optional `entrypoint.d/` scripts for startup behavior,
  - optional `.docker/php/overrides.ini` for PHP runtime overrides (Laravel images).
- Two main Dockerfile families appear across the repo:
  - `ghcr.io/serversideup/php:*` or `serversideup/php:*` based images that rely on `install-php-extensions` and `www-data` runtime user.
  - `php:*-apache` based Laravel images that manually install extensions/tools and copy `.docker/php/overrides.ini`.

## Key conventions in this repository

- In Dockerfiles, privileged setup is done as `USER root`, then images switch back to `USER www-data` for runtime.
- For images with custom startup scripts, scripts live in `entrypoint.d/` and are copied to `/etc/entrypoint.d/`; `docker-php-serversideup-s6-init` is then run to register them.
- Node.js is installed via NodeSource setup scripts in-image; version is pinned per image family (for example `setup_20.x` or `setup_24.x`).
- Image publish workflow is README-driven per folder (`docker build` -> `docker tag` -> `docker push`), while the active image uses `docker buildx` for multi-arch pushes.
