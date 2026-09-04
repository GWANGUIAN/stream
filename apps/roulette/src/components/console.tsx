'use client'

import { PLATFORM_LABELS } from '@stream/core'
import type { ChatSseClientEvent } from '@stream/sse/client'
import { Home } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useChatConnection, useRouletteStore } from '@/lib/hooks'
import { HistoryPanel } from './history-panel'
import { ItemList } from './item-list'
import { LogFeed } from './log-feed'
import { MenuDrawer } from './menu-drawer'
import { ThemeToggle } from './theme-toggle'
import { TimerBar } from './timer-bar'
import { TimerDisplay } from './timer-display'
import { TitleBar } from './title-bar'
import { Wheel } from './wheel'

export function Console() {
  const { store, snapshot } = useRouletteStore()
  const [historyOpen, setHistoryOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const onChatEvent = useCallback(
    (event: ChatSseClientEvent) => {
      store?.ingest(event)
    },
    [store],
  )
  const connection = useChatConnection(onChatEvent, {
    types: ['donation', 'status'],
  })
  const connected = connection.status === 'connected'

  const handleSpin = useCallback(() => {
    store?.engine.spin()
  }, [store])

  const knownStreamerId = snapshot?.streamerId?.trim()
  const handleQuickConnect = useCallback(() => {
    if (!snapshot?.streamerId) return
    connection.connect(snapshot.platform, snapshot.streamerId)
  }, [connection, snapshot?.platform, snapshot?.streamerId])

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
        handleSpin()
        return
      }

      if (event.key.toLowerCase() === 'h') {
        setHistoryOpen((v) => !v)
        return
      }

      if (event.key.toLowerCase() === 'm') {
        setMenuOpen((v) => !v)
        return
      }

      if (event.key.toLowerCase() === 't' && store) {
        if (store.engine.isRegistrationOpen()) store.engine.closeRegistration()
        else store.engine.openRegistration()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleSpin, store])

  if (!store || !snapshot) {
    return (
      <div className="console-page">
        <p className="glass-panel-sub">불러오는 중…</p>
      </div>
    )
  }

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
            ☰
          </button>
          <span className="brand-tag">
            <b>STREAM</b>.ROULETTE
          </span>
        </div>
        <ThemeToggle />
      </header>

      <TitleBar title={snapshot.title} onChange={(title) => store.engine.setTitle(title)} />
      <TimerDisplay store={store} timer={snapshot.timer} />

      {!connected && knownStreamerId ? (
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
      ) : !connected ? (
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
                : 'SOOP · 치지직이 연결되지 않았어요. 탭해서 방송 연결을 열어 주세요.'}
          </span>
          <span className="btn btn-sm btn-secondary">방송 연결</span>
        </button>
      ) : null}

      <div className="console-body">
        <div className="console-stage">
          <div className="wheel-stage">
            <Wheel
              items={snapshot.items}
              weightMode={snapshot.weightMode}
              lastResult={snapshot.lastResult}
              onSpin={handleSpin}
              canSpin={snapshot.items.length > 0}
            />
            <div className="shortcuts-row">
              <span>
                <span className="kbd">Space</span> 스핀
              </span>
              <span>
                <span className="kbd">T</span> 접수 시작/마감
              </span>
              <span>
                <span className="kbd">H</span> 히스토리
              </span>
              <span>
                <span className="kbd">M</span> 메뉴
              </span>
            </div>
          </div>
        </div>

        <aside className="console-side">
          <TimerBar store={store} timer={snapshot.timer} />
          <ItemList store={store} items={snapshot.items} />
        </aside>
      </div>

      <LogFeed log={snapshot.log} />
      <HistoryPanel
        history={snapshot.history}
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
      />
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
    </div>
  )
}
