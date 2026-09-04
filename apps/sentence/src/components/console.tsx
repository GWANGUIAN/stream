'use client'

import { PLATFORM_LABELS } from '@stream/core'
import type { ChatSseClientEvent } from '@stream/sse/client'
import confetti from 'canvas-confetti'
import { Check, Copy, History, Home, Menu } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { exampleCommands } from '@/lib/examples'
import { useChatConnection, useSentenceStore } from '@/lib/hooks'
import { playRevealFanfare } from '@/lib/sound'
import type { SentenceStoreSnapshot } from '@/lib/store'
import { CandidatePanels } from './candidate-panels'
import { ControlBar } from './control-bar'
import { EntryFeed } from './entry-feed'
import { HistoryPanel } from './history-panel'
import { MenuDrawer } from './menu-drawer'
import { PhaseTimer } from './phase-timer'
import { ReelStage } from './reel-stage'
import { SectionToggles } from './section-toggles'
import { SentenceBoard } from './sentence-board'
import { ThemeToggle } from './theme-toggle'
import { TitleBar } from './title-bar'

function maxSpinSeq(snapshot: SentenceStoreSnapshot): number {
  return Math.max(0, ...snapshot.sections.map((s) => snapshot.picks[s.id]?.spinSeq ?? 0))
}

export function Console() {
  const { store, snapshot } = useSentenceStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [reelsAnimating, setReelsAnimating] = useState(false)
  /** 애니메이션까지 끝난 것으로 공개한 spinSeq. 엔진 결과보다 늦게 따라갑니다. */
  const [revealedKey, setRevealedKey] = useState<number | null>(null)
  const wasAnimatingRef = useRef(false)
  const onChatEvent = useCallback(
    (event: ChatSseClientEvent) => {
      store?.ingest(event)
    },
    [store],
  )
  const messagePrefixes =
    snapshot?.sections
      .filter((section) => section.enabled)
      .map((section) => section.prefix.trim())
      .filter(Boolean) ?? []
  const connection = useChatConnection(onChatEvent, {
    types: ['message', 'status'],
    prefixes: messagePrefixes.length > 0 ? messagePrefixes : undefined,
  })
  const connected = connection.status === 'connected'
  const knownStreamerId = snapshot?.streamerId?.trim()
  const handleQuickConnect = useCallback(() => {
    if (!snapshot?.streamerId) return
    connection.connect(snapshot.platform, snapshot.streamerId)
  }, [connection, snapshot?.platform, snapshot?.streamerId])

  const handleAnimatingChange = useCallback((animating: boolean) => {
    setReelsAnimating(animating)
  }, [])

  const handlePrimaryAction = useCallback(() => {
    if (!store || !snapshot) return
    if (snapshot.phase === 'idle' || snapshot.phase === 'revealed') store.engine.start()
    else if (snapshot.phase === 'collecting') store.engine.close()
    else if (snapshot.phase === 'closed' || snapshot.phase === 'spinning') store.engine.spinAll()
  }, [store, snapshot])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target
      if (
        target instanceof HTMLElement &&
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
      ) {
        return
      }

      if (event.code === 'Space') {
        event.preventDefault()
        handlePrimaryAction()
        return
      }
      if (event.key.toLowerCase() === 'm') setMenuOpen((v) => !v)
      if (event.key.toLowerCase() === 'h') setHistoryOpen((v) => !v)
      if (event.key.toLowerCase() === 's' && store && snapshot) {
        if (
          snapshot.phase === 'closed' ||
          snapshot.phase === 'spinning' ||
          snapshot.phase === 'revealed'
        ) {
          store.engine.spinAll()
        }
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handlePrimaryAction, store, snapshot])

  const currentKey = snapshot ? maxSpinSeq(snapshot) : 0

  // 복원 시에는 바로 공개 상태로 맞춥니다.
  useEffect(() => {
    if (!snapshot || revealedKey != null) return
    setRevealedKey(currentKey)
  }, [snapshot, currentKey, revealedKey])

  // 릴이 모두 멈춘 뒤에만 문장 키를 따라가며 공개합니다.
  useEffect(() => {
    if (reelsAnimating) {
      wasAnimatingRef.current = true
      return
    }
    if (revealedKey == null) return
    if (currentKey !== revealedKey) setRevealedKey(currentKey)
  }, [reelsAnimating, currentKey, revealedKey])

  const displaySentence =
    snapshot && revealedKey != null && currentKey === revealedKey && !reelsAnimating
      ? (snapshot.result?.sentence ?? null)
      : null

  useEffect(() => {
    if (reelsAnimating) return
    if (!wasAnimatingRef.current) return
    wasAnimatingRef.current = false
    if (!displaySentence) return

    playRevealFanfare()
    void confetti({
      particleCount: 120,
      spread: 78,
      origin: { y: 0.55 },
      colors: ['#c8f542', '#3ecfff', '#ffcb57', '#ffffff'],
    })
  }, [reelsAnimating, displaySentence])

  if (!store || !snapshot) {
    return (
      <div className="console-page">
        <p className="glass-panel-sub">불러오는 중…</p>
      </div>
    )
  }

  const examples = exampleCommands(snapshot.sections)

  function copyInstruction() {
    void navigator.clipboard.writeText(
      `채팅창에 "${examples[0] ?? '!누가 왁굳형이'}" 처럼 입력해서 문장 조각을 보내 주세요!`,
    )
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  const sectionLocked =
    snapshot.phase === 'spinning' || reelsAnimating || currentKey !== revealedKey

  return (
    <div className="console-page">
      <header className="console-header">
        <div className="header-left">
          <a href="../" className="btn btn-icon btn-ghost" aria-label="stream 홈으로">
            <Home size={16} />
          </a>
          <button
            type="button"
            className="btn btn-icon btn-ghost"
            aria-label="메뉴 열기"
            onClick={() => setMenuOpen(true)}
          >
            <Menu size={16} />
          </button>
          <span className="brand-tag">
            <b>STREAM</b>.SENTENCE
          </span>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="btn btn-icon btn-ghost"
            aria-label="지난 문장 열기"
            onClick={() => setHistoryOpen(true)}
          >
            <History size={16} />
          </button>
          <ThemeToggle />
        </div>
      </header>

      <TitleBar
        title={snapshot.title}
        editable={snapshot.phase === 'idle'}
        onChange={(title) => store.engine.setTitle(title)}
      />
      <PhaseTimer store={store} phase={snapshot.phase} endsAt={snapshot.endsAt} />

      <SectionToggles store={store} sections={snapshot.sections} locked={sectionLocked} />

      {connected ? (
        <div className="instruction-card">
          <span className="instruction-text">
            채팅에{' '}
            {examples.map((example, index) => (
              <span key={example}>
                {index > 0 ? ' · ' : null}
                <code>{example}</code>
              </span>
            ))}{' '}
            처럼 보내 주세요.
          </span>
          <button type="button" className="btn btn-sm btn-ghost" onClick={copyInstruction}>
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? '복사됨' : '안내 문구 복사'}
          </button>
        </div>
      ) : knownStreamerId ? (
        <button
          type="button"
          className="instruction-card instruction-card-action"
          onClick={handleQuickConnect}
          disabled={connection.status === 'connecting'}
        >
          <span className="instruction-text">
            {connection.status === 'connecting'
              ? `${PLATFORM_LABELS[snapshot.platform]} · ${knownStreamerId}에 연결하는 중…`
              : connection.status === 'error'
                ? connection.message || '연결에 실패했어요. 탭해서 다시 시도해 주세요.'
                : `이전에 연동한 채널: ${PLATFORM_LABELS[snapshot.platform]} · ${knownStreamerId}`}
          </span>
          <span className="btn btn-sm btn-secondary">연동하기</span>
        </button>
      ) : (
        <button
          type="button"
          className="instruction-card instruction-card-action"
          onClick={() => setMenuOpen(true)}
        >
          <span className="instruction-text">
            {connection.status === 'connecting'
              ? 'SOOP · 치지직에 연결하는 중…'
              : connection.status === 'error'
                ? connection.message || '연결에 실패했어요. 탭해서 다시 연결해 주세요.'
                : 'SOOP · 치지직 채팅이 연결되지 않았어요. 탭해서 방송 연결을 열어 주세요.'}
          </span>
          <span className="btn btn-sm btn-secondary">방송 연결</span>
        </button>
      )}

      <ReelStage store={store} snapshot={snapshot} onAnimatingChange={handleAnimatingChange} />
      <SentenceBoard sentence={displaySentence} />
      <ControlBar
        store={store}
        snapshot={snapshot}
        onOpenHistory={() => setHistoryOpen(true)}
        animating={reelsAnimating}
      />

      <section className="glass-panel">
        <h2 className="glass-panel-title">후보 모음</h2>
        <p className="glass-panel-sub">
          총 {snapshot.totalEntries.toLocaleString('ko-KR')}개 · 수동으로도 넣을 수 있어요.
        </p>
        <CandidatePanels store={store} snapshot={snapshot} />
      </section>

      <div className="shortcuts-row">
        <span>
          <span className="kbd">Space</span> 다음 단계
        </span>
        <span>
          <span className="kbd">S</span> 전체 뽑기
        </span>
        <span>
          <span className="kbd">M</span> 메뉴
        </span>
        <span>
          <span className="kbd">H</span> 지난 문장
        </span>
      </div>

      <MenuDrawer
        store={store}
        snapshot={snapshot}
        connection={connection}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onOpenHistory={() => {
          setMenuOpen(false)
          setHistoryOpen(true)
        }}
      />
      <HistoryPanel
        history={snapshot.history}
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onClear={() => store.engine.clearHistory()}
      />
      <EntryFeed feed={snapshot.feed} />
    </div>
  )
}
