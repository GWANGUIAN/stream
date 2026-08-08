#!/usr/bin/env node
// GitHub Pages 루트 랜딩 페이지를 apps.json 목록으로부터 생성합니다.
// 새 앱을 추가할 때는 이 목록에 한 줄만 추가하면 됩니다(빌드/복사 스텝은 워크플로에 추가).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const apps = JSON.parse(readFileSync(path.join(here, 'apps.json'), 'utf8'))

const outDir = process.argv[2] ?? path.join(here, '..', '..', '_site')
mkdirSync(outDir, { recursive: true })

const escapeHtml = (value) =>
  value.replace(/[&<>"']/g, (char) => {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
    return map[char]
  })

const cards = apps
  .map(
    (app) => `
        <a class="card" href="./${app.path}">
          <span class="card-title">${escapeHtml(app.name)}</span>
          <span class="card-desc">${escapeHtml(app.description)}</span>
          <span class="card-arrow" aria-hidden="true">&rarr;</span>
        </a>`,
  )
  .join('\n')

const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>stream</title>
<meta name="description" content="방송용 도구 모음" />
<style>
  :root {
    color-scheme: dark;
    --accent: #ffb443;
    --bg-0: #0a0714;
    --bg-1: #1a1030;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2.5rem 1.5rem;
    font-family: -apple-system, "Segoe UI", "Noto Sans KR", sans-serif;
    color: #f3ecff;
    background:
      radial-gradient(circle at 15% 10%, rgba(255, 180, 67, 0.16), transparent 55%),
      radial-gradient(circle at 85% 90%, rgba(139, 92, 246, 0.18), transparent 55%),
      linear-gradient(160deg, var(--bg-1), var(--bg-0));
  }
  main { width: 100%; max-width: 640px; }
  h1 {
    margin: 0 0 0.4rem;
    font-size: clamp(2.4rem, 6vw, 3.4rem);
    font-weight: 900;
    letter-spacing: -0.02em;
  }
  h1 span { color: var(--accent); }
  p.lead {
    margin: 0 0 2.2rem;
    color: rgba(243, 236, 255, 0.72);
    font-size: 1.05rem;
  }
  .list { display: flex; flex-direction: column; gap: 0.75rem; }
  .card {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    gap: 0.15rem 1rem;
    padding: 1.1rem 1.3rem;
    border-radius: 14px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.04);
    text-decoration: none;
    color: inherit;
    transition: border-color 0.15s ease, background 0.15s ease, transform 0.15s ease;
  }
  .card:hover {
    border-color: rgba(255, 180, 67, 0.55);
    background: rgba(255, 255, 255, 0.07);
    transform: translateY(-1px);
  }
  .card-title { font-weight: 700; font-size: 1.08rem; grid-column: 1; }
  .card-desc {
    grid-column: 1;
    color: rgba(243, 236, 255, 0.6);
    font-size: 0.88rem;
  }
  .card-arrow {
    grid-column: 2;
    grid-row: 1 / span 2;
    color: var(--accent);
    font-size: 1.3rem;
  }
  footer {
    margin-top: 2.4rem;
    font-size: 0.8rem;
    color: rgba(243, 236, 255, 0.4);
  }
  footer a { color: inherit; }
</style>
</head>
<body>
<main>
  <h1>stream<span>.</span></h1>
  <p class="lead">방송용 도구 모음</p>
  <nav class="list">${cards}
  </nav>
  <footer>
    <a href="https://github.com/GWANGUIAN/stream">GWANGUIAN/stream</a> · GitHub Pages
  </footer>
</main>
</body>
</html>
`

writeFileSync(path.join(outDir, 'index.html'), html)
console.log(`[build-index] ${apps.length}개 앱으로 ${path.join(outDir, 'index.html')} 생성`)
