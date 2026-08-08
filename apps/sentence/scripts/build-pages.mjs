#!/usr/bin/env node
// GitHub Pages 등 정적 호스팅용 빌드 스크립트.
// output: 'export'는 API 라우트(SSE 프록시)와 호환되지 않으므로, 빌드 중에만
// `src/app/api`를 잠시 옮겨 두었다가 끝나면 그대로 복원합니다.
import { execSync } from 'node:child_process'
import { cpSync, existsSync, rmSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const appRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const apiDir = path.join(appRoot, 'src', 'app', 'api')
const apiBackupDir = path.join(appRoot, 'src', 'app', '_api-static-export-backup')

const hadApiDir = existsSync(apiDir)
if (hadApiDir) {
  cpSync(apiDir, apiBackupDir, { recursive: true })
  rmSync(apiDir, { recursive: true, force: true })
  console.log('[build-pages] static export를 위해 src/app/api를 임시로 제외합니다.')
}

try {
  execSync('next build', {
    stdio: 'inherit',
    cwd: appRoot,
    env: { ...process.env, NEXT_PUBLIC_STATIC_EXPORT: 'true' },
  })
} finally {
  if (hadApiDir) {
    cpSync(apiBackupDir, apiDir, { recursive: true })
    rmSync(apiBackupDir, { recursive: true, force: true })
    console.log('[build-pages] src/app/api를 복원했습니다.')
  }
}
