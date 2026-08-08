import { ChatViewer } from './chat-viewer'

interface ChatPageProps {
  searchParams: Promise<{ platform?: string; channelId?: string }>
}

export default async function ChatPage({ searchParams }: ChatPageProps) {
  const params = await searchParams
  const initialPlatform =
    params.platform === 'soop' || params.platform === 'chzzk' ? params.platform : 'chzzk'
  const initialChannelId = params.channelId?.trim() ?? ''

  return (
    <main>
      <section className="hero">
        <h1>채팅 테스트</h1>
        <p>
          `@stream/chat`가 `@stream/api`의 `getChatConnection`으로 세션을 준비한 뒤 WebSocket에
          붙습니다. 기본 Credential은 익명입니다 — OAuth 로그인과는 별개 경로입니다.
        </p>
      </section>
      <ChatViewer initialPlatform={initialPlatform} initialChannelId={initialChannelId} />
      <p className="footnote">
        익명 읽기가 기본입니다. 치지직 전송 권한이 필요하면 `CHZZK_NID_AUT`/`CHZZK_NID_SES`를
        설정하세요. 쿠키는 계정 전체 세션이므로 커밋하지 마세요.
      </p>
    </main>
  )
}
