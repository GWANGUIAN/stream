export const SOOP_DEFAULT_DOMAIN = 'sooplive.co.kr'

export function soopOrigin(domain = SOOP_DEFAULT_DOMAIN): string {
  return `https://www.${domain}`
}

export function soopLiveBase(domain = SOOP_DEFAULT_DOMAIN): string {
  return `https://live.${domain}`
}

export function soopChannelApiBase(domain = SOOP_DEFAULT_DOMAIN): string {
  return `https://chapi.${domain}`
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
