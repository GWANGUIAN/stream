'use client'

import { useState } from 'react'

type Platform = 'chzzk' | 'soop'

interface StreamerInfo {
  platform: Platform
  id: string
  name: string
  profileImageUrl?: string
  followerCount?: number
  description?: string
  url: string
}

interface LiveState {
  platform?: Platform
  channelId?: string
  live?: boolean
  title?: string
  category?: string
  viewerCount?: number
  chatChannelId?: string
  error?: string
}

export function ChannelLookup() {
  const [platform, setPlatform] = useState<Platform>('chzzk')
  const [channelId, setChannelId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [streamer, setStreamer] = useState<StreamerInfo | null>(null)
  const [live, setLive] = useState<LiveState | null>(null)

  async function lookup() {
    const id = channelId.trim()
    if (!id) {
      setError('채널 ID를 입력하세요')
      return
    }
    setBusy(true)
    setError(null)
    setStreamer(null)
    setLive(null)
    try {
      const res = await fetch(`/api/channel/${platform}?id=${encodeURIComponent(id)}`)
      const data = (await res.json()) as {
        error?: string
        streamer?: StreamerInfo
        live?: LiveState
      }
      if (!res.ok) throw new Error(data.error ?? '조회 실패')
      setStreamer(data.streamer ?? null)
      setLive(data.live ?? null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '조회 실패')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="panel">
      <h2>채널 조회</h2>
      <p className="meta">
        `@stream/api`의 `getStreamer` + `getLive`. OAuth 로그인 없이 익명으로 동작합니다.
      </p>

      <div className="form-row">
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value as Platform)}
          disabled={busy}
        >
          <option value="chzzk">치지직</option>
          <option value="soop">SOOP</option>
        </select>
        <input
          value={channelId}
          onChange={(e) => setChannelId(e.target.value)}
          placeholder={platform === 'chzzk' ? '채널 ID (해시)' : '스트리머 ID (로그인 아이디)'}
          disabled={busy}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void lookup()
          }}
        />
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy}
          onClick={() => void lookup()}
        >
          {busy ? '조회 중…' : '조회'}
        </button>
      </div>

      {error ? <div className="alert">{error}</div> : null}

      {streamer ? (
        <div className="grid" style={{ marginTop: '1rem' }}>
          <article className="panel">
            <h2>스트리머</h2>
            <dl className="kv">
              <div>
                <dt>이름</dt>
                <dd>{streamer.name}</dd>
              </div>
              <div>
                <dt>ID</dt>
                <dd>{streamer.id}</dd>
              </div>
              <div>
                <dt>팔로워</dt>
                <dd>{streamer.followerCount ?? '—'}</dd>
              </div>
              <div>
                <dt>URL</dt>
                <dd>
                  <a href={streamer.url} target="_blank" rel="noreferrer">
                    {streamer.url}
                  </a>
                </dd>
              </div>
            </dl>
            {streamer.description ? <p className="meta">{streamer.description}</p> : null}
          </article>

          <article className="panel">
            <h2>라이브</h2>
            {live?.error ? (
              <div className="alert">{live.error}</div>
            ) : (
              <dl className="kv">
                <div>
                  <dt>상태</dt>
                  <dd>
                    {live?.live ? (
                      <span className="badge ok">방송 중</span>
                    ) : (
                      <span className="badge">오프라인</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt>제목</dt>
                  <dd>{live?.title ?? '—'}</dd>
                </div>
                <div>
                  <dt>카테고리</dt>
                  <dd>{live?.category ?? '—'}</dd>
                </div>
                <div>
                  <dt>시청자</dt>
                  <dd>{live?.viewerCount ?? '—'}</dd>
                </div>
                {live?.chatChannelId ? (
                  <div>
                    <dt>chatChannelId</dt>
                    <dd>{live.chatChannelId}</dd>
                  </div>
                ) : null}
              </dl>
            )}
            {live?.live ? (
              <div className="actions">
                <a
                  className="btn"
                  href={`/chat?platform=${platform}&channelId=${encodeURIComponent(streamer.id)}`}
                >
                  이 채널 채팅 보기
                </a>
              </div>
            ) : null}
          </article>
        </div>
      ) : null}
    </section>
  )
}
