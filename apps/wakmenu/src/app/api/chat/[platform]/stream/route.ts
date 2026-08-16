import { createChatSseResponse, parseChatSseSearchParams } from '@stream/sse/server'
import { anonymousCredential } from '@stream/auth'
import { isPlatform } from '@stream/core'
export const runtime = 'nodejs'; export const dynamic = 'force-dynamic'
export async function GET(request: Request, context: { params: Promise<{ platform: string }> }) { const platform = (await context.params).platform; if (!isPlatform(platform)) return new Response('unsupported platform', { status: 400 }); const parsed = parseChatSseSearchParams(new URL(request.url).searchParams); return createChatSseResponse({ platform, channelId: parsed.channelId, credential: anonymousCredential(platform), types: parsed.types, messagePrefixes: parsed.messagePrefixes, signal: request.signal }) }
