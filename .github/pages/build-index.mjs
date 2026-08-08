#!/usr/bin/env node
// GitHub Pages 루트 랜딩 페이지를 apps.json 목록으로부터 생성합니다.
// 새 앱을 추가할 때는 이 목록에 한 줄만 추가하면 됩니다(빌드/복사 스텝은 워크플로에 추가).
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const apps = JSON.parse(readFileSync(path.join(here, 'apps.json'), 'utf8'))

const outDir = process.argv[2] ?? path.join(here, '..', '..', '_site')
mkdirSync(outDir, { recursive: true })

const imagesSrc = path.join(here, 'images')
const imagesDest = path.join(outDir, 'images')
if (existsSync(imagesSrc)) {
  mkdirSync(imagesDest, { recursive: true })
  cpSync(imagesSrc, imagesDest, { recursive: true })
}

const faviconSrc = path.join(here, 'favicon.ico')
if (existsSync(faviconSrc)) {
  cpSync(faviconSrc, path.join(outDir, 'favicon.ico'))
}

const escapeHtml = (value) =>
  value.replace(/[&<>"']/g, (char) => {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
    return map[char]
  })

const cards = apps
  .map((app) => {
    const image = app.image
      ? `
          <img class="card-image" src="./${escapeHtml(app.image)}" alt="${escapeHtml(app.name)} 미리보기" loading="lazy" width="320" height="180" />`
      : ''
    return `
        <a class="card${app.image ? ' has-image' : ''}" href="./${app.path}">${image}
          <span class="card-body">
            <span class="card-title">${escapeHtml(app.name)}</span>
            <span class="card-desc">${escapeHtml(app.description)}</span>
          </span>
          <span class="card-arrow" aria-hidden="true">&rarr;</span>
        </a>`
  })
  .join('\n')

const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>stream</title>
<meta name="description" content="SOOP · 치지직 방송용 도구 모음" />
<link rel="icon" href="./favicon.ico" type="image/x-icon" />
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
  .card.has-image {
    grid-template-columns: minmax(140px, 42%) 1fr auto;
    align-items: center;
    gap: 0 1rem;
    padding: 0.65rem 1rem 0.65rem 0.65rem;
  }
  .card:hover {
    border-color: rgba(255, 180, 67, 0.55);
    background: rgba(255, 255, 255, 0.07);
    transform: translateY(-1px);
  }
  .card-image {
    width: 100%;
    max-width: 280px;
    aspect-ratio: 16 / 9;
    object-fit: cover;
    border-radius: 10px;
    background: rgba(0, 0, 0, 0.35);
    display: block;
  }
  .card-body {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    min-width: 0;
  }
  .card-title { font-weight: 700; font-size: 1.08rem; }
  .card-desc {
    color: rgba(243, 236, 255, 0.6);
    font-size: 0.88rem;
  }
  .card-arrow {
    color: var(--accent);
    font-size: 1.3rem;
    align-self: center;
  }
  @media (max-width: 520px) {
    .card.has-image {
      grid-template-columns: 1fr auto;
      gap: 0.65rem 0.85rem;
      padding: 0.75rem;
    }
    .card-image {
      grid-column: 1 / -1;
      max-width: none;
    }
    .card-arrow {
      grid-row: 2;
    }
  }
  footer {
    margin-top: 2.4rem;
    font-size: 0.8rem;
    color: rgba(243, 236, 255, 0.4);
  }
  footer a {
    color: inherit;
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    text-decoration: none;
  }
  footer a:hover { color: rgba(243, 236, 255, 0.7); }
  footer svg { flex-shrink: 0; }
</style>
</head>
<body>
<main>
  <h1>stream<span>.</span></h1>
  <p class="lead">SOOP · 치지직 방송용 도구 모음</p>
  <nav class="list">${cards}
  </nav>
  <footer>
    <a href="https://github.com/GWANGUIAN/stream" aria-label="GWANGUIAN/stream on GitHub">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8"/>
      </svg>
      GWANGUIAN/stream
    </a>
  </footer>
</main>
</body>
</html>
`

writeFileSync(path.join(outDir, 'index.html'), html)
console.log(`[build-index] ${apps.length}개 앱으로 ${path.join(outDir, 'index.html')} 생성`)
