'use client'

import { Check, Copy, History, Menu } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { usePollStore } from '@/lib/hooks'
import { playRevealFanfare } from '@/lib/sound'
import { ControlBar } from './control-bar'
import { HistoryPanel } from './history-panel'
import { MenuDrawer } from './menu-drawer'
import { PhaseTimer } from './phase-timer'
import { ThemeToggle } from './theme-toggle'
import { TitleBar } from './title-bar'
import { VoteFeed } from './vote-feed'
import { VoteStage } from './vote-stage'

export function Console() {
  const { store, snapshot } = usePollStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const lastPhaseRef = useRef<string | null>(null)

  const handlePrimaryAction = useCallback(() => {
    if (!store || !snapshot) return
    if (snapshot.phase === 'idle') store.engine.start()
    else if (snapshot.phase === 'running') store.engine.close()
    else if (snapshot.phase === 'closed') store.engine.reveal()
    else if (snapshot.phase === 'revealed') store.engine.reset()
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
      if (event.key.toLowerCase() === 'r' && store && snapshot) {
        if (snapshot.phase === 'running' || snapshot.phase === 'closed') {
          store.engine.reveal()
        }
        return
      }
      if (event.key.toLowerCase() === 'l' && store && snapshot) {
        store.engine.setShowLiveResults(!snapshot.settings.showLiveResults)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handlePrimaryAction, store, snapshot])

  useEffect(() => {
    if (!snapshot) return
    if (lastPhaseRef.current !== 'revealed' && snapshot.phase === 'revealed') {
      playRevealFanfare()
    }
    lastPhaseRef.current = snapshot.phase
  }, [snapshot])

  if (!store || !snapshot) {
    return (
      <div className="console-page">
        <p className="glass-panel-sub">불러오는 중…</p>
      </div>
    )
  }

  function copyInstruction() {
    if (!snapshot) return
    void navigator.clipboard.writeText(
      `채팅창에 "${snapshot.settings.votePrefix} 1" 처럼 번호를 입력해서 투표해 주세요!`,
    )
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

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
            <b>STREAM</b>.POLL
          </span>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="btn btn-icon btn-ghost"
            aria-label="지난 투표 열기"
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

      <div className="instruction-card">
        <span className="instruction-text">
          시청자는 채팅에 <code>{snapshot.settings.votePrefix} 1</code> 처럼 입력해서 투표해요.
        </span>
        <button type="button" className="btn btn-sm btn-ghost" onClick={copyInstruction}>
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? '복사됨' : '안내 문구 복사'}
        </button>
      </div>

      <VoteStage store={store} snapshot={snapshot} />
      <ControlBar store={store} snapshot={snapshot} onOpenHistory={() => setHistoryOpen(true)} />

      <div className="shortcuts-row">
        <span>
          <span className="kbd">Space</span> 다음 단계
        </span>
        <span>
          <span className="kbd">R</span> 결과 공개
        </span>
        <span>
          <span className="kbd">L</span> 실시간 공개
        </span>
        <span>
          <span className="kbd">M</span> 메뉴
        </span>
        <span>
          <span className="kbd">H</span> 지난 투표
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
      <VoteFeed
        feed={snapshot.feed}
        showOption={snapshot.settings.showLiveResults || snapshot.phase === 'revealed'}
      />
    </div>
  )
}
