'use client'

import type { Platform } from '@stream/core'
import type { RouletteSnapshot } from '@stream/roulette'
import { type ChatSseClientEvent, chatSseUrl, subscribeChatSse } from '@stream/sse/client'
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { getOverlayMirror, getRouletteStore, type RouletteStore } from './store'

function noopSubscribe(): () => void {
  return () => {}
}

/** 조작 페이지에서 엔진을 소유한 스토어를 구독합니다. 서버 렌더링 중에는 null입니다. */
export function useRouletteStore(): {
  store: RouletteStore | null
  snapshot: RouletteSnapshot | null
} {
  const [store, setStore] = useState<RouletteStore | null>(null)

  useEffect(() => {
    setStore(getRouletteStore())
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
export function useOverlaySnapshot(): RouletteSnapshot | null {
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

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error'

export interface ChatConnection {
  status: ConnectionStatus
  message: string
  connect: (platform: Platform, streamerId: string) => void
  disconnect: () => void
}

/** SOOP/치지직 채팅 SSE 구독을 관리하고, 도네이션 이벤트를 콜백으로 넘깁니다. */
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

    setStatus('connecting')
    setMessage('연결 중…')

    subRef.current = subscribeChatSse({
      url: chatSseUrl('/api/chat', platform, id),
      onEvent: (event) => {
        if (event.type === 'hello') {
          setStatus('connected')
          setMessage(`${event.platform === 'soop' ? 'SOOP' : '치지직'} · ${event.channelId} 연결됨`)
          return
        }
        if (event.type === 'status') {
          if (event.status === 'connected') setStatus('connected')
          if (event.status === 'reconnecting') setStatus('connecting')
          if (event.status === 'disconnected' || event.status === 'error') setStatus('error')
          setMessage(String(event.text ?? event.status))
          return
        }
        onEventRef.current(event)
      },
      onError: () => {
        setStatus('error')
        setMessage('SSE 연결 오류')
      },
    })
  }, [])

  const disconnect = useCallback(() => {
    subRef.current?.close()
    subRef.current = null
    setStatus('idle')
    setMessage('연결 종료')
  }, [])

  useEffect(() => {
    return () => subRef.current?.close()
  }, [])

  return { status, message, connect, disconnect }
}
