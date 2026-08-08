'use client'

import type { Platform } from '@stream/core'
import { ChzzkMark, SoopMark } from '@stream/ui/brand'
import { useState } from 'react'
import { useChatConnection } from '@/lib/hooks'
import type { PollStore } from '@/lib/store'

const PLACEHOLDER: Record<Platform, { label: string; hint: string }> = {
  soop: { label: 'BJ 아이디', hint: '예: gameng' },
  chzzk: { label: '채널 ID', hint: '예: 32자리 채널 코드' },
}

export interface SourcePanelProps {
  store: PollStore
  platform: Platform
  streamerId: string
}

export function SourcePanel({ store, platform, streamerId }: SourcePanelProps) {
  const [localPlatform, setLocalPlatform] = useState<Platform>(platform)
  const [localId, setLocalId] = useState(streamerId)
  const { status, message, connect, disconnect } = useChatConnection((event) => store.ingest(event))
  const info = PLACEHOLDER[localPlatform]

  function handlePlatformSelect(next: Platform) {
    setLocalPlatform(next)
    store.setSource(next, localId)
  }

  function handleConnect() {
    store.setSource(localPlatform, localId)
    connect(localPlatform, localId)
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
    <section className="glass-panel">
      <h2 className="glass-panel-title">방송 연결</h2>
      <p className="glass-panel-sub">
        SOOP(숲) 또는 치지직 채팅에 연결하면 !투표 채팅을 자동으로 집계합니다.
      </p>

      <div className="field">
        <span className="field-label">플랫폼</span>
        <div className="pill-group">
          <button
            type="button"
            className={`pill pill-mark soop ${localPlatform === 'soop' ? 'active' : ''}`}
            onClick={() => handlePlatformSelect('soop')}
            aria-label="SOOP"
          >
            <span className="brand-mark-chip">
              <SoopMark className="brand-mark brand-mark-soop" />
            </span>
          </button>
          <button
            type="button"
            className={`pill pill-mark chzzk ${localPlatform === 'chzzk' ? 'active' : ''}`}
            onClick={() => handlePlatformSelect('chzzk')}
            aria-label="치지직"
          >
            <span className="brand-mark-chip">
              <ChzzkMark className="brand-mark brand-mark-chzzk" />
            </span>
          </button>
        </div>
      </div>

      <div className="field">
        <span className="field-label">{info.label}</span>
        <input
          value={localId}
          placeholder={info.hint}
          onChange={(e) => setLocalId(e.target.value)}
        />
      </div>

      <div className="field-row">
        {status === 'connected' ? (
          <button type="button" className="btn btn-sm btn-danger btn-block" onClick={disconnect}>
            연결 끊기
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-sm btn-secondary btn-block"
            onClick={handleConnect}
            disabled={status === 'connecting'}
          >
            {status === 'connecting' ? '연결 중…' : '연결'}
          </button>
        )}
      </div>

      {message && (
        <p className="field-hint" style={{ marginTop: '0.5rem' }}>
          <span className={`badge-dot ${dotClass}`} style={{ marginRight: '0.35rem' }} />
          {message}
        </p>
      )}
    </section>
  )
}
