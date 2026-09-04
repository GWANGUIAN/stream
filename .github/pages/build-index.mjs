#!/usr/bin/env node
// GitHub Pages/AWS 루트 랜딩 + 콘텐츠 페이지(소개/개인정보처리방침/이용약관)를
// apps.json 목록으로부터 생성합니다. sitemap.xml/robots.txt/ads.txt도 함께 만듭니다.
// 새 앱을 추가할 때는 apps.json에 한 줄만 추가하면 됩니다(빌드/복사 스텝은 워크플로에 추가).
// 우왁굳 전용 wakmenu, 내부 검증용 chat-test는 apps.json에 의도적으로 넣지 않습니다.
// → 랜딩 카드/사이트맵 모두에서 자동으로 빠집니다(숨겨진 고정 경로).
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

// 검색 등록/캐노니컬/사이트맵은 커스텀 도메인 하나로 고정합니다.
// (AWS·GitHub Pages 두 채널에 병행 배포되지만, 검색엔진에는 이 도메인만 등록합니다.)
const SITE_URL = 'https://streamcontent.click'
const REPO_ISSUES_URL = 'https://github.com/GWANGUIAN/stream/issues'

// 애드센스 게시자 ID/광고 단위 ID. 비어 있으면 광고 스크립트·영역이 전혀 출력되지 않습니다.
// 애드센스 가입 후 값을 채우면(레포 Variables: ADSENSE_CLIENT_ID/ADSENSE_SLOT) 다음 배포부터 노출됩니다.
const ADSENSE_CLIENT_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID ?? ''
const ADSENSE_SLOT = process.env.NEXT_PUBLIC_ADSENSE_SLOT ?? ''

// 애드센스 게시자 ID(고정값). 사이트 소유 확인 메타 태그와 ads.txt는 광고
// 스크립트/영역과 달리 심사 이전에도 항상 노출되어야 하므로 env var 게이팅 없이 씁니다.
const ADSENSE_PUBLISHER_ID = 'pub-2941605563798614'
const ADSENSE_ACCOUNT_META = `<meta name="google-adsense-account" content="ca-${ADSENSE_PUBLISHER_ID}" />`

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (char) => {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
    return map[char]
  })

// depth 0 = outDir 바로 아래(index.html), depth 1 = 한 단계 하위 폴더(about/index.html 등).
// 두 배포 채널의 base path가 다르므로(루트 vs /stream) 상대경로를 씁니다.
const rel = (depth, target) => `${depth === 0 ? './' : '../'}${target}`

const adHeadScript = ADSENSE_CLIENT_ID
  ? `\n<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${escapeHtml(ADSENSE_CLIENT_ID)}" crossorigin="anonymous"></script>`
  : ''

const adSlotHtml = (extraClass) => {
  if (!ADSENSE_CLIENT_ID || !ADSENSE_SLOT) return ''
  const cls = extraClass ? `adsbygoogle ${extraClass}` : 'adsbygoogle'
  return `
  <div class="ad-slot">
    <ins class="${cls}" style="display:block" data-ad-client="${escapeHtml(ADSENSE_CLIENT_ID)}" data-ad-slot="${escapeHtml(ADSENSE_SLOT)}" data-ad-format="auto" data-full-width-responsive="true"></ins>
    <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
  </div>`
}

const footerNav = (depth, activeHref) => {
  const links = [
    { href: 'about/', label: '소개' },
    { href: 'privacy/', label: '개인정보처리방침' },
    { href: 'terms/', label: '이용약관' },
  ]
  return `
  <footer class="site-footer">
    <a href="${rel(depth, '')}">홈</a>
    ${links
      .map(
        (link) =>
          `<a href="${rel(depth, link.href)}"${activeHref === link.href ? ' aria-current="page"' : ''}>${link.label}</a>`,
      )
      .join('\n    ')}
  </footer>`
}

const renderMeta = ({ title, description, urlPath }) => {
  const url = `${SITE_URL}${urlPath}`
  const ogImage = `${SITE_URL}/images/roulette.png`
  return `<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}" />
<link rel="canonical" href="${url}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="stream" />
<meta property="og:locale" content="ko_KR" />
<meta property="og:title" content="${escapeHtml(title)}" />
<meta property="og:description" content="${escapeHtml(description)}" />
<meta property="og:url" content="${url}" />
<meta property="og:image" content="${ogImage}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escapeHtml(title)}" />
<meta name="twitter:description" content="${escapeHtml(description)}" />
<meta name="twitter:image" content="${ogImage}" />`
}

const SHARED_STYLES = `
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
    padding: 2.5rem 1.5rem;
    font-family: -apple-system, "Segoe UI", "Noto Sans KR", sans-serif;
    color: #f3ecff;
    background:
      radial-gradient(circle at 15% 10%, rgba(255, 180, 67, 0.16), transparent 55%),
      radial-gradient(circle at 85% 90%, rgba(139, 92, 246, 0.18), transparent 55%),
      linear-gradient(160deg, var(--bg-1), var(--bg-0));
  }
  body.home {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  main { width: 100%; max-width: 640px; margin: 0 auto; }
  main.content { max-width: 720px; }
  h1 {
    margin: 0 0 0.4rem;
    font-size: clamp(2.2rem, 6vw, 3.4rem);
    font-weight: 900;
    letter-spacing: -0.02em;
  }
  h1 span { color: var(--accent); }
  p.lead {
    margin: 0 0 2.2rem;
    color: rgba(243, 236, 255, 0.72);
    font-size: 1.05rem;
    line-height: 1.6;
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
  .content h1 { font-size: clamp(1.9rem, 5vw, 2.6rem); }
  .content h2 {
    margin: 2.2rem 0 0.7rem;
    font-size: 1.35rem;
    color: var(--accent);
  }
  .content h3 { margin: 1.4rem 0 0.4rem; font-size: 1.05rem; }
  .content p, .content li {
    color: rgba(243, 236, 255, 0.82);
    line-height: 1.75;
    font-size: 0.98rem;
  }
  .content ul, .content ol { padding-left: 1.3rem; }
  .content .meta {
    color: rgba(243, 236, 255, 0.5);
    font-size: 0.85rem;
    margin-bottom: 2rem;
  }
  .content a { color: var(--accent); }
  .back-link {
    display: inline-block;
    margin-bottom: 1.6rem;
    color: rgba(243, 236, 255, 0.6);
    text-decoration: none;
    font-size: 0.9rem;
  }
  .back-link:hover { color: var(--accent); }
  .ad-slot { margin: 2rem 0; min-height: 0; }
  .site-footer {
    margin-top: 2.4rem;
    display: flex;
    flex-wrap: wrap;
    gap: 0.9rem;
    font-size: 0.82rem;
    color: rgba(243, 236, 255, 0.45);
  }
  .site-footer a { color: inherit; text-decoration: none; }
  .site-footer a:hover { color: rgba(243, 236, 255, 0.8); }
`

const pageShell = ({
  title,
  description,
  urlPath,
  depth,
  bodyHtml,
  bodyClass,
  jsonLd,
}) => `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
${ADSENSE_ACCOUNT_META}
${renderMeta({ title, description, urlPath })}
<link rel="icon" href="${rel(depth, 'favicon.ico')}" type="image/x-icon" />
<style>${SHARED_STYLES}</style>${adHeadScript}
${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>\n` : ''}</head>
<body${bodyClass ? ` class="${bodyClass}"` : ''}>
${bodyHtml}
</body>
</html>
`

// ---------------------------------------------------------------------------
// 홈
// ---------------------------------------------------------------------------

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

const homeBody = `<main>
  <h1>stream<span>.</span></h1>
  <p class="lead">SOOP · 치지직 방송인을 위한 무료 채팅 연동 도구 모음입니다. 회원가입이나 설치 없이 브라우저에서 바로 조작 화면을 열고 채널만 연결하면, 시청자 채팅과 실시간으로 상호작용하는 콘텐츠를 방송에 바로 쓸 수 있습니다.</p>
  <nav class="list" aria-label="방송 도구 목록">${cards}
  </nav>${adSlotHtml('ad-slot-home')}${footerNav(0, null)}
</main>`

writeFileSync(
  path.join(outDir, 'index.html'),
  pageShell({
    title: 'stream — SOOP·치지직 방송 도구 모음',
    description:
      'SOOP · 치지직 방송용 무료 채팅 연동 도구 모음. 후원 랜덤 룰렛, 채팅 투표, 랜덤 문장 만들기.',
    urlPath: '/',
    depth: 0,
    bodyHtml: homeBody,
    bodyClass: 'home',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'stream',
      url: SITE_URL,
      description:
        'SOOP · 치지직 방송용 채팅 연동 도구 모음 — 후원 랜덤 룰렛, 채팅 투표, 랜덤 문장 만들기',
      inLanguage: 'ko',
    },
  }),
)

// ---------------------------------------------------------------------------
// 소개
// ---------------------------------------------------------------------------

const aboutBody = `<main class="content">
  <a class="back-link" href="../">&larr; 홈으로</a>
  <article>
    <h1>stream 소개</h1>
    <p class="meta">SOOP(숲) · 치지직 방송인을 위한 무료 채팅 연동 도구 모음</p>

    <p>
      stream은 SOOP(구 아프리카TV)과 치지직에서 방송하는 스트리머가 시청자 채팅과
      상호작용하는 연출을 쉽게 넣을 수 있도록 만든 개인 오픈소스 프로젝트입니다.
      회원가입이나 별도 프로그램 설치 없이 브라우저에서 조작 페이지를 열고 채널 ID만
      연결하면 바로 사용할 수 있습니다. 채팅 연동은 치지직/SOOP 공식·비공식 API를 통해
      실시간으로 이루어지며, 시청자는 평소처럼 채팅을 치는 것만으로 참여할 수 있습니다.
    </p>

    <h2>후원 랜덤 룰렛</h2>
    <p>
      후원(도네이션)이 들어올 때마다 후원 메시지나 후원자가 지정한 항목이 자동으로
      룰렛 아이템으로 등록되는 방송용 추첨 도구입니다. 조작 페이지에서 방송 플랫폼과
      채널을 연결하고, 후원 금액 단위당 등록 방식과 접수 시간을 설정한 뒤, 스페이스바로
      룰렛을 돌립니다. 등록된 아이템과 당첨 결과는 화면에 바로 표시됩니다.
    </p>
    <ul>
      <li>단축키: <code>Space</code> 스핀 · <code>T</code> 접수 타이머 시작/정지 · <code>H</code> 히스토리 열기</li>
      <li>조작 페이지의 "오버레이 URL 복사" 버튼으로 OBS에 붙여 넣을 주소를 바로 가져올 수 있습니다.</li>
      <li>리허설 모드로 실제 후원 없이 동작을 미리 확인할 수 있습니다.</li>
    </ul>

    <h2>채팅 투표</h2>
    <p>
      시청자가 채팅창에 <code>!투표 1</code>, <code>!투표 2</code>처럼 번호를 입력하면
      실시간으로 집계되는 방송용 투표 도구입니다. 진행자가 투표 항목과 제한 시간을
      정하면 오버레이에 막대그래프 형태로 결과가 실시간 표시되고, 시간이 끝나면 최종
      결과를 공개하는 연출까지 포함되어 있습니다. 시청자 반응을 즉석에서 콘텐츠로
      끌어오고 싶을 때 유용합니다.
    </p>

    <h2>랜덤 문장 만들기</h2>
    <p>
      "누가·어디서·무엇을·어떻게·왜"처럼 문장을 이루는 각 항목을 시청자 채팅으로
      나누어 응모받은 뒤, 항목별로 가중 추첨해 하나의 완성된 문장을 만들어내는
      방송용 콘텐츠입니다. 채팅이 다 함께 만든 문장이 오버레이에 순서대로 조립되어
      나타나며, 완성된 문장은 히스토리로 남아 다시 돌아볼 수 있습니다.
    </p>

    <h2>자주 묻는 질문</h2>
    <h3>로그인이 꼭 필요한가요?</h3>
    <p>아니요. 세 도구 모두 익명 상태에서 바로 사용할 수 있습니다. 채널 연결에는
      치지직/SOOP 채널 ID만 있으면 됩니다.</p>
    <h3>치지직과 SOOP(숲) 둘 다 지원하나요?</h3>
    <p>네, 두 플랫폼의 채팅·후원 연동을 모두 지원합니다. 다만 두 플랫폼의 공식 API
      제약이 서로 달라 일부 세부 동작에는 차이가 있을 수 있습니다.</p>
    <h3>이용 요금이 있나요?</h3>
    <p>없습니다. 개인이 만들어 무료로 배포하는 오픈소스 프로젝트입니다.</p>

    <h2>문의</h2>
    <p>버그 제보나 기능 제안은 <a href="${REPO_ISSUES_URL}">GitHub Issues</a>로
      남겨주세요.</p>
  </article>${adSlotHtml('ad-slot-about')}${footerNav(1, 'about/')}
</main>`

mkdirSync(path.join(outDir, 'about'), { recursive: true })
writeFileSync(
  path.join(outDir, 'about', 'index.html'),
  pageShell({
    title: 'stream 소개 — SOOP·치지직 방송 도구 모음',
    description:
      'SOOP·치지직 방송용 후원 랜덤 룰렛·채팅 투표·랜덤 문장 만들기 사용법과 채팅 연동 방법을 소개합니다.',
    urlPath: '/about/',
    depth: 1,
    bodyHtml: aboutBody,
  }),
)

// ---------------------------------------------------------------------------
// 개인정보처리방침
// ---------------------------------------------------------------------------

const privacyBody = `<main class="content">
  <a class="back-link" href="../">&larr; 홈으로</a>
  <article>
    <h1>개인정보처리방침</h1>
    <p class="meta">시행일자: 2026년 9월 4일</p>

    <p>stream(이하 "이 사이트")은 SOOP·치지직 방송인을 위한 무료 채팅 연동 도구
      모음이며, 아래와 같이 개인정보를 처리합니다.</p>

    <h2>1. 수집하는 정보</h2>
    <p>후원 랜덤 룰렛·채팅 투표·랜덤 문장 만들기 도구는 회원가입 없이 익명으로
      이용할 수 있으며, 이용자를 식별할 수 있는 개인정보를 별도로 수집하지 않습니다.
      치지직/SOOP 채널 연동에는 공개된 채널 ID만 사용합니다. 일부 데모·연동
      페이지에서 사용하는 OAuth 로그인은 인증 토큰만 암호화하여 서버에 저장하며,
      비밀번호는 이 사이트를 거치지 않고 각 플랫폼에서 직접 처리됩니다.</p>

    <h2>2. 쿠키와 광고</h2>
    <p>이 사이트는 Google AdSense를 통해 광고를 게재할 수 있습니다. Google을
      비롯한 제3자 광고 공급업체는 쿠키를 사용해 이용자가 이 사이트 또는 다른
      웹사이트를 방문한 기록을 바탕으로 광고를 게재할 수 있습니다. 이용자는
      <a href="https://adssettings.google.com/" rel="noopener">Google 광고 설정</a>에서
      맞춤 광고 게재에 사용되는 쿠키를 비활성화할 수 있으며,
      <a href="https://www.aboutads.info/choices/" rel="noopener">aboutads.info</a>에서도
      맞춤 광고 관련 설정을 관리할 수 있습니다.</p>

    <h2>3. 제3자 서비스</h2>
    <p>광고 게재를 위해 Google AdSense를 이용합니다. 채팅 연동을 위해 자체
      SSE(Server-Sent Events) 프록시 서버를 운영하며, 이 프록시는 치지직/SOOP의
      공개 채팅 데이터를 중계하는 용도로만 사용되고 별도로 저장하지 않습니다.</p>

    <h2>4. 이용자의 권리</h2>
    <p>저장된 인증 토큰의 삭제 등 개인정보 관련 문의는 아래 문의처로 연락해
      주시면 신속히 처리하겠습니다.</p>

    <h2>5. 문의처</h2>
    <p><a href="${REPO_ISSUES_URL}">GitHub Issues</a>로 문의해 주세요.</p>

    <h2>6. 정책 변경</h2>
    <p>이 개인정보처리방침이 변경되는 경우 이 페이지를 통해 공지합니다.</p>
  </article>${footerNav(1, 'privacy/')}
</main>`

mkdirSync(path.join(outDir, 'privacy'), { recursive: true })
writeFileSync(
  path.join(outDir, 'privacy', 'index.html'),
  pageShell({
    title: '개인정보처리방침 — stream',
    description:
      'stream 사이트의 개인정보 수집·이용, 쿠키, 광고(Google AdSense) 관련 처리방침입니다.',
    urlPath: '/privacy/',
    depth: 1,
    bodyHtml: privacyBody,
  }),
)

// ---------------------------------------------------------------------------
// 이용약관
// ---------------------------------------------------------------------------

const termsBody = `<main class="content">
  <a class="back-link" href="../">&larr; 홈으로</a>
  <article>
    <h1>이용약관</h1>
    <p class="meta">시행일자: 2026년 9월 4일</p>

    <h2>제1조 (목적)</h2>
    <p>이 약관은 stream(이하 "이 사이트")이 제공하는 방송용 채팅 연동 도구의
      이용 조건과 절차, 이용자와 운영자의 권리·의무를 규정합니다.</p>

    <h2>제2조 (서비스 설명)</h2>
    <p>이 사이트는 개인이 무료로 제작·배포하는 오픈소스 프로젝트이며, SOOP·치지직
      방송에서 시청자 채팅과 상호작용할 수 있는 후원 랜덤 룰렛, 채팅 투표,
      랜덤 문장 만들기 등의 조작 페이지를 제공합니다.</p>

    <h2>제3조 (이용자의 의무)</h2>
    <p>이용자는 이 사이트의 도구를 통해 치지직·SOOP에서 방송을 진행할 때 각
      플랫폼의 이용약관과 관련 법령을 함께 준수해야 합니다. 이 사이트는 두
      플랫폼의 공식 API 외에 비공식 API를 일부 사용하며, 각 플랫폼의 정책
      변경에 따라 사전 고지 없이 기능이 변경되거나 중단될 수 있습니다.</p>

    <h2>제4조 (면책조항)</h2>
    <p>이 사이트는 무료로 제공되는 개인 프로젝트로서, 서비스의 지속적인 가용성이나
      오류 없는 동작을 보장하지 않습니다. 비공식 API의 변경, 각 플랫폼의 정책
      변경, 서버 비용 초과에 따른 일시 중단 등으로 발생하는 손해에 대해 운영자는
      책임을 지지 않습니다.</p>

    <h2>제5조 (지적재산권)</h2>
    <p>치지직·SOOP의 명칭, 로고, 브랜드 색상 등은 각 사의 소유이며, 이 사이트는
      해당 브랜드 가이드라인을 따릅니다
      (<a href="https://chzzk.gitbook.io/chzzk/resources/brand-guides" rel="noopener">치지직 Brand Guides</a>,
      <a href="https://corp.sooplive.com/company.php?page=ci" rel="noopener">SOOP CI</a>).
      이 사이트가 직접 제작한 코드는 저장소의 라이선스 조건을 따릅니다.</p>

    <h2>제6조 (준거법 및 문의)</h2>
    <p>이 약관은 대한민국 법령에 따라 해석됩니다. 약관 관련 문의는
      <a href="${REPO_ISSUES_URL}">GitHub Issues</a>로 남겨주세요.</p>
  </article>${footerNav(1, 'terms/')}
</main>`

mkdirSync(path.join(outDir, 'terms'), { recursive: true })
writeFileSync(
  path.join(outDir, 'terms', 'index.html'),
  pageShell({
    title: '이용약관 — stream',
    description:
      'stream 사이트가 제공하는 방송용 오버레이 도구의 이용조건과 면책조항을 안내합니다.',
    urlPath: '/terms/',
    depth: 1,
    bodyHtml: termsBody,
  }),
)

// ---------------------------------------------------------------------------
// sitemap.xml / robots.txt / ads.txt
// ---------------------------------------------------------------------------
// wakmenu·chat-test는 apps.json에 없으므로 자동으로 sitemap에서 제외됩니다.

const sitemapUrls = [
  `${SITE_URL}/`,
  `${SITE_URL}/about/`,
  `${SITE_URL}/privacy/`,
  `${SITE_URL}/terms/`,
  ...apps.map((app) => `${SITE_URL}/${app.path}`),
]

const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls.map((url) => `  <url><loc>${url}</loc></url>`).join('\n')}
</urlset>
`
writeFileSync(path.join(outDir, 'sitemap.xml'), sitemapXml)

const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`
writeFileSync(path.join(outDir, 'robots.txt'), robotsTxt)

writeFileSync(
  path.join(outDir, 'ads.txt'),
  `google.com, ${ADSENSE_PUBLISHER_ID}, DIRECT, f08c47fec0942fa0\n`,
)

console.log(
  `[build-index] ${apps.length}개 앱 + 소개/개인정보처리방침/이용약관 + sitemap/robots/ads.txt 생성 → ${outDir}`,
)
