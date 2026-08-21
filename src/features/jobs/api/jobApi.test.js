import { afterEach, describe, expect, it, vi } from 'vitest'
import { createJob, fetchRequiredLevels, getClientJob, getClientJobs } from './jobApi.js'

function json(body = {}, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

describe('job API', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('creates a job with the exact endpoint, payload, and idempotency header', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({}, 201))
    vi.stubGlobal('fetch', fetchMock)
    const payload = { title: 'Job', mapLink: 'https://google.com/maps/a', totalReviews: 1 }
    await createJob(payload, 'job-intent-1')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/jobs')
    expect(fetchMock.mock.calls[0][1].method).toBe('POST')
    expect(fetchMock.mock.calls[0][1].headers['Idempotency-Key']).toBe('job-intent-1')
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual(payload)
  })

  it('rejects an invalid idempotency key before sending', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    expect(() => createJob({}, '')).toThrow(TypeError)
    expect(() => createJob({}, 'x'.repeat(101))).toThrow(TypeError)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('normalizes Required Level data at the API boundary', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ data: [{ id: '2', description: 'Level 2', price_per_review: '20000' }] })))
    await expect(fetchRequiredLevels()).resolves.toEqual([{ id: 2, description: 'Level 2', pricePerReview: 20000 }])
  })

  it('loads the current Client jobs from the documented endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json([{ id: 2, title: 'Newest', pricePerReview: '10000', totalReviews: 2, status: 'OPEN' }]))
    vi.stubGlobal('fetch', fetchMock)
    await expect(getClientJobs()).resolves.toEqual([expect.objectContaining({ id: 2, title: 'Newest', pricePerReview: 10000, totalReviews: 2, status: 'OPEN' })])
    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/jobs')
  })

  it('loads a Client job detail with an encoded ID', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ data: { id: 'job/1', title: 'Job detail' } }))
    vi.stubGlobal('fetch', fetchMock)
    await expect(getClientJob('job/1')).resolves.toEqual(expect.objectContaining({ id: 'job/1', title: 'Job detail' }))
    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/jobs/job%2F1')
  })
})
