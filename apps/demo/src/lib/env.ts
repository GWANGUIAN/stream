import { z } from 'zod'

const optionalString = z
  .string()
  .optional()
  .transform((value) => {
    const trimmed = value?.trim()
    return trimmed ? trimmed : undefined
  })

const envSchema = z.object({
  AUTH_SECRET: z.string().min(16, 'AUTH_SECRET은 최소 16자 이상이어야 합니다.'),
  CHZZK_CLIENT_ID: optionalString,
  CHZZK_CLIENT_SECRET: optionalString,
  CHZZK_REDIRECT_URI: optionalString,
  SOOP_CLIENT_ID: optionalString,
  SOOP_CLIENT_SECRET: optionalString,
  SOOP_REDIRECT_URI: optionalString,
  CHZZK_NID_AUT: optionalString,
  CHZZK_NID_SES: optionalString,
  SOOP_USER_ID: optionalString,
  SOOP_PASSWORD: optionalString,
  NODE_ENV: z.enum(['development', 'production', 'test']).optional(),
})

export type DemoEnv = z.infer<typeof envSchema>

let cached: DemoEnv | undefined

/**
 * 부팅 시 한 번 검증합니다.
 * AUTH_SECRET만 필수이고, 플랫폼 자격증명은 없어도 익명 모드로 동작합니다.
 */
export function getEnv(): DemoEnv {
  if (cached) return cached
  const parsed = envSchema.safeParse({
    AUTH_SECRET: process.env.AUTH_SECRET,
    CHZZK_CLIENT_ID: process.env.CHZZK_CLIENT_ID,
    CHZZK_CLIENT_SECRET: process.env.CHZZK_CLIENT_SECRET,
    CHZZK_REDIRECT_URI: process.env.CHZZK_REDIRECT_URI,
    SOOP_CLIENT_ID: process.env.SOOP_CLIENT_ID,
    SOOP_CLIENT_SECRET: process.env.SOOP_CLIENT_SECRET,
    SOOP_REDIRECT_URI: process.env.SOOP_REDIRECT_URI,
    CHZZK_NID_AUT: process.env.CHZZK_NID_AUT,
    CHZZK_NID_SES: process.env.CHZZK_NID_SES,
    SOOP_USER_ID: process.env.SOOP_USER_ID,
    SOOP_PASSWORD: process.env.SOOP_PASSWORD,
    NODE_ENV: process.env.NODE_ENV,
  })

  if (!parsed.success) {
    const detail = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
    throw new Error(`환경변수 검증 실패 — ${detail}`)
  }

  cached = parsed.data
  return cached
}

export function chzzkOAuthConfigured(): boolean {
  const env = getEnv()
  return Boolean(env.CHZZK_CLIENT_ID && env.CHZZK_CLIENT_SECRET && env.CHZZK_REDIRECT_URI)
}

export function soopOAuthConfigured(): boolean {
  const env = getEnv()
  return Boolean(env.SOOP_CLIENT_ID && env.SOOP_CLIENT_SECRET)
}
