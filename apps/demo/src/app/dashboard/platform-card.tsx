'use client'

import { ChzzkLoginButton, SoopLoginButton } from '@stream/ui'
import { useEffect, useState } from 'react'
import { logoutPlatform, refreshPlatform } from './actions'

export interface PlatformCardProps {
  platform: 'chzzk' | 'soop'
  label: string
  configured: boolean
  connected: boolean
  nickname?: string
  id?: string
  expiresAt?: number
  identityError?: string
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return '만료됨'
  const total = Math.floor(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) return `${h}시간 ${m}분 ${s}초`
  if (m > 0) return `${m}분 ${s}초`
  return `${s}초`
}

export function PlatformCard(props: PlatformCardProps) {
  const [now, setNow] = useState(() => Date.now())
  const [busy, setBusy] = useState<'refresh' | 'logout' | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!props.expiresAt) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [props.expiresAt])

  const remaining = props.expiresAt ? props.expiresAt - now : undefined

  async function onRefresh() {
    setBusy('refresh')
    setError(null)
    try {
      await refreshPlatform(props.platform)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '갱신 실패')
      setBusy(null)
    }
  }

  async function onLogout() {
    setBusy('logout')
    setError(null)
    try {
      await logoutPlatform(props.platform)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '해제 실패')
      setBusy(null)
    }
  }

  return (
    <article className="panel">
      <h2>{props.label}</h2>
      <p className="meta">
        {props.configured ? (
          <span className="badge ok">OAuth 설정됨</span>
        ) : (
          <span className="badge warn">OAuth 미설정</span>
        )}{' '}
        {props.connected ? (
          <span className="badge ok">연결됨</span>
        ) : (
          <span className="badge">미연결</span>
        )}
      </p>

      {props.connected ? (
        <dl className="kv">
          <div>
            <dt>닉네임</dt>
            <dd>{props.nickname ?? '—'}</dd>
          </div>
          <div>
            <dt>ID</dt>
            <dd>{props.id ?? '—'}</dd>
          </div>
          <div>
            <dt>만료까지</dt>
            <dd>{remaining === undefined ? '—' : formatRemaining(remaining)}</dd>
          </div>
          <div>
            <dt>expiresAt</dt>
            <dd>{props.expiresAt ? new Date(props.expiresAt).toLocaleString('ko-KR') : '—'}</dd>
          </div>
        </dl>
      ) : (
        <p className="meta">
          {props.configured
            ? '아직 로그인되지 않았습니다. 아래 버튼으로 OAuth 인가를 시작하세요.'
            : props.platform === 'soop'
              ? '파트너 키가 없어 OAuth 로그인을 쓸 수 없습니다. 채널 조회·채팅은 익명으로 /channel, /chat 에서 테스트하세요.'
              : '.env.local 에 CHZZK_CLIENT_ID / SECRET / REDIRECT_URI 를 채우세요.'}
        </p>
      )}

      {props.identityError ? <div className="alert">{props.identityError}</div> : null}
      {error ? <div className="alert">{error}</div> : null}

      <div className="actions">
        {props.configured ? (
          props.platform === 'chzzk' ? (
            <ChzzkLoginButton href="/api/auth/chzzk/login">
              {props.connected ? '다시 로그인' : '치지직으로 로그인'}
            </ChzzkLoginButton>
          ) : (
            <SoopLoginButton href="/api/auth/soop/login">
              {props.connected ? '다시 로그인' : 'SOOP으로 로그인'}
            </SoopLoginButton>
          )
        ) : null}
        <button
          type="button"
          className="btn"
          disabled={!props.connected || busy !== null}
          onClick={() => void onRefresh()}
        >
          {busy === 'refresh' ? '갱신 중…' : '토큰 갱신'}
        </button>
        <button
          type="button"
          className="btn btn-danger"
          disabled={!props.connected || busy !== null}
          onClick={() => void onLogout()}
        >
          {busy === 'logout' ? '해제 중…' : '연결 해제'}
        </button>
      </div>
    </article>
  )
}
