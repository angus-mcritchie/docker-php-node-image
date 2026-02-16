FROM ghcr.io/serversideup/php:8.5-fpm-nginx

# Switch to root so we can do root things
USER root

# Install some additional PHP extensions
RUN install-php-extensions bcmath gd intl ftp exif calendar sockets mysqli

# Install imagick from source (required for PHP 8.5 compatibility)
RUN apt-get update && apt-get install -y --no-install-recommends git libmagickwand-dev \
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

# Install mydumper for parallel database dumps
RUN curl -L https://github.com/mydumper/mydumper/releases/download/v0.21.3-1/mydumper_0.21.3-1.bookworm_amd64.deb -o /tmp/mydumper.deb && \
    apt-get update && \
    apt-get install -y /tmp/mydumper.deb && \
    rm -rf /var/lib/apt/lists/* /tmp/mydumper.deb

# Drop back to our unprivileged user
USER www-data
