import { ChzzkLoginButton, SoopLoginButton } from '@stream/ui'
import { chzzkOAuthConfigured, soopOAuthConfigured } from '@/lib/env'

export default function HomePage() {
  const chzzkReady = safeConfigured(chzzkOAuthConfigured)
  const soopReady = safeConfigured(soopOAuthConfigured)

  return (
    <main>
      <section className="hero">
        <h1>플랫폼 계정으로 로그인</h1>
        <p>
          `@stream/auth`는 유저가 OAuth 버튼을 눌러 치지직·SOOP에 직접 인가하는 모듈입니다. 로그인
          후 대시보드에서 내 계정·토큰을 확인하고, 채널 조회·채팅은 `@stream/api` / `@stream/chat`로
          이어집니다.
        </p>
        <div className="actions">
          <ChzzkLoginButton href="/api/auth/chzzk/login" disabled={!chzzkReady} size="lg" />
          <SoopLoginButton href="/api/auth/soop/login" disabled={!soopReady} size="lg" />
          <a className="btn" href="/dashboard">
            내 계정
          </a>
        </div>
      </section>

      <div className="grid">
        <article className="panel">
          <h2>1. OAuth 로그인 — `@stream/auth`</h2>
          <p className="meta">
            {chzzkReady ? '치지직 앱 키 설정됨' : '치지직 CLIENT_ID/SECRET 필요'} ·{' '}
            {soopReady ? 'SOOP 파트너 키 설정됨' : 'SOOP은 파트너 키 필요 (없으면 비활성)'}
          </p>
          <p className="meta">
            버튼 클릭 → 플랫폼 인가 화면 → 콜백 → 암호화 쿠키에 토큰 저장. 리프레시 토큰 회전은
            TokenManager single-flight가 보호합니다.
          </p>
        </article>
        <article className="panel">
          <h2>2. 채널 · 라이브 — `@stream/api`</h2>
          <p className="meta">로그인과 별개로 임의의 스트리머 정보를 조회합니다.</p>
          <div className="actions">
            <a className="btn" href="/channel">
              채널 조회
            </a>
          </div>
        </article>
        <article className="panel">
          <h2>3. 실시간 채팅 — `@stream/chat`</h2>
          <p className="meta">
            `@stream/api`로 연결 정보를 받은 뒤 WebSocket으로 정규화 이벤트를 받습니다. 익명 읽기가
            기본입니다.
          </p>
          <div className="actions">
            <a className="btn" href="/chat">
              채팅 테스트
            </a>
          </div>
        </article>
      </div>

      <p className="footnote">
        비공식 쿠키(`NID_AUT`/`NID_SES`)는 네이버 계정 전체 세션입니다. OAuth 로그인과 섞지 말고,
        필요할 때만 `.env.local`에 넣으세요.
      </p>
    </main>
  )
}

function safeConfigured(fn: () => boolean): boolean {
  try {
    return fn()
  } catch {
    return false
  }
}
