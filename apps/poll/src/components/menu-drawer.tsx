'use client'

import { Check, History, Link2, X } from 'lucide-react'
import { useState } from 'react'
import { withBasePath } from '@/lib/base-path'
import type { ChatConnection } from '@/lib/hooks'
import type { PollStore, PollStoreSnapshot } from '@/lib/store'
import { PollSettingsPanel } from './poll-settings-panel'
import { RafflePanel } from './raffle-panel'
import { RehearsalPanel } from './rehearsal-panel'
import { SourcePanel } from './source-panel'

export interface MenuDrawerProps {
  store: PollStore
  snapshot: PollStoreSnapshot
  connection: ChatConnection
  open: boolean
  onClose: () => void
  onOpenHistory: () => void
}

export function MenuDrawer({
  store,
  snapshot,
  connection,
  open,
  onClose,
  onOpenHistory,
}: MenuDrawerProps) {
  const [copied, setCopied] = useState(false)

  function copyOverlayUrl() {
    const url = `${window.location.origin}${withBasePath('/overlay/')}`
    void navigator.clipboard.writeText(url)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <>
      <button
        type="button"
        aria-label="메뉴 닫기"
        className={`menu-scrim ${open ? 'open' : ''}`}
        onClick={onClose}
      />
      <aside className={`menu-drawer scroll-thin ${open ? 'open' : ''}`}>
        <div className="console-header" style={{ marginBottom: '0.8rem' }}>
          <h2 className="glass-panel-title" style={{ margin: 0 }}>
            설정 & 메뉴
          </h2>
          <button type="button" className="btn btn-icon btn-ghost" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="field-row" style={{ marginBottom: '1.1rem' }}>
          <button type="button" className="btn btn-sm btn-secondary" onClick={copyOverlayUrl}>
            {copied ? <Check size={14} /> : <Link2 size={14} />}
            {copied ? '복사됨!' : '오버레이 URL 복사'}
          </button>
          <button type="button" className="btn btn-sm" onClick={onOpenHistory}>
            <History size={14} /> 히스토리
          </button>
        </div>

        <div className="menu-drawer-sections">
          <SourcePanel
            store={store}
            platform={snapshot.platform}
            streamerId={snapshot.streamerId}
            connection={connection}
          />
          <PollSettingsPanel
            store={store}
            settings={snapshot.settings}
            durationSec={snapshot.durationSec}
            phase={snapshot.phase}
          />
          <RehearsalPanel store={store} options={snapshot.options} phase={snapshot.phase} />
          <RafflePanel snapshot={snapshot} />
        </div>
      </aside>
    </>
  )
}
