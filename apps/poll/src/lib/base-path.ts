/**
 * GitHub Pages 같은 서브패스 배포에서 `next.config.ts`의 `basePath`와 동일한 값을 써야
 * 하는 정적 자원(오버레이 링크 등)에 사용합니다.
 * `next.config.ts`의 env로 주입되며, 기본값은 `/stream/poll`입니다.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '/stream/poll'

export function withBasePath(path: string): string {
  const suffix = path.startsWith('/') ? path : `/${path}`
  return `${BASE_PATH}${suffix}`
}
