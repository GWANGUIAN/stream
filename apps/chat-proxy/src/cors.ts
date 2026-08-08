const DEFAULT_ORIGINS = [
  'https://gwanguian.github.io',
  'https://streamcontent.click',
  'https://www.streamcontent.click',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:3002',
  'http://127.0.0.1:3003',
]

function allowedOrigins(): Set<string> {
  const extra = (process.env.CHAT_PROXY_CORS_ORIGINS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
  return new Set([...DEFAULT_ORIGINS, ...extra])
}

/** Origin 헤더가 허용 목록에 있으면 그대로, 없으면 null. */
export function resolveCorsOrigin(requestOrigin: string | undefined): string | null {
  if (!requestOrigin) return null
  return allowedOrigins().has(requestOrigin) ? requestOrigin : null
}

export function corsHeaders(origin: string | null): Record<string, string> {
  if (!origin) return {}
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET, OPTIONS',
    'access-control-allow-headers': 'cache-control',
    vary: 'Origin',
  }
}
