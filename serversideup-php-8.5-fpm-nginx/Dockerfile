FROM ghcr.io/serversideup/php:8.5-fpm-nginx

# Switch to root so we can do root things
USER root

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
