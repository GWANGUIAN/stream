import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // 워크스페이스 패키지를 소스 그대로 transpile합니다.
  transpilePackages: [
    '@stream/alerts',
    '@stream/analytics',
    '@stream/api',
    '@stream/auth',
    '@stream/bot',
    '@stream/chat',
    '@stream/chat-ui',
    '@stream/config',
    '@stream/core',
    '@stream/events',
    '@stream/goals',
    '@stream/live',
    '@stream/media',
    '@stream/overlay',
    '@stream/poll',
    '@stream/scheduler',
    '@stream/session',
    '@stream/sse',
    '@stream/tts',
    '@stream/ui',
  ],
  serverExternalPackages: ['ws', 'lightningcss', '@tailwindcss/postcss'],
  // TypeScript 7 네이티브 컴파일러에는 JS API가 없어 CLI 타입체크를 씁니다.
  experimental: {
    useTypeScriptCli: true,
  },
}

export default nextConfig
