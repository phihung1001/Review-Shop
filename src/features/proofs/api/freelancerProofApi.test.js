import { afterEach, describe, expect, it, vi } from 'vitest'
import { getFreelancerProofs } from './freelancerProofApi.js'

function json(body) { return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } }) }

describe('Freelancer Proof API', () => {
  afterEach(() => vi.unstubAllGlobals())
  it('maps the exact JobProofResponse contract', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ data: { items: [{ id: 12, assignmentId: 30, jobId: 10, jobTitle: 'Job A', freelancerId: 15, freelancerName: 'Lan', reviewContentIndex: 0, reviewContent: 'Review', shareLink: 'https://example.com/review', proofImages: ['https://example.com/a.jpg', 'javascript:bad'], status: 'rejected', rejectionReason: '  Ảnh chưa hợp lệ  ', payoutAmount: '25000', reviewedAt: '2026-08-02T10:30:00Z', createdAt: '2026-08-02T10:00:00Z', updatedAt: '2026-08-02T10:31:00Z' }] } }))
    vi.stubGlobal('fetch', fetchMock)
    await expect(getFreelancerProofs()).resolves.toEqual([expect.objectContaining({ id: 12, assignmentId: 30, job: { id: 10, title: 'Job A' }, freelancer: { id: 15, name: 'Lan' }, reviewContentIndex: 0, evidenceImages: ['https://example.com/a.jpg'], status: 'REJECTED', rejectionReason: 'Ảnh chưa hợp lệ', payoutAmount: 25000, reviewedAt: '2026-08-02T10:30:00Z', createdAt: '2026-08-02T10:00:00Z', updatedAt: '2026-08-02T10:31:00Z' })])
    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/freelancer/proofs')
  })
  it('does not use updatedAt as reviewedAt or create NaN', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json([{ id: 1, payoutAmount: 'bad', updatedAt: '2026-08-02T10:00:00Z' }, { jobId: 2 }])))
    await expect(getFreelancerProofs()).resolves.toEqual([expect.objectContaining({ payoutAmount: null, reviewedAt: null, updatedAt: '2026-08-02T10:00:00Z' })])
  })
})
