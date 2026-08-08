'use client'

import type { DonationRule, RegisterMode, WeightMode, WinnerAction } from '@stream/roulette'
import type { RouletteStore } from '@/lib/store'

export interface RulePanelProps {
  store: RouletteStore
  rule: DonationRule
  weightMode: WeightMode
  winnerAction: WinnerAction
}

const MODE_LABELS: Record<RegisterMode, string> = {
  multiple: '단위 배수만큼',
  exact: '정확히 일치할 때만',
  atLeast: '단위 이상이면 1개',
}

export function RulePanel({ store, rule, weightMode, winnerAction }: RulePanelProps) {
  return (
    <section className="glass-panel">
      <h2 className="glass-panel-title">등록 규칙</h2>
      <p className="glass-panel-sub">도네이션 금액을 아이템 개수로 바꾸는 규칙을 설정합니다.</p>

      <div className="field">
        <span className="field-label">등록 방식</span>
        <div className="pill-group">
          {(Object.keys(MODE_LABELS) as RegisterMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              className={`pill ${rule.mode === mode ? 'active' : ''}`}
              onClick={() => store.engine.setRule({ mode })}
            >
              {MODE_LABELS[mode]}
            </button>
          ))}
        </div>
        <span className="field-hint">
          예: 단위 10, 배수 모드에서 100을 받으면 같은 아이템이 10개 등록됩니다.
        </span>
      </div>

      <div className="field-row">
        <div className="field">
          <span className="field-label">단위 금액</span>
          <input
            type="number"
            min={1}
            value={rule.unitAmount}
            onChange={(e) =>
              store.engine.setRule({ unitAmount: Math.max(1, Number(e.target.value) || 1) })
            }
          />
        </div>
        <div className="field">
          <span className="field-label">1회 최대 등록 개수</span>
          <input
            type="number"
            min={1}
            value={rule.maxPerDonation ?? ''}
            placeholder="무제한"
            onChange={(e) => {
              const value = e.target.value.trim()
              store.engine.setRule({
                maxPerDonation: value ? Math.max(1, Number(value)) : undefined,
              })
            }}
          />
        </div>
      </div>

      <div className="field">
        <span className="field-label">메시지 없는 후원 처리</span>
        <select
          value={rule.emptyText}
          onChange={(e) =>
            store.engine.setRule({ emptyText: e.target.value as DonationRule['emptyText'] })
          }
        >
          <option value="nickname">닉네임을 아이템 이름으로 사용</option>
          <option value="ignore">등록하지 않음</option>
        </select>
      </div>

      <div className="field-row">
        <div className="field">
          <span className="field-label">아이템 이름 최대 길이</span>
          <input
            type="number"
            min={1}
            value={rule.maxLabelLength}
            onChange={(e) =>
              store.engine.setRule({ maxLabelLength: Math.max(1, Number(e.target.value) || 1) })
            }
          />
        </div>
        <div className="field">
          <span className="field-label">동일 아이템 병합</span>
          <label className="checkbox-row" style={{ marginTop: '0.35rem' }}>
            <input
              type="checkbox"
              checked={rule.normalize}
              onChange={(e) => store.engine.setRule({ normalize: e.target.checked })}
            />
            대소문자/공백 무시하고 합치기
          </label>
        </div>
      </div>

      <div className="field">
        <span className="field-label">금지어(줄바꿈 구분)</span>
        <textarea
          rows={2}
          defaultValue={rule.bannedWords.join('\n')}
          onBlur={(e) =>
            store.engine.setRule({
              bannedWords: e.target.value
                .split('\n')
                .map((w) => w.trim())
                .filter(Boolean),
            })
          }
        />
      </div>

      <div className="field">
        <span className="field-label">차단할 유저(닉네임/아이디, 줄바꿈 구분)</span>
        <textarea
          rows={2}
          defaultValue={rule.blockedUsers.join('\n')}
          onBlur={(e) =>
            store.engine.setRule({
              blockedUsers: e.target.value
                .split('\n')
                .map((w) => w.trim())
                .filter(Boolean),
            })
          }
        />
      </div>

      <hr className="section-divider" />

      <div className="field">
        <span className="field-label">원판 칸 크기</span>
        <div className="pill-group">
          <button
            type="button"
            className={`pill ${weightMode === 'proportional' ? 'active' : ''}`}
            onClick={() => store.engine.setWeightMode('proportional')}
          >
            개수 비례
          </button>
          <button
            type="button"
            className={`pill ${weightMode === 'even' ? 'active' : ''}`}
            onClick={() => store.engine.setWeightMode('even')}
          >
            균등 분할
          </button>
        </div>
      </div>

      <div className="field">
        <span className="field-label">당첨 후 처리</span>
        <select
          value={winnerAction}
          onChange={(e) => store.engine.setWinnerAction(e.target.value as WinnerAction)}
        >
          <option value="keep">그대로 유지</option>
          <option value="decrement">당첨 아이템 1개 차감</option>
          <option value="remove">당첨 아이템 통째로 제거</option>
        </select>
      </div>
    </section>
  )
}
