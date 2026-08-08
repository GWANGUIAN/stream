'use client'

import type { Platform } from '@stream/core'
import type { ChatSseClientEvent } from '@stream/sse/client'
import { ChzzkMark, SoopMark } from '@stream/ui/brand'
import { Check, ClipboardCopy, Trash2 } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { buildDiagnosticDump, MAX_EVENTS, summarizeEvent } from '@/lib/diagnostic'
import { useChatConnection } from '@/lib/hooks'

type FeedFilter = 'all' | 'message' | 'donation'

const PLACEHOLDER: Record<Platform, { label: string; hint: string }> = {
  soop: { label: '스트리머 아이디', hint: '예: gameng' },
  chzzk: { label: '채널 ID', hint: '예: 32자리 채널 코드' },
}

function eventMatchesFilter(event: ChatSseClientEvent, filter: FeedFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'message') return event.type === 'message'
  if (filter === 'donation') return event.type === 'donation' || event.type === 'subscription'
  return true
}

function eventTone(type: string): string {
  if (type === 'donation' || type === 'subscription') return 'donation'
  if (type === 'message') return 'message'
  if (type === 'status' || type === 'hello') return 'meta'
  return 'system'
}

export function Console() {
  const [platform, setPlatform] = useState<Platform>('soop')
  const [streamerId, setStreamerId] = useState('')
  const [activePlatform, setActivePlatform] = useState<Platform | null>(null)
  const [activeChannelId, setActiveChannelId] = useState('')
  const [events, setEvents] = useState<ChatSseClientEvent[]>([])
  const [filter, setFilter] = useState<FeedFilter>('all')
  const [copyState, setCopyState] = useState<'idle' | 'ok' | 'err'>('idle')

  const onEvent = useCallback((event: ChatSseClientEvent) => {
    if (event.type === 'hello') {
      setActivePlatform(event.platform)
      setActiveChannelId(event.channelId)
    }
    setEvents((prev) => {
      const next = [...prev, event]
      return next.length > MAX_EVENTS ? next.slice(next.length - MAX_EVENTS) : next
    })
  }, [])

  const { status, message, sseBase, connect, disconnect } = useChatConnection(onEvent)
  const info = PLACEHOLDER[platform]

  const visible = useMemo(
    () => events.filter((event) => eventMatchesFilter(event, filter)),
    [events, filter],
  )

  const donationCount = useMemo(
    () => events.filter((e) => e.type === 'donation' || e.type === 'subscription').length,
    [events],
  )
  const messageCount = useMemo(() => events.filter((e) => e.type === 'message').length, [events])

  function handleConnect() {
    setEvents([])
    setActivePlatform(platform)
    setActiveChannelId(streamerId.trim())
    connect(platform, streamerId)
  }

  function handleDisconnect() {
    disconnect()
  }

  async function handleCopyAll() {
    const dump = buildDiagnosticDump(
      {
        capturedAt: new Date().toISOString(),
        platform: activePlatform,
        channelId: activeChannelId || streamerId.trim(),
        sseBase,
        connectionStatus: status,
        connectionMessage: message,
        eventCount: events.length,
        filter,
      },
      events,
    )
    try {
      await navigator.clipboard.writeText(dump)
      setCopyState('ok')
      window.setTimeout(() => setCopyState('idle'), 2000)
    } catch {
      setCopyState('err')
      window.setTimeout(() => setCopyState('idle'), 2500)
    }
  }

  const dotClass =
    status === 'connected'
      ? 'ok'
      : status === 'error'
        ? 'err'
        : status === 'connecting'
          ? 'warn'
          : ''

  return (
    <main className="shell">
      <header className="hero">
        <p className="eyebrow">내부 검증</p>
        <h1>채팅 연동 테스트</h1>
        <p className="lede">
          배포된 채팅 프록시로 SOOP·치지직 이벤트를 받아 정규화 결과를 확인합니다. 전체 복사 후
          Cursor에 붙여넣으면 로직 대조가 가능합니다.
        </p>
      </header>

      <div className="layout">
        <aside className="sidebar">
          <section className="panel">
            <h2>방송 연결</h2>
            <p className="panel-sub">플랫폼과 채널을 입력한 뒤 연결하세요.</p>

            <div className="field">
              <span className="field-label">플랫폼</span>
              <div className="pill-group">
                <button
                  type="button"
                  className={`pill soop ${platform === 'soop' ? 'active' : ''}`}
                  onClick={() => setPlatform('soop')}
                  aria-label="SOOP"
                >
                  <SoopMark className="brand-mark brand-mark-soop" />
                </button>
                <button
                  type="button"
                  className={`pill chzzk ${platform === 'chzzk' ? 'active' : ''}`}
                  onClick={() => setPlatform('chzzk')}
                  aria-label="치지직"
                >
                  <ChzzkMark className="brand-mark brand-mark-chzzk" />
                </button>
              </div>
            </div>

            <div className="field">
              <span className="field-label">{info.label}</span>
              <input
                value={streamerId}
                placeholder={info.hint}
                onChange={(e) => setStreamerId(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && status !== 'connecting') handleConnect()
                }}
              />
            </div>

            <div className="field-row">
              {status === 'connected' ? (
                <button type="button" className="btn danger" onClick={handleDisconnect}>
                  연결 끊기
                </button>
              ) : (
                <button
                  type="button"
                  className="btn primary"
                  onClick={handleConnect}
                  disabled={status === 'connecting'}
                >
                  {status === 'connecting' ? '연결 중…' : '연결'}
                </button>
              )}
            </div>

            {message ? (
              <p className="status-line">
                <span className={`dot ${dotClass}`} />
                {message}
              </p>
            ) : null}

            <p className="meta-line">SSE: {sseBase}</p>
          </section>

          <section className="panel">
            <h2>진단</h2>
            <p className="panel-sub">
              수신 이벤트 {events.length}건 · 채팅 {messageCount} · 후원/구독 {donationCount}
            </p>
            <div className="field-row">
              <button type="button" className="btn primary" onClick={() => void handleCopyAll()}>
                {copyState === 'ok' ? (
                  <>
                    <Check size={16} /> 복사됨
                  </>
                ) : (
                  <>
                    <ClipboardCopy size={16} /> 전체 복사
                  </>
                )}
              </button>
              <button
                type="button"
                className="btn ghost"
                onClick={() => setEvents([])}
                disabled={events.length === 0}
              >
                <Trash2 size={16} /> 비우기
              </button>
            </div>
            {copyState === 'err' ? (
              <p className="status-line">
                <span className="dot err" />
                클립보드 복사에 실패했습니다.
              </p>
            ) : null}
          </section>
        </aside>

        <section className="panel feed-panel">
          <div className="feed-head">
            <div>
              <h2>이벤트 피드</h2>
              <p className="panel-sub">최신 {MAX_EVENTS}건까지 유지합니다.</p>
            </div>
            <div className="filter-group">
              {(
                [
                  ['all', '전체'],
                  ['message', '채팅만'],
                  ['donation', '후원만'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={`filter ${filter === value ? 'active' : ''}`}
                  onClick={() => setFilter(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <ul className="feed">
            {visible.length === 0 ? (
              <li className="feed-empty">연결 후 채팅·후원이 여기 표시됩니다.</li>
            ) : (
              [...visible].reverse().map((event, index) => (
                <li key={`${event.type}-${'at' in event ? event.at : index}-${index}`} className={`feed-item ${eventTone(event.type)}`}>
                  <div className="feed-meta">
                    <span className="type-tag">{event.type}</span>
                    {'platform' in event ? <span className="plat">{event.platform}</span> : null}
                    {'at' in event && typeof event.at === 'number' ? (
                      <time dateTime={new Date(event.at).toISOString()}>
                        {new Date(event.at).toLocaleTimeString('ko-KR')}
                      </time>
                    ) : null}
                  </div>
                  <p className="feed-text">{summarizeEvent(event)}</p>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </main>
  )
}
