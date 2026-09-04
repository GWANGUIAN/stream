'use client'

import { createScheduleFlush, getLastConnection } from '@stream/core'
import { createEventBus, type EventBus } from '@stream/events'
import { RouletteEngine, type RouletteSnapshot } from '@stream/roulette'
import type { ChatSseClientEvent } from '@stream/sse/client'

const STORAGE_KEY = 'stream-roulette:snapshot:v1'
const CHANNEL_NAME = 'stream-roulette:v1'

function loadPersisted(): Partial<RouletteSnapshot> | undefined {
  if (typeof window === 'undefined') return undefined
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Partial<RouletteSnapshot>) : undefined
  } catch {
    return undefined
  }
}

function persist(snapshot: RouletteSnapshot): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
  } catch {
    // 저장 공간 부족 등은 조용히 무시합니다.
  }
}

/**
 * 조작 페이지가 소유하는 엔진 하나를 감싸, React가 구독할 수 있는 스냅샷 스토어로 노출합니다.
 * 스냅샷 변경은 rAF로 합쳐 localStorage·BroadcastChannel·React에 알립니다.
 */
export class RouletteStore {
  readonly engine: RouletteEngine
  private readonly bus: EventBus
  private readonly channel: BroadcastChannel | null
  private snapshot: RouletteSnapshot
  private readonly listeners = new Set<() => void>()
  private readonly scheduleFlush: () => void

  constructor() {
    this.engine = new RouletteEngine()
    const persisted = loadPersisted()
    if (persisted) this.engine.loadSnapshot(persisted)
    if (!persisted?.streamerId) {
      // 이 앱에서 연동한 적이 없으면 다른 방송 도구에서 마지막으로 연동한 채널을 이어받습니다.
      const last = getLastConnection()
      if (last) this.engine.setSource(last.platform, last.streamerId)
    }

    this.bus = createEventBus()
    this.engine.attachEventBus(this.bus)

    this.channel =
      typeof window !== 'undefined' && 'BroadcastChannel' in window
        ? new BroadcastChannel(CHANNEL_NAME)
        : null

    this.snapshot = this.engine.getSnapshot()
    this.scheduleFlush = createScheduleFlush(() => this.flush())
    this.engine.onChange((next) => {
      this.snapshot = next
      this.scheduleFlush()
    })
  }

  getSnapshot = (): RouletteSnapshot => this.snapshot

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /** 채팅 SSE에서 받은 이벤트를 엔진에 흘려보냅니다(후원만 실제로 반영됩니다). */
  ingest(event: ChatSseClientEvent): void {
    if (event.type === 'hello') return
    this.bus.emit(event)
  }

  private flush(): void {
    persist(this.snapshot)
    this.channel?.postMessage(this.snapshot)
    for (const listener of this.listeners) listener()
  }
}

let storeSingleton: RouletteStore | undefined

/** 브라우저에서만 호출하세요. SSR 중에는 window가 없어 store를 만들 수 없습니다. */
export function getRouletteStore(): RouletteStore {
  storeSingleton ??= new RouletteStore()
  return storeSingleton
}

/** 오버레이 탭에서 스냅샷을 읽기 전용으로 구독합니다(엔진을 소유하지 않음). */
export class OverlayMirror {
  private snapshot: RouletteSnapshot | null = null
  private channel: BroadcastChannel | null = null
  private readonly listeners = new Set<() => void>()

  constructor() {
    if (typeof window === 'undefined') return

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) this.snapshot = JSON.parse(raw) as RouletteSnapshot
    } catch {
      // ignore
    }

    if ('BroadcastChannel' in window) {
      this.channel = new BroadcastChannel(CHANNEL_NAME)
      this.channel.onmessage = (message) => {
        this.snapshot = message.data as RouletteSnapshot
        this.notify()
      }
    }
  }

  getSnapshot = (): RouletteSnapshot | null => this.snapshot

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private notify(): void {
    for (const listener of this.listeners) listener()
  }
}

let overlaySingleton: OverlayMirror | undefined

export function getOverlayMirror(): OverlayMirror {
  overlaySingleton ??= new OverlayMirror()
  return overlaySingleton
}
