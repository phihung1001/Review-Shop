import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, httpClient } from './httpClient.js'
import { clearAccessToken, setAccessToken } from './accessToken.js'

function json(body, status) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

describe('httpClient error responses', () => {
  afterEach(() => {
    clearAccessToken()
    vi.unstubAllGlobals()
  })

  it('keeps authentication headers under the HTTP boundary control', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({}, 200))
    vi.stubGlobal('fetch', fetchMock)
    setAccessToken('session-token')

    await httpClient('/jobs', { headers: { authorization: 'Bearer attacker-supplied-token' } })

    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer session-token')
    expect(fetchMock.mock.calls[0][1].headers.authorization).toBeUndefined()
  })

  it('preserves the backend message on an unsuccessful response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ error: 'Unprocessable Entity', message: 'Client available balance is insufficient to fund this job', status: 422 }, 422)))
    await expect(httpClient('/jobs')).rejects.toEqual(expect.objectContaining({
      name: 'ApiError',
      status: 422,
      message: 'Client available balance is insufficient to fund this job',
    }))
  })

  it('uses a safe fallback when the backend omits its message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ error: 'Server Error', status: 500 }, 500)))
    await expect(httpClient('/jobs')).rejects.toEqual(expect.objectContaining({ message: 'Yêu cầu không thành công.' }))
  })

  it('continues to expose field errors together with the backend message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ message: 'Validation failed', fieldErrors: { title: 'Title is required' } }, 400)))
    try {
      await httpClient('/jobs')
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError)
      expect(error.message).toBe('Validation failed')
      expect(error.fieldErrors).toEqual({ title: 'Title is required' })
    }
  })
})
