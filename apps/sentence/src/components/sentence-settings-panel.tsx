'use client'

import type { SectionId, SectionState, SentencePhase, SentenceSettings } from '@stream/sentence'
import type { SentenceStore } from '@/lib/store'

export interface SentenceSettingsPanelProps {
  store: SentenceStore
  settings: SentenceSettings
  durationSec: number
  phase: SentencePhase
  sections: SectionState[]
}

const DURATION_PRESETS = [30, 60, 90, 120, 180]

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

export function SentenceSettingsPanel({
  store,
  settings,
  durationSec,
  phase,
  sections,
}: SentenceSettingsPanelProps) {
  const collecting = phase === 'collecting'

  return (
    <section className="glass-panel">
      <h2 className="glass-panel-title">문장 옵션</h2>
      <p className="glass-panel-sub">타이머, 중복 투표, 가중치, 커맨드를 설정합니다.</p>

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
          <span className="toggle-row-title">섹션별 중복 투표</span>
          <span className="toggle-row-hint">
            켜면 한 사람이 같은 섹션에 여러 텍스트를 넣을 수 있어요. 끄면 최신 텍스트로 바뀝니다.
          </span>
        </div>
        <Toggle
          on={settings.allowMultiplePerSection}
          onChange={(v) => store.engine.setAllowMultiplePerSection(v)}
          disabled={collecting}
        />
      </div>

      <div className="toggle-row">
        <div className="toggle-row-text">
          <span className="toggle-row-title">횟수 가중 추첨</span>
          <span className="toggle-row-hint">같은 문구가 많을수록 더 잘 뽑힙니다.</span>
        </div>
        <Toggle on={settings.weightByCount} onChange={(v) => store.engine.setWeightByCount(v)} />
      </div>

      <div className="field" style={{ marginTop: '0.8rem' }}>
        <span className="field-label">텍스트 최대 길이</span>
        <input
          type="number"
          min={4}
          max={80}
          value={settings.maxTextLength}
          onChange={(e) => store.engine.setMaxTextLength(Math.max(4, Number(e.target.value) || 40))}
        />
      </div>

      <hr className="section-divider" />

      <div className="field">
        <span className="field-label">섹션 커맨드</span>
        {sections.map((section) => (
          <div key={section.id} className="field-row" style={{ marginBottom: '0.45rem' }}>
            <span className="field-hint" style={{ flex: '0 0 3.2rem' }}>
              {section.label}
            </span>
            <input
              value={section.prefix}
              disabled={collecting}
              onChange={(e) =>
                store.engine.setSectionPrefix(section.id as SectionId, e.target.value)
              }
            />
          </div>
        ))}
        <span className="field-hint">예: 채팅에 `!누가 왁굳형이`</span>
      </div>
    </section>
  )
}
