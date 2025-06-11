/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true, // Allow deployment with TypeScript errors
  },
  eslint: {
    ignoreDuringBuilds: true, // Allow deployment with ESLint errors
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', 'base-bnpl.vercel.app'],
    },
  },
  images: {
    domains: [
      'wallet-api-production.s3.amazonaws.com',
      'd3r81g40ycuhqg.cloudfront.net',
      'dynamic-assets.coinbase.com',
      'ipfs.io',
      'gateway.pinata.cloud',
    ],
  },
  webpack: (config) => {
    config.resolve.fallback = {
      fs: false,
      net: false,
      tls: false,
    };
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    return config;
  },
};

module.exports = nextConfig;