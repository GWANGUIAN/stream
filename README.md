# live-streaming

SOOP(숲)과 치지직 방송 컨텐츠를 만들기 위한 pnpm 워크스페이스 모노레포입니다.

## 구성

| 패키지 | 설명 |
| --- | --- |
| `@stream/config` | 공유 tsconfig / vitest 프리셋 |
| `@stream/core` | 플랫폼 중립 타입, 에러 계층, 재시도 HTTP 클라이언트 |
| `@stream/auth` | **OAuth 로그인.** 버튼 → 인가 → 콜백 → 토큰 저장/갱신 |
| `@stream/api` | **채널·라이브·채팅 연결 준비.** `getStreamer` / `getLive` / `getChatConnection` |
| `@stream/chat` | 정규화된 실시간 채팅 WebSocket (`@stream/api`로 부트스트랩) |
| `@stream/events` | 채팅·라이브 이벤트 버스 (필터 / dedupe / debounce) |
| `@stream/sse` | 서버 chat → SSE 브릿지 + 브라우저 구독 헬퍼 |
| `@stream/alerts` | 도네이션·구독 알림 우선순위 큐 |
| `@stream/bot` | 채팅 명령어·자동응답 프레임워크 |
| `@stream/session` | 크리에이터 프로필·설정·토큰 영속화 (Memory / File) |
| `@stream/live` | 방송 시작/종료 폴링 모니터 · uptime |
| `@stream/goals` | 후원/구독/메시지 목표 트래커 |
| `@stream/poll` | 채팅 투표 · 추첨 |
| `@stream/tts` | 알림 TTS 어댑터 (provider 주입) |
| `@stream/analytics` | 채팅·후원 집계 스냅샷 |
| `@stream/scheduler` | 방송 일정 · webhook outbox |
| `@stream/media` | 썸네일·플레이어/VOD URL 헬퍼 |
| `@stream/chat-ui` | 방송용 채팅 라인/리스트 컴포넌트 |
| `@stream/overlay` | OBS Browser Source용 오버레이 위젯 |
| `@stream/ui` | shadcn 스타일 UI + 치지직·SOOP 브랜드 로그인 버튼 |
| `@stream/roulette` | 도네이션 → 아이템 자동 등록, 가중치 추첨, 히스토리/되돌리기 헤드리스 룰렛 엔진 |
| `apps/demo` | OAuth 로그인 · 채널 조회 · 채팅 검증용 Next.js 데모 |
| `apps/roulette` | 도네이션 랜덤 룰렛 조작 페이지 + OBS 투명 오버레이 (Next.js, 포트 3001) |

```
유저 OAuth 로그인  →  @stream/auth
스트리머/라이브 조회 →  @stream/api   (Credential 소비, 기본 익명)
실시간 채팅         →  @stream/chat  (@stream/api.getChatConnection)
이벤트 버스         →  @stream/events
SSE / 오버레이      →  @stream/sse · @stream/alerts · @stream/overlay
```

내부 패키지는 TypeScript 소스를 그대로 export합니다 (`exports` → `./src/index.ts`).
TypeScript 7 네이티브 컴파일러에는 기존 `tsc` JS API가 없어 별도 라이브러리 빌드
단계를 두지 않았습니다. Next.js가 `transpilePackages`로 함께 묶고,
`experimental.useTypeScriptCli`로 타입체크합니다.

파일 기반 토큰 저장소는 fs를 쓰므로 별도 엔트리입니다.

```ts
import { FileTokenStore } from '@stream/auth/file-store'
```

### `@stream/ui`

```ts
import { ChzzkLoginButton, SoopLoginButton, Button, Card } from '@stream/ui'
import '@stream/ui/styles.css'
```

데모 앱은 Tailwind v4로 스타일을 묶고, 홈·대시보드 CTA에 `ChzzkLoginButton` /
`SoopLoginButton`을 씁니다.

로그인 버튼은 흰 배경에 브랜드 워드마크(치지직 `#00FFA3` / SOOP 그라데이션 OO)와
라벨을 같이 보여 줍니다. 공식 로고 배포 ZIP은 포함하지 않으며, 상업적·변형 사용은
각사 가이드를 따르세요.

- [치지직 Brand Guides](https://chzzk.gitbook.io/chzzk/resources/brand-guides)
- [SOOP CI](https://corp.sooplive.com/company.php?page=ci)

브랜드 색 토큰: 치지직 `#00FFA3` / on `#0B0B0B`, SOOP Essential Blue `#0182FF` / on `#FFFFFF`
(`@stream/ui/brand`).

## 시작하기

```bash
corepack enable pnpm
pnpm install
cp .env.example apps/demo/.env.local   # 값 채우기
pnpm --filter @stream/demo dev
```

`http://localhost:3000` 접속.

- `/` — **치지직/SOOP으로 로그인** (OAuth)
- `/dashboard` — 로그인된 내 계정 · 토큰 만료 · 갱신/해제
- `/channel` — `@stream/api` 스트리머·라이브 조회
- `/chat` — 실시간 채팅

`AUTH_SECRET`만 있으면 데모가 뜹니다. 치지직 OAuth는 `CHZZK_CLIENT_*`가 필요하고,
SOOP OAuth는 파트너 키가 없으면 버튼이 비활성입니다(채널 조회·채팅은 익명으로 가능).

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 도네이션 랜덤 룰렛 (`apps/roulette`)

```bash
pnpm --filter @stream/roulette-app dev
```

`http://localhost:3001` 접속. 환경변수·`AUTH_SECRET` 없이 익명 크리덴셜로 바로 뜹니다.

- `/` — 조작 페이지. 플랫폼(숲/치지직) · 스트리머 ID 연결, 도네 등록 규칙(단위값/방식/상한),
  접수 타이머, 아이템 수동 편집·프리셋, 룰렛 스핀, 히스토리, 리허설 도네 주입
- `/overlay` — OBS 브라우저 소스용 투명 배경 페이지. 제목 + 원판 + 최근 등록 토스트만 표시,
  `BroadcastChannel`로 조작 페이지와 실시간 동기화 (조작 페이지의 "오버레이 URL 복사" 버튼 참고)
- 단축키: `Space` 스핀, `T` 접수 타이머 시작/정지, `H` 히스토리 열기

## 사용 예

```ts
import { ChzzkOAuthProvider, TokenManager, MemoryTokenStore } from '@stream/auth'
import { createStreamApi } from '@stream/api'
import { createChatClient } from '@stream/chat'

// 1) OAuth 로그인 (앱의 /login → redirect → /callback)
const provider = new ChzzkOAuthProvider({ clientId, clientSecret, redirectUri, secret })
const { url, stateCookie } = provider.createAuthorization()
// ... 콜백에서 exchangeCode → TokenManager.save

// 2) 채널/라이브 조회 (로그인과 독립, 익명 가능)
const api = createStreamApi({ platform: 'chzzk' })
const streamer = await api.getStreamer(channelId)
const live = await api.getLive(channelId)

// 3) 채팅
const chat = createChatClient({ platform: 'chzzk', channelId })
chat.on((event) => console.log(event))
await chat.connect()

// 4) 이벤트 버스 → 알림/봇/목표
import { createEventBus } from '@stream/events'
import { createAlertQueue } from '@stream/alerts'
import { createCommandBot, builtinCommands } from '@stream/bot'

const bus = createEventBus({ dedupeWindowMs: 1000 })
bus.attachChatClient(chat)

const alerts = createAlertQueue({ minDonationAmount: 1000 })
alerts.attachEventBus(bus)

const bot = createCommandBot({
  channelId,
  commands: builtinCommands({ discord: 'https://discord.gg/…' }),
})
bot.attachEventBus(bus)
```

## 두 플랫폼의 실제 제약

이 저장소의 설계 결정 대부분이 아래 사실에서 나왔습니다.

### 치지직

공식 Open API(`openapi.chzzk.naver.com`)가 OAuth 2.0을 제공하지만 표준과 여러 곳이 다릅니다.

- 인가 URL만 `chzzk.naver.com/account-interlock`이라는 **다른 도메인**에 있습니다.
- 토큰 요청이 form-encoded가 아니라 **JSON 바디**입니다.
- 모든 응답이 `{ code, message, content }` 봉투에 싸여 옵니다.
- **리프레시 토큰은 1회용이며 매 갱신마다 회전합니다.** 동시에 두 번 갱신하면
  토큰 체인이 끊겨 사용자가 재인증해야 합니다. `TokenManager`의 single-flight가
  이걸 막습니다.
- 공식 API에는 "특정 채널이 지금 방송 중인가"를 묻는 엔드포인트가 **없습니다.**
  이것이 `@stream/api`의 비공식 어댑터가 필요한 이유입니다.

앱 등록 시 주의: 앱 ID/이름에 `chzzk`, `치지직`, `naver`, `네이버`를 쓸 수 없고,
90일간 스코프 사용 이력이 없으면 앱이 자동 삭제됩니다.

### SOOP

- 공식 Open API가 **파트너 전용**입니다. 개인 개발자용 키 발급은 "준비 중"이라
  현재로선 자체적으로 `client_id`를 받을 수 없습니다.
- OAuth가 비표준입니다. `state`, `response_type`, `scope` 파라미터가 **없고**,
  `redirect_uri`는 인가 요청에 싣지 않고 사전 등록합니다.
- 토큰을 `Authorization` 헤더가 아니라 **폼 바디의 `access_token` 필드**로 보냅니다.
- 사용자 프로필 / 특정 스트리머 방송정보 / 시청자 수 엔드포인트가 아예 없습니다.
- `sooplive.co.kr` → `sooplive.com` 도메인 마이그레이션이 진행 중입니다(둘 다 동작).
  그래서 모든 base URL을 주입 가능하게 만들었습니다.

`state`가 없다는 점 때문에 CSRF 방어를 직접 합니다. `@stream/auth`는 HMAC 서명한
nonce를 httpOnly 쿠키에 심고 콜백에서 쿠키로 검증합니다.

## 비공식 API 사용 시 보안 주의

`@stream/api`와 채팅은 공식 OAuth 외에 비공식 HTTP/WebSocket도 씁니다.

- **치지직 쿠키 인증은 네이버 계정 전체 세션(`NID_AUT`/`NID_SES`)을 저장합니다.**
  유출되면 네이버 계정 전체가 털립니다. 대부분의 채팅·채널 **읽기**는 익명으로 충분합니다.
- 네이버는 과도한 비공식 API 호출에 대해 계정 보호조치를 적용할 수 있습니다.
  `@stream/core` HTTP 클라이언트가 백오프를 걸지만 폴링 주기를 임의로 낮추지 마세요.
- 비공식 엔드포인트는 예고 없이 바뀝니다. 응답은 zod로 검증합니다.
- 비공식 엔드포인트는 CORS로 브라우저 직접 호출이 막혀 있습니다. 서버에서 호출하세요.

## 스크립트

| 명령 | 설명 |
| --- | --- |
| `pnpm dev` | 전체 개발 서버 |
| `pnpm build` | 전체 빌드 |
| `pnpm test` | 전체 테스트 |
| `pnpm typecheck` | 타입 체크 |
| `pnpm lint` | Biome 검사 |
| `pnpm format` | Biome 자동 수정 |

## 라이선스

Private. 비공식 API 사용은 각 플랫폼 이용약관을 확인한 뒤 본인 책임하에 하세요.

## 구현된 프로젝트 (GitHub Pages)

랜딩: [https://gwanguian.github.io/stream/](https://gwanguian.github.io/stream/)

| 프로젝트 | 설명 | 주소 |
| --- | --- | --- |
| 도네이션 랜덤 룰렛 | SOOP · 치지직 도네이션으로 아이템이 등록되는 방송용 랜덤 룰렛. 조작 페이지와 OBS 투명 오버레이 포함. | [https://gwanguian.github.io/stream/roulette/](https://gwanguian.github.io/stream/roulette/) |
| 채팅 투표 | SOOP · 치지직 채팅(`!투표 N`)으로 진행하는 방송용 실시간 투표. 타이머·결과 공개·오버레이 포함. | [https://gwanguian.github.io/stream/poll/](https://gwanguian.github.io/stream/poll/) |

> GitHub Pages는 Settings → Pages → Source를 **GitHub Actions**로 켠 뒤, `main` 푸시 시 Actions로 배포됩니다. 정적 호스팅이라 로컬 `pnpm dev`의 채팅 SSE API는 포함되지 않으며, 라이브 채팅 연동은 Node 호스트의 `NEXT_PUBLIC_CHAT_SSE_BASE`가 필요할 수 있습니다.
