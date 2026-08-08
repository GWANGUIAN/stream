export type ThemeMode = 'dark' | 'light'

const STORAGE_KEY = 'stream-poll:theme:v1'

export function getStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'dark'
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

export function applyTheme(mode: ThemeMode): void {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.theme = mode
  try {
    window.localStorage.setItem(STORAGE_KEY, mode)
  } catch {
    // 저장 공간 부족 등은 조용히 무시합니다.
  }
}

/**
 * 페인트 전에 저장된 테마를 적용하는 인라인 스크립트. FOUC(깜빡임)를 막습니다.
 * layout의 `<head>`에 `dangerouslySetInnerHTML`로 주입합니다.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=window.localStorage.getItem('${STORAGE_KEY}');document.documentElement.dataset.theme=t==='light'?'light':'dark';}catch(e){document.documentElement.dataset.theme='dark';}})();`
