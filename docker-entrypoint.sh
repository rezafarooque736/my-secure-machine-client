#!/bin/sh
set -e

# Wait for PostgreSQL
echo "Waiting for PostgreSQL at postgres:5432..."
while ! nc -z postgres 5432; do
  sleep 1
done
echo "PostgreSQL is up."

# Wait for Guacamole API
echo "Waiting for Guacamole API at guacamole:8080..."
while ! nc -z guacamole 8080; do
  sleep 1
done
echo "Guacamole API is up."

# Sync database schema (no migrations needed)
# echo "Running Prisma migrate deploy..."
# npx prisma db push
# npx prisma migrate deploy

echo "Starting Next.js application..."
exec "$@"