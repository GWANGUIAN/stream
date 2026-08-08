'use client'

import { createScheduleFlush, type Platform } from '@stream/core'
import { createEventBus, type EventBus } from '@stream/events'
import { SentenceEngine, type SentenceSnapshot } from '@stream/sentence'
import type { ChatSseClientEvent } from '@stream/sse/client'

const STORAGE_KEY = 'stream-sentence:snapshot:v1'
const CHANNEL_NAME = 'stream-sentence:v1'

export interface ConnectionState {
  platform: Platform
  streamerId: string
}

export interface SentenceStoreSnapshot extends SentenceSnapshot {
  platform: Platform
  streamerId: string
}

interface PersistedState {
  sentence?: Partial<SentenceSnapshot>
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

/** Overlay does not render contributors — strip them from BroadcastChannel payloads. */
function toOverlaySnapshot(snapshot: SentenceStoreSnapshot): SentenceStoreSnapshot {
  return {
    ...snapshot,
    sections: snapshot.sections.map((section) => ({
      ...section,
      entries: section.entries.map((entry) => ({
        ...entry,
        contributors: [],
      })),
    })),
  }
}

/**
 * 조작 페이지가 소유하는 엔진 하나를 감싸, React가 구독할 수 있는 스냅샷 스토어로 노출합니다.
 */
export class SentenceStore {
  readonly engine: SentenceEngine
  private readonly bus: EventBus
  private readonly channel: BroadcastChannel | null
  private connection: ConnectionState = { platform: 'soop', streamerId: '' }
  private snapshot: SentenceStoreSnapshot
  private readonly listeners = new Set<() => void>()
  private readonly scheduleFlush: () => void

  constructor() {
    this.engine = new SentenceEngine()
    const persisted = loadPersisted()
    if (persisted?.sentence) this.engine.loadSnapshot(persisted.sentence)
    if (persisted?.connection) this.connection = persisted.connection

    this.bus = createEventBus()
    this.engine.attachEventBus(this.bus)

    this.channel =
      typeof window !== 'undefined' && 'BroadcastChannel' in window
        ? new BroadcastChannel(CHANNEL_NAME)
        : null

    this.snapshot = { ...this.engine.getSnapshot(), ...this.connection }
    this.scheduleFlush = createScheduleFlush(() => this.flush())
    this.engine.onChange((sentenceSnapshot) => {
      this.snapshot = { ...sentenceSnapshot, ...this.connection }
      this.scheduleFlush()
    })
  }

  getSnapshot = (): SentenceStoreSnapshot => this.snapshot

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  setSource(platform: Platform, streamerId: string): void {
    this.connection = { platform, streamerId: streamerId.trim() }
    this.snapshot = { ...this.snapshot, ...this.connection }
    this.scheduleFlush()
  }

  ingest(event: ChatSseClientEvent): void {
    if (event.type === 'hello') return
    this.bus.emit(event)
  }

  private flush(): void {
    persist({ sentence: this.snapshot, connection: this.connection })
    this.channel?.postMessage(toOverlaySnapshot(this.snapshot))
    for (const listener of this.listeners) listener()
  }
}

let storeSingleton: SentenceStore | undefined

export function getSentenceStore(): SentenceStore {
  storeSingleton ??= new SentenceStore()
  return storeSingleton
}

export class OverlayMirror {
  private snapshot: SentenceStoreSnapshot | null = null
  private channel: BroadcastChannel | null = null
  private readonly listeners = new Set<() => void>()

  constructor() {
    if (typeof window === 'undefined') return

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as PersistedState
        if (parsed.sentence && parsed.connection) {
          this.snapshot = {
            ...(parsed.sentence as SentenceSnapshot),
            ...parsed.connection,
          }
        }
      }
    } catch {
      // ignore
    }

    if ('BroadcastChannel' in window) {
      this.channel = new BroadcastChannel(CHANNEL_NAME)
      this.channel.onmessage = (message) => {
        this.snapshot = message.data as SentenceStoreSnapshot
        this.notify()
      }
    }
  }

  getSnapshot = (): SentenceStoreSnapshot | null => this.snapshot

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
