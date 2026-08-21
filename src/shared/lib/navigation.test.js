import { describe, expect, it, vi } from 'vitest'
import { handleInternalNavigation } from './navigation.js'

describe('internal navigation', () => {
  it('uses SPA navigation for an unmodified same-origin link click', () => {
    window.history.replaceState({}, '', '/')
    const anchor = document.createElement('a')
    anchor.href = '/dashboard'
    const event = {
      defaultPrevented: false,
      button: 0,
      metaKey: false,
      ctrlKey: false,
      shiftKey: false,
      altKey: false,
      target: anchor,
      preventDefault: vi.fn(),
    }

    handleInternalNavigation(event)

    expect(event.preventDefault).toHaveBeenCalledOnce()
    expect(window.location.pathname).toBe('/dashboard')
  })

  it('preserves modified clicks so links can open in a new tab', () => {
    const anchor = document.createElement('a')
    anchor.href = '/dashboard'
    const event = {
      defaultPrevented: false,
      button: 0,
      metaKey: false,
      ctrlKey: true,
      shiftKey: false,
      altKey: false,
      target: anchor,
      preventDefault: vi.fn(),
    }

    handleInternalNavigation(event)
    expect(event.preventDefault).not.toHaveBeenCalled()
  })
})
