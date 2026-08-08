/**
 * GitHub Pages 같은 서브패스 배포에서 `next.config.ts`의 `basePath`와 동일한 값을 써야
 * 하는 정적 자원(파비콘, manifest, 오버레이 링크 등)에 사용합니다.
 * 빌드 시 `NEXT_PUBLIC_BASE_PATH`로 주입되며, 값이 없으면 빈 문자열(루트 배포)입니다.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

export function withBasePath(path: string): string {
  const suffix = path.startsWith('/') ? path : `/${path}`
  return `${BASE_PATH}${suffix}`
}
