FROM ghcr.io/serversideup/php:8.4-fpm-apache

# Switch to root so we can do root things
USER root

# Install some additional PHP extensions
RUN install-php-extensions bcmath imagick gd intl ftp exif calendar

RUN curl -sL https://deb.nodesource.com/setup_20.x | bash -

# Update, install dependencies, and clean up in a single layer
RUN apt-get update && apt-get install -y --no-install-recommends \
    ghostscript \
    ffmpeg \
    nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Add our custom entrypoint scripts (eg. decrypting our environment file)
COPY --chmod=755 ./entrypoint.d/ /etc/entrypoint.d/

# Required for custom start up scripts to work with S6 Overlay
# See https://serversideup.net/open-source/docker-php/docs/customizing-the-image/adding-your-own-start-up-scripts#additional-steps-for-fpm-apache-fpm-nginx-s6-overlay-based-images
RUN docker-php-serversideup-s6-init

# Drop back to our unprivileged user
USER www-data
