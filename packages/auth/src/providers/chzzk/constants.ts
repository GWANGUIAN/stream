/**
 * 인가 URL만 openapi 도메인이 아니라 서비스 도메인에 있습니다.
 * 이걸 openapi.chzzk.naver.com에 붙이면 404가 나며, 흔한 실수입니다.
 */
export const CHZZK_AUTHORIZE_URL = 'https://chzzk.naver.com/account-interlock'

/** 공식 Open API. 앱 등록과 스코프 승인이 필요합니다. */
export const CHZZK_OPEN_API_BASE = 'https://openapi.chzzk.naver.com'

/** 비공식 사용자 상태 조회용. 채널/라이브는 `@stream/api`를 쓰세요. */
export const CHZZK_GAME_API_BASE = 'https://comm-api.game.naver.com/nng_main'

export const CHZZK_ORIGIN = 'https://chzzk.naver.com'

export const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

/**
 * 비공식 엔드포인트는 브라우저에서 온 요청처럼 보이지 않으면 거부하거나 빈 응답을 줍니다.
 * front-client-platform-type은 비교적 최근에 요구되기 시작한 헤더입니다.
 */
export const CHZZK_UNOFFICIAL_HEADERS: Record<string, string> = {
  'user-agent': BROWSER_USER_AGENT,
  origin: CHZZK_ORIGIN,
  referer: `${CHZZK_ORIGIN}/`,
  'front-client-platform-type': 'PC',
  accept: 'application/json',
}
