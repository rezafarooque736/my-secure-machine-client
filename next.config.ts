import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  distDir: '.next',
  output: 'standalone',
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,

  // Environment variables that should be available on the client
  env: {
    NEXT_PUBLIC_GUACAMOLE_URL: process.env.NEXT_PUBLIC_GUACAMOLE_URL,
    NEXT_PUBLIC_WEBSOCKET_URL: process.env.NEXT_PUBLIC_WEBSOCKET_URL,
  },
};

export default nextConfig;
