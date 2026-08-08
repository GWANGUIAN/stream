'use client'

import type { Platform } from '@stream/core'
import { createEventBus, type EventBus } from '@stream/events'
import { PollEngine, type PollSnapshot } from '@stream/poll'
import type { ChatSseClientEvent } from '@stream/sse/client'

const STORAGE_KEY = 'stream-poll:snapshot:v1'
const CHANNEL_NAME = 'stream-poll:v1'

export interface ConnectionState {
  platform: Platform
  streamerId: string
}

export interface PollStoreSnapshot extends PollSnapshot {
  platform: Platform
  streamerId: string
}

interface PersistedState {
  poll?: Partial<PollSnapshot>
  connection?: ConnectionState
}

function loadPersisted(): PersistedState | undefined {
  if (typeof window === 'undefined') return undefined
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as PersistedState) : undefined
  } catch {
    return undefined
  }
}

function persist(state: PersistedState): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // 저장 공간 부족 등은 조용히 무시합니다.
  }
}

/**
 * 조작 페이지가 소유하는 엔진 하나를 감싸, React가 구독할 수 있는 스냅샷 스토어로 노출합니다.
 * 스냅샷이 바뀔 때마다 localStorage에 저장하고 BroadcastChannel로 오버레이 탭에 알립니다.
 */
export class PollStore {
  readonly engine: PollEngine
  private readonly bus: EventBus
  private readonly channel: BroadcastChannel | null
  private connection: ConnectionState = { platform: 'soop', streamerId: '' }
  private snapshot: PollStoreSnapshot
  private readonly listeners = new Set<() => void>()

  constructor() {
    this.engine = new PollEngine()
    const persisted = loadPersisted()
    if (persisted?.poll) this.engine.loadSnapshot(persisted.poll)
    if (persisted?.connection) this.connection = persisted.connection

    this.bus = createEventBus()
    this.engine.attachEventBus(this.bus)

    this.channel =
      typeof window !== 'undefined' && 'BroadcastChannel' in window
        ? new BroadcastChannel(CHANNEL_NAME)
        : null

    this.snapshot = { ...this.engine.getSnapshot(), ...this.connection }
    this.engine.onChange((pollSnapshot) => {
      this.snapshot = { ...pollSnapshot, ...this.connection }
      this.persistAndBroadcast()
    })
  }

  getSnapshot = (): PollStoreSnapshot => this.snapshot

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  setSource(platform: Platform, streamerId: string): void {
    this.connection = { platform, streamerId: streamerId.trim() }
    this.snapshot = { ...this.snapshot, ...this.connection }
    this.persistAndBroadcast()
  }

  /** 채팅 SSE에서 받은 이벤트를 엔진에 흘려보냅니다(채팅 메시지만 실제로 반영됩니다). */
  ingest(event: ChatSseClientEvent): void {
    if (event.type === 'hello') return
    this.bus.emit(event)
  }

  private persistAndBroadcast(): void {
    persist({ poll: this.snapshot, connection: this.connection })
    this.channel?.postMessage(this.snapshot)
    for (const listener of this.listeners) listener()
  }
}

let storeSingleton: PollStore | undefined

/** 브라우저에서만 호출하세요. SSR 중에는 window가 없어 store를 만들 수 없습니다. */
export function getPollStore(): PollStore {
  storeSingleton ??= new PollStore()
  return storeSingleton
}

/** 오버레이 탭에서 스냅샷을 읽기 전용으로 구독합니다(엔진을 소유하지 않음). */
export class OverlayMirror {
  private snapshot: PollStoreSnapshot | null = null
  private channel: BroadcastChannel | null = null
  private readonly listeners = new Set<() => void>()

  constructor() {
    if (typeof window === 'undefined') return

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as PersistedState
        if (parsed.poll && parsed.connection) {
          this.snapshot = { ...(parsed.poll as PollSnapshot), ...parsed.connection }
        }
      }
    } catch {
      // ignore
    }

    if ('BroadcastChannel' in window) {
      this.channel = new BroadcastChannel(CHANNEL_NAME)
      this.channel.onmessage = (message) => {
        this.snapshot = message.data as PollStoreSnapshot
        this.notify()
      }
    }
  }

  getSnapshot = (): PollStoreSnapshot | null => this.snapshot

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
