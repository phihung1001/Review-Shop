import { afterEach, describe, expect, it, vi } from 'vitest'
import { approveClientProof, getClientProof, getClientProofs, rejectClientProof } from './clientProofApi.js'

function json(body = {}, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

describe('Client Proof API', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('loads and normalizes wrapped Proof data', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ data: { items: [{
      proofId: 7,
      status: 'pending',
      jobId: 4,
      jobTitle: 'Review Job',
      freelancerName: 'Lan',
      payout: '12000',
      images: [{ imageUrl: 'https://cdn.example.com/proof.png' }, 'not-a-url'],
    }] } }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(getClientProofs()).resolves.toEqual([expect.objectContaining({
      id: 7,
      status: 'PENDING',
      job: { id: 4, title: 'Review Job' },
      payoutAmount: 12000,
      evidenceImages: ['https://cdn.example.com/proof.png'],
    })])
    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/client/proofs')
  })

  it('does not expose NaN when payout is invalid', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json([{ id: 1, payoutAmount: 'invalid' }])))
    await expect(getClientProofs()).resolves.toEqual([expect.objectContaining({ payoutAmount: null })])
  })

  it('loads and normalizes a Proof detail with an encoded ID', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ data: {
      proofId: 'proof/7',
      status: 'rejected',
      rejectionReason: 'Bằng chứng chưa rõ.',
    } }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(getClientProof('proof/7')).resolves.toEqual(expect.objectContaining({
      id: 'proof/7',
      status: 'REJECTED',
      rejectionReason: 'Bằng chứng chưa rõ.',
    }))
    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/client/proofs/proof%2F7')
  })

  it('approves with an encoded ID and no request body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({}, 200))
    vi.stubGlobal('fetch', fetchMock)
    await approveClientProof('proof/7')
    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/client/proofs/proof%2F7/approve')
    expect(fetchMock.mock.calls[0][1]).toEqual(expect.objectContaining({ method: 'POST' }))
    expect(fetchMock.mock.calls[0][1]).not.toHaveProperty('body')
  })

  it('trims the rejection reason and validates before sending', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({}, 200))
    vi.stubGlobal('fetch', fetchMock)
    await rejectClientProof(7, '  Ảnh chưa hợp lệ  ')
    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/client/proofs/7/reject')
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ reason: 'Ảnh chưa hợp lệ' })
    expect(() => rejectClientProof(7, '   ')).toThrow(TypeError)
    expect(() => rejectClientProof(7, 'x'.repeat(2001))).toThrow(TypeError)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
