import { describe, expect, it } from 'vitest'
import { isValidGoogleMapsContributorUrl, normalizeContributorProfileUrl } from './googleMapsAccountValidation.js'

describe('Google Maps Contributor URL validation', () => {
  it.each(['https://google.com/maps/contrib/117642509766343273456', 'https://www.google.com/maps/contrib/117642509766343273456', ' https://www.google.com/maps/contrib/117642509766343273456/ '])('accepts %s', (url) => expect(isValidGoogleMapsContributorUrl(url)).toBe(true))
  it.each(['http://www.google.com/maps/contrib/117642509766343273456', 'https://maps.app.goo.gl/example', 'https://google.com/maps/place/example', 'https://google.com.evil.example/maps/contrib/117642509766343273456', 'https://www.google.com/maps/contrib/', 'https://www.google.com/maps/contrib/not-numeric', 'javascript:alert(1)', 'not-a-url'])('rejects %s', (url) => expect(isValidGoogleMapsContributorUrl(url)).toBe(false))
  it('trims the submitted URL', () => expect(normalizeContributorProfileUrl('  https://google.com/maps/contrib/1  ')).toBe('https://google.com/maps/contrib/1'))
})
