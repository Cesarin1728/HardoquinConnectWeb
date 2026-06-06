#!/bin/bash

set -e

cd "$(dirname "$0")"

ENVIRONMENT="$1"

if [ "$ENVIRONMENT" != "blue" ] && [ "$ENVIRONMENT" != "green" ]; then
    echo "Uso: ./switch.sh blue | green"
    exit 1
fi

cp "nginx/nginx-$ENVIRONMENT.conf" "nginx/nginx.conf"
docker compose up -d --build nginx

echo "Nginx apunta a $ENVIRONMENT en http://localhost:8088"
