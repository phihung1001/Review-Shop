import { afterEach, describe, expect, it, vi } from 'vitest'
import { uploadPayoutMethodImage } from './payoutMethodImageApi.js'

function json(body = {}, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

describe('Payout method QR upload API', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('requests an upload URL and PUTs the image directly to storage', async () => {
    const file = new File(['qr-image'], 'vietcombank-qr.png', { type: 'image/png' })
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json({ objectKey: 'payout-methods/123/qr.png', uploadUrl: 'https://storage.example.com/upload', expiresAt: '2026-08-09T04:10:00Z' }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(uploadPayoutMethodImage(file)).resolves.toBe('payout-methods/123/qr.png')
    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/freelancer/payout-method-images/uploads')
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ fileName: 'vietcombank-qr.png', contentType: 'image/png', fileSize: 8 })
    expect(fetchMock.mock.calls[1][1]).toEqual(expect.objectContaining({ method: 'PUT', headers: { 'Content-Type': 'image/png' }, body: file }))
    expect(fetchMock.mock.calls[1][1].headers).not.toHaveProperty('Authorization')
  })
})
