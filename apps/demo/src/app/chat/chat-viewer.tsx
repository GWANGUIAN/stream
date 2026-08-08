'use client'

import type { ChatEvent } from '@stream/chat'
import { type ChatLineModel, ChatList, chatEventToLine } from '@stream/chat-ui'
import { chatSseUrl, subscribeChatSse } from '@stream/sse/client'
import { useEffect, useRef, useState } from 'react'
import '@stream/chat-ui/styles.css'

type Platform = 'chzzk' | 'soop'

export function ChatViewer({
  initialPlatform = 'chzzk',
  initialChannelId = '',
}: {
  initialPlatform?: Platform
  initialChannelId?: string
}) {
  const [platform, setPlatform] = useState<Platform>(initialPlatform)
  const [channelId, setChannelId] = useState(initialChannelId)
  const [lines, setLines] = useState<ChatLineModel[]>([])
  const [status, setStatus] = useState('대기 중')
  const [connected, setConnected] = useState(false)
  const subRef = useRef<ReturnType<typeof subscribeChatSse> | null>(null)

  useEffect(() => {
    return () => {
      subRef.current?.close()
    }
  }, [])

  function stop() {
    subRef.current?.close()
    subRef.current = null
    setConnected(false)
    setStatus('연결 종료')
  }

  function start() {
    const id = channelId.trim()
    if (!id) {
      setStatus('채널 ID를 입력하세요')
      return
    }

    stop()
    setLines([])
    setStatus('연결 중…')
    setConnected(true)

    const sub = subscribeChatSse({
      url: chatSseUrl('/api/chat', platform, id),
      onEvent: (event) => {
        if (event.type === 'hello') {
          setStatus(`${event.platform} / ${event.channelId} 스트림 열림`)
          return
        }
        if (event.type === 'live') return

        if (event.type === 'status') {
          setStatus(String(event.text ?? event.status))
          if (event.status === 'disconnected' || event.status === 'error') {
            setConnected(false)
          }
        }

        setLines((prev) => [...prev.slice(-299), chatEventToLine(event as ChatEvent)])
      },
      onError: () => {
        setStatus('SSE 연결 오류')
        setConnected(false)
        subRef.current?.close()
      },
    })
    subRef.current = sub
  }

  return (
    <section className="panel">
      <h2>실시간 채팅</h2>
      <p className="meta">서버 SSE 프록시로 비공식 채팅을 읽습니다. 상태: {status}</p>

      <div className="form-row">
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value as Platform)}
          disabled={connected}
        >
          <option value="chzzk">치지직</option>
          <option value="soop">SOOP</option>
        </select>
        <input
          value={channelId}
          onChange={(e) => setChannelId(e.target.value)}
          placeholder={platform === 'chzzk' ? '채널 ID (해시)' : '스트리머 ID (로그인 아이디)'}
          disabled={connected}
        />
        {!connected ? (
          <button type="button" className="btn btn-primary" onClick={start}>
            연결
          </button>
        ) : (
          <button type="button" className="btn btn-danger" onClick={stop}>
            종료
          </button>
        )}
      </div>

      <div className="chat-log">
        {lines.length === 0 ? (
          <p className="meta">아직 메시지가 없습니다. 방송 중인 채널 ID를 입력하세요.</p>
        ) : (
          <ChatList lines={lines} />
        )}
      </div>
    </section>
  )
}
