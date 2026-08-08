import type { NextConfig } from 'next'

// 기본값은 GitHub Pages(`/stream/sentence`). AWS 커스텀 도메인은 CI에서
// NEXT_PUBLIC_BASE_PATH=/sentence 로 덮어씁니다.
const isStaticExport = process.env.NEXT_PUBLIC_STATIC_EXPORT === 'true'
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '/stream/sentence'

const nextConfig: NextConfig = {
  transpilePackages: [
    '@stream/auth',
    '@stream/chat',
    '@stream/config',
    '@stream/core',
    '@stream/events',
    '@stream/sentence',
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
            {
              source: '/overlay',
              destination: `${basePath}/overlay/`,
              permanent: false,
              basePath: false,
            },
            {
              source: '/overlay/',
              destination: `${basePath}/overlay/`,
              permanent: false,
              basePath: false,
            },
          ]
        },
      }),
}

export default nextConfig
