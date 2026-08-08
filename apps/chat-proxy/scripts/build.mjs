import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as esbuild from 'esbuild'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outdir = path.join(root, 'dist')
mkdirSync(outdir, { recursive: true })

await esbuild.build({
  entryPoints: [path.join(root, 'src/server.ts')],
  outfile: path.join(outdir, 'server.mjs'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  packages: 'bundle',
  banner: {
    // CJS-only deps (ws 등)가 ESM 번들에서 require를 쓸 수 있게 합니다.
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
  logLevel: 'info',
})

console.log('[chat-proxy] wrote dist/server.mjs')
