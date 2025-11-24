#!/bin/sh

# Set default values if not already set
APP_ENV=${APP_ENV:-production}
APP_BASE_DIR=${APP_BASE_DIR:-/var/www/html}

# Check if the encrypted environment file exists
if [ ! -f "$APP_BASE_DIR/.env.$APP_ENV.encrypted" ]; then
    echo "🔐 $APP_BASE_DIR/.env.$APP_ENV.encrypted file not found. Skipping decryption."
    exit 0
fi

# Check if the environment file is already decrypted
if [ -f "$APP_BASE_DIR/.env.$APP_ENV" ]; then
    echo "🔐 $APP_BASE_DIR/.env.$APP_ENV file already decrypted. Skipping decryption."
    exit 0
fi

# Check if the encryption key is set
if [ -z "$LARAVEL_ENV_ENCRYPTION_KEY" ]; then
    echo "🔐 LARAVEL_ENV_ENCRYPTION_KEY not set. Skipping decryption."
    exit 0
fi

# Check if the artisan file exists
if [ ! -f "$APP_BASE_DIR/artisan" ]; then
    echo "🔐 Artisan file not found. Skipping decryption."
    exit 0
fi

# Attempt to decrypt the environment file
if grep -q "APP_KEY" "$APP_BASE_DIR/.env.$APP_ENV.encrypted"; then
    echo "ℹ️ $APP_BASE_DIR/.env.$APP_ENV.encrypted contains APP_KEY variable. Attempting to decrypt values only."
    php "$APP_BASE_DIR/artisan" env:decrypt --env="$APP_ENV" --only-values
else
    echo "🔐 Decrypting $APP_BASE_DIR/.env.$APP_ENV.encrypted file..."
    php "$APP_BASE_DIR/artisan" env:decrypt --env="$APP_ENV"
fi

exit 0
