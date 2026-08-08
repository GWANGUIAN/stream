export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '/stream/chat-test'

export function withBasePath(path: string): string {
  const suffix = path.startsWith('/') ? path : `/${path}`
  return `${BASE_PATH}${suffix}`
}
