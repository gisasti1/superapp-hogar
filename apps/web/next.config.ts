import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Output standalone para deploy en contenedores (Docker/Railway/Fly)
  output: 'standalone',
  transpilePackages: ['@superapp/shared'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.s3.amazonaws.com' },
      { protocol: 'https', hostname: '**.r2.cloudflarestorage.com' },
      { protocol: 'http', hostname: 'localhost' },
    ],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000',
  },
};

export default nextConfig;
