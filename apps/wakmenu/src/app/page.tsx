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
const ROULETTE_LABELS = ['라면', '치킨', '김밥', '초밥', '피자', '국밥', '떡볶이', '쌀국수', '카레']

function formatTime(ms: number) { const sec = Math.max(0, Math.floor(ms / 1000)); return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}` }

function FoodImage({ menu }: { menu: MenuAnswer }) {
  const [failed, setFailed] = useState(false)
  if (!menu.imageUrl || failed) return <div className="food-image fallback">🍚</div>
  return <img className="food-image" src={menu.imageUrl} alt={menu.label} onError={() => setFailed(true)} />
}

function ResultCard({ result, index, startedAt, mode }: { result: MenuResult; index: number; startedAt: number | null; mode: 'spinning' | 'stopped' | 'revealed' }) {
  if (mode === 'spinning') return <article className="result-card roulette-card"><div className="roulette-window roulette-running"><div className="roulette-strip">{[...Array(6)].flatMap(() => [...ROULETTE_LABELS, result.menu.label]).map((label, row) => <span key={`${label}-${row}`}>{label}</span>)}</div></div><p>오늘의 밥을 고르는 중…</p></article>
  if (mode === 'stopped') return <article className="result-card roulette-card roulette-stopped"><div className="roulette-window"><strong>{result.menu.label}</strong></div><p>정답은… <b>{result.menu.label}</b>!</p></article>
  return <article className="result-card result-revealed" style={{ animationDelay: `${index * 180}ms` }}>
    <FoodImage menu={result.menu} />
    <div className="result-title"><span>오늘의 밥</span><h2>{result.menu.label}</h2><strong><Users size={17} /> {result.winners.length.toLocaleString('ko-KR')}명 정답!</strong></div>
    <ol className="fastest-list">{result.fastest.length ? result.fastest.map((winner, rank) => <li key={winner.viewerId}><b>{['🥇','🥈','🥉','4위','5위'][rank]}</b><span>{winner.nickname}</span><time>{startedAt ? `+${formatTime(winner.at - startedAt)}` : ''}</time></li>) : <li className="empty">아직 정답자가 없어요</li>}</ol>
    {result.winners.length > 5 && <details><summary>전체 정답자 {result.winners.length}명 보기</summary><p className="winner-names">{result.winners.map((winner) => winner.nickname).join(' · ')}</p></details>}
  </article>
}

export default function WakmenuPage() {
  const [store, setStore] = useState<ReturnType<typeof getWakmenuStore> | null>(null)
  const [query, setQuery] = useState(''); const [status, setStatus] = useState('SOOP 연결 중'); const [historyOpen, setHistoryOpen] = useState(false); const [tick, setTick] = useState(0); const [stoppedCount, setStoppedCount] = useState(0); const [revealedCount, setRevealedCount] = useState(0); const [answerStepDone, setAnswerStepDone] = useState(false); const [activeSuggestion, setActiveSuggestion] = useState(0)
  useEffect(() => setStore(getWakmenuStore()), [])
  const snapshot = useSyncExternalStore(store ? store.subscribe : () => () => {}, store ? store.getSnapshot : () => null, () => null)
  const selected = snapshot?.answers ?? []
  const results = snapshot?.results ?? []
  const suggestions = useMemo(() => { const term = query.trim().toLowerCase().replace(/\s/g, ''); if (!term) return []; return FOOD_CATALOG.filter((item) => !selected.some((chosen) => chosen.id === item.id) && [item.label, ...item.aliases].some((name) => name.toLowerCase().replace(/\s/g, '').includes(term))).slice(0, 7) }, [query, selected])
  useEffect(() => setActiveSuggestion(0), [query])
  const add = (menu: MenuAnswer) => { if (!store || selected.some((item) => item.id === menu.id)) return; store.engine.setAnswers([...selected, menu]); setQuery('') }
  const connect = useCallback(() => { if (!store) return; if (isStatic && !process.env.NEXT_PUBLIC_CHAT_SSE_BASE) { setStatus('SOOP 연동 불가'); return } setStatus('SOOP 연결 중'); const sub = subscribeChatSse({ url: chatSseUrl(SSE, 'soop', 'ecvhao', { types: ['message', 'status'], prefixes: ['!밥'] }), onOpen: () => setStatus('SOOP 연동됨'), onEvent: (event) => { if (event.type === 'message') { store.engine.handleMessage(event); setStatus('SOOP 연동됨') } else if (event.type === 'status' && event.status === 'error') setStatus('SOOP 연동 실패') }, onError: () => setStatus('SOOP 연동 실패') }); return () => sub.close() }, [store])
  useEffect(() => { const close = connect(); return close }, [connect])
  useEffect(() => { if (snapshot?.phase !== 'running') return; const id = window.setInterval(() => { store?.engine.getRemainingMs(); setTick((value) => value + 1) }, 250); return () => clearInterval(id) }, [snapshot?.phase, store])
  useEffect(() => { if (snapshot?.phase !== 'revealed') { setStoppedCount(0); setRevealedCount(0); return } const timers = results.flatMap((_, index) => [window.setTimeout(() => setStoppedCount(index + 1), 2_800 + index * 850), window.setTimeout(() => { setRevealedCount(index + 1); confetti({ particleCount: index === 0 ? 130 : 50, spread: 75, origin: { y: 0.62 }, colors: ['#ff7a66', '#b9e743', '#ffd65a'] }) }, 3_650 + index * 850)]); return () => timers.forEach(window.clearTimeout) }, [snapshot?.phase, results.length])
  useEffect(() => { const key = (event: KeyboardEvent) => { if (!store || (event.target as HTMLElement)?.tagName === 'INPUT') return; if (event.code === 'Space') { event.preventDefault(); snapshot?.phase === 'idle' ? store.engine.start() : snapshot?.phase === 'running' ? store.engine.close() : snapshot?.phase === 'closed' ? store.engine.reveal() : store.engine.reset() } if (event.key.toLowerCase() === 'h') setHistoryOpen(true) }; window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key) }, [store, snapshot?.phase])
  if (!store || !snapshot) return <main className="loading">밥상 차리는 중…</main>
  const remaining = snapshot.phase === 'running' && snapshot.endsAt ? Math.max(0, snapshot.endsAt - Date.now()) : null
  return <main className="page-shell"><header><div><p className="eyebrow">WAKGOOD’S LUNCH GAME</p><h1>우왁굳의 <em>밥</em>을 맞춰라!</h1><p className="subtitle">시청자는 <code>!밥 메뉴명</code>으로 정답을 외쳐주세요.</p></div><div className="wakdu-frame"><img className="wakdu" src={`${BASE}/wakdu.gif`} alt="밥 먹는 우왁굳" /></div></header>
    <section className="status-row"><span className={`status-dot ${status.includes('연동됨') ? 'online' : status.includes('실패') || status.includes('불가') ? 'error' : 'connecting'}`} /> {status}<span className="message-count">유효 응답 {snapshot.acceptedMessages.toLocaleString()}개</span></section>
    <section className="game-board"><div className="phase-line"><span className={`phase ${snapshot.phase}`}>{phaseText[snapshot.phase]}</span><span className="phase-actions">{remaining != null && <strong className="timer">{formatTime(remaining)}</strong>}{snapshot.phase === 'revealed' && <button className="new-game" type="button" onClick={() => store.engine.reset()}><RotateCcw size={14}/> 새 게임</button>}</span></div>
      {snapshot.phase === 'idle' && <>{!answerStepDone ? <><div className="masked-stage"><span>?</span><p>방송 화면을 가리고<br/>정답 메뉴를 선택하세요!</p><small>정답을 모두 고른 뒤 입력 완료를 눌러주세요.</small></div><div className="menu-picker"><label><Search size={16}/><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (!suggestions.length) return; if (event.key === 'ArrowDown') { event.preventDefault(); setActiveSuggestion((index) => (index + 1) % suggestions.length) } else if (event.key === 'ArrowUp') { event.preventDefault(); setActiveSuggestion((index) => (index - 1 + suggestions.length) % suggestions.length) } else if (event.key === 'Enter') { event.preventDefault(); const menu = suggestions[activeSuggestion] ?? suggestions[0]; if (menu) add(menu) } }} placeholder="정답 메뉴를 검색해서 추가" /></label>{suggestions.length > 0 && <div className="suggestions">{suggestions.map((menu, index) => <button type="button" className={index === activeSuggestion ? 'active' : ''} key={menu.id} onMouseEnter={() => setActiveSuggestion(index)} onClick={() => add(menu)}><span>{menu.label}</span><small>{menu.aliases.join(' · ')}</small></button>)}</div>}{query.trim() && !suggestions.length && <button className="custom-add" type="button" onClick={() => add(blank(query.trim()))}><Plus size={15}/> “{query.trim()}” 임시 추가 <small>사진은 개발자가 수동 등록 예정</small></button>}</div><div className="selected-menu">{selected.length ? selected.map((menu) => <button type="button" key={menu.id} onClick={() => store.engine.setAnswers(selected.filter((item) => item.id !== menu.id))}>{menu.label} ×</button>) : <p>먼저 정답 메뉴를 하나 이상 선택하세요.</p>}</div><button className="primary" disabled={!selected.length} type="button" onClick={() => setAnswerStepDone(true)}><Play size={18}/> 정답 입력 완료</button></> : <div className="start-step"><p className="ready-answer">정답 메뉴 {selected.length}개 입력 완료</p><div className="settings"><label>타이머 <input type="number" min="5" value={snapshot.durationSec} onChange={(event) => store.engine.setDurationSec(Number(event.target.value))}/> 초</label><label className="check"><input type="checkbox" checked={snapshot.allowMultipleAnswers} onChange={(event) => store.engine.setAllowMultipleAnswers(event.target.checked)}/> 중복 맞추기 허용</label></div><div className="start-step-actions"><button className="secondary" type="button" onClick={() => setAnswerStepDone(false)}>정답 수정</button><button className="primary" type="button" onClick={() => { store.engine.start(); setAnswerStepDone(false) }}><Play size={18}/> {snapshot.durationSec}초 시작</button></div></div>}</>}
      {snapshot.phase === 'running' && <div className="live-stage"><Trophy size={55}/><h2>정답 접수 중!</h2><p>정답은 아직 비밀이에요. <code>!밥 메뉴명</code></p><div className="submission-feed" aria-live="polite">{snapshot.feed.length ? snapshot.feed.map((entry) => <p className="submission-line" key={entry.id}><b style={{ color: colorForNickname(entry.nickname) }}>{entry.nickname}</b><span>님이 </span><strong>{entry.menuLabel}</strong><span>를 제출했습니다</span></p>) : <p className="submission-empty">첫 정답 채팅을 기다리고 있어요…</p>}</div><button className="danger" type="button" onClick={() => store.engine.close()}><Square size={16}/> 지금 마감</button></div>}
      {snapshot.phase === 'closed' && <div className="live-stage"><img className="small-wakdu" src={`${BASE}/wakdu.gif`} alt=""/><h2>쩝쩝… 정답을 공개할까요?</h2><button className="primary" type="button" onClick={() => store.engine.reveal()}><Sparkles size={17}/> 정답 공개</button></div>}
      {snapshot.phase === 'revealed' && <div className="results">{results.map((result, index) => <ResultCard key={result.menu.id} result={result} index={index} startedAt={snapshot.startedAt} mode={index < revealedCount ? 'revealed' : index < stoppedCount ? 'stopped' : 'spinning'}/>)}</div>}
    </section>
    <button className="history-button" type="button" onClick={() => setHistoryOpen(true)}><History size={16}/> 히스토리 ({snapshot.history.length})</button>
    {historyOpen && <aside className="history"><button type="button" onClick={() => setHistoryOpen(false)}>닫기 ×</button><h2>지난 밥 맞추기</h2>{[...snapshot.history].reverse().map((entry) => <article key={entry.id}><time>{new Date(entry.endedAt).toLocaleString('ko-KR')}</time>{entry.results.map((result) => <div key={result.menu.id}><b>{result.menu.label}</b> · {result.winners.length}명 <small>TOP 5: {result.fastest.map((winner) => winner.nickname).join(', ') || '없음'}</small></div>)}</article>)}{!snapshot.history.length && <p>아직 공개된 게임이 없어요.</p>}<button className="clear" type="button" onClick={() => store.engine.clearHistory()}>히스토리 비우기</button></aside>}
  </main>
}
