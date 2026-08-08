'use client'

import type { Platform } from '@stream/core'
import { type ChatSseClientEvent, chatSseUrl, subscribeChatSse } from '@stream/sse/client'
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { withBasePath } from './base-path'
import { getOverlayMirror, getPollStore, type PollStore, type PollStoreSnapshot } from './store'

function noopSubscribe(): () => void {
  return () => {}
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

// 정적 export(GitHub Pages 등) 빌드에는 채팅 SSE 프록시(API 라우트)가 없습니다.
// Node 호스트가 따로 있으면 NEXT_PUBLIC_CHAT_SSE_BASE로 그 API를 가리키게 설정하세요.
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
export function useChatConnection(onEvent: (event: ChatSseClientEvent) => void): ChatConnection {
  const [status, setStatus] = useState<ConnectionStatus>('idle')
  const [message, setMessage] = useState('')
  const subRef = useRef<ReturnType<typeof subscribeChatSse> | null>(null)
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  const connect = useCallback((platform: Platform, streamerId: string) => {
    subRef.current?.close()
    const id = streamerId.trim()
    if (!id) {
      setStatus('error')
      setMessage('스트리머 아이디를 입력하세요.')
      return
    }

    if (IS_STATIC_EXPORT && !CHAT_SSE_BASE) {
      setStatus('error')
      setMessage('정적 배포에서는 NEXT_PUBLIC_CHAT_SSE_BASE로 채팅 서버를 지정해야 합니다.')
      return
    }

    const base = CHAT_SSE_BASE ?? withBasePath('/api/chat')
    setStatus('connecting')
    setMessage('연결 중…')

    subRef.current = subscribeChatSse({
      url: chatSseUrl(base, platform, id),
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
    setStatus('idle')
    setMessage('')
  }, [])

  useEffect(() => {
    return () => {
      subRef.current?.close()
    }
  }, [])

  return { status, message, connect, disconnect }
}
