import { defineConfig } from 'vitest/config'

type VitestConfig = ReturnType<typeof defineConfig>
type TestOptions = NonNullable<Extract<VitestConfig, { test?: unknown }>['test']>

/**
 * Node 환경 라이브러리 패키지용 vitest 기본값.
 *
 * 이 저장소의 패키지는 빌드 산출물 없이 소스를 직접 참조하므로
 * (package.json exports -> ./src/index.ts) 별도 alias 설정이 필요 없습니다.
 */
export function nodePreset(overrides: TestOptions = {}): VitestConfig {
  return defineConfig({
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts'],
      restoreMocks: true,
      unstubEnvs: true,
      unstubGlobals: true,
      ...overrides,
    },
  })
}

/** DOM이 필요한 라이브러리(overlay/chat-ui 등)용 vitest 기본값. */
export function domPreset(overrides: TestOptions = {}): VitestConfig {
  return nodePreset({
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    ...overrides,
  })
}
