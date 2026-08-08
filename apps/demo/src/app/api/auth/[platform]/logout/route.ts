import { NextResponse } from 'next/server'
import { assertPlatform, createTokenManager, isOAuthConfigured } from '@/lib/providers'
import { clearTokens } from '@/lib/session'

export async function POST(_request: Request, context: { params: Promise<{ platform: string }> }) {
  const platform = assertPlatform((await context.params).platform)

  try {
    if (isOAuthConfigured(platform)) {
      const manager = await createTokenManager(platform)
      await manager.revoke(manager.key())
    } else {
      await clearTokens(platform)
    }
    return NextResponse.json({ ok: true })
  } catch (cause) {
    // 원격 폐기가 실패해도 로컬은 비웁니다.
    await clearTokens(platform)
    const message = cause instanceof Error ? cause.message : 'logout_failed'
    return NextResponse.json({ ok: true, warning: message })
  }
}
