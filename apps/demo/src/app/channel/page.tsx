import { ChannelLookup } from './channel-lookup'

export default function ChannelPage() {
  return (
    <main>
      <section className="hero">
        <h1>채널 · 라이브 조회</h1>
        <p>
          `@stream/api`로 임의의 스트리머 프로필과 현재 방송 상태를 가져옵니다. OAuth 로그인과는
          독립된 익명 조회 경로입니다.
        </p>
      </section>
      <ChannelLookup />
    </main>
  )
}
