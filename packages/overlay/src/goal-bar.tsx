import type { GoalState, GoalTracker } from '@stream/goals'
import { useEffect, useState } from 'react'

export function GoalBar({
  tracker,
  goalId,
  className,
}: {
  tracker: GoalTracker
  goalId?: string
  className?: string
}) {
  const [states, setStates] = useState<GoalState[]>(() => tracker.getStates())

  useEffect(() => tracker.onChange(setStates), [tracker])

  const state = goalId ? states.find((s) => s.id === goalId) : states[0]
  if (!state) return null

  const pct = Math.round(state.progress * 100)

  return (
    <div className={['stream-goal-bar', className].filter(Boolean).join(' ')}>
      <div className="stream-goal-label">
        <span>{state.label}</span>
        <span>
          {state.current} / {state.target}
        </span>
      </div>
      <div className="stream-goal-track">
        <div className="stream-goal-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
