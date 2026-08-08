import { type CookieAccessor, CookieTokenStore, type TokenSet, tokenKey } from '@stream/auth'
import type { Platform } from '@stream/core'
import { cookies } from 'next/headers'
import { getEnv } from './env'

async function cookieAccessor(): Promise<CookieAccessor> {
  const jar = await cookies()
  return {
    get(name) {
      return jar.get(name)?.value
    },
    set(name, value, options) {
      jar.set(name, value, {
        httpOnly: options.httpOnly,
        secure: options.secure,
        sameSite: options.sameSite,
        path: options.path,
        maxAge: options.maxAge,
      })
    },
    delete(name) {
      jar.delete(name)
    },
  }
}

export async function tokenStore(): Promise<CookieTokenStore> {
  const env = getEnv()
  return new CookieTokenStore({
    secret: env.AUTH_SECRET,
    cookies: await cookieAccessor(),
    secure: env.NODE_ENV === 'production',
  })
}

export async function getStoredTokens(platform: Platform): Promise<TokenSet | undefined> {
  const store = await tokenStore()
  return store.get(tokenKey(platform))
}

export async function saveTokens(platform: Platform, tokens: TokenSet): Promise<void> {
  const store = await tokenStore()
  await store.set(tokenKey(platform), tokens)
}

export async function clearTokens(platform: Platform): Promise<void> {
  const store = await tokenStore()
  await store.delete(tokenKey(platform))
}

export async function setStateCookie(
  name: string,
  value: string,
  maxAgeSeconds: number,
): Promise<void> {
  const jar = await cookies()
  const env = getEnv()
  jar.set(name, value, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeSeconds,
  })
}

export async function readStateCookie(name: string): Promise<string | undefined> {
  const jar = await cookies()
  return jar.get(name)?.value
}

export async function clearStateCookie(name: string): Promise<void> {
  const jar = await cookies()
  jar.delete(name)
}
