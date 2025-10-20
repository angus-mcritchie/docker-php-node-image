FROM serversideup/php:8.1-fpm-apache-v1.5.0

#  install composer
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

#  install node 18.7
RUN curl -sL https://deb.nodesource.com/setup_18.x | bash -
RUN apt-get install -y nodejs


# install zip
RUN apt-get install -y zip
