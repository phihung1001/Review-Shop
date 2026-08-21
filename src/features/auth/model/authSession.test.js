import { afterEach, describe, expect, it, vi } from 'vitest'
import { authSession } from './authSession.js'
import { getAccessToken } from '@/shared/api/accessToken.js'

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

describe('auth session restoration', () => {
  afterEach(() => {
    authSession.clear()
    vi.unstubAllGlobals()
    document.cookie = 'csrf_token=; Max-Age=0; path=/'
  })

  it('restores the authenticated user after a page reload', async () => {
    document.cookie = 'csrf_token=restore-csrf; path=/'
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({
      message: 'Token refreshed successfully',
      user: { id: 7, fullName: 'Nguyễn Văn A', email: 'user@example.com' },
    })))

    await authSession.retryRestore()

    expect(authSession.getSnapshot()).toEqual({
      status: 'authenticated',
      user: { id: 7, name: 'Nguyễn Văn A', email: 'user@example.com', avatarUrl: '', role: '' },
    })
  })

  it('preserves the admin role after restoring the session', async () => {
    document.cookie = 'csrf_token=admin-csrf; path=/'
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ user: { id: 1, email: 'admin@example.com', role: 'ADMIN' } })))
    await authSession.retryRestore()
    expect(authSession.getSnapshot().user.role).toBe('ADMIN')
  })

  it('normalizes Spring Security role prefixes for route guards', async () => {
    document.cookie = 'csrf_token=client-csrf; path=/'
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ user: { id: 2, role: 'ROLE_CLIENT' } })))
    await authSession.retryRestore()
    expect(authSession.getSnapshot().user.role).toBe('CLIENT')
  })

  it('keeps a refreshed access token in memory and clears it with the session', async () => {
    document.cookie = 'csrf_token=token-csrf; path=/'
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ accessToken: 'refreshed-token', user: { id: 1, role: 'ADMIN' } })))
    await authSession.retryRestore()
    expect(getAccessToken()).toBe('refreshed-token')
    authSession.clear()
    expect(getAccessToken()).toBe('')
  })

  it('becomes anonymous when the refresh token is invalid', async () => {
    document.cookie = 'csrf_token=invalid-session-csrf; path=/'
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ code: 'INVALID_REFRESH_TOKEN' }, 401)))
    await authSession.retryRestore()
    expect(authSession.getSnapshot()).toEqual({ status: 'anonymous', user: null })
  })

  it('becomes anonymous when CSRF validation rejects session restoration', async () => {
    document.cookie = 'csrf_token=stale-csrf; path=/'
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ code: 'INVALID_CSRF_TOKEN' }, 403)))
    await authSession.retryRestore()
    expect(authSession.getSnapshot()).toEqual({ status: 'anonymous', user: null })
  })

  it('does not call refresh before login when there is no CSRF cookie', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await authSession.retryRestore()
    expect(authSession.getSnapshot()).toEqual({ status: 'anonymous', user: null })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('exposes a retryable error when the server cannot be reached', async () => {
    document.cookie = 'csrf_token=network-test-csrf; path=/'
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network unavailable')))
    await authSession.retryRestore()
    expect(authSession.getSnapshot()).toEqual({ status: 'error', user: null })
  })
})
