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

RUN curl -sL https://deb.nodesource.com/setup_20.x | bash

ENV BUN_INSTALL=/usr/local
RUN curl -fsSL https://bun.sh/install | bash

# Update, install dependencies, and clean up in a single layer
RUN apt-get update && apt-get install -y --no-install-recommends \
    ghostscript \
    ffmpeg \
    nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Drop back to our unprivileged user
USER www-data
