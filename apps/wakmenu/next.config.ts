import type { NextConfig } from 'next'
const isStaticExport = process.env.NEXT_PUBLIC_STATIC_EXPORT === 'true'
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '/wakmenu'
const nextConfig: NextConfig = { transpilePackages: ['@stream/auth', '@stream/chat', '@stream/core', '@stream/sse', '@stream/ui', '@stream/wakmenu'], serverExternalPackages: ['ws'], experimental: { useTypeScriptCli: true }, basePath, assetPrefix: basePath, trailingSlash: true, env: { NEXT_PUBLIC_BASE_PATH: basePath }, ...(isStaticExport ? { output: 'export', images: { unoptimized: true } } : {}) }
export default nextConfig
