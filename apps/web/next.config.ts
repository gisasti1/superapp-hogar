import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@superapp/shared'],
  images: {
    domains: ['superapp-hogar-dev.s3.amazonaws.com', 'superapp-hogar-prod.s3.amazonaws.com'],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000',
  },
};

export default nextConfig;
