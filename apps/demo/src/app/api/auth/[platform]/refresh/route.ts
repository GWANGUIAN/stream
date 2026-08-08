import { NextResponse } from 'next/server'
import { assertPlatform, createTokenManager, isOAuthConfigured } from '@/lib/providers'

export async function POST(_request: Request, context: { params: Promise<{ platform: string }> }) {
  const platform = assertPlatform((await context.params).platform)
  if (!isOAuthConfigured(platform)) {
    return NextResponse.json({ error: 'OAuth가 설정되지 않았습니다.' }, { status: 400 })
  }

  try {
    const manager = await createTokenManager(platform)
    const tokens = await manager.refresh(manager.key())
    return NextResponse.json({
      ok: true,
      expiresAt: tokens.expiresAt,
      accessTokenPreview: `${tokens.accessToken.slice(0, 8)}…`,
    })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'refresh_failed'
    return NextResponse.json({ error: message }, { status: 401 })
  }
}
