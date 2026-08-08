'use client'

import type { Platform } from '@stream/core'
import { type ChatSseClientEvent, chatSseUrl, subscribeChatSse } from '@stream/sse/client'
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { withBasePath } from './base-path'
import {
  getOverlayMirror,
  getSentenceStore,
  type SentenceStore,
  type SentenceStoreSnapshot,
} from './store'

function noopSubscribe(): () => void {
  return () => {}
}

export function useSentenceStore(): {
  store: SentenceStore | null
  snapshot: SentenceStoreSnapshot | null
} {
  const [store, setStore] = useState<SentenceStore | null>(null)

  useEffect(() => {
    setStore(getSentenceStore())
  }, [])

  const subscribe = useCallback(
    (onStoreChange: () => void) => (store ? store.subscribe(onStoreChange) : noopSubscribe()),
    [store],
  )
  const getSnapshot = useCallback(() => (store ? store.getSnapshot() : null), [store])
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => null)

  return { store, snapshot }
}

export function useOverlaySnapshot(): SentenceStoreSnapshot | null {
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
      setMessage(
        '채팅 프록시 URL이 없습니다. NEXT_PUBLIC_CHAT_SSE_BASE를 설정하거나 리허설·수동 등록을 이용하세요.',
      )
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
