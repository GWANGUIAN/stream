import { CHANNEL_URL, numeric, parseWith, z } from '@stream/core'
import { type TokenSet, toExpiresAt } from '../../types'

/** SOOP 토큰 응답. scope는 항상 null에 가깝습니다. */
export const soopTokenSchema = z.object({
  access_token: z.string(),
  expires_in: numeric,
  token_type: z.string().default('Bearer'),
  scope: z.union([z.string(), z.null()]).optional(),
  refresh_token: z.string().optional(),
})

/** OAuth getIdentity용 — 토큰 소유자 스테이션. */
export const soopStationInfoSchema = z.object({
  result: numeric,
  msg: z.string().optional().nullable(),
  data: z
    .object({
      user_nick: z.string().optional(),
      station_name: z.string().optional(),
      profile_image: z.string().optional().nullable(),
      lately_broad_date: z.string().optional().nullable(),
      favorite_cnt: numeric.optional().nullable(),
    })
    .optional(),
})

export function parseSoopTokenSet(data: unknown, now = Date.now()): TokenSet {
  const token = parseWith(soopTokenSchema, data, {
    label: 'soop/auth/token',
    platform: 'soop',
  })

  return {
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    expiresAt: toExpiresAt(token.expires_in, now),
    tokenType: token.token_type,
    scope: token.scope ?? undefined,
    raw: data,
  }
}

export function soopChannelUrl(userId: string): string {
  return CHANNEL_URL.soop(userId)
}
