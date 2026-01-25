// Check if cloud-features is available (it's optional)
let hasCloudFeatures = false;
try {
  require.resolve('@netpad/cloud-features');
  hasCloudFeatures = true;
} catch {
  // Package not available, that's okay
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Transpile local workspace packages (extensions)
  transpilePackages: [
    '@netpad/collaborate',
    '@netpad/demo-node',
    '@netpad/workflow-renderer',
    // Only include cloud-features if it's available
    ...(hasCloudFeatures ? ['@netpad/cloud-features'] : []),
  ],

  // Handle optional cloud-features package
  webpack: (config, { isServer }) => {
    if (!hasCloudFeatures) {
      // Mark cloud-features as external when not available
      // This prevents webpack from trying to resolve it
      config.externals = config.externals || [];
      if (isServer) {
        config.externals.push('@netpad/cloud-features');
      }
    }
    return config;
  },

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


