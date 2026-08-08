import type { Platform } from '@stream/core'
import { createOAuthProvider, createTokenManager, isOAuthConfigured } from '@/lib/providers'
import { getStoredTokens } from '@/lib/session'
import { PlatformCard } from './platform-card'

export const dynamic = 'force-dynamic'

interface DashboardPageProps {
  searchParams: Promise<{ error?: string; connected?: string }>
}

async function loadPlatform(platform: Platform) {
  const configured = isOAuthConfigured(platform)
  const tokens = await getStoredTokens(platform)

  if (!tokens) {
    return {
      platform,
      configured,
      connected: false as const,
    }
  }

  let nickname: string | undefined
  let id: string | undefined
  let identityError: string | undefined

  if (configured) {
    try {
      const manager = await createTokenManager(platform)
      // get()이 만료 임박 시 자동 갱신합니다.
      const fresh = await manager.get(manager.key())
      if (fresh) {
        const identity = await createOAuthProvider(platform).getIdentity({
          kind: 'oauth',
          platform,
          tokens: fresh,
        })
        nickname = identity.nickname
        id = identity.id
      }
    } catch (cause) {
      identityError = cause instanceof Error ? cause.message : 'identity 조회 실패'
    }
  }

  return {
    platform,
    configured,
    connected: true as const,
    nickname,
    id,
    expiresAt: tokens.expiresAt,
    identityError,
  }
}

type PlatformView = Awaited<ReturnType<typeof loadPlatform>>

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams
  let chzzk: PlatformView
  let soop: PlatformView

  try {
    ;[chzzk, soop] = await Promise.all([loadPlatform('chzzk'), loadPlatform('soop')])
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : '환경변수 오류'
    return (
      <main>
        <div className="alert">
          {message}. `.env.local`에 `AUTH_SECRET`을 설정한 뒤 서버를 다시 시작하세요.
        </div>
      </main>
    )
  }

  return (
    <main>
      <section className="hero">
        <h1>내 계정</h1>
        <p>
          OAuth로 로그인한 플랫폼 계정입니다. 닉네임·토큰 만료 카운트다운·수동 갱신/해제로
          `@stream/auth` TokenManager를 검증합니다.
        </p>
      </section>

      {params.error ? <div className="alert">{params.error}</div> : null}
      {params.connected ? (
        <div className="alert ok">{params.connected} 로그인이 완료되었습니다.</div>
      ) : null}

      <div className="grid">
        <PlatformCard
          platform="chzzk"
          label="치지직"
          configured={chzzk.configured}
          connected={chzzk.connected}
          nickname={chzzk.connected ? chzzk.nickname : undefined}
          id={chzzk.connected ? chzzk.id : undefined}
          expiresAt={chzzk.connected ? chzzk.expiresAt : undefined}
          identityError={chzzk.connected ? chzzk.identityError : undefined}
        />
        <PlatformCard
          platform="soop"
          label="SOOP"
          configured={soop.configured}
          connected={soop.connected}
          nickname={soop.connected ? soop.nickname : undefined}
          id={soop.connected ? soop.id : undefined}
          expiresAt={soop.connected ? soop.expiresAt : undefined}
          identityError={soop.connected ? soop.identityError : undefined}
        />
      </div>
    </main>
  )
}
