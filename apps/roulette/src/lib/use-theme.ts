'use client'

import { useCallback, useSyncExternalStore } from 'react'
import { applyTheme, getDocumentTheme, THEME_EVENT, type Theme, toggleTheme } from './theme'

function subscribe(onStoreChange: () => void): () => void {
  window.addEventListener(THEME_EVENT, onStoreChange)
  window.addEventListener('storage', onStoreChange)
  return () => {
    window.removeEventListener(THEME_EVENT, onStoreChange)
    window.removeEventListener('storage', onStoreChange)
  }
}

/** 현재 문서에 적용된 라이트/다크 테마를 구독합니다. */
export function useTheme(): {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggle: () => void
} {
  const theme = useSyncExternalStore(subscribe, getDocumentTheme, () => 'dark' as Theme)

  const setTheme = useCallback((next: Theme) => {
    applyTheme(next)
  }, [])

  const toggle = useCallback(() => {
    toggleTheme(theme)
  }, [theme])

  return { theme, setTheme, toggle }
}
