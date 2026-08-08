import { describe, expect, it } from 'vitest'
import { GoalTracker } from './tracker'

describe('GoalTracker', () => {
  it('후원 목표 진행률을 계산합니다', () => {
    const tracker = new GoalTracker({
      goals: [
        {
          id: 'cheese',
          label: '치즈 목표',
          metric: 'donation',
          target: 1000,
          reset: 'manual',
        },
      ],
    })

    tracker.add('donation', 250)
    const [state] = tracker.getStates()
    expect(state?.current).toBe(250)
    expect(state?.progress).toBe(0.25)
    expect(state?.reached).toBe(false)

    tracker.add('donation', 800)
    expect(tracker.getStates()[0]?.reached).toBe(true)
  })
})
