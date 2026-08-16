'use client'

import confetti from 'canvas-confetti'
import { History, Play, Plus, RotateCcw, Search, Sparkles, Square, Trophy, Users } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { chatSseUrl, subscribeChatSse } from '@stream/sse/client'
import { colorForNickname } from '@stream/ui'
import type { MenuAnswer, MenuResult, WakmenuPhase } from '@stream/wakmenu'
import { FOOD_CATALOG } from '@/lib/catalog'
import { getWakmenuStore } from '@/lib/store'

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '/wakmenu'
const SSE = process.env.NEXT_PUBLIC_CHAT_SSE_BASE || `${BASE}/api/chat`
const isStatic = process.env.NEXT_PUBLIC_STATIC_EXPORT === 'true'
const phaseText: Record<WakmenuPhase, string> = { idle: '정답 입력 대기', running: '채팅 접수 중', closed: '마감 · 공개 대기', revealed: '정답 공개 완료' }
const blank = (label: string): MenuAnswer => ({ id: `custom-${crypto.randomUUID()}`, label, aliases: [], imageUrl: '', license: '개발자 사진 등록 대기' })

function formatTime(ms: number) { const sec = Math.max(0, Math.floor(ms / 1000)); return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}` }

function FoodImage({ menu }: { menu: MenuAnswer }) {
  const [failed, setFailed] = useState(false)
  if (!menu.imageUrl || failed) return <div className="food-image fallback">🍚</div>
  return <img className="food-image" src={menu.imageUrl} alt={menu.label} onError={() => setFailed(true)} />
}

function ResultCard({ result, index, startedAt }: { result: MenuResult; index: number; startedAt: number | null }) {
  return <article className="result-card" style={{ animationDelay: `${index * 180}ms` }}>
    <div className="roulette-window"><div className="roulette-strip">🍜 · 🍕 · 🍗 · 🍱 · {result.menu.label}</div></div>
    <FoodImage menu={result.menu} />
    <div className="result-title"><span>오늘의 밥</span><h2>{result.menu.label}</h2><strong><Users size={17} /> {result.winners.length.toLocaleString('ko-KR')}명 정답!</strong></div>
    <ol className="fastest-list">{result.fastest.length ? result.fastest.map((winner, rank) => <li key={winner.viewerId}><b>{['🥇','🥈','🥉','4위','5위'][rank]}</b><span>{winner.nickname}</span><time>{startedAt ? `+${formatTime(winner.at - startedAt)}` : ''}</time></li>) : <li className="empty">아직 정답자가 없어요</li>}</ol>
    {result.winners.length > 5 && <details><summary>전체 정답자 {result.winners.length}명 보기</summary><p className="winner-names">{result.winners.map((winner) => winner.nickname).join(' · ')}</p></details>}
  </article>
}

export default function WakmenuPage() {
  const [store, setStore] = useState<ReturnType<typeof getWakmenuStore> | null>(null)
  const [query, setQuery] = useState(''); const [status, setStatus] = useState('연결 준비 중'); const [historyOpen, setHistoryOpen] = useState(false); const [tick, setTick] = useState(0)
  useEffect(() => setStore(getWakmenuStore()), [])
  const snapshot = useSyncExternalStore(store ? store.subscribe : () => () => {}, store ? store.getSnapshot : () => null, () => null)
  const selected = snapshot?.answers ?? []
  const results = snapshot?.results ?? []
  const suggestions = useMemo(() => { const term = query.trim().toLowerCase().replace(/\s/g, ''); if (!term) return []; return FOOD_CATALOG.filter((item) => !selected.some((chosen) => chosen.id === item.id) && [item.label, ...item.aliases].some((name) => name.toLowerCase().replace(/\s/g, '').includes(term))).slice(0, 7) }, [query, selected])
  const add = (menu: MenuAnswer) => { if (!store || selected.some((item) => item.id === menu.id)) return; store.engine.setAnswers([...selected, menu]); setQuery('') }
  const connect = useCallback(() => { if (!store) return; if (isStatic && !process.env.NEXT_PUBLIC_CHAT_SSE_BASE) { setStatus('채팅 프록시 URL이 없습니다'); return } setStatus('방송 채팅 연결 중…'); const sub = subscribeChatSse({ url: chatSseUrl(SSE, 'soop', 'ecvhao', { types: ['message', 'status'], prefixes: ['!밥'] }), onOpen: () => setStatus('프록시 연결됨 · 방송 채팅 확인 중'), onEvent: (event) => { if (event.type === 'message') { store.engine.handleMessage(event); setStatus('방송 중 · !밥 채팅 연동됨') } else if (event.type === 'status' && event.status === 'error') setStatus('방송 미시작 또는 채팅 연동 실패') }, onError: () => setStatus('방송 미시작 또는 채팅 연동 실패') }); return () => sub.close() }, [store])
  useEffect(() => { const close = connect(); return close }, [connect])
  useEffect(() => { if (snapshot?.phase !== 'running') return; const id = window.setInterval(() => { store?.engine.getRemainingMs(); setTick((value) => value + 1) }, 250); return () => clearInterval(id) }, [snapshot?.phase, store])
  useEffect(() => { if (snapshot?.phase === 'revealed') confetti({ particleCount: 130, spread: 75, origin: { y: 0.62 }, colors: ['#ff7a66', '#b9e743', '#ffd65a'] }) }, [snapshot?.phase])
  useEffect(() => { const key = (event: KeyboardEvent) => { if (!store || (event.target as HTMLElement)?.tagName === 'INPUT') return; if (event.code === 'Space') { event.preventDefault(); snapshot?.phase === 'idle' ? store.engine.start() : snapshot?.phase === 'running' ? store.engine.close() : snapshot?.phase === 'closed' ? store.engine.reveal() : store.engine.reset() } if (event.key.toLowerCase() === 'h') setHistoryOpen(true) }; window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key) }, [store, snapshot?.phase])
  if (!store || !snapshot) return <main className="loading">밥상 차리는 중…</main>
  const remaining = snapshot.phase === 'running' && snapshot.endsAt ? Math.max(0, snapshot.endsAt - Date.now()) : null
  return <main className="page-shell"><header><div><p className="eyebrow">WAKGOOD’S LUNCH GAME</p><h1>우왁굳의 <em>밥</em>을 맞춰라!</h1><p className="subtitle">시청자는 <code>!밥 메뉴명</code>으로 정답을 외쳐주세요.</p></div><img className="wakdu" src={`${BASE}/wakdu.gif`} alt="밥 먹는 우왁굳" /></header>
    <section className="status-row"><span className={`status-dot ${status.includes('연동됨') ? 'online' : ''}`} /> SOOP · ecvhao · {status}<span className="message-count">유효 응답 {snapshot.acceptedMessages.toLocaleString()}개</span></section>
    <section className="game-board"><div className="phase-line"><span className={`phase ${snapshot.phase}`}>{phaseText[snapshot.phase]}</span>{remaining != null && <strong className="timer">{formatTime(remaining)}</strong>}</div>
      {snapshot.phase === 'idle' && <><div className="masked-stage"><span>?</span><p>우왁굳이 오늘 먹는 밥은 뭘까요?</p><small>정답은 시작 후에도 안전하게 가려집니다.</small></div><div className="menu-picker"><label><Search size={16}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="정답 메뉴를 검색해서 추가" /></label>{suggestions.length > 0 && <div className="suggestions">{suggestions.map((menu) => <button type="button" key={menu.id} onClick={() => add(menu)}><span>{menu.label}</span><small>{menu.aliases.join(' · ')}</small></button>)}</div>}{query.trim() && !suggestions.length && <button className="custom-add" type="button" onClick={() => add(blank(query.trim()))}><Plus size={15}/> “{query.trim()}” 임시 추가 <small>사진은 개발자가 수동 등록 예정</small></button>}</div><div className="selected-menu">{selected.length ? selected.map((menu) => <button type="button" key={menu.id} onClick={() => store.engine.setAnswers(selected.filter((item) => item.id !== menu.id))}>{menu.label} ×</button>) : <p>먼저 정답 메뉴를 하나 이상 선택하세요.</p>}</div><div className="settings"><label>타이머 <input type="number" min="5" value={snapshot.durationSec} onChange={(event) => store.engine.setDurationSec(Number(event.target.value))}/> 초</label><label className="check"><input type="checkbox" checked={snapshot.allowMultipleAnswers} onChange={(event) => store.engine.setAllowMultipleAnswers(event.target.checked)}/> 중복 맞추기 허용</label></div><button className="primary" disabled={!selected.length} type="button" onClick={() => store.engine.start()}><Play size={18}/> {snapshot.durationSec}초 시작</button></>}
      {snapshot.phase === 'running' && <div className="live-stage"><Trophy size={55}/><h2>정답 접수 중!</h2><p>정답은 아직 비밀이에요. <code>!밥 메뉴명</code></p><div className="submission-feed" aria-live="polite">{snapshot.feed.length ? snapshot.feed.map((entry) => <p className="submission-line" key={entry.id}><b style={{ color: colorForNickname(entry.nickname) }}>{entry.nickname}</b><span>님이 </span><strong>{entry.menuLabel}</strong><span>를 제출했습니다</span></p>) : <p className="submission-empty">첫 정답 채팅을 기다리고 있어요…</p>}</div><button className="danger" type="button" onClick={() => store.engine.close()}><Square size={16}/> 지금 마감</button></div>}
      {snapshot.phase === 'closed' && <div className="live-stage"><img className="small-wakdu" src={`${BASE}/wakdu.gif`} alt=""/><h2>쩝쩝… 정답을 공개할까요?</h2><p>마감되었습니다. 룰렛이 메뉴마다 멈춥니다.</p><button className="primary" type="button" onClick={() => store.engine.reveal()}><Sparkles size={17}/> 정답 공개</button></div>}
      {snapshot.phase === 'revealed' && <div className="results">{results.map((result, index) => <ResultCard key={result.menu.id} result={result} index={index} startedAt={snapshot.startedAt}/>) }<button className="secondary" type="button" onClick={() => store.engine.reset()}><RotateCcw size={16}/> 새 게임</button></div>}
    </section>
    <button className="history-button" type="button" onClick={() => setHistoryOpen(true)}><History size={16}/> 히스토리 ({snapshot.history.length})</button>
    {historyOpen && <aside className="history"><button type="button" onClick={() => setHistoryOpen(false)}>닫기 ×</button><h2>지난 밥 맞추기</h2>{[...snapshot.history].reverse().map((entry) => <article key={entry.id}><time>{new Date(entry.endedAt).toLocaleString('ko-KR')}</time>{entry.results.map((result) => <div key={result.menu.id}><b>{result.menu.label}</b> · {result.winners.length}명 <small>TOP 5: {result.fastest.map((winner) => winner.nickname).join(', ') || '없음'}</small></div>)}</article>)}{!snapshot.history.length && <p>아직 공개된 게임이 없어요.</p>}<button className="clear" type="button" onClick={() => store.engine.clearHistory()}>히스토리 비우기</button></aside>}
  </main>
}
