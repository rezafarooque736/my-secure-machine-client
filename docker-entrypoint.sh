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

echo "Starting Next.js application..."
exec "$@"