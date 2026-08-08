'use client'

import type { PollPhase, PollSettings } from '@stream/poll'
import type { PollStore } from '@/lib/store'

export interface PollSettingsPanelProps {
  store: PollStore
  settings: PollSettings
  durationSec: number
  phase: PollPhase
}

const DURATION_PRESETS = [30, 60, 120, 180]

const TEMPLATES: Array<{ label: string; options: string[] }> = [
  { label: '찬성 · 반대', options: ['찬성', '반대'] },
  { label: 'A · B · C', options: ['A', 'B', 'C'] },
  { label: '1 ~ 4', options: ['1', '2', '3', '4'] },
  { label: 'OX', options: ['O', 'X'] },
]

function Toggle({
  on,
  onChange,
  disabled,
}: {
  on: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      className={`toggle-switch ${on ? 'on' : ''}`}
      onClick={() => !disabled && onChange(!on)}
      disabled={disabled}
      style={disabled ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
    >
      <span className="thumb" />
    </button>
  )
}

export function PollSettingsPanel({ store, settings, durationSec, phase }: PollSettingsPanelProps) {
  const idle = phase === 'idle'

  return (
    <section className="glass-panel">
      <h2 className="glass-panel-title">투표 옵션</h2>
      <p className="glass-panel-sub">타이머, 공개 방식, 중복 투표 여부를 설정합니다.</p>

      <div className="field">
        <span className="field-label">타이머</span>
        <div className="duration-presets">
          {DURATION_PRESETS.map((sec) => (
            <button
              key={sec}
              type="button"
              className={`pill ${durationSec === sec ? 'active' : ''}`}
              onClick={() => store.engine.setDurationSec(sec)}
            >
              {sec}초
            </button>
          ))}
          <button
            type="button"
            className={`pill ${durationSec === 0 ? 'active' : ''}`}
            onClick={() => store.engine.setDurationSec(0)}
          >
            무제한
          </button>
        </div>
        {durationSec > 0 && (
          <div className="field-row" style={{ marginTop: '0.5rem' }}>
            <input
              type="number"
              min={5}
              value={durationSec}
              onChange={(e) =>
                store.engine.setDurationSec(Math.max(5, Number(e.target.value) || 5))
              }
            />
            <span className="field-hint">초 (직접 입력)</span>
          </div>
        )}
      </div>

      <hr className="section-divider" />

      <div className="toggle-row">
        <div className="toggle-row-text">
          <span className="toggle-row-title">실시간 결과 공개</span>
          <span className="toggle-row-hint">
            켜면 투표 중에 표·퍼센트가 바로 보입니다. 끄면 결과 공개 전까지 숨깁니다.
          </span>
        </div>
        <Toggle
          on={settings.showLiveResults}
          onChange={(v) => store.engine.setShowLiveResults(v)}
        />
      </div>

      <div className="toggle-row">
        <div className="toggle-row-text">
          <span className="toggle-row-title">중복 투표 허용</span>
          <span className="toggle-row-hint">끄면 재투표 시 마지막 채팅으로 표가 바뀝니다.</span>
        </div>
        <Toggle
          on={settings.allowMultipleVotes}
          onChange={(v) => store.engine.setAllowMultipleVotes(v)}
          disabled={phase === 'running'}
        />
      </div>

      <hr className="section-divider" />

      <div className="field">
        <span className="field-label">채팅 명령어</span>
        <input
          value={settings.votePrefix}
          onChange={(e) => store.engine.setVotePrefix(e.target.value)}
          disabled={phase === 'running'}
          placeholder="!투표"
        />
        <span className="field-hint">
          시청자는 <code>{settings.votePrefix} 1</code> 처럼 번호로 투표합니다.
        </span>
      </div>

      <div className="field">
        <span className="field-label">빠른 항목 템플릿</span>
        <div className="template-row">
          {TEMPLATES.map((tpl) => (
            <button
              key={tpl.label}
              type="button"
              className="pill"
              disabled={!idle}
              onClick={() => store.engine.setOptionsFromLabels(tpl.options)}
            >
              {tpl.label}
            </button>
          ))}
        </div>
        {!idle && <span className="field-hint">템플릿은 대기 상태에서만 적용할 수 있어요.</span>}
      </div>
    </section>
  )
}
