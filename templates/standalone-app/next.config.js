/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Enable standalone output for optimal Vercel deployment
  output: 'standalone',
  // Disable x-powered-by header for security
  poweredByHeader: false,
  // Configure allowed image domains if needed
  images: {
    domains: [],
  },
};

module.exports = nextConfig;
