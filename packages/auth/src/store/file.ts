import { randomBytes } from 'node:crypto'
import { chmod, mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { seal, unseal } from '../crypto'
import type { TokenSet } from '../types'
import type { TokenStore } from './types'

export interface FileTokenStoreOptions {
  /** 기본 `.tokens/tokens.json`. .gitignore에 이미 들어 있습니다. */
  filePath?: string
  /**
   * 지정하면 파일 내용을 AES-256-GCM으로 암호화합니다.
   * 리프레시 토큰이 평문으로 디스크에 남지 않게 하려면 채우세요.
   */
  secret?: string
}

const FILE_PURPOSE = 'token-file'

/**
 * 단일 JSON 파일 기반 저장소. 로컬 개발과 CLI 도구용입니다.
 *
 * 쓰기는 임시 파일 + rename으로 원자적으로 처리하고, 프로세스 내 쓰기는 하나의
 * 체인으로 직렬화합니다. 그래도 여러 프로세스가 같은 파일을 쓰면 마지막 쓰기가
 * 이기므로, 그런 환경에서는 DB 기반 TokenStore를 쓰세요.
 */
export class FileTokenStore implements TokenStore {
  private readonly filePath: string
  private readonly secret?: string
  private queue: Promise<unknown> = Promise.resolve()

  constructor(options: FileTokenStoreOptions = {}) {
    this.filePath = resolve(options.filePath ?? '.tokens/tokens.json')
    this.secret = options.secret
  }

  async get(key: string): Promise<TokenSet | undefined> {
    const all = await this.readAll()
    return all[key]
  }

  async set(key: string, tokens: TokenSet): Promise<void> {
    await this.mutate((all) => {
      all[key] = tokens
    })
  }

  async delete(key: string): Promise<void> {
    await this.mutate((all) => {
      delete all[key]
    })
  }

  async keys(): Promise<string[]> {
    return Object.keys(await this.readAll())
  }

  private async readAll(): Promise<Record<string, TokenSet>> {
    let raw: string
    try {
      raw = await readFile(this.filePath, 'utf8')
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {}
      throw error
    }
    if (!raw.trim()) return {}

    const decoded = this.secret ? unseal(this.secret, FILE_PURPOSE, raw.trim()) : raw
    if (decoded === undefined) {
      // 시크릿이 바뀌면 기존 파일을 못 읽습니다. 재인증하면 되므로 치명적이지 않습니다.
      return {}
    }
    try {
      return JSON.parse(decoded) as Record<string, TokenSet>
    } catch {
      return {}
    }
  }

  private mutate(apply: (all: Record<string, TokenSet>) => void): Promise<void> {
    const next = this.queue.then(async () => {
      const all = await this.readAll()
      apply(all)
      await this.writeAll(all)
    })
    // 실패해도 다음 작업이 진행되도록 체인은 항상 resolve 상태로 넘깁니다.
    this.queue = next.catch(() => undefined)
    return next
  }

  private async writeAll(all: Record<string, TokenSet>): Promise<void> {
    const serialized = JSON.stringify(all, null, 2)
    const payload = this.secret ? seal(this.secret, FILE_PURPOSE, serialized) : serialized

    await mkdir(dirname(this.filePath), { recursive: true })
    const tempPath = `${this.filePath}.${randomBytes(6).toString('hex')}.tmp`
    await writeFile(tempPath, payload, { encoding: 'utf8', mode: 0o600 })
    await rename(tempPath, this.filePath)
    // Windows에서는 chmod가 사실상 무시되지만, POSIX에서 rename 후 권한을 보장합니다.
    await chmod(this.filePath, 0o600).catch(() => undefined)
  }
}
