import { describe, expect, it } from 'vitest'
import { percentToRate, requiredLevelPayload, validatePlatformFee, validateRequiredLevel } from './validation.js'

describe('admin validation', () => {
  it('validates required-level fields and decimal precision', () => {
    expect(validateRequiredLevel({ description: ' ', pricePerReview: 0, rank: 0 })).toEqual(expect.objectContaining({ description: expect.any(String), pricePerReview: expect.any(String), rank: expect.any(String) }))
    expect(validateRequiredLevel({ description: 'Level', pricePerReview: '10.123', rank: 11 }).pricePerReview).toContain('2 chữ số')
    expect(validateRequiredLevel({ description: 'Level', pricePerReview: '10.12', rank: 10 })).toEqual({})
  })

  it('trims description and omits an empty rank', () => {
    expect(requiredLevelPayload({ description: ' Level 1 ', pricePerReview: '10000.00', rank: '' })).toEqual({ description: 'Level 1', pricePerReview: 10000 })
  })

  it('validates percentage bounds and converts percent to rate', () => {
    expect(validatePlatformFee(0)).toBe('')
    expect(validatePlatformFee(-1)).toBeTruthy()
    expect(validatePlatformFee(100)).toBeTruthy()
    expect(validatePlatformFee(25.123)).toContain('2 chữ số')
    expect(percentToRate(25)).toBe(0.25)
  })
})
