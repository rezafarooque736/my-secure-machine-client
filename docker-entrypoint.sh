#!/bin/sh
set -e

echo "Waiting for PostgreSQL at postgres:5432..."
while ! nc -z postgres 5432; do
  sleep 1
done
echo "PostgreSQL is up."

echo "Waiting for Guacamole API at guacamole:8080..."
while ! nc -z guacamole 8080; do
  sleep 1
done
echo "Guacamole API is up."

# Generate Prisma client (ensures it's in sync with the schema)
echo "DATABASE_URL=$DATABASE_URL"
# echo "Running prisma generate..."
# npx prisma generate

# Apply database migrations
# echo "Running prisma migrate deploy..."
# npx prisma migrate deploy --url="$DATABASE_URL"
# npx prisma migrate deploy --schema=./schema.prisma --config=prisma.config.ts
# npx prisma db push

echo "Starting Next.js application..."
exec "$@"