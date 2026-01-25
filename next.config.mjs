import { withSentryConfig } from '@sentry/nextjs';
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

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "netpad",

  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  }
});
