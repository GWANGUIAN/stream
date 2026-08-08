'use client'

import { useTheme } from '@/lib/use-theme'

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.05 5.05l1.55 1.55M17.4 17.4l1.55 1.55M18.95 5.05l-1.55 1.55M6.6 17.4l-1.55 1.55"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M16.5 3.5a8.2 8.2 0 1 0 4 12.8 7 7 0 1 1-4-12.8Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** 라이트/다크 모드 전환 버튼. 선택은 localStorage에 저장됩니다. */
export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const nextLabel = theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'

  return (
    <button
      type="button"
      className="btn btn-icon btn-ghost theme-toggle"
      aria-label={nextLabel}
      title={nextLabel}
      onClick={toggle}
    >
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
    </button>
  )
}
