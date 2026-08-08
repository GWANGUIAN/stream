import type { ChannelLiveState, StreamerInfo } from '@stream/core'
import { CHANNEL_URL, numeric, parseWith, z } from '@stream/core'

export const soopPlayerChannelSchema = z.object({
  RESULT: numeric,
  CHDOMAIN: z.string().optional(),
  CHPT: z.union([z.string(), z.number()]).optional(),
  CHATNO: z.union([z.string(), z.number()]).optional(),
  FTK: z.string().optional().nullable(),
  BNO: z.union([z.string(), z.number()]).optional().nullable(),
  BJID: z.string().optional(),
  BJNICK: z.string().optional(),
  TITLE: z.string().optional().nullable(),
  CTUSER: numeric.optional().nullable(),
  CATE: z.string().optional().nullable(),
  BPS: z.union([z.string(), z.number()]).optional().nullable(),
  RESOLUTION: z.string().optional().nullable(),
  BPWD: z.union([z.string(), z.number()]).optional().nullable(),
})

export const soopPlayerLiveSchema = z.object({
  CHANNEL: soopPlayerChannelSchema,
})

/** chapi station 응답 — 필드가 버전마다 조금씩 달라 넓게 받습니다. */
export const soopStationSchema = z
  .object({
    result: numeric.optional(),
    station: z
      .object({
        user_id: z.string().optional(),
        user_nick: z.string().optional(),
        station_name: z.string().optional(),
        station_title: z.string().optional(),
        profile_image: z.string().optional().nullable(),
        board_type: z.unknown().optional(),
      })
      .passthrough()
      .optional(),
    profile_image: z.string().optional().nullable(),
    user_nick: z.string().optional(),
    station_name: z.string().optional(),
    fan_cnt: numeric.optional().nullable(),
    favorite_cnt: numeric.optional().nullable(),
  })
  .passthrough()

export function toSoopLiveState(streamerId: string, data: unknown): ChannelLiveState {
  const parsed = parseWith(soopPlayerLiveSchema, data, {
    label: `soop/live-state/${streamerId}`,
    platform: 'soop',
  })
  const ch = parsed.CHANNEL
  return {
    platform: 'soop',
    channelId: streamerId,
    live: ch.RESULT === 1,
    title: ch.TITLE ?? undefined,
    category: ch.CATE ?? undefined,
    viewerCount: ch.CTUSER ?? undefined,
    raw: data,
  }
}

export function parseSoopChatSessionFields(streamerId: string, data: unknown) {
  const parsed = parseWith(soopPlayerLiveSchema, data, {
    label: `soop/player_live/${streamerId}`,
    platform: 'soop',
  })
  const ch = parsed.CHANNEL

  if (ch.RESULT !== 1) {
    throw new Error(
      `SOOP 라이브 정보를 가져오지 못했습니다 (RESULT=${ch.RESULT}). 방송 중이 아니거나 접근이 제한되었을 수 있습니다.`,
    )
  }
  if (!ch.CHDOMAIN || ch.CHPT === undefined || ch.CHATNO === undefined) {
    throw new Error('SOOP 채팅 연결 정보(CHDOMAIN/CHPT/CHATNO)가 없습니다.')
  }

  const chatDomain = String(ch.CHDOMAIN).toLowerCase()
  const chatPort = Number(ch.CHPT) + 1
  return {
    streamerId,
    chatDomain,
    chatPort,
    chatNo: String(ch.CHATNO),
    ftk: ch.FTK ?? undefined,
    broadcastNo: ch.BNO != null ? String(ch.BNO) : undefined,
    webSocketUrl: `wss://${chatDomain}:${chatPort}/Websocket/${streamerId}`,
    raw: data,
  }
}

export function toSoopStreamerInfo(streamerId: string, data: unknown): StreamerInfo {
  const parsed = parseWith(soopStationSchema, data, {
    label: `soop/station/${streamerId}`,
    platform: 'soop',
  })

  const station = parsed.station
  const name =
    station?.user_nick ??
    parsed.user_nick ??
    station?.station_name ??
    parsed.station_name ??
    streamerId
  const profile = station?.profile_image ?? parsed.profile_image ?? undefined
  const followers = parsed.fan_cnt ?? parsed.favorite_cnt ?? undefined
  const description = station?.station_title ?? undefined

  return {
    platform: 'soop',
    id: station?.user_id ?? streamerId,
    name,
    profileImageUrl: profile ?? undefined,
    followerCount: followers ?? undefined,
    description,
    url: CHANNEL_URL.soop(streamerId),
  }
}

export function soopChatWebSocketUrl(connection: {
  chatDomain: string
  chatPort: number
  streamerId: string
}): string {
  return `wss://${connection.chatDomain}:${connection.chatPort}/Websocket/${connection.streamerId}`
}
