import { z } from 'zod'

const optionalString = z
  .string()
  .optional()
  .transform((value) => {
    const trimmed = value?.trim()
    return trimmed ? trimmed : undefined
  })

const envSchema = z.object({
  CHZZK_NID_AUT: optionalString,
  CHZZK_NID_SES: optionalString,
  NODE_ENV: z.enum(['development', 'production', 'test']).optional(),
})

export type ChatTestEnv = z.infer<typeof envSchema>

let cached: ChatTestEnv | undefined

export function getEnv(): ChatTestEnv {
  if (cached) return cached
  const parsed = envSchema.safeParse({
    CHZZK_NID_AUT: process.env.CHZZK_NID_AUT,
    CHZZK_NID_SES: process.env.CHZZK_NID_SES,
    NODE_ENV: process.env.NODE_ENV,
  })

  if (!parsed.success) {
    const detail = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
    throw new Error(`환경변수 검증 실패 — ${detail}`)
  }

  cached = parsed.data
  return cached
}
