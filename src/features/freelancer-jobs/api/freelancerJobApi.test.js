import { afterEach, describe, expect, it, vi } from 'vitest'
import { cancelFreelancerAssignment, claimFreelancerJob, getEligibleGoogleMapsAccounts, getFreelancerAssignment, getFreelancerAssignments, getOpenFreelancerJobs, submitFreelancerProof } from './freelancerJobApi.js'

function json(body) {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })
}

describe('Freelancer open Job API', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('calls the role-specific endpoint and normalizes the contract', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ data: { content: [{
      id: 10,
      title: 'Open Job',
      mapLink: 'https://www.google.com/maps/place/example',
      requiredLevel: { id: 1, description: 'Level 3', pricePerReview: '50000', rank: '3' },
      payoutPerTask: '25000',
      availableSlots: '2',
      totalSlots: 2,
      reviewContents: [{ index: 0, content: 'Content', available: true, images: ['https://cdn.example.com/a.png'] }, { index: 1, available: 1 }],
    }] } }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(getOpenFreelancerJobs()).resolves.toEqual([expect.objectContaining({
      id: 10,
      payoutPerTask: 25000,
      availableSlots: 2,
      totalSlots: 2,
      requiredLevel: { id: 1, description: 'Level 3', pricePerReview: 50000, rank: 3 },
      reviewContents: [expect.objectContaining({ available: true }), expect.objectContaining({ available: false })],
    })])
    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/freelancer/jobs/open')
  })

  it('uses unavailable values instead of NaN and drops unsafe URLs', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json([{ id: 1, payoutPerTask: 'bad', availableSlots: -1, totalSlots: 1.5, mapLink: 'javascript:alert(1)', requiredLevel: { rank: 'bad' } }])))
    await expect(getOpenFreelancerJobs()).resolves.toEqual([expect.objectContaining({
      payoutPerTask: null,
      availableSlots: null,
      totalSlots: null,
      mapLink: '',
      requiredLevel: expect.objectContaining({ rank: null }),
    })])
  })

  it('loads and normalizes eligible Google Maps accounts for an encoded Job ID', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json([{ id: 12, contributorId: 117642509766343273456n.toString(), profileUrl: 'https://www.google.com/maps/contrib/117642509766343273456', accountName: ' Local Guide A ', thumbnail: 'https://example.com/avatar.jpg', localGuideLevel: '5', points: '1000', reviewCount: 100, accountType: 'vietnam', readyForJobs: true, verifiedAt: '2026-08-02T10:00:00Z' }]))
    vi.stubGlobal('fetch', fetchMock)

    await expect(getEligibleGoogleMapsAccounts('job/10')).resolves.toEqual([expect.objectContaining({ id: 12, accountName: 'Local Guide A', localGuideLevel: 5, accountType: 'VIETNAM', readyForJobs: true })])
    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/freelancer/jobs/job%2F10/eligible-google-maps-accounts')
    expect(fetchMock.mock.calls[0][1].method).toBeUndefined()
  })

  it('rejects an empty Job ID before making an eligibility request', () => {
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock)
    expect(() => getEligibleGoogleMapsAccounts('')).toThrow(TypeError)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('claims a Job with the selected account and review content', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { id: 50, jobId: 10, status: 'CLAIMED', expiresAt: '2026-08-02T10:10:00Z' } }), { status: 201, headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(claimFreelancerJob(10, { googleMapsAccountId: 12, reviewContentIndex: 0 })).resolves.toEqual(expect.objectContaining({ id: 50, status: 'CLAIMED' }))
    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/freelancer/jobs/10/assignments')
    expect(fetchMock.mock.calls[0][1].method).toBe('POST')
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ googleMapsAccountId: 12, reviewContentIndex: 0 })
  })

  it('omits reviewContentIndex when claiming a Job without review contents', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ id: 51, status: 'CLAIMED' }))
    vi.stubGlobal('fetch', fetchMock)
    await claimFreelancerJob('job/11', { googleMapsAccountId: '12' })
    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/freelancer/jobs/job%2F11/assignments')
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ googleMapsAccountId: '12' })
  })

  it('loads and normalizes the claimed Assignment detail', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ data: { id: 50, jobId: 10, jobTitle: 'Review A', jobDescription: 'Description', mapLink: 'https://www.google.com/maps/place/example', payoutPerTask: '25000', reviewContentIndex: 0, reviewContent: 'Content', reviewContentImages: ['https://cdn.example.com/a.jpg', 'javascript:bad'], status: 'claimed' } }))
    vi.stubGlobal('fetch', fetchMock)
    await expect(getFreelancerAssignment('assignment/50')).resolves.toEqual(expect.objectContaining({ id: 50, jobId: 10, payoutPerTask: 25000, reviewContentIndex: 0, reviewContentImages: ['https://cdn.example.com/a.jpg'], status: 'CLAIMED' }))
    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/freelancer/assignments/assignment%2F50')
  })

  it('submits Proof with the documented payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 70, status: 'PENDING' }), { status: 201, headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)
    await submitFreelancerProof(10, { assignmentId: 50, shareLink: 'https://www.google.com/maps/contrib/example/reviews', proofImages: ['proofs/user-1/proof-1.jpg'] })
    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/freelancer/jobs/10/proofs')
    expect(fetchMock.mock.calls[0][1].method).toBe('POST')
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ assignmentId: 50, shareLink: 'https://www.google.com/maps/contrib/example/reviews', proofImages: ['proofs/user-1/proof-1.jpg'] })
  })

  it('sends an empty string for an optional review URL when submitting Proof', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({}, 200))
    vi.stubGlobal('fetch', fetchMock)
    await submitFreelancerProof(10, { assignmentId: 50, shareLink: '   ', proofImages: ['proofs/user-1/proof-1.jpg'] })
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ assignmentId: 50, shareLink: '', proofImages: ['proofs/user-1/proof-1.jpg'] })
  })

  it('cancels a claimed Assignment without a request body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)
    await expect(cancelFreelancerAssignment('assignment/50')).resolves.toBeNull()
    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/freelancer/assignments/assignment%2F50')
    expect(fetchMock.mock.calls[0][1].method).toBe('DELETE')
    expect(fetchMock.mock.calls[0][1].body).toBeUndefined()
  })

  it('reloads the Freelancer Assignment collection', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json([])); vi.stubGlobal('fetch', fetchMock)
    await getFreelancerAssignments()
    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/freelancer/assignments')
  })
})
