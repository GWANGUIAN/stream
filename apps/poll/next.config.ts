import type { NextConfig } from 'next'

// GitHub Pages(`/stream/poll`)와 로컬 개발 URL을 동일하게 맞춥니다.
const isStaticExport = process.env.NEXT_PUBLIC_STATIC_EXPORT === 'true'
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '/stream/poll'

const nextConfig: NextConfig = {
  // 워크스페이스 패키지를 소스 그대로 transpile합니다.
  transpilePackages: [
    '@stream/auth',
    '@stream/chat',
    '@stream/config',
    '@stream/core',
    '@stream/events',
    '@stream/poll',
    '@stream/sse',
    '@stream/ui',
  ],
  serverExternalPackages: ['ws', 'lightningcss', '@tailwindcss/postcss'],
  // TypeScript 7 네이티브 컴파일러에는 JS API가 없어 CLI 타입체크를 씁니다.
  experimental: {
    useTypeScriptCli: true,
  },
  basePath,
  assetPrefix: basePath,
  trailingSlash: true,
  // 클라이언트 코드의 withBasePath / SSE URL과 next.config basePath를 동기화합니다.
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  ...(isStaticExport
    ? {
        output: 'export',
        images: { unoptimized: true },
      }
    : {
        // basePath 밖 URL(`/`, `/overlay`)로 들어오면 Pages와 동일한 경로로 보냅니다.
        // (static export에서는 redirects 미지원)
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
