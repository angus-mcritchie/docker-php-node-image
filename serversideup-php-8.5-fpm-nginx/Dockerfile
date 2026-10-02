FROM ghcr.io/serversideup/php:8.5-fpm-nginx AS upstream

############################################
# Brotli filter module for nginx
############################################
# The upstream nginx comes from nginx.org, which packages no brotli module, and Debian's
# libnginx-mod-http-brotli-filter is built for Debian's own nginx, which this one refuses
# to load. So google/ngx_brotli's filter (vendored in nginx-brotli/ngx_brotli, BSD-2) is
# compiled as a dynamic module against the source of whatever nginx this build's upstream
# runs, read from `nginx -v`. The tarball is checked against nginx.org's release signing
# keys, vendored in nginx-brotli/keys, so the check does not trust the download host.
# Only the .so reaches the final image; the compilers and headers stay in this stage.
# Apps enable it with `load_module modules/ngx_http_brotli_filter_module.so;` and `brotli on;`.
FROM upstream AS nginx-brotli

USER root

RUN apt-get update && apt-get install -y --no-install-recommends \
        gnupg \
        libbrotli-dev \
        libpcre2-dev \
        zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

COPY nginx-brotli/ngx_brotli/ /usr/src/ngx_brotli/
COPY nginx-brotli/keys/ /usr/src/nginx-keys/

RUN NGINX_VERSION="$(nginx -v 2>&1 | sed -n 's|^nginx version: nginx/||p')" && \
    test -n "${NGINX_VERSION}" && \
    # The module's config expects brotli's source under deps/; the system headers serve.
    mkdir -p /usr/src/ngx_brotli/deps/brotli/c && \
    ln -s /usr/include /usr/src/ngx_brotli/deps/brotli/c/include && \
    cd /usr/src && \
    curl -fsSLo nginx.tar.gz "https://nginx.org/download/nginx-${NGINX_VERSION}.tar.gz" && \
    curl -fsSLo nginx.tar.gz.asc "https://nginx.org/download/nginx-${NGINX_VERSION}.tar.gz.asc" && \
    export GNUPGHOME="$(mktemp -d)" && \
    gpg --batch --quiet --import /usr/src/nginx-keys/*.key && \
    gpg --batch --verify nginx.tar.gz.asc nginx.tar.gz && \
    tar xzf nginx.tar.gz && \
    cd "nginx-${NGINX_VERSION}" && \
    ./configure --with-compat --add-dynamic-module=/usr/src/ngx_brotli >/dev/null && \
    make modules >/dev/null && \
    install -D -m 0644 objs/ngx_http_brotli_filter_module.so /out/ngx_http_brotli_filter_module.so

FROM upstream

# Switch to root so we can do root things
USER root

COPY --from=nginx-brotli /out/ngx_http_brotli_filter_module.so /usr/lib/nginx/modules/ngx_http_brotli_filter_module.so

# Install some additional PHP extensions
RUN install-php-extensions bcmath gd intl ftp exif calendar sockets mysqli

# Install imagick from source (required for PHP 8.5 compatibility).
# `libheif-plugin-aomenc` and `libheif-plugin-svtenc` add AVIF *encoder*
# delegates to the libheif Imagick links against — without them, Imagick
# reports `AVIF` in queryFormats() but writeImage() fails with
# `no encode delegate for this image format AVIF`. aomenc is the libaom
# reference encoder (best quality); svtenc gives faster encodes for the
# offline cache-warm path. Both are required to serve AVIF via
# ImageOptimizer::FORMAT_AVIF.
RUN apt-get update && apt-get install -y --no-install-recommends \
        git \
        libmagickwand-dev \
        libheif-plugin-aomenc \
        libheif-plugin-svtenc \
    && git clone https://github.com/Imagick/imagick.git --depth 1 /tmp/imagick \
    && cd /tmp/imagick \
    && phpize \
    && ./configure \
    && make \
    && make install \
    && docker-php-ext-enable imagick \
    && rm -rf /tmp/imagick

RUN curl -sL https://deb.nodesource.com/setup_24.x | bash

ENV BUN_INSTALL=/usr/local
RUN curl -fsSL https://bun.sh/install | bash

# Update, install dependencies, and clean up in a single layer
RUN apt-get update && apt-get install -y --no-install-recommends \
    ghostscript \
    ffmpeg \
    nodejs \
    zstd \
    libbrotli1 \
    awscli \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install mydumper for parallel database dumps. The .deb is per-architecture and
# per-Debian-release, so both are derived at build time to stay in step with the
# base image (which moved to trixie).
RUN MYDUMPER_VERSION="1.0.3-1" && \
    ARCH="$(dpkg --print-architecture)" && \
    . /etc/os-release && \
    curl -fL "https://github.com/mydumper/mydumper/releases/download/v${MYDUMPER_VERSION}/mydumper_${MYDUMPER_VERSION}.${VERSION_CODENAME}_${ARCH}.deb" -o /tmp/mydumper.deb && \
    apt-get update && \
    apt-get install -y /tmp/mydumper.deb && \
    rm -rf /var/lib/apt/lists/* /tmp/mydumper.deb

# Drop back to our unprivileged user
USER www-data
