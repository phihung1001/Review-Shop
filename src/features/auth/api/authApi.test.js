import { afterEach, describe, expect, it, vi } from 'vitest'
import { forgotPassword, login, logout, refreshSession, register, resetPassword } from './authApi.js'

function jsonResponse(body = {}, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

describe('auth API payloads', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('sends the exact login payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse())
    vi.stubGlobal('fetch', fetchMock)
    await login({ email: 'client@example.com', password: 'password-12-chars' })
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ email: 'client@example.com', password: 'password-12-chars' })
  })

  it('logs out through the authenticated session endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)
    await logout()
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/auth\/logout$/)
    expect(fetchMock.mock.calls[0][1].method).toBe('POST')
    expect(fetchMock.mock.calls[0][1].credentials).toBe('include')
    expect(fetchMock.mock.calls[0][1].headers).not.toHaveProperty('X-CSRF-Token')
  })

  it('sends the exact encoded CSRF cookie value without transforming it', async () => {
    document.cookie = 'csrf_token=csrf%20value; path=/'
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ message: 'Logout successfully' }))
    vi.stubGlobal('fetch', fetchMock)

    await logout()

    expect(fetchMock.mock.calls[0][1].headers['X-CSRF-Token']).toBe('csrf%20value')
    document.cookie = 'csrf_token=; Max-Age=0; path=/'
  })

  it('refreshes the session with credentials and the CSRF cookie', async () => {
    document.cookie = 'csrf_token=refresh-csrf; path=/'
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ message: 'Token refreshed successfully', user: { id: 1 } }))
    vi.stubGlobal('fetch', fetchMock)

    await refreshSession()

    expect(fetchMock.mock.calls[0][0]).toMatch(/\/auth\/refresh$/)
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: 'POST',
      credentials: 'include',
      headers: expect.objectContaining({ 'X-CSRF-Token': 'refresh-csrf' }),
    })
    document.cookie = 'csrf_token=; Max-Age=0; path=/'
  })

  it('sends a whitelisted registration role and excludes UI-only fields', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse())
    vi.stubGlobal('fetch', fetchMock)
    await register({ fullName: 'Nguyen Van A', email: 'client@example.com', password: 'password-12-chars', confirmPassword: 'ignored', acceptTerms: true, role: 'FREELANCER' })
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ fullName: 'Nguyen Van A', email: 'client@example.com', password: 'password-12-chars', role: 'FREELANCER' })
  })

  it('falls back to CLIENT when a role is not allowed', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse())
    vi.stubGlobal('fetch', fetchMock)
    await register({ fullName: 'Nguyen Van A', email: 'client@example.com', password: 'password-12-chars', role: 'ADMIN' })
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).role).toBe('CLIENT')
  })

  it('sends only email for forgot password', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse())
    vi.stubGlobal('fetch', fetchMock)
    await forgotPassword('client@example.com')
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ email: 'client@example.com' })
  })

  it('sends the exact reset password payload and excludes confirmation', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse())
    vi.stubGlobal('fetch', fetchMock)
    await resetPassword({ email: 'client@example.com', otp: '123456', newPassword: ' secret1 ', confirmPassword: 'ignored' })
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/v1\/auth\/reset-password$/)
    expect(fetchMock.mock.calls[0][1].method).toBe('POST')
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ email: 'client@example.com', otp: '123456', newPassword: ' secret1 ' })
  })
})
