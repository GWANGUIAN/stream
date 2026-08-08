'use client'

export async function refreshPlatform(platform: 'chzzk' | 'soop') {
  const res = await fetch(`/api/auth/${platform}/refresh`, { method: 'POST' })
  const data = (await res.json()) as { error?: string }
  if (!res.ok) throw new Error(data.error ?? 'refresh failed')
  window.location.reload()
}

export async function logoutPlatform(platform: 'chzzk' | 'soop') {
  await fetch(`/api/auth/${platform}/logout`, { method: 'POST' })
  window.location.reload()
}
