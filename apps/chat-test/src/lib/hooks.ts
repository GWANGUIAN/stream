'use client'

import type { Platform } from '@stream/core'
import { type ChatSseClientEvent, chatSseUrl, subscribeChatSse } from '@stream/sse/client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { withBasePath } from './base-path'

const CHAT_SSE_BASE = process.env.NEXT_PUBLIC_CHAT_SSE_BASE
const IS_STATIC_EXPORT = process.env.NEXT_PUBLIC_STATIC_EXPORT === 'true'

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error'

export interface ChatConnection {
  status: ConnectionStatus
  message: string
  sseBase: string
  connect: (platform: Platform, streamerId: string) => void
  disconnect: () => void
}

export function useChatConnection(onEvent: (event: ChatSseClientEvent) => void): ChatConnection {
  const [status, setStatus] = useState<ConnectionStatus>('idle')
  const [message, setMessage] = useState('')
  const subRef = useRef<ReturnType<typeof subscribeChatSse> | null>(null)
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  const sseBase = CHAT_SSE_BASE ?? withBasePath('/api/chat')

  const connect = useCallback(
    (platform: Platform, streamerId: string) => {
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

      setStatus('connecting')
      setMessage('연결 중…')

      subRef.current = subscribeChatSse({
        url: chatSseUrl(sseBase, platform, id),
        onOpen: () => {
          setStatus('connected')
          setMessage('연결됨')
        },
        onEvent: (event) => {
          if (event.type === 'hello') {
            setStatus('connected')
            setMessage(`${event.platform === 'soop' ? 'SOOP' : '치지직'} · ${event.channelId} 연결됨`)
          }
          if (event.type === 'status') {
            if (event.status === 'connected') setStatus('connected')
            if (event.status === 'reconnecting') setStatus('connecting')
            if (event.status === 'disconnected' || event.status === 'error') {
              setStatus('error')
              setMessage(String(event.text ?? event.status))
            }
          }
          onEventRef.current(event)
        },
        onError: () => {
          setStatus('error')
          setMessage('연결이 끊어졌습니다. 다시 시도해 주세요.')
        },
      })
    },
    [sseBase],
  )

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

  return { status, message, sseBase, connect, disconnect }
}
