import { type ZodType, z } from 'zod'
import { SchemaError } from './errors'
import type { Platform } from './types'

export interface ParseContext {
  /** 에러 메시지에 들어갈 라벨. 어느 응답이 깨졌는지 바로 알 수 있게 합니다. */
  label: string
  platform?: Platform
}

/**
 * zod 파싱 결과를 SchemaError로 정규화합니다.
 *
 * 비공식 API는 예고 없이 필드가 바뀌므로, 여기서 실패하면 대개 우리 코드가 아니라
 * 상대 API가 변한 것입니다. 그 판단이 바로 서도록 원본 값을 함께 담습니다.
 */
export function parseWith<T>(schema: ZodType<T>, data: unknown, context: ParseContext): T {
  const result = schema.safeParse(data)
  if (result.success) return result.data

  throw new SchemaError(
    `${context.label} 응답 형식이 예상과 다릅니다: ${summarize(result.error)}`,
    {
      platform: context.platform,
      issues: result.error.issues,
      received: data,
      detail:
        '플랫폼 API가 변경되었을 수 있습니다. packages/auth 또는 packages/chat의 스키마를 확인하세요.',
    },
  )
}

function summarize(error: z.ZodError): string {
  return error.issues
    .slice(0, 3)
    .map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`)
    .join(', ')
}

/**
 * 숫자로 오기도 하고 문자열로 오기도 하는 필드용.
 *
 * 치지직 `expiresIn`은 문서상 String이지만 실제 응답은 number이고,
 * SOOP `CHPT`는 항상 문자열입니다. 양쪽 다 받습니다.
 */
export const numeric = z.union([z.number(), z.string()]).transform((value, ctx) => {
  const parsed = typeof value === 'number' ? value : Number(value.trim())
  if (!Number.isFinite(parsed)) {
    ctx.addIssue({ code: 'custom', message: `숫자가 아닙니다: ${String(value)}` })
    return z.NEVER
  }
  return parsed
})

/** "1"/"0"/1/0/true/false 를 모두 boolean으로 받습니다. */
export const flexibleBoolean = z.union([z.boolean(), z.number(), z.string()]).transform((value) => {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  const normalized = value.trim().toLowerCase()
  return normalized === 'true' || normalized === '1' || normalized === 'y'
})

/**
 * 치지직·SOOP 비공식 API는 JSON을 문자열로 한 번 더 감싸서 보냅니다.
 * (채팅 메시지의 profile/extras 필드가 대표적입니다.)
 */
export function jsonString<T>(schema: ZodType<T>) {
  return z.union([z.string(), z.null(), z.undefined()]).transform((value, ctx): T | undefined => {
    if (value === null || value === undefined || value === '') return undefined
    let decoded: unknown
    try {
      decoded = JSON.parse(value)
    } catch {
      ctx.addIssue({ code: 'custom', message: 'JSON 문자열 파싱 실패' })
      return z.NEVER
    }
    const result = schema.safeParse(decoded)
    if (!result.success) {
      ctx.addIssue({ code: 'custom', message: summarize(result.error) })
      return z.NEVER
    }
    return result.data
  })
}

export { z }
