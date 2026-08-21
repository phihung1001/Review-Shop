import { httpClient } from '@/shared/api/httpClient.js'

function safeUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return ''
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.toString() : '' } catch { return '' }
}

function numberOrNull(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

export function normalizeFreelancerProof(item = {}) {
  return {
    id: item.id ?? null,
    assignmentId: item.assignmentId ?? null,
    job: { id: item.jobId ?? null, title: typeof item.jobTitle === 'string' ? item.jobTitle : '' },
    freelancer: { id: item.freelancerId ?? null, name: typeof item.freelancerName === 'string' ? item.freelancerName : '' },
    reviewContentIndex: Number.isInteger(item.reviewContentIndex) ? item.reviewContentIndex : null,
    reviewContent: typeof item.reviewContent === 'string' ? item.reviewContent : '',
    shareLink: safeUrl(item.shareLink),
    evidenceImages: Array.isArray(item.proofImages) ? item.proofImages.map(safeUrl).filter(Boolean) : [],
    status: String(item.status ?? 'UNKNOWN').toUpperCase(),
    rejectionReason: typeof item.rejectionReason === 'string' ? item.rejectionReason.trim() : '',
    payoutAmount: numberOrNull(item.payoutAmount),
    currency: 'VND',
    reviewedAt: item.reviewedAt ?? null,
    createdAt: item.createdAt ?? null,
    updatedAt: item.updatedAt ?? null,
  }
}

export function getFreelancerProofs() {
  return httpClient('/freelancer/proofs').then((response) => {
    const body = response?.data ?? response
    const items = Array.isArray(body) ? body : body?.content ?? body?.items ?? []
    return Array.isArray(items) ? items.map(normalizeFreelancerProof).filter((proof) => proof.id !== null && proof.id !== undefined && String(proof.id).trim()) : []
  })
}
