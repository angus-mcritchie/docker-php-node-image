FROM ghcr.io/serversideup/php:8.3-fpm-apache

# Switch to root so we can do root things
USER root

# Install some additional PHP extensions
RUN install-php-extensions imagick
RUN install-php-extensions bcmath
RUN install-php-extensions gd
RUN install-php-extensions intl
RUN install-php-extensions ftp
RUN install-php-extensions exif
RUN install-php-extensions calendar

# Add our custom entrypoint scripts (eg. decrytpting our environment file)
COPY --chmod=755 ./entrypoint.d/ /etc/entrypoint.d/

# Required for custom start up scripts to work with S6 Overlay
# See https://serversideup.net/open-source/docker-php/docs/customizing-the-image/adding-your-own-start-up-scripts#additional-steps-for-fpm-apache-fpm-nginx-s6-overlay-based-images
RUN docker-php-serversideup-s6-init

# install nodejs 20.x
# Pipelines only (to use `npm ci` and `npm run production` etc)
RUN curl -sL https://deb.nodesource.com/setup_20.x | bash -
RUN apt-get install -y nodejs

# Drop back to our unprivileged user
USER www-data
