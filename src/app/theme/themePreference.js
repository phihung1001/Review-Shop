const STORAGE_KEY = 'review-shop-theme'
const listeners = new Set()

function readStoredTheme() {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY)
    return value === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

let currentTheme = typeof window === 'undefined' ? 'light' : readStoredTheme()

function applyTheme(theme) {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
}

applyTheme(currentTheme)

export const themePreference = {
  subscribe(listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  getSnapshot() {
    return currentTheme
  },
  set(theme) {
    const nextTheme = theme === 'dark' ? 'dark' : 'light'
    if (nextTheme === currentTheme) return
    currentTheme = nextTheme
    applyTheme(nextTheme)
    try { window.localStorage.setItem(STORAGE_KEY, nextTheme) } catch { /* Storage can be unavailable in private mode. */ }
    listeners.forEach((listener) => listener())
  },
  toggle() {
    this.set(currentTheme === 'dark' ? 'light' : 'dark')
  },
}
