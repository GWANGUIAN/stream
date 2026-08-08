import { createChatSseResponse, parseChatSseSearchParams } from '@stream/sse/server'
import { assertPlatform, chatCredential } from '@/lib/providers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request, context: { params: Promise<{ platform: string }> }) {
  const platform = assertPlatform((await context.params).platform)
  const { channelId, types, messagePrefixes } = parseChatSseSearchParams(
    new URL(request.url).searchParams,
  )

  return createChatSseResponse({
    platform,
    channelId,
    credential: chatCredential(platform),
    types,
    messagePrefixes,
    signal: request.signal,
  })
}
