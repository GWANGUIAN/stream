/**
 * SOOP은 sooplive.co.kr → sooplive.com 마이그레이션 중입니다.
 * 기본값은 아직 널리 쓰이는 .co.kr로 두고, 모든 URL을 주입 가능하게 만듭니다.
 */
export const SOOP_DEFAULT_DOMAIN = 'sooplive.co.kr'
export const SOOP_OPEN_API_BASE = 'https://openapi.sooplive.com'

export function soopOrigin(domain = SOOP_DEFAULT_DOMAIN): string {
  return `https://www.${domain}`
}

export function soopLoginBase(domain = SOOP_DEFAULT_DOMAIN): string {
  return `https://login.${domain}`
}

export const SOOP_BROWSER_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

export function soopUnofficialHeaders(domain = SOOP_DEFAULT_DOMAIN): Record<string, string> {
  const origin = `https://play.${domain}`
  return {
    'user-agent': SOOP_BROWSER_USER_AGENT,
    origin,
    referer: `${origin}/`,
    accept: 'application/json, text/plain, */*',
  }
}
