import { CHANNEL_URL, numeric, parseWith, z } from '@stream/core'
import { type TokenSet, toExpiresAt } from '../../types'

/** 치지직 공식 API 공통 봉투. content는 성공 시에만 옵니다. */
export const chzzkEnvelope = <T extends z.ZodType>(content: T) =>
  z.object({
    code: z.union([z.number(), z.string()]),
    message: z.union([z.string(), z.null()]).optional(),
    content: content.optional(),
  })

export const chzzkTokenContentSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  tokenType: z.string().default('Bearer'),
  expiresIn: numeric,
  scope: z.string().optional(),
})

export const chzzkTokenEnvelopeSchema = chzzkEnvelope(chzzkTokenContentSchema)

export const chzzkMeContentSchema = z.object({
  channelId: z.string(),
  channelName: z.string(),
})

export const chzzkMeEnvelopeSchema = chzzkEnvelope(chzzkMeContentSchema)

export const chzzkUserStatusSchema = chzzkEnvelope(
  z.object({
    userIdHash: z.string(),
    nickname: z.string().optional(),
    profileImageUrl: z.string().optional().nullable(),
  }),
)

export function parseChzzkTokenSet(data: unknown, now = Date.now()): TokenSet {
  const envelope = parseWith(chzzkTokenEnvelopeSchema, data, {
    label: 'chzzk/auth/token',
    platform: 'chzzk',
  })

  if (Number(envelope.code) !== 200 || !envelope.content) {
    throw new Error(
      `치지직 토큰 응답 실패: code=${String(envelope.code)} message=${envelope.message ?? ''}`,
    )
  }

  const content = envelope.content
  return {
    accessToken: content.accessToken,
    refreshToken: content.refreshToken,
    expiresAt: toExpiresAt(content.expiresIn, now),
    tokenType: content.tokenType,
    scope: content.scope,
    raw: data,
  }
}

export function chzzkChannelUrl(channelId: string): string {
  return CHANNEL_URL.chzzk(channelId)
}
