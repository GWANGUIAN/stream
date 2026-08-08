import type { NextConfig } from 'next'

// 정적 호스팅 빌드일 때만 켭니다. Pages는 CI에서 /stream/roulette, AWS는 /roulette.
const isStaticExport = process.env.NEXT_PUBLIC_STATIC_EXPORT === 'true'
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

const nextConfig: NextConfig = {
  // 워크스페이스 패키지를 소스 그대로 transpile합니다.
  transpilePackages: [
    '@stream/auth',
    '@stream/chat',
    '@stream/config',
    '@stream/core',
    '@stream/events',
    '@stream/roulette',
    '@stream/sse',
    '@stream/ui',
  ],
  serverExternalPackages: ['ws', 'lightningcss', '@tailwindcss/postcss'],
  // TypeScript 7 네이티브 컴파일러에는 JS API가 없어 CLI 타입체크를 씁니다.
  experimental: {
    useTypeScriptCli: true,
  },
  ...(isStaticExport
    ? {
        output: 'export',
        basePath,
        assetPrefix: basePath,
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {}),
}

export default nextConfig
