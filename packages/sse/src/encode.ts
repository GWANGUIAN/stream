/** SSE data 프레임 한 줄. */
export function encodeSseData(payload: unknown): string {
  return `data: ${JSON.stringify(payload)}\n\n`
}

export const SSE_RESPONSE_HEADERS = {
  'content-type': 'text/event-stream; charset=utf-8',
  'cache-control': 'no-cache, no-transform',
  connection: 'keep-alive',
} as const
