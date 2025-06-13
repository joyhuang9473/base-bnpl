/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Allow deployment with TypeScript errors
    ignoreBuildErrors: true, 
  },
  eslint: {
    // Allow deployment with ESLint errors and don't lint any directories during build
    ignoreDuringBuilds: true,
    dirs: [],
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', 'base-bnpl.vercel.app'],
    },
    // Disable ESLint completely during build
    eslint: false,
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