import { httpClient } from '@/shared/api/httpClient.js'

export function getRequiredLevels() {
  return httpClient('/required-levels').then((items) => [...(Array.isArray(items) ? items : items?.data ?? [])].sort((a, b) => a.id - b.id))
}

export function getRequiredLevel(id) {
  return httpClient(`/required-levels/${encodeURIComponent(id)}`)
}

export function createRequiredLevel(payload) {
  return httpClient('/required-levels', { method: 'POST', body: JSON.stringify(payload) })
}

export function updateRequiredLevel(id, payload) {
  return httpClient(`/required-levels/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(payload) })
}

export function deleteRequiredLevel(id) {
  return httpClient(`/required-levels/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export function getPlatformSettings() {
  return httpClient('/admin/platform-settings')
}

export function updatePlatformFeeRate(platformFeeRate) {
  return httpClient('/admin/platform-settings/fee-rate', {
    method: 'PUT',
    body: JSON.stringify({ platformFeeRate }),
  })
}
