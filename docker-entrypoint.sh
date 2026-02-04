#!/bin/sh
set -e

echo "🚀 Starting Guacamole Project Client..."

echo "⏳ Waiting for MariaDB to be ready..."
until nc -z -v -w30 guacdb 3306
do
  echo "Waiting for database connection..."
  sleep 1
done

echo "✅ MariaDB is ready!"
echo "📦 Running database push prisma..."

npx prisma db push --accept-data-loss

echo "🌱 Seeding database..."
pnpm exec tsx prisma/seed.ts

echo "✅ database push and seed completed!"
echo "🎯 Starting Next.js application..."

exec "$@"
