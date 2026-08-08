import type { EventBus } from '@stream/events'

export type GoalMetric = 'donation' | 'subscription' | 'message'

export type GoalResetPolicy = 'manual' | 'session' | 'daily'

export interface GoalDefinition {
  id: string
  label: string
  metric: GoalMetric
  target: number
  reset: GoalResetPolicy
}

export interface GoalState {
  id: string
  label: string
  metric: GoalMetric
  current: number
  target: number
  progress: number
  reached: boolean
}

export type GoalListener = (states: GoalState[]) => void

export interface GoalTrackerOptions {
  goals: GoalDefinition[]
  now?: () => number
}

/**
 * 후원/구독/메시지 목표 트래커.
 * session/daily/manual 리셋 정책을 지원합니다.
 */
export class GoalTracker {
  private readonly defs: GoalDefinition[]
  private readonly current = new Map<string, number>()
  private readonly listeners = new Set<GoalListener>()
  private readonly now: () => number
  private dayKey: string
  private detach: (() => void) | undefined

  constructor(options: GoalTrackerOptions) {
    this.defs = options.goals
    this.now = options.now ?? Date.now
    this.dayKey = this.todayKey()
    for (const goal of this.defs) {
      this.current.set(goal.id, 0)
    }
  }

  attachEventBus(bus: EventBus): () => void {
    this.detach?.()
    this.detach = bus.subscribe((event) => {
      this.maybeDailyReset()
      if (event.type === 'donation') this.add('donation', event.amount)
      else if (event.type === 'subscription') this.add('subscription', 1)
      else if (event.type === 'message') this.add('message', 1)
      else if (event.type === 'live' && !event.live.live) {
        this.resetByPolicy('session')
      }
    })
    return () => {
      this.detach?.()
      this.detach = undefined
    }
  }

  add(metric: GoalMetric, amount: number): void {
    for (const goal of this.defs) {
      if (goal.metric !== metric) continue
      const next = (this.current.get(goal.id) ?? 0) + amount
      this.current.set(goal.id, next)
    }
    this.notify()
  }

  reset(id?: string): void {
    if (id) {
      this.current.set(id, 0)
    } else {
      for (const goal of this.defs) this.current.set(goal.id, 0)
    }
    this.notify()
  }

  resetByPolicy(policy: GoalResetPolicy): void {
    for (const goal of this.defs) {
      if (goal.reset === policy) this.current.set(goal.id, 0)
    }
    this.notify()
  }

  getStates(): GoalState[] {
    return this.defs.map((goal) => {
      const current = this.current.get(goal.id) ?? 0
      const progress = goal.target > 0 ? Math.min(1, current / goal.target) : 0
      return {
        id: goal.id,
        label: goal.label,
        metric: goal.metric,
        current,
        target: goal.target,
        progress,
        reached: current >= goal.target,
      }
    })
  }

  onChange(listener: GoalListener): () => void {
    this.listeners.add(listener)
    listener(this.getStates())
    return () => {
      this.listeners.delete(listener)
    }
  }

  dispose(): void {
    this.detach?.()
    this.listeners.clear()
  }

  private maybeDailyReset(): void {
    const key = this.todayKey()
    if (key !== this.dayKey) {
      this.dayKey = key
      this.resetByPolicy('daily')
    }
  }

  private todayKey(): string {
    return new Date(this.now()).toISOString().slice(0, 10)
  }

  private notify(): void {
    const states = this.getStates()
    for (const listener of this.listeners) {
      try {
        listener(states)
      } catch {
        // ignore
      }
    }
  }
}

export function createGoalTracker(options: GoalTrackerOptions): GoalTracker {
  return new GoalTracker(options)
}
