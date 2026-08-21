import { describe, expect, it } from 'vitest'
import { createIdempotencyKey, DEFAULT_JOB_DESCRIPTION, hasAtMostTwoDecimalPlaces, isSupportedGoogleMapsUrl, mapJobPayload } from './jobForm.js'

describe('job form domain helpers', () => {
  it('provides the editable default description for every new job intent', () => {
    expect(DEFAULT_JOB_DESCRIPTION).toContain('đúng nội dung và yêu cầu của công việc')
    expect(DEFAULT_JOB_DESCRIPTION).toContain('bằng tab ẩn danh')
    expect(DEFAULT_JOB_DESCRIPTION).toContain('Hình ảnh liên quan, rõ nét')
    expect(DEFAULT_JOB_DESCRIPTION).not.toContain('tên tiếng Anh')
  })

  it.each([
    'https://www.google.com/maps/place/example',
    'https://maps.google.com/place/example',
    'https://www.google.com.vn/maps/place/example',
    'https://maps.app.goo.gl/example',
    'https://goo.gl/maps/example',
  ])('accepts a supported Google Maps URL: %s', (url) => expect(isSupportedGoogleMapsUrl(url)).toBe(true))

  it.each([
    'http://google.com/maps/example',
    'https://fake-google.com/maps/example',
    'https://example.com/?redirect=google.com/maps',
    'https://google.com/search?q=maps',
    'not-a-url',
  ])('rejects an unsupported Google Maps URL: %s', (url) => expect(isSupportedGoogleMapsUrl(url)).toBe(false))

  it('maps, trims, converts numbers, and removes empty review contents', () => {
    const payload = mapJobPayload({
      title: ' Job A ', description: ' Description ', mapLink: ' https://google.com/maps/a ',
      requiredLevelId: '2', pricePerReview: '10000.50', totalReviews: '3',
      reviewContents: [{ content: ' First ', images: null }, { content: '  ' }, null],
    })
    expect(payload).toEqual({
      title: 'Job A', description: 'Description', mapLink: 'https://google.com/maps/a',
      requiredLevelId: 2, pricePerReview: 10000.5, totalReviews: 3,
      reviewContents: [{ content: 'First', images: [] }],
    })
    expect(payload).not.toHaveProperty('linkUrlMap')
    expect(payload).not.toHaveProperty('totalSlots')
  })

  it('maps missing review contents to an empty array', () => {
    expect(mapJobPayload({ title: 'A', description: 'B', mapLink: 'https://goo.gl/maps/a', requiredLevelId: 1, pricePerReview: 1, totalReviews: 1 }).reviewContents).toEqual([])
  })

  it('creates a non-empty idempotency key within the backend limit', () => {
    const key = createIdempotencyKey()
    expect(key.length).toBeGreaterThan(0)
    expect(key.length).toBeLessThanOrEqual(100)
  })

  it('checks decimal precision', () => {
    expect(hasAtMostTwoDecimalPlaces('100.12')).toBe(true)
    expect(hasAtMostTwoDecimalPlaces('100.123')).toBe(false)
  })
})
