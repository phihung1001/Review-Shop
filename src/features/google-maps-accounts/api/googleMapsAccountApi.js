import { httpClient } from '@/shared/api/httpClient.js'
import { isValidGoogleMapsContributorUrl, normalizeContributorProfileUrl } from '../lib/googleMapsAccountValidation.js'

export function verifyGoogleMapsAccount(profileUrl) {
  const normalizedUrl = normalizeContributorProfileUrl(profileUrl)
  if (!isValidGoogleMapsContributorUrl(normalizedUrl)) throw new TypeError('Google Maps Contributor Profile URL không hợp lệ.')
  return httpClient('/freelancer/google-maps-accounts/verify', {
    method: 'POST',
    body: JSON.stringify({ profileUrl: normalizedUrl }),
  })
}

function httpsUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return ''
  try { const url = new URL(value); return url.protocol === 'https:' ? url.toString() : '' } catch { return '' }
}

function integer(value, minimum) {
  const number = Number(value)
  return Number.isInteger(number) && number >= minimum ? number : null
}

export function normalizeGoogleMapsAccount(item = {}) {
  const contributorId = item.contributorId === null || item.contributorId === undefined ? '' : String(item.contributorId)
  const accountType = typeof item.accountType === 'string' && item.accountType.trim() ? item.accountType.trim().toUpperCase() : null
  return {
    id: item.id ?? null,
    contributorId,
    profileUrl: isValidGoogleMapsContributorUrl(item.profileUrl) ? normalizeContributorProfileUrl(item.profileUrl) : '',
    accountName: typeof item.accountName === 'string' ? item.accountName.trim() : '',
    thumbnail: httpsUrl(item.thumbnail),
    localGuideLevel: integer(item.localGuideLevel, 1),
    points: integer(item.points, 0),
    reviewCount: integer(item.reviewCount, 0),
    accountType,
    readyForJobs: item.readyForJobs === true,
    verifiedAt: item.verifiedAt ?? null,
  }
}

export function getGoogleMapsAccounts() {
  return httpClient('/freelancer/google-maps-accounts').then((response) => {
    const body = response?.data ?? response
    const items = Array.isArray(body) ? body : body?.content ?? body?.items ?? []
    return Array.isArray(items) ? items.map(normalizeGoogleMapsAccount).filter((account) => account.id !== null && account.id !== undefined && String(account.id).trim()) : []
  })
}

const SUPPORTED_ACCOUNT_TYPES = new Set(['VIETNAM', 'FOREIGN'])

export function updateGoogleMapsAccountType(id, accountType) {
  if (id === null || id === undefined || !String(id).trim()) throw new TypeError('Google Maps account ID không hợp lệ.')
  const normalizedType = typeof accountType === 'string' ? accountType.trim().toUpperCase() : ''
  if (!SUPPORTED_ACCOUNT_TYPES.has(normalizedType)) throw new TypeError('Loại tài khoản Google Maps không hợp lệ.')

  return httpClient(`/freelancer/google-maps-accounts/${encodeURIComponent(String(id))}/type`, {
    method: 'PATCH',
    body: JSON.stringify({ accountType: normalizedType }),
  }).then((response) => normalizeGoogleMapsAccount(response?.data ?? response))
}
