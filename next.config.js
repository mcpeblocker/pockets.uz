/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Turbopack config for Next.js 16
  turbopack: {},
  // Webpack config for production builds (when not using Turbopack)
  webpack: (config, { isServer }) => {
    // Fix for Tesseract.js worker files
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
