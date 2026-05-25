# Changelog

All notable changes to the images in this repo.

## `playwright-sidecar`

### 0.1.0 - 2026-05-25

- Initial release. Headless Chromium sidecar for the Launchpad source pipeline
- Fastify HTTP surface: one-shot `/fetch` and persistent `/session/*` for step-by-step AI driving
- `rebrowser-playwright` 1.52.0 + `puppeteer-extra-plugin-stealth` for Cloudflare/DataDome/PerimeterX evasion
- Pool of N (`POOL_SIZE`, default 3) Chromium contexts; UA + viewport + locale rotation per spin-up
- Bearer-token auth via `PLAYWRIGHT_AUTH_TOKEN`; idle session sweep at 30s, default 120s TTL
- Multi-arch: linux/amd64 + linux/arm64

## `serversideup-php-8.5-fpm-nginx`

## 1.6.0 - 2026-05-15

- Add `libheif-plugin-aomenc` and `libheif-plugin-svtenc` so Imagick can encode AVIF (`writeImage` previously failed with `no encode delegate for this image format AVIF`)
- Rebuild on latest base image (serversideup v4.3.5), Node 24, Bun, and imagick

## 1.5.0 - 2026-02-16

- Add `zstd` and `awscli` packages
- Add `mydumper` for parallel database dumps (architecture-specific packages)
- Bump Node.js from v20 to v24

## 1.2.0 - 2026-02-16

- Add Bun runtime
- Fix Bun install path to `/usr/local`

## 1.1.1 - 2025-11-24

- Remove double installation of imagick
- Remove decrypt environment file startup script
- Add `docker-php-serversideup-s6-init` back in

## 1.0.4 - 2025-11-24

- Add best practice exit code to startup script

## 1.0.3 - 2025-11-22

- Streamline environment variable checks and improve readability
- Simplify decrypt file

## 1.0.1 - 2025-11-22

- Initial release based on `serversideup/php:8.5-fpm-nginx` (ServersideUp v4)
- PHP extensions: bcmath, gd, intl, ftp, exif, calendar, sockets, mysqli, imagick
- Imagick built from source for PHP 8.5 compatibility
- Node.js, ghostscript, ffmpeg included

---

## Previous images (archived)

### serversideup-php-8.4-fpm-apache

#### 1.3.1 - 2025-11-08

- Fix option name for artisan env decrypt command

#### 1.3.0 - 2025-09-08

- Add Veil env encrypting support

#### 1.2.0 - 2025-09-04

- Add mysqli extension
- Multi-architecture build support (amd64/arm64)
- Consolidate into single Dockerfile (remove arm64-specific build)

#### 1.0.0 - 2025-10-18

- Initial PHP 8.4 FPM Nginx image with entrypoint script

### serversideup-php-8.3-fpm-apache

#### 1.3.0 - 2025-09-08

- Add ghostscript
- Add skip decrypt if already done
- Add exif extension
