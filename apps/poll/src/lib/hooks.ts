'use client'

import { type Platform, setLastConnection } from '@stream/core'
import {
  type ChatSseClientEvent,
  type ChatSseUrlOptions,
  chatSseUrl,
  subscribeChatSse,
} from '@stream/sse/client'
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { withBasePath } from './base-path'
import { getOverlayMirror, getPollStore, type PollStore, type PollStoreSnapshot } from './store'

function noopSubscribe(): () => void {
  return () => {}
}

function filterKey(filter?: ChatSseUrlOptions): string {
  const types = filter?.types?.slice().sort().join(',') ?? ''
  const prefixes = filter?.prefixes?.map((p) => p.trim()).filter(Boolean).sort().join('\0') ?? ''
  return `${types}|${prefixes}`
}

/** 조작 페이지에서 엔진을 소유한 스토어를 구독합니다. 서버 렌더링 중에는 null입니다. */
export function usePollStore(): {
  store: PollStore | null
  snapshot: PollStoreSnapshot | null
} {
  const [store, setStore] = useState<PollStore | null>(null)

  useEffect(() => {
    setStore(getPollStore())
  }, [])

  const subscribe = useCallback(
    (onStoreChange: () => void) => (store ? store.subscribe(onStoreChange) : noopSubscribe()),
    [store],
  )
  const getSnapshot = useCallback(() => (store ? store.getSnapshot() : null), [store])
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => null)

  return { store, snapshot }
}

/** 오버레이 페이지에서 스냅샷만 읽습니다(엔진 없음). */
export function useOverlaySnapshot(): PollStoreSnapshot | null {
  const [mirror, setMirror] = useState<ReturnType<typeof getOverlayMirror> | null>(null)

  useEffect(() => {
    setMirror(getOverlayMirror())
  }, [])

  const subscribe = useCallback(
    (onStoreChange: () => void) => (mirror ? mirror.subscribe(onStoreChange) : noopSubscribe()),
    [mirror],
  )
  const getSnapshot = useCallback(() => (mirror ? mirror.getSnapshot() : null), [mirror])
  return useSyncExternalStore(subscribe, getSnapshot, () => null)
}

// 정적 export에는 앱 API 라우트가 없습니다. CI는 NEXT_PUBLIC_CHAT_SSE_BASE로
// chat.streamcontent.click 프록시를 주입합니다. 없을 때만 연결을 막습니다.
const CHAT_SSE_BASE = process.env.NEXT_PUBLIC_CHAT_SSE_BASE
const IS_STATIC_EXPORT = process.env.NEXT_PUBLIC_STATIC_EXPORT === 'true'

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error'

export interface ChatConnection {
  status: ConnectionStatus
  message: string
  connect: (platform: Platform, streamerId: string) => void
  disconnect: () => void
}

/** SOOP/치지직 채팅 SSE 구독을 관리하고, 채팅 메시지를 콜백으로 넘깁니다. */
export function useChatConnection(
  onEvent: (event: ChatSseClientEvent) => void,
  filter?: ChatSseUrlOptions,
): ChatConnection {
  const [status, setStatus] = useState<ConnectionStatus>('idle')
  const [message, setMessage] = useState('')
  const subRef = useRef<ReturnType<typeof subscribeChatSse> | null>(null)
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent
  const filterRef = useRef(filter)
  filterRef.current = filter
  const activeRef = useRef<{ platform: Platform; streamerId: string } | null>(null)
  const statusRef = useRef(status)
  statusRef.current = status

  const connect = useCallback((platform: Platform, streamerId: string) => {
    subRef.current?.close()
    const id = streamerId.trim()
    if (!id) {
      setStatus('error')
      setMessage('스트리머 아이디를 입력하세요.')
      return
    }
    setLastConnection(platform, id)

    if (IS_STATIC_EXPORT && !CHAT_SSE_BASE) {
      setStatus('error')
      setMessage(
        '채팅 프록시 URL이 없습니다. NEXT_PUBLIC_CHAT_SSE_BASE를 설정하거나 리허설·수동 등록을 이용하세요.',
      )
      return
    }

    const base = CHAT_SSE_BASE ?? withBasePath('/api/chat')
    activeRef.current = { platform, streamerId: id }
    setStatus('connecting')
    setMessage('연결 중…')

    subRef.current = subscribeChatSse({
      url: chatSseUrl(base, platform, id, filterRef.current),
      onOpen: () => {
        setStatus('connected')
        setMessage('연결됨')
      },
      onEvent: (event) => onEventRef.current(event),
      onError: () => {
        setStatus('error')
        setMessage('연결이 끊어졌습니다. 다시 시도해 주세요.')
      },
    })
  }, [])

  const disconnect = useCallback(() => {
    subRef.current?.close()
    subRef.current = null
    activeRef.current = null
    setStatus('idle')
    setMessage('')
  }, [])

  const currentFilterKey = filterKey(filter)
  useEffect(() => {
    const active = activeRef.current
    if (!active) return
    if (statusRef.current !== 'connected' && statusRef.current !== 'connecting') return
    connect(active.platform, active.streamerId)
  }, [currentFilterKey, connect])

  useEffect(() => {
    return () => {
      subRef.current?.close()
    }
  }, [])

  return { status, message, connect, disconnect }
}
