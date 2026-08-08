export const CHZZK_API_BASE = 'https://api.chzzk.naver.com'
export const CHZZK_GAME_API_BASE = 'https://comm-api.game.naver.com/nng_main'
export const CHZZK_ORIGIN = 'https://chzzk.naver.com'

export const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

export const CHZZK_UNOFFICIAL_HEADERS: Record<string, string> = {
  'user-agent': BROWSER_USER_AGENT,
  origin: CHZZK_ORIGIN,
  referer: `${CHZZK_ORIGIN}/`,
  'front-client-platform-type': 'PC',
  accept: 'application/json',
}
