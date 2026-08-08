import { describe, expect, it } from 'vitest'
import { pickWeightedIndex, type SectionId, SentenceEngine } from './sentence'

function chat(
  nickname: string,
  text: string,
  at = 1,
): Parameters<SentenceEngine['handleChatMessage']>[0] {
  return {
    type: 'message',
    platform: 'soop',
    user: { platform: 'soop', id: nickname, nickname, role: 'viewer', badges: [] },
    text,
    emojis: {},
    at,
  }
}

function makeEngine(now = { value: 0 }, random = () => 0) {
  return new SentenceEngine({
    now: () => now.value,
    random,
  })
}

describe('SentenceEngine', () => {
  it('collecting이 아니면 채팅을 무시합니다', () => {
    const engine = makeEngine()
    expect(engine.handleChatMessage(chat('a', '!누가 사슴이'))).toBe(false)
  })

  it('!누가 텍스트 형식을 파싱해 섹션에 넣습니다', () => {
    const engine = makeEngine()
    engine.start(60)
    expect(engine.handleChatMessage(chat('철수', '!누가 사슴이'))).toBe(true)
    const who = engine.getSnapshot().sections.find((s) => s.id === 'who')
    expect(who?.entries).toHaveLength(1)
    expect(who?.entries[0]?.text).toBe('사슴이')
    expect(who?.entries[0]?.count).toBe(1)
  })

  it('동일 텍스트는 합쳐 count가 증가합니다', () => {
    const engine = makeEngine()
    engine.start(60)
    engine.handleChatMessage(chat('a', '!누가 사슴이'))
    engine.handleChatMessage(chat('b', '!누가 사슴이'))
    const who = engine.getSnapshot().sections.find((s) => s.id === 'who')
    expect(who?.entries).toHaveLength(1)
    expect(who?.entries[0]?.count).toBe(2)
  })

  it('기본값: 섹션별 중복 투표를 허용합니다', () => {
    const engine = makeEngine()
    engine.start(60)
    engine.handleChatMessage(chat('철수', '!누가 사슴이'))
    engine.handleChatMessage(chat('철수', '!누가 토끼가'))
    const who = engine.getSnapshot().sections.find((s) => s.id === 'who')
    expect(who?.entries).toHaveLength(2)
    expect(engine.getSnapshot().totalEntries).toBe(2)
  })

  it('중복 투표 비허용이면 같은 섹션에서 최신 텍스트로 교체합니다', () => {
    const engine = makeEngine()
    engine.setAllowMultiplePerSection(false)
    engine.start(60)
    engine.handleChatMessage(chat('철수', '!누가 사슴이'))
    engine.handleChatMessage(chat('철수', '!누가 토끼가'))
    const who = engine.getSnapshot().sections.find((s) => s.id === 'who')
    expect(who?.entries).toHaveLength(1)
    expect(who?.entries[0]?.text).toBe('토끼가')
    expect(who?.entries[0]?.count).toBe(1)
  })

  it('비활성 섹션 커맨드는 무시합니다', () => {
    const engine = makeEngine()
    engine.setSectionEnabled('who', false)
    engine.start(60)
    expect(engine.handleChatMessage(chat('a', '!누가 사슴이'))).toBe(false)
    expect(engine.handleChatMessage(chat('a', '!어디서 숲에서'))).toBe(true)
  })

  it('타이머가 만료되면 closed가 됩니다', () => {
    const now = { value: 0 }
    const engine = makeEngine(now)
    engine.start(10)
    now.value = 11_000
    expect(engine.getRemainingMs()).toBeNull()
    expect(engine.getSnapshot().phase).toBe('closed')
  })

  it('spinAll은 활성 섹션마다 텍스트를 고르고 문장을 만듭니다', () => {
    const engine = makeEngine({ value: 0 }, () => 0)
    engine.start(60)
    engine.handleChatMessage(chat('a', '!누가 사슴이'))
    engine.handleChatMessage(chat('a', '!어디서 숲에서'))
    engine.handleChatMessage(chat('a', '!어떻게 몰래'))
    engine.handleChatMessage(chat('a', '!무엇을 도토리를'))
    engine.handleChatMessage(chat('a', '!왜 배고파서'))
    engine.close()
    expect(engine.spinAll()).toBe(true)

    const snapshot = engine.getSnapshot()
    expect(snapshot.phase).toBe('revealed')
    expect(snapshot.result?.sentence).toBe('사슴이 숲에서 몰래 도토리를 배고파서')
    expect(snapshot.history).toHaveLength(1)
  })

  it('비활성 섹션은 문장에 포함되지 않습니다', () => {
    const engine = makeEngine({ value: 0 }, () => 0)
    for (const id of ['where', 'how', 'what', 'why'] as SectionId[]) {
      engine.setSectionEnabled(id, false)
    }
    engine.start(60)
    engine.handleChatMessage(chat('a', '!누가 사슴이'))
    engine.close()
    engine.spinAll()
    expect(engine.getSnapshot().result?.sentence).toBe('사슴이')
  })

  it('reset은 후보/결과만 지우고 설정은 유지합니다', () => {
    const engine = makeEngine()
    engine.setSectionEnabled('why', false)
    engine.start(60)
    engine.handleChatMessage(chat('a', '!누가 사슴이'))
    engine.reset()
    const snapshot = engine.getSnapshot()
    expect(snapshot.phase).toBe('idle')
    expect(snapshot.totalEntries).toBe(0)
    expect(snapshot.sections.find((s) => s.id === 'why')?.enabled).toBe(false)
  })

  it('접두사를 바꾸면 새 접두사로만 인식합니다', () => {
    const engine = makeEngine()
    engine.setSectionPrefix('who', '!who')
    engine.start(60)
    expect(engine.handleChatMessage(chat('a', '!누가 사슴이'))).toBe(false)
    expect(engine.handleChatMessage(chat('a', '!who 사슴이'))).toBe(true)
  })
})

describe('pickWeightedIndex', () => {
  it('가중치로 인덱스를 고릅니다', () => {
    expect(pickWeightedIndex([0, 10], () => 0.5)).toBe(1)
    expect(pickWeightedIndex([10, 0], () => 0.1)).toBe(0)
  })
})
