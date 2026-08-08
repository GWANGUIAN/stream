import { stateCookieName } from '@stream/auth'
import { NextResponse } from 'next/server'
import { assertPlatform, createOAuthProvider, createTokenManager } from '@/lib/providers'
import { clearStateCookie, readStateCookie, saveTokens } from '@/lib/session'

export async function GET(request: Request, context: { params: Promise<{ platform: string }> }) {
  const platform = assertPlatform((await context.params).platform)
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const queryState = url.searchParams.get('state') ?? undefined
  const error = url.searchParams.get('error')

  if (error) {
    return NextResponse.redirect(
      new URL(`/dashboard?error=${encodeURIComponent(error)}`, url.origin),
    )
  }

  if (!code) {
    return NextResponse.redirect(new URL('/dashboard?error=missing_code', url.origin))
  }

  try {
    const provider = createOAuthProvider(platform)
    const cookieName = stateCookieName(platform)
    const storedState = await readStateCookie(cookieName)

    const tokens = await provider.exchangeCode({
      code,
      state: queryState,
      storedState,
    })

    await saveTokens(platform, tokens)
    await clearStateCookie(cookieName)

    // TokenManager에 한 번 저장해 두어 이후 get/refresh 경로와 동일하게 맞춥니다.
    const manager = await createTokenManager(platform)
    await manager.save(manager.key(), tokens)

    return NextResponse.redirect(new URL(`/dashboard?connected=${platform}`, url.origin))
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'callback_failed'
    return NextResponse.redirect(
      new URL(`/dashboard?error=${encodeURIComponent(message)}`, url.origin),
    )
  }
}
