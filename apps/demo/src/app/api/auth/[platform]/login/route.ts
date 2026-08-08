import { NextResponse } from 'next/server'
import { assertPlatform, createOAuthProvider, isOAuthConfigured } from '@/lib/providers'
import { setStateCookie } from '@/lib/session'

export async function GET(_request: Request, context: { params: Promise<{ platform: string }> }) {
  const platform = assertPlatform((await context.params).platform)

  if (!isOAuthConfigured(platform)) {
    return NextResponse.json(
      {
        error:
          platform === 'soop'
            ? 'SOOP OAuth는 파트너 키가 필요합니다. 현재는 채팅 익명 모드만 사용할 수 있습니다.'
            : '치지직 CLIENT_ID/SECRET/REDIRECT_URI가 설정되지 않았습니다.',
      },
      { status: 400 },
    )
  }

  const provider = createOAuthProvider(platform)
  const auth = provider.createAuthorization({ data: { returnTo: '/dashboard' } })
  await setStateCookie(
    auth.stateCookie.name,
    auth.stateCookie.value,
    auth.stateCookie.maxAgeSeconds,
  )

  return NextResponse.redirect(auth.url)
}
