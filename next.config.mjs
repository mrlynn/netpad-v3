/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Enable subdomain routing for local development
  // For production, this is handled by Vercel's rewrites in vercel.json
  async rewrites() {
    return {
      beforeFiles: [
        // Handle local subdomain development
        // Access via: acme.localhost:3000/form-slug
        // Requires /etc/hosts entry: 127.0.0.1 acme.localhost
        {
          source: '/:path*',
          has: [
            {
              type: 'host',
              value: '(?<org>[^.]+)\\.localhost:3000',
            },
          ],
          destination: '/portal/:org/:path*',
        },
        // Also support without port (if using custom proxy)
        {
          source: '/:path*',
          has: [
            {
              type: 'host',
              value: '(?<org>[^.]+)\\.localhost',
            },
          ],
          destination: '/portal/:org/:path*',
        },
      ],
    };
  },
};

export default nextConfig;


