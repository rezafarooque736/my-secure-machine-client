#!/usr/bin/env bash

echo "======================================="
echo "  Starting project setup and dev run"
echo "======================================="

# Exit on error
set -e

echo ""
echo "Step 1/4: Installing dependencies with pnpm..."
pnpm i
echo "✅ Dependencies installed."

echo ""
echo "Step 2/4: Generating Prisma client..."
pnpm prisma generate
echo "✅ Prisma client generated."

echo ""
echo "Step 3/4: Applying database schema with prisma db push..."
pnpm prisma db push
echo "✅ Database schema pushed."

echo ""
echo "Step 4/4: Starting development server..."
echo "You can stop the server anytime with Ctrl+C."
pnpm run dev
echo ""

