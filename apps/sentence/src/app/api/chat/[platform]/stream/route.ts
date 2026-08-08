import { createChatSseResponse } from '@stream/sse/server'
import { assertPlatform, chatCredential } from '@/lib/providers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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
