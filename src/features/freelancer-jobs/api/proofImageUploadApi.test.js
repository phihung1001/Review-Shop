import { afterEach, describe, expect, it, vi } from 'vitest'
import { uploadProofImage, uploadProofImages } from './proofImageUploadApi.js'

function json(body = {}, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

describe('Proof image upload API', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('creates a presigned upload, PUTs the file, and returns its object key', async () => {
    const file = new File(['image'], 'proof.jpg', { type: 'image/jpeg' })
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json({ objectKey: 'proofs/user/proof.jpg', uploadUrl: 'https://storage.example.com/upload', requiredHeaders: { 'Content-Type': 'image/jpeg', 'x-storage-token': 'signed' }, expiresAt: '2026-08-08T12:00:00Z' }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(uploadProofImage(file)).resolves.toBe('proofs/user/proof.jpg')
    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/freelancer/proof-images/uploads')
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ fileName: 'proof.jpg', contentType: 'image/jpeg', size: 5 })
    expect(fetchMock.mock.calls[1][0]).toBe('https://storage.example.com/upload')
    expect(fetchMock.mock.calls[1][1]).toEqual(expect.objectContaining({ method: 'PUT', body: file, headers: { 'Content-Type': 'image/jpeg', 'x-storage-token': 'signed' } }))
    expect(fetchMock.mock.calls[1][1].headers).not.toHaveProperty('Authorization')
  })

  it('rejects invalid selections before making a request', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    expect(() => uploadProofImages([])).toThrow(TypeError)
    expect(() => uploadProofImages(Array.from({ length: 11 }, () => new File(['x'], 'proof.jpg', { type: 'image/jpeg' })))).toThrow(TypeError)
    await expect(uploadProofImage(new File(['text'], 'proof.txt', { type: 'text/plain' }))).rejects.toThrow(TypeError)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('reports a storage upload failure', async () => {
    const file = new File(['image'], 'proof.png', { type: 'image/png' })
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(json({ objectKey: 'proof.png', uploadUrl: 'https://storage.example.com/upload', requiredHeaders: {} }))
      .mockResolvedValueOnce(new Response(null, { status: 403 })))
    await expect(uploadProofImage(file)).rejects.toMatchObject({ status: 403, code: 'IMAGE_UPLOAD_HTTP_403' })
  })
})
