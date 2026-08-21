import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRequiredLevel, deleteRequiredLevel, getPlatformSettings, getRequiredLevel, getRequiredLevels, updatePlatformFeeRate, updateRequiredLevel } from './adminApi.js'
import { clearAccessToken, setAccessToken } from '@/shared/api/accessToken.js'

function json(body = {}, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

describe('admin API', () => {
  afterEach(() => {
    clearAccessToken()
    vi.unstubAllGlobals()
  })

  it('loads and sorts required levels from the documented path', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json([{ id: 2 }, { id: 1 }]))
    vi.stubGlobal('fetch', fetchMock)
    expect((await getRequiredLevels()).map((item) => item.id)).toEqual([1, 2])
    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/required-levels')
  })

  it('uses encoded IDs for required-level detail and mutations', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json())
    vi.stubGlobal('fetch', fetchMock)
    await getRequiredLevel('1/2')
    await updateRequiredLevel(1, { description: 'Level 1', pricePerReview: 10000, rank: 1 })
    await deleteRequiredLevel(1)
    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/required-levels/1%2F2')
    expect(fetchMock.mock.calls[1][0]).toBe('/api/v1/required-levels/1')
    expect(fetchMock.mock.calls[2][0]).toBe('/api/v1/required-levels/1')
  })

  it('creates a required level with the exact payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({}, 201))
    vi.stubGlobal('fetch', fetchMock)
    const payload = { description: 'Level 1', pricePerReview: 10000, rank: 1 }
    await createRequiredLevel(payload)
    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/required-levels')
    expect(fetchMock.mock.calls[0][1].method).toBe('POST')
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual(payload)
  })

  it('reads and updates platform settings on the documented paths', async () => {
    setAccessToken('admin-access-token')
    const fetchMock = vi.fn().mockResolvedValue(json())
    vi.stubGlobal('fetch', fetchMock)
    await getPlatformSettings()
    await updatePlatformFeeRate(0.25)
    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/admin/platform-settings')
    expect(fetchMock.mock.calls[1][0]).toBe('/api/v1/admin/platform-settings/fee-rate')
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ platformFeeRate: 0.25 })
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer admin-access-token')
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe('Bearer admin-access-token')
    expect(fetchMock.mock.calls.flat().join(' ')).not.toContain('/api/api/')
  })
})
