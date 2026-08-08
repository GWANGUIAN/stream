import type { NextConfig } from 'next'

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
}

export default nextConfig
