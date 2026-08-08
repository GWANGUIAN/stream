/**
 * SOOP 실방송 채팅·도네 스모크.
 * Usage: pnpm exec tsx scripts/smoke-live.mts [channelId...] [--seconds=90]
 */
import { createChatClient } from '../src/create.ts'
import type { ChatEvent } from '../src/types.ts'
import type { DecodedPacket } from '../src/soop/packet.ts'

const DEFAULT_CHANNELS = ['phonics1', '243000']
const SAMPLE_LIMIT = 5

function parseArgs(argv: string[]) {
  let seconds = 90
  const channels: string[] = []
  for (const arg of argv) {
    if (arg.startsWith('--seconds=')) {
      seconds = Number(arg.slice('--seconds='.length))
      continue
    }
    if (!arg.startsWith('-')) channels.push(arg)
  }
  return {
    seconds: Number.isFinite(seconds) && seconds > 0 ? seconds : 90,
    channels: channels.length > 0 ? channels : DEFAULT_CHANNELS,
  }
}

function isDecodedPacket(raw: unknown): raw is DecodedPacket {
  return (
    typeof raw === 'object' &&
    raw !== null &&
    'svc' in raw &&
    'fields' in raw &&
    Array.isArray((raw as DecodedPacket).fields)
  )
}

function summarizeEvent(event: ChatEvent) {
  const raw = 'raw' in event ? event.raw : undefined
  const packet = isDecodedPacket(raw) ? raw : undefined
  const base = {
    type: event.type,
    svc: packet?.svc,
    fields: packet?.fields?.slice(0, 16),
  }
  if (event.type === 'message') {
    return {
      ...base,
      text: event.text,
      userId: event.user.id,
      nickname: event.user.nickname,
    }
  }
  if (event.type === 'donation') {
    return {
      ...base,
      amount: event.amount,
      currency: event.currency,
      text: event.text,
      nickname: event.user.nickname,
      userId: event.user.id,
    }
  }
  if (event.type === 'subscription') {
    return {
      ...base,
      months: event.months,
      nickname: event.user.nickname,
    }
  }
  if (event.type === 'system') {
    return { ...base, text: event.text }
  }
  return base
}

async function smokeChannel(channelId: string, seconds: number) {
  const counts: Record<string, number> = {
    status: 0,
    message: 0,
    donation: 0,
    subscription: 0,
    system: 0,
  }
  const samples: Record<string, unknown[]> = {
    message: [],
    donation: [],
    subscription: [],
    system: [],
    status: [],
  }
  const issues: string[] = []
  let connected = false
  let connectError: string | undefined

  const client = createChatClient({ platform: 'soop', channelId })
  client.on((event) => {
    counts[event.type] = (counts[event.type] ?? 0) + 1
    const bucket = samples[event.type]
    if (bucket && bucket.length < SAMPLE_LIMIT) {
      bucket.push(summarizeEvent(event))
    }

    if (event.type === 'status') {
      if (event.status === 'connected') connected = true
      if (event.status === 'error') connectError = event.text
      return
    }

    if (event.type === 'message') {
      if (!event.text.trim()) issues.push('message with empty text')
      if (!event.user.nickname.trim()) issues.push('message with empty nickname')
      // userId는 로그인 아이디(f[1]). 예전 버그는 f[2] 플래그 "0"을 id로 썼음.
      if (event.user.id === 'anonymous' || event.user.id === '0') {
        issues.push(`message bad userId: ${event.user.id}`)
      }
    }

    if (event.type === 'donation') {
      if (!(event.amount > 0)) issues.push(`donation amount not positive: ${event.amount}`)
      if (event.currency !== 'balloon') issues.push(`donation currency ${event.currency}`)
      if (!event.user.nickname.trim()) issues.push('donation with empty nickname')
    }
  })

  const started = Date.now()
  console.log(`\n=== ${channelId} (${seconds}s) ===`)
  try {
    await client.connect()
  } catch (error) {
    connectError = error instanceof Error ? error.message : String(error)
    console.error(`[${channelId}] connect failed:`, connectError)
    return {
      channelId,
      connected: false,
      connectError,
      elapsedMs: Date.now() - started,
      counts,
      samples,
      issues,
    }
  }

  await new Promise((resolve) => setTimeout(resolve, seconds * 1000))
  await client.disconnect()

  const result = {
    channelId,
    connected,
    connectError,
    elapsedMs: Date.now() - started,
    counts,
    samples,
    issues: [...new Set(issues)],
  }
  console.log(JSON.stringify(result, null, 2))
  return result
}

const { channels, seconds } = parseArgs(process.argv.slice(2))
const results = []
for (const channelId of channels) {
  results.push(await smokeChannel(channelId, seconds))
}

const summary = {
  ok: results.every((r) => r.connected && r.counts.message > 0 && r.issues.length === 0),
  channels: results.map((r) => ({
    channelId: r.channelId,
    connected: r.connected,
    messages: r.counts.message,
    donations: r.counts.donation,
    subscriptions: r.counts.subscription,
    issues: r.issues,
    connectError: r.connectError,
  })),
}
console.log('\n=== SUMMARY ===')
console.log(JSON.stringify(summary, null, 2))
process.exit(summary.ok ? 0 : 1)
