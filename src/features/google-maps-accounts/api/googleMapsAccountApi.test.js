import { afterEach, describe, expect, it, vi } from 'vitest'
import { getGoogleMapsAccounts, updateGoogleMapsAccountType, verifyGoogleMapsAccount } from './googleMapsAccountApi.js'

describe('Google Maps account API', () => {
  afterEach(() => vi.unstubAllGlobals())
  it('calls the exact verify endpoint with a trimmed URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)
    await verifyGoogleMapsAccount('  https://www.google.com/maps/contrib/117642509766343273456  ')
    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/freelancer/google-maps-accounts/verify')
    expect(fetchMock.mock.calls[0][1].method).toBe('POST')
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ profileUrl: 'https://www.google.com/maps/contrib/117642509766343273456' })
  })
  it('rejects invalid input before making a request', () => {
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock)
    expect(() => verifyGoogleMapsAccount('https://evil.example/maps/contrib/1')).toThrow(TypeError)
    expect(fetchMock).not.toHaveBeenCalled()
  })
  it('loads and normalizes account data without changing backend order', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { items: [{ id: 2, contributorId: 117642509766343273456n.toString(), accountName: '  Account B  ', thumbnail: 'https://example.com/b.jpg', profileUrl: 'https://www.google.com/maps/contrib/117642509766343273456', localGuideLevel: '5', points: '1000', reviewCount: 100, accountType: 'vietnam', readyForJobs: true }, { id: 1, contributorId: '2', thumbnail: 'http://unsafe.test/a.jpg', localGuideLevel: 0, points: -1, reviewCount: 'bad', readyForJobs: 1 }, { contributorId: 'missing-id' }] } }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)
    const accounts = await getGoogleMapsAccounts()
    expect(accounts).toHaveLength(2)
    expect(accounts[0]).toEqual(expect.objectContaining({ id: 2, contributorId: '117642509766343273456', accountName: 'Account B', localGuideLevel: 5, points: 1000, reviewCount: 100, accountType: 'VIETNAM', readyForJobs: true }))
    expect(accounts[1]).toEqual(expect.objectContaining({ id: 1, thumbnail: '', localGuideLevel: null, points: null, reviewCount: null, accountType: null, readyForJobs: false }))
    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/freelancer/google-maps-accounts')
  })
  it('updates a verified account type and normalizes the response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { id: 'account/12', contributorId: '117642509766343273456', profileUrl: 'https://www.google.com/maps/contrib/117642509766343273456', accountType: 'vietnam', readyForJobs: true } }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(updateGoogleMapsAccountType('account/12', 'vietnam')).resolves.toEqual(expect.objectContaining({ id: 'account/12', accountType: 'VIETNAM', readyForJobs: true }))
    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/freelancer/google-maps-accounts/account%2F12/type')
    expect(fetchMock.mock.calls[0][1].method).toBe('PATCH')
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ accountType: 'VIETNAM' })
  })
  it('rejects an unsupported account type before making a request', () => {
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock)
    expect(() => updateGoogleMapsAccountType(12, 'OTHER')).toThrow(TypeError)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
