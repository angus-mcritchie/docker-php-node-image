FROM serversideup/php:7.4-fpm-apache-v1.5.0

#  install composer
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

#  install node
RUN curl -sL https://deb.nodesource.com/setup_16.x | bash -
RUN apt-get install -y nodejs

# install zip
RUN apt-get install -y zip
