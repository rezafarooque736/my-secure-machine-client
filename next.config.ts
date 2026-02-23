import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  distDir: '.next',
  output: 'standalone',
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
  // Disable static optimization for connection pages
  async headers() {
    return [
      {
        source: '/connection/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
    ];
  },

  // Environment variables that should be available on the client
  env: {
    NEXT_PUBLIC_GUACAMOLE_URL: process.env.NEXT_PUBLIC_GUACAMOLE_URL,
    NEXT_PUBLIC_WEBSOCKET_URL: process.env.NEXT_PUBLIC_WEBSOCKET_URL,
  },
};

export default nextConfig;
