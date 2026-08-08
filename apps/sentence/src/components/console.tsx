'use client'

import confetti from 'canvas-confetti'
import { Check, Copy, History, Menu } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useSentenceStore } from '@/lib/hooks'
import { playRevealFanfare } from '@/lib/sound'
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

export function Console() {
  const { store, snapshot } = useSentenceStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const lastResultRef = useRef<string | null>(null)

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

  useEffect(() => {
    if (!snapshot?.result?.sentence) return
    if (lastResultRef.current === snapshot.result.sentence) return
    if (snapshot.phase !== 'revealed' && snapshot.phase !== 'spinning') return

    lastResultRef.current = snapshot.result.sentence
    // 릴 애니메이션이 끝난 뒤 연출되도록 살짝 지연
    const timer = window.setTimeout(() => {
      playRevealFanfare()
      void confetti({
        particleCount: 120,
        spread: 78,
        origin: { y: 0.55 },
        colors: ['#c8f542', '#3ecfff', '#ffcb57', '#ffffff'],
      })
    }, 2800)
    return () => window.clearTimeout(timer)
  }, [snapshot?.result?.sentence, snapshot?.phase])

  if (!store || !snapshot) {
    return (
      <div className="console-page">
        <p className="glass-panel-sub">불러오는 중…</p>
      </div>
    )
  }

  const prefixes = snapshot.sections
    .filter((s) => s.enabled)
    .map((s) => s.prefix)
    .join(' · ')

  function copyInstruction() {
    void navigator.clipboard.writeText(
      `채팅창에 "${prefixes.split(' · ')[0]} 텍스트" 처럼 입력해서 문장 조각을 보내 주세요!`,
    )
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  const sectionLocked = snapshot.phase === 'spinning'

  return (
    <div className="console-page">
      <header className="console-header">
        <div className="header-left">
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

      <div className="instruction-card">
        <span className="instruction-text">
          시청자는 채팅에 <code>{prefixes}</code> + 텍스트로 참여해요.
        </span>
        <button type="button" className="btn btn-sm btn-ghost" onClick={copyInstruction}>
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? '복사됨' : '안내 문구 복사'}
        </button>
      </div>

      <ReelStage store={store} snapshot={snapshot} />
      <SentenceBoard sentence={snapshot.result?.sentence ?? null} />
      <ControlBar store={store} snapshot={snapshot} onOpenHistory={() => setHistoryOpen(true)} />

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
