'use client'

import type { Platform } from '@stream/core'
import { termsFor } from '@stream/roulette'
import { ChzzkMark, SoopMark } from '@stream/ui/brand'
import { useState } from 'react'
import { useChatConnection } from '@/lib/hooks'
import type { RouletteStore } from '@/lib/store'

export interface SourcePanelProps {
  store: RouletteStore
  platform: Platform
  streamerId: string
}

export function SourcePanel({ store, platform, streamerId }: SourcePanelProps) {
  const [localPlatform, setLocalPlatform] = useState<Platform>(platform)
  const [localId, setLocalId] = useState(streamerId)
  const { status, message, connect, disconnect } = useChatConnection((event) => store.ingest(event))
  const terms = termsFor(localPlatform)

  function handlePlatformSelect(next: Platform) {
    setLocalPlatform(next)
    // 실제 연결 전이라도 플랫폼 관련 문구(단위/라벨 등)가 앱 전체에 바로 반영되도록 합니다.
    store.engine.setSource(next, localId)
  }

  function handleConnect() {
    store.engine.setSource(localPlatform, localId)
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
        SOOP(숲) 또는 치지직 채팅에 연결하면 도네이션이 자동으로 원판 아이템으로 등록됩니다.
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
        <span className="field-label">{terms.streamerLabel}</span>
        <input
          value={localId}
          placeholder={terms.idPlaceholder}
          onChange={(e) => setLocalId(e.target.value)}
        />
      </div>

      <div className="field-row">
        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={handleConnect}
          disabled={status === 'connecting'}
        >
          연결
        </button>
        <button type="button" className="btn btn-ghost" onClick={disconnect}>
          해제
        </button>
      </div>

      <div className="badge">
        <span className={`badge-dot ${dotClass}`} />
        {message || '연결 대기 중'}
      </div>

      <p className="term-hint">
        이 플랫폼은 <b>{terms.currency}</b> {terms.unit} 단위로 후원을 표시합니다.
      </p>
    </section>
  )
}
