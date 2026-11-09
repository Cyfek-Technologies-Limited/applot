const applicationRuntimeFiles = [
  './node_modules/playwright/**/*',
  './node_modules/playwright-core/**/*',
  // Vercel installs using pnpm: include its real package paths as well as links.
  './node_modules/.pnpm/playwright@*/node_modules/playwright/**/*',
  './node_modules/.pnpm/playwright-core@*/node_modules/playwright-core/**/*',
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['playwright', 'playwright-core'],
  outputFileTracingIncludes: {
    '/api/agent/run': applicationRuntimeFiles,
    '/api/cron/autopilot': applicationRuntimeFiles,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ]
  },
}

export default nextConfig
