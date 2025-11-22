#!/bin/sh

if [ -z "$APP_ENV" ]; then
    APP_ENV="production"
fi

# check $APP_BASE_DIR is set, i not set to '/var/www/html'
if [ -z "$APP_BASE_DIR" ]; then
    APP_BASE_DIR="/var/www/html"
fi

# check APP_BASE_DIR/.env.$APP_ENV file exists, i not skip decryption
if [ ! -f "$APP_BASE_DIR/.env.$APP_ENV.encrypted" ]; then
    echo "🔐 $APP_BASE_DIR/.env.$APP_ENV.encrypted file not found. Skipping decryption."
    return 0
fi

if [ -f "$APP_BASE_DIR/.env.$APP_ENV" ]; then
    echo "🔐 $APP_BASE_DIR/.env.$APP_ENV file already decrypted. Skipping decryption."
    return 0
fi

# check $LARAVEL_ENV_ENCRYPTION_KEY is set, i not skip decryption
if [ -z "$LARAVEL_ENV_ENCRYPTION_KEY" ]; then
    echo "🔐 LARAVEL_ENV_ENCRYPTION_KEY not set. Skipping decryption."
    return 0
fi

# check $APP_BASE_DIR/artisan file exists, i not skip decryption
if [ ! -f "$APP_BASE_DIR/artisan" ]; then
    echo "🔐 Artisan file not found. Skipping decryption."
    return 0
fi

# check environment is not staging or production, then skip decryption
if [ "$APP_ENV" != "staging" ] && [ "$APP_ENV" != "production" ]; then
    echo "🔐 Skipping decryption for $APP_ENV environment."
    return 0
fi

if grep -q "APP_KEY" ".env.$APP_ENV.encrypted"; then
    echo "ℹ️ .env.$APP_ENV.encrypted contains APP_KEY variable, so attempting to decrypting values only."
    php "$APP_BASE_DIR/artisan" env:decrypt --env=$APP_ENV --only-values
else
    echo "🔐 Decrypting .env.$APP_ENV.encrypted file..."
    php "$APP_BASE_DIR/artisan" env:decrypt --env=$APP_ENV
fi
