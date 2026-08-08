'use client'

import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import { applyTheme, getStoredTheme, type ThemeMode } from '@/lib/theme'

export function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>('dark')

  useEffect(() => {
    setMode(getStoredTheme())
  }, [])

  function toggle() {
    const next: ThemeMode = mode === 'dark' ? 'light' : 'dark'
    setMode(next)
    applyTheme(next)
  }

  return (
    <button
      type="button"
      className="btn btn-icon btn-ghost theme-toggle"
      aria-label={mode === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
      onClick={toggle}
    >
      {mode === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
    </button>
  )
}
