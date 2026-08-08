/**
 * 룰렛·투표·문장 오버레이 미리보기 스크린샷을 찍습니다.
 * 사전 조건: 각 앱 개발 서버가 떠 있어야 합니다 (3001 / 3002 / 3003).
 *
 *   npm install --no-save --prefix .github/pages/scripts playwright@1.51.0
 *   npx --prefix .github/pages/scripts playwright install chromium
 *   node .github/pages/scripts/capture-previews.mjs
 *   node .github/pages/scripts/capture-previews.mjs sentence   # 특정 앱만
 */
import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
let chromium
try {
  ;({ chromium } = require('playwright'))
} catch {
  console.error(
    '[capture] playwright가 없습니다. 먼저 설치하세요:\n' +
      '  npm install --no-save --prefix .github/pages/scripts playwright@1.51.0\n' +
      '  npx --prefix .github/pages/scripts playwright install chromium',
  )
  process.exit(1)
}

const outDir = path.join(here, '..', 'images')
mkdirSync(outDir, { recursive: true })

const VIEWPORT = { width: 1280, height: 720 }

const OVERLAY_BG = `
  html, body {
    background:
      radial-gradient(circle at 20% 15%, rgba(255, 180, 67, 0.18), transparent 50%),
      radial-gradient(circle at 80% 85%, rgba(139, 92, 246, 0.2), transparent 50%),
      linear-gradient(160deg, #1a1030, #0a0714) !important;
  }
  nextjs-portal,
  [data-next-badge-root],
  [data-nextjs-toast],
  #__next-build-watcher {
    display: none !important;
  }
`

async function waitReady(page, selector, timeout = 20000) {
  await page.waitForSelector(selector, { state: 'visible', timeout })
}

async function captureRoulette(browser) {
  const context = await browser.newContext({ viewport: VIEWPORT })
  const consolePage = await context.newPage()

  await consolePage.goto('http://localhost:3001/', { waitUntil: 'networkidle' })
  await consolePage.evaluate(() => localStorage.clear())
  await consolePage.reload({ waitUntil: 'networkidle' })
  await waitReady(consolePage, '.console-page')

  // 제목 설정
  await consolePage.locator('.title-display, .title-bar button, .title-bar h1, .title-bar').first().click()
  const titleInput = consolePage.locator('.title-input')
  if (await titleInput.count()) {
    await titleInput.fill('오늘 뭐 먹을까?')
    await titleInput.press('Enter')
  }

  // 메뉴 → 일괄 등록 (RulePanel textarea가 먼저 오므로 placeholder로 지정)
  await consolePage.getByRole('button', { name: '메뉴 열기' }).click()
  await waitReady(consolePage, '.menu-drawer.open')
  const bulk = consolePage.getByPlaceholder(/치킨 x3/)
  await bulk.scrollIntoViewIfNeeded()
  await bulk.fill(['치킨 x3', '피자 x2', '떡볶이 x2', '족발', '햄버거 x2', '초밥'].join('\n'))
  await consolePage.getByRole('button', { name: '일괄 등록' }).click()
  await consolePage.waitForFunction(() => {
    try {
      const raw = localStorage.getItem('stream-roulette:snapshot:v1')
      if (!raw) return false
      return (JSON.parse(raw).items?.length ?? 0) >= 4
    } catch {
      return false
    }
  })
  await consolePage.locator('button.menu-scrim.open').click()
  await consolePage.waitForTimeout(400)

  const overlay = await context.newPage()
  await overlay.goto('http://localhost:3001/overlay/', { waitUntil: 'networkidle' })
  await waitReady(overlay, '.overlay-wheel-shell')
  // 빈 상태 문구가 사라질 때까지 대기
  await overlay.waitForFunction(() => !document.body.innerText.includes('아직 등록된 아이템이 없어요'))
  await overlay.addStyleTag({ content: OVERLAY_BG })
  // 휠 렌더 안정화
  await overlay.waitForTimeout(800)

  const out = path.join(outDir, 'roulette.png')
  await overlay.screenshot({ path: out, type: 'png' })
  console.log(`[capture] ${out}`)
  await context.close()
}

async function capturePoll(browser) {
  const context = await browser.newContext({ viewport: VIEWPORT })
  const consolePage = await context.newPage()

  await consolePage.goto('http://localhost:3002/stream/poll/', { waitUntil: 'networkidle' })
  await consolePage.evaluate(() => localStorage.clear())
  await consolePage.reload({ waitUntil: 'networkidle' })
  await waitReady(consolePage, '.console-page')

  // 제목
  await consolePage.locator('.title-display, .title-bar button, .title-bar h1, .title-bar').first().click()
  const titleInput = consolePage.locator('.title-input')
  if (await titleInput.count()) {
    await titleInput.fill('오늘 저녁 메뉴는?')
    await titleInput.press('Enter')
  }

  // 옵션 라벨 편집 (기본 찬성/반대 → 메뉴 항목으로)
  const optionInputs = consolePage.locator('.vote-bar-input input')
  await optionInputs.nth(0).fill('치킨')
  await optionInputs.nth(1).fill('피자')
  await consolePage.getByRole('button', { name: /항목 추가/ }).click()
  await consolePage.locator('.vote-bar-input input').nth(2).fill('초밥')
  await consolePage.getByRole('button', { name: /항목 추가/ }).click()
  await consolePage.locator('.vote-bar-input input').nth(3).fill('햄버거')

  // 실시간 결과 공개 + 무제한
  await consolePage.getByRole('button', { name: '메뉴 열기' }).click()
  await waitReady(consolePage, '.menu-drawer.open')
  await consolePage.getByRole('button', { name: '무제한' }).click()
  const liveToggle = consolePage
    .locator('.toggle-row')
    .filter({ hasText: '실시간 결과 공개' })
    .locator('[role="switch"]')
  if ((await liveToggle.getAttribute('aria-checked')) !== 'true') {
    await liveToggle.click()
  }
  await consolePage.locator('button.menu-scrim.open').click()
  await consolePage.waitForTimeout(300)

  // 투표 시작
  await consolePage.getByRole('button', { name: /투표 시작/ }).click()
  await consolePage.waitForTimeout(400)

  // 리허설 투표
  await consolePage.getByRole('button', { name: '메뉴 열기' }).click()
  await waitReady(consolePage, '.menu-drawer.open')
  const votes = [
    ['별빛토끼', 0],
    ['겜돌이', 1],
    ['밤하늘', 0],
    ['초코우유', 2],
    ['스트림킹', 0],
    ['피자왕', 1],
    ['스시러버', 2],
    ['햄버거맨', 3],
    ['야식요정', 0],
    ['배고픈사람', 1],
    ['초밥러', 2],
    ['치킨매니아', 0],
  ]
  for (const [nick, optionIndex] of votes) {
    await consolePage.locator('.rehearsal-row input').fill(nick)
    await consolePage.locator('.rehearsal-row select').selectOption({ index: optionIndex })
    await consolePage.getByRole('button', { name: '테스트 투표 보내기' }).click()
    await consolePage.waitForTimeout(80)
  }
  await consolePage.locator('button.menu-scrim.open').click()

  // 결과 공개
  await consolePage.getByRole('button', { name: /바로 결과 공개|결과 공개/ }).first().click()
  await consolePage.waitForTimeout(600)

  const overlay = await context.newPage()
  await overlay.goto('http://localhost:3002/stream/poll/overlay/', { waitUntil: 'networkidle' })
  await waitReady(overlay, '.overlay-root')
  // revealed 바 애니메이션 대기
  await overlay.waitForTimeout(1200)
  await overlay.addStyleTag({ content: OVERLAY_BG })
  await overlay.waitForTimeout(200)

  const out = path.join(outDir, 'poll.png')
  await overlay.screenshot({ path: out, type: 'png' })
  console.log(`[capture] ${out}`)
  await context.close()
}

async function captureSentence(browser) {
  const context = await browser.newContext({ viewport: VIEWPORT })
  const consolePage = await context.newPage()

  await consolePage.goto('http://localhost:3003/stream/sentence/', { waitUntil: 'networkidle' })
  await consolePage.evaluate(() => localStorage.clear())
  await consolePage.reload({ waitUntil: 'networkidle' })
  await waitReady(consolePage, '.console-page')

  await consolePage.locator('.title-display').first().click()
  const titleInput = consolePage.locator('.title-input')
  if (await titleInput.count()) {
    await titleInput.fill('오늘 문장 만들기')
    await titleInput.press('Enter')
  }

  // start()가 후보를 비우므로 수집을 먼저 연 뒤 후보를 넣습니다.
  await consolePage.getByRole('button', { name: /수집 시작/ }).click()
  await consolePage.waitForTimeout(300)

  const candidatesBySection = [
    ['왁굳형이', '고멤이', '이세돌이'],
    ['숲속에서', '스튜디오에서', '카페에서'],
    ['몰래', '신나게', '진지하게'],
    ['도토리를', '마이크를', '키보드를'],
    ['배고파서', '심심해서', '갑자기'],
  ]
  await consolePage.getByText('후보 모음').scrollIntoViewIfNeeded()
  const panels = consolePage.locator('.candidate-panel:not(.disabled)')
  for (let i = 0; i < candidatesBySection.length; i += 1) {
    const panel = panels.nth(i)
    const input = panel.getByPlaceholder('수동 추가')
    for (const text of candidatesBySection[i]) {
      await input.fill(text)
      await input.press('Enter')
      await consolePage.waitForTimeout(80)
    }
  }
  await consolePage.waitForFunction(() => {
    try {
      const raw = localStorage.getItem('stream-sentence:snapshot:v1')
      if (!raw) return false
      const parsed = JSON.parse(raw)
      const sections = parsed.sentence?.sections
      if (!sections) return false
      return (
        parsed.sentence.phase === 'collecting' &&
        sections.every((s) => !s.enabled || (s.entries?.length ?? 0) >= 1)
      )
    } catch {
      return false
    }
  })

  await consolePage.getByRole('button', { name: '바로 전체 뽑기' }).click()

  const overlay = await context.newPage()
  await overlay.goto('http://localhost:3003/stream/sentence/overlay/', {
    waitUntil: 'networkidle',
  })
  await waitReady(overlay, '.overlay-root')
  await overlay.waitForSelector('.overlay-sentence', { state: 'visible', timeout: 15000 })
  await overlay.addStyleTag({ content: OVERLAY_BG })
  // 컨페티가 살짝 퍼진 컷
  await overlay.waitForTimeout(700)

  const out = path.join(outDir, 'sentence.png')
  await overlay.screenshot({ path: out, type: 'png' })
  console.log(`[capture] ${out}`)
  await context.close()
}

const only = process.argv[2]
const targets =
  only === 'roulette'
    ? [captureRoulette]
    : only === 'poll'
      ? [capturePoll]
      : only === 'sentence'
        ? [captureSentence]
        : [captureRoulette, capturePoll, captureSentence]

const browser = await chromium.launch({ headless: true })
try {
  for (const capture of targets) await capture(browser)
} finally {
  await browser.close()
}
console.log('[capture] done')
