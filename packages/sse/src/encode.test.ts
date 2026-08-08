import { describe, expect, it } from 'vitest'
import { encodeSseData } from './encode'

describe('encodeSseData', () => {
  it('SSE data 프레임을 만듭니다', () => {
    expect(encodeSseData({ type: 'hello', platform: 'chzzk' })).toBe(
      'data: {"type":"hello","platform":"chzzk"}\n\n',
    )
  })
})
