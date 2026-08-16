import { execSync } from 'node:child_process'
import { cpSync, existsSync, rmSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url))); const api = path.join(root, 'src/app/api'); const backup = path.join(root, 'src/app/_api-static-export-backup'); const had = existsSync(api)
if (had) { cpSync(api, backup, { recursive: true }); rmSync(api, { recursive: true, force: true }) }
try { execSync('next build', { stdio: 'inherit', cwd: root, env: { ...process.env, NEXT_PUBLIC_STATIC_EXPORT: 'true' } }) } finally { if (had) { cpSync(backup, api, { recursive: true }); rmSync(backup, { recursive: true, force: true }) } }
