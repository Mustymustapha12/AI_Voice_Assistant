import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  output: 'standalone',
  reactStrictMode: true,
  transpilePackages: ['@avc/contracts'],
};

export default nextConfig;
