/** @type {import('next').NextConfig} */
const nextConfig = {
    // Optimize for faster development builds and route switching
    turbopack: {
      rules: {
        '*.svg': ['@svgr/webpack'],
      },
    },
    
    // Optimize chunk loading
    webpack: (config, { dev, isServer }) => {
      // Silence warnings
      // https://github.com/WalletConnect/walletconnect-monorepo/issues/1908
      config.externals.push('pino-pretty', 'lokijs', 'encoding');
      
      if (dev) {
        // Faster development builds
        config.optimization = {
          ...config.optimization,
          splitChunks: {
            chunks: 'all',
            cacheGroups: {
              default: {
                minChunks: 1,
                priority: -20,
                reuseExistingChunk: true,
              },
              vendor: {
                test: /[\\/]node_modules[\\/]/,
                name: 'vendors',
                priority: -10,
                chunks: 'all',
              },
            },
          },
        };
      }
      
      return config;
    },
    
    // Improve compilation performance
    onDemandEntries: {
      // Period (in ms) where the server will keep pages in the buffer
      maxInactiveAge: 25 * 1000,
      // Number of pages that should be kept simultaneously without being disposed
      pagesBufferLength: 5,
    },
  };
  
  export default nextConfig;
  