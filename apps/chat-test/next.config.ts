import type { NextConfig } from 'next'

const isStaticExport = process.env.NEXT_PUBLIC_STATIC_EXPORT === 'true'
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '/stream/chat-test'

const nextConfig: NextConfig = {
  transpilePackages: [
    '@stream/auth',
    '@stream/chat',
    '@stream/config',
    '@stream/core',
    '@stream/sse',
    '@stream/ui',
  ],
  serverExternalPackages: ['ws', 'lightningcss', '@tailwindcss/postcss'],
  experimental: {
    useTypeScriptCli: true,
  },
  basePath,
  assetPrefix: basePath,
  trailingSlash: true,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  ...(isStaticExport
    ? {
        output: 'export',
        images: { unoptimized: true },
      }
    : {
        async redirects() {
          return [
            {
              source: '/',
              destination: `${basePath}/`,
              permanent: false,
              basePath: false,
            },
          ]
        },
      }),
}

export default nextConfig
