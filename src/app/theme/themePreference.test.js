import { afterEach, describe, expect, it, vi } from 'vitest'
import { themePreference } from './themePreference.js'

describe('themePreference', () => {
  afterEach(() => {
    themePreference.set('light')
    window.localStorage.clear()
    vi.restoreAllMocks()
  })

  it('applies, persists and publishes a dark theme change', () => {
    const listener = vi.fn()
    const unsubscribe = themePreference.subscribe(listener)

    themePreference.set('dark')

    expect(themePreference.getSnapshot()).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(document.documentElement.style.colorScheme).toBe('dark')
    expect(window.localStorage.getItem('review-shop-theme')).toBe('dark')
    expect(listener).toHaveBeenCalledOnce()
    unsubscribe()
  })

  it('toggles back to light without notifying after unsubscribe', () => {
    themePreference.set('dark')
    const listener = vi.fn()
    const unsubscribe = themePreference.subscribe(listener)
    unsubscribe()

    themePreference.toggle()

    expect(themePreference.getSnapshot()).toBe('light')
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(listener).not.toHaveBeenCalled()
  })
})
