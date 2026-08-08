import { AuthError, type Platform, ReauthorizationRequiredError } from '@stream/core'
import type { TokenStore } from './store/types'
import {
  type AccountIdentity,
  type Credential,
  isExpired,
  type OAuthProvider,
  oauthCredential,
  type TokenSet,
} from './types'

export interface TokenManagerOptions {
  provider: OAuthProvider
  store: TokenStore
  /** 만료 이 시간 전이면 미리 갱신합니다. 기본 60초. */
  refreshSkewMs?: number
  /** 갱신 성공 시 호출. 쿠키 재설정 같은 부수효과를 걸 때 씁니다. */
  onRefresh?: (key: string, tokens: TokenSet) => void | Promise<void>
  now?: () => number
}

export function tokenKey(platform: Platform, subject = 'default'): string {
  return `${platform}:${subject}`
}

/**
 * 저장소에서 토큰을 꺼내 필요하면 자동 갱신해서 돌려줍니다.
 *
 * 이 클래스가 존재하는 이유는 사실상 하나입니다. 치지직 리프레시 토큰은 1회용이고
 * 갱신할 때마다 회전합니다. 동시에 두 번 갱신하면 늦게 도착한 쪽이 이미 죽은
 * 리프레시 토큰을 쓰게 되고, 그 순간 토큰 체인이 끊겨 사용자가 처음부터 다시
 * 인가해야 합니다. single-flight로 갱신 요청을 하나로 합쳐 그 상황을 막습니다.
 *
 * 주의: 이 보호는 프로세스 내부에서만 유효합니다. 여러 인스턴스가 같은 토큰을
 * 공유한다면 분산 락이 있는 TokenStore가 필요합니다.
 */
export class TokenManager {
  private readonly provider: OAuthProvider
  private readonly store: TokenStore
  private readonly refreshSkewMs: number
  private readonly onRefresh?: (key: string, tokens: TokenSet) => void | Promise<void>
  private readonly now: () => number
  private readonly inflight = new Map<string, Promise<TokenSet>>()

  constructor(options: TokenManagerOptions) {
    this.provider = options.provider
    this.store = options.store
    this.refreshSkewMs = options.refreshSkewMs ?? 60_000
    this.onRefresh = options.onRefresh
    this.now = options.now ?? (() => Date.now())
  }

  get platform(): Platform {
    return this.provider.platform
  }

  key(subject?: string): string {
    return tokenKey(this.provider.platform, subject)
  }

  async save(key: string, tokens: TokenSet): Promise<void> {
    await this.store.set(key, tokens)
  }

  /** 저장된 토큰이 없으면 undefined. 있으면 필요 시 갱신해서 돌려줍니다. */
  async get(key: string): Promise<TokenSet | undefined> {
    const stored = await this.store.get(key)
    if (!stored) return undefined
    if (!isExpired(stored, this.refreshSkewMs, this.now())) return stored
    return this.refresh(key, stored)
  }

  /** 토큰이 없으면 재인가가 필요하다는 에러를 던집니다. */
  async require(key: string): Promise<TokenSet> {
    const tokens = await this.get(key)
    if (!tokens) {
      throw new ReauthorizationRequiredError(
        `${this.provider.platform} 계정이 연결되어 있지 않습니다.`,
        { platform: this.provider.platform },
      )
    }
    return tokens
  }

  async getCredential(key: string): Promise<Credential | undefined> {
    const tokens = await this.get(key)
    return tokens ? oauthCredential(this.provider.platform, tokens) : undefined
  }

  async getIdentity(key: string): Promise<AccountIdentity> {
    return this.provider.getIdentity(
      oauthCredential(this.provider.platform, await this.require(key)),
    )
  }

  /**
   * 강제 갱신. 이미 진행 중인 갱신이 있으면 그 결과를 함께 기다립니다.
   * `current`를 넘기면 저장소를 한 번 덜 읽습니다.
   */
  refresh(key: string, current?: TokenSet): Promise<TokenSet> {
    const existing = this.inflight.get(key)
    if (existing) return existing

    const promise = this.performRefresh(key, current).finally(() => {
      this.inflight.delete(key)
    })
    this.inflight.set(key, promise)
    return promise
  }

  async revoke(key: string): Promise<void> {
    const tokens = await this.store.get(key)
    // 저장소부터 비웁니다. 원격 폐기가 실패해도 로컬에 죽은 토큰이 남지 않게 합니다.
    await this.store.delete(key)
    if (tokens && this.provider.supportsRevoke) {
      await this.provider.revoke(tokens)
    }
  }

  private async performRefresh(key: string, current?: TokenSet): Promise<TokenSet> {
    const tokens = current ?? (await this.store.get(key))
    if (!tokens) {
      throw new ReauthorizationRequiredError(
        `${this.provider.platform} 저장된 토큰이 없어 갱신할 수 없습니다.`,
        { platform: this.provider.platform },
      )
    }
    if (!tokens.refreshToken) {
      await this.store.delete(key)
      throw new ReauthorizationRequiredError(
        `${this.provider.platform} 리프레시 토큰이 없습니다. 다시 인가해야 합니다.`,
        { platform: this.provider.platform },
      )
    }

    let next: TokenSet
    try {
      next = await this.provider.refresh(tokens)
    } catch (error) {
      if (error instanceof AuthError) {
        // 플랫폼이 인증 거부를 했다는 것은 저장된 리프레시 토큰이 이미 죽었다는 뜻입니다.
        // 그대로 두면 이후 모든 요청이 같은 에러로 실패하므로 지우고 재인가를 요구합니다.
        await this.store.delete(key)
        throw new ReauthorizationRequiredError(
          `${this.provider.platform} 토큰 갱신이 거부되었습니다. 다시 인가해야 합니다.`,
          { platform: this.provider.platform, cause: error },
        )
      }
      // 네트워크/일시적 오류라면 저장된 토큰은 아직 유효할 수 있으므로 건드리지 않습니다.
      throw error
    }

    await this.store.set(key, next)
    await this.onRefresh?.(key, next)
    return next
  }
}
