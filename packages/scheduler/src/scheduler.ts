import type { Platform } from '@stream/core'

export interface ScheduleItem {
  id: string
  title: string
  startsAt: number
  endsAt?: number
  platform?: Platform
  channelId?: string
  remindMinutesBefore?: number[]
  meta?: Record<string, unknown>
}

export interface WebhookJob {
  id: string
  url: string
  body: unknown
  createdAt: number
  attempts: number
  lastError?: string
}

export interface ScheduleStore {
  list(): Promise<ScheduleItem[]>
  save(item: ScheduleItem): Promise<void>
  delete(id: string): Promise<void>
}

export class MemoryScheduleStore implements ScheduleStore {
  private readonly items = new Map<string, ScheduleItem>()

  async list(): Promise<ScheduleItem[]> {
    return [...this.items.values()].sort((a, b) => a.startsAt - b.startsAt)
  }

  async save(item: ScheduleItem): Promise<void> {
    this.items.set(item.id, item)
  }

  async delete(id: string): Promise<void> {
    this.items.delete(id)
  }
}

export interface WebhookOutboxOptions {
  fetch?: typeof globalThis.fetch
  maxAttempts?: number
}

/** Discord 등 외부 알림용 webhook outbox. */
export class WebhookOutbox {
  private readonly jobs: WebhookJob[] = []
  private readonly fetchImpl: typeof globalThis.fetch
  private readonly maxAttempts: number

  constructor(options: WebhookOutboxOptions = {}) {
    this.fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis)
    this.maxAttempts = options.maxAttempts ?? 3
  }

  enqueue(url: string, body: unknown): WebhookJob {
    const job: WebhookJob = {
      id: `hook-${Date.now()}-${this.jobs.length}`,
      url,
      body,
      createdAt: Date.now(),
      attempts: 0,
    }
    this.jobs.push(job)
    return job
  }

  pending(): WebhookJob[] {
    return this.jobs.filter(
      (j) => j.attempts < this.maxAttempts && !j.lastError?.startsWith('done:'),
    )
  }

  async flush(): Promise<{ sent: number; failed: number }> {
    let sent = 0
    let failed = 0
    for (const job of [...this.jobs]) {
      if (job.attempts >= this.maxAttempts || job.lastError?.startsWith('done:')) continue
      job.attempts += 1
      try {
        const response = await this.fetchImpl(job.url, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(job.body),
        })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        job.lastError = `done:${response.status}`
        sent += 1
      } catch (error) {
        job.lastError = error instanceof Error ? error.message : 'send failed'
        failed += 1
      }
    }
    return { sent, failed }
  }
}

export interface BroadcastSchedulerOptions {
  store?: ScheduleStore
  outbox?: WebhookOutbox
  now?: () => number
}

/**
 * 방송 일정 + 리마인더.
 * 플랫폼 스케줄 API가 약하므로 자체 캘린더와 webhook outbox를 제공합니다.
 */
export class BroadcastScheduler {
  private readonly store: ScheduleStore
  private readonly outbox?: WebhookOutbox
  private readonly now: () => number
  private readonly fired = new Set<string>()

  constructor(options: BroadcastSchedulerOptions = {}) {
    this.store = options.store ?? new MemoryScheduleStore()
    this.outbox = options.outbox
    this.now = options.now ?? Date.now
  }

  upsert(item: ScheduleItem): Promise<void> {
    return this.store.save(item)
  }

  remove(id: string): Promise<void> {
    return this.store.delete(id)
  }

  list(): Promise<ScheduleItem[]> {
    return this.store.list()
  }

  /**
   * 리마인더 시점이 된 일정을 outbox에 넣습니다.
   * webhookUrl이 없으면 발화 키만 기록하고 아이템을 반환합니다.
   */
  async tick(webhookUrl?: string): Promise<ScheduleItem[]> {
    const now = this.now()
    const due: ScheduleItem[] = []
    for (const item of await this.store.list()) {
      const reminds = item.remindMinutesBefore ?? [60, 10]
      for (const minutes of reminds) {
        const remindAt = item.startsAt - minutes * 60_000
        const key = `${item.id}:${minutes}`
        if (this.fired.has(key)) continue
        if (now >= remindAt && now < item.startsAt) {
          this.fired.add(key)
          due.push(item)
          if (webhookUrl && this.outbox) {
            this.outbox.enqueue(webhookUrl, {
              content: `방송 알림: ${item.title} (${minutes}분 전)`,
              scheduleId: item.id,
              startsAt: item.startsAt,
            })
          }
        }
      }
    }
    return due
  }
}

export function createBroadcastScheduler(options?: BroadcastSchedulerOptions): BroadcastScheduler {
  return new BroadcastScheduler(options)
}
