import { NextResponse } from 'next/server'
import { assertPlatform, streamApiFor } from '@/lib/providers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * 스트리머 정보 + 라이브 상태를 `@stream/api`로 조회합니다.
 * GET /api/channel/chzzk?id=...
 */
export async function GET(request: Request, context: { params: Promise<{ platform: string }> }) {
  try {
    const platform = assertPlatform((await context.params).platform)
    const id = new URL(request.url).searchParams.get('id')?.trim()
    if (!id) {
      return NextResponse.json({ error: 'id 쿼리가 필요합니다.' }, { status: 400 })
    }

    const api = streamApiFor(platform)
    const [streamer, live] = await Promise.all([
      api.getStreamer(id),
      api.getLive(id).catch((cause: unknown) => ({
        error: cause instanceof Error ? cause.message : 'live 조회 실패',
      })),
    ])

    return NextResponse.json({ streamer, live })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'channel_lookup_failed'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
