import type { ChannelLiveState, StreamerInfo } from '@stream/core'
import { CHANNEL_URL, numeric, parseWith, z } from '@stream/core'

const envelope = <T extends z.ZodType>(content: T) =>
  z.object({
    code: z.union([z.number(), z.string()]),
    message: z.union([z.string(), z.null()]).optional(),
    content: content.optional(),
  })

export const chzzkLiveStatusSchema = envelope(
  z.object({
    liveTitle: z.string().optional().nullable(),
    status: z.string().optional().nullable(),
    concurrentUserCount: numeric.optional().nullable(),
    accumulateCount: numeric.optional().nullable(),
    categoryType: z.string().optional().nullable(),
    liveCategory: z.string().optional().nullable(),
    liveCategoryValue: z.string().optional().nullable(),
    adult: z.boolean().optional().nullable(),
    chatChannelId: z.string().optional().nullable(),
    openDate: z.string().optional().nullable(),
    liveImageUrl: z.string().optional().nullable(),
  }),
)

export const chzzkChatAccessTokenSchema = envelope(
  z.object({
    accessToken: z.string(),
    extraToken: z.string().optional().nullable(),
  }),
)

export const chzzkUserStatusSchema = envelope(
  z.object({
    userIdHash: z.string(),
    nickname: z.string().optional(),
    profileImageUrl: z.string().optional().nullable(),
  }),
)

/** service/v1/channels/{id} 응답. */
export const chzzkChannelSchema = envelope(
  z.object({
    channelId: z.string(),
    channelName: z.string(),
    channelImageUrl: z.string().optional().nullable(),
    channelDescription: z.string().optional().nullable(),
    followerCount: numeric.optional().nullable(),
    openLive: z.boolean().optional().nullable(),
  }),
)

export function toChannelLiveState(channelId: string, data: unknown): ChannelLiveState {
  const env = parseWith(chzzkLiveStatusSchema, data, {
    label: `chzzk/live-status/${channelId}`,
    platform: 'chzzk',
  })
  const content = env.content
  return {
    platform: 'chzzk',
    channelId,
    live: content?.status === 'OPEN',
    title: content?.liveTitle ?? undefined,
    category: content?.liveCategoryValue ?? content?.liveCategory ?? undefined,
    viewerCount: content?.concurrentUserCount ?? undefined,
    startedAt: content?.openDate ?? undefined,
    thumbnailUrl: content?.liveImageUrl?.replace('{type}', '480') ?? undefined,
    adult: content?.adult ?? undefined,
    chatChannelId: content?.chatChannelId ?? undefined,
    raw: data,
  }
}

export function toStreamerInfo(channelId: string, data: unknown): StreamerInfo {
  const env = parseWith(chzzkChannelSchema, data, {
    label: `chzzk/channel/${channelId}`,
    platform: 'chzzk',
  })
  if (Number(env.code) !== 200 || !env.content) {
    throw new Error(`치지직 채널 조회 실패: ${env.message ?? env.code}`)
  }
  const c = env.content
  return {
    platform: 'chzzk',
    id: c.channelId,
    name: c.channelName,
    profileImageUrl: c.channelImageUrl ?? undefined,
    followerCount: c.followerCount ?? undefined,
    description: c.channelDescription ?? undefined,
    url: CHANNEL_URL.chzzk(c.channelId),
  }
}

export function chzzkChatServerIndex(chatChannelId: string): number {
  let sum = 0
  for (let i = 0; i < chatChannelId.length; i++) {
    sum += chatChannelId.charCodeAt(i)
  }
  return (sum % 9) + 1
}

export function chzzkChatWebSocketUrl(chatChannelId: string): string {
  return `wss://kr-ss${chzzkChatServerIndex(chatChannelId)}.chat.naver.com/chat`
}
