import { createChatSseResponse } from '@stream/sse/server'
import { assertPlatform, chatCredential } from '@/lib/providers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * 서버에서 채팅 클라이언트를 돌리고 정규화 이벤트(도네이션 포함)를 SSE로 push합니다.
 * 비공식 API는 CORS로 브라우저 직접 호출이 막혀 있어 이 프록시가 필수입니다.
 */
export async function GET(request: Request, context: { params: Promise<{ platform: string }> }) {
  const platform = assertPlatform((await context.params).platform)
  const channelId = new URL(request.url).searchParams.get('channelId')?.trim() ?? ''

  return createChatSseResponse({
    platform,
    channelId,
    credential: chatCredential(platform),
    signal: request.signal,
  })
}
