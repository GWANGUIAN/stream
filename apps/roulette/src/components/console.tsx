'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouletteStore } from '@/lib/hooks'
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

  const handleSpin = useCallback(() => {
    store?.engine.spin()
  }, [store])

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

      <div className="console-body">
        <div className="console-stage">
          <div className="wheel-stage">
            <Wheel
              items={snapshot.items}
              weightMode={snapshot.weightMode}
              lastResult={snapshot.lastResult}
              onSpin={handleSpin}
              canSpin={snapshot.items.length > 0}
              maxWidth={760}
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
