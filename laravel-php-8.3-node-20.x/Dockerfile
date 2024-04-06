FROM php:8.3-apache

ENV APACHE_DOCUMENT_ROOT=/var/www/html/public

RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf
RUN sed -ri -e 's!/var/www/!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf

RUN docker-php-ext-install mysqli
RUN docker-php-ext-install pdo_mysql

RUN apt-get update --fix-missing

RUN apt-get install -y zlib1g-dev
RUN apt-get install -y libfreetype6-dev
RUN apt-get install -y libjpeg62-turbo-dev
RUN apt-get install -y libpng-dev
RUN apt-get install -y libwebp-dev
RUN apt-get install -y libicu-dev
RUN apt-get install -y git
RUN docker-php-ext-configure gd --with-freetype --with-jpeg --with-webp
RUN docker-php-ext-install -j$(nproc) gd

RUN apt-get install -y libzip-dev
RUN apt-get install -y zip
RUN docker-php-ext-install zip
RUN docker-php-ext-install intl
RUN docker-php-ext-configure intl
RUN docker-php-ext-install exif

# see https://discuss.circleci.com/t/installing-imagick-on-php-8-1-docker/46820
RUN apt-get update
RUN apt-get install -y libmagickwand-dev
RUN rm -rf /var/lib/apt/lists/*
RUN mkdir -p /usr/src/php/ext/imagick
RUN chmod 777 /usr/src/php/ext/imagick
RUN curl -fsSL https://github.com/Imagick/imagick/archive/refs/tags/3.7.0.tar.gz | tar xvz -C "/usr/src/php/ext/imagick" --strip 1
RUN docker-php-ext-install imagick
RUN rm /etc/ImageMagick-6/policy.xml

# install redis
RUN pecl install redis
RUN docker-php-ext-enable redis

# install FTP
RUN docker-php-ext-install ftp

# Install BCMath
RUN docker-php-ext-install bcmath

# install & configure OPCache
RUN docker-php-ext-configure opcache --enable-opcache \
    && docker-php-ext-install opcache


# install nodejs 20.9.0
RUN apt-get install -y curl
RUN curl -sL https://deb.nodesource.com/setup_20.x | bash -
RUN apt-get install -y nodejs

WORKDIR /var/www/html

# .htaccess
RUN a2enmod rewrite
RUN a2enmod expires
RUN a2enmod remoteip

# copy the php ini file as per image instructions - https://hub.docker.com/_/php
RUN mv "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini"

# add application php.ini overrides
COPY ".docker/php/overrides.ini" "$PHP_INI_DIR/conf.d"

RUN echo "ServerName localhost\n" >> /etc/apache2/apache2.conf

RUN echo "ServerTokens Prod" >> /etc/apache2/apache2.conf
RUN echo "ServerSignature Off\n" >> /etc/apache2/apache2.conf

RUN echo "RemoteIPHeader X-Forwarded-For" >> /etc/apache2/apache2.conf
RUN echo "RemoteIPTrustedProxy 10.0.0.0/8" >> /etc/apache2/apache2.conf
RUN echo "RemoteIPTrustedProxy 172.16.0.0/12" >> /etc/apache2/apache2.conf
RUN echo "RemoteIPTrustedProxy 192.168.0.0/16\n" >> /etc/apache2/apache2.conf

RUN echo 'LogFormat "%a %l %u %t \"%r\" %>s %O \"%{Referer}i\" \"%{User-Agent}i\"" combined\n' >> /etc/apache2/apache2.conf

# install composer
RUN cd ~
RUN curl -sS https://getcomposer.org/installer -o /tmp/composer-setup.php
RUN php /tmp/composer-setup.php --install-dir=/usr/local/bin --filename=composer

RUN mkdir -p /var/www/html/public/image/catalog
RUN mkdir -p /var/www/html/opencart/system/logs
RUN mkdir -p /var/www/html/storage/logs

# set file and folder permissions
RUN chown -R $USER:www-data /var/www/html
RUN chmod -R 755 /var/www/html && find /var/www/html -type f -exec chmod 644 {} \;
