import { httpClient } from '@/shared/api/httpClient.js'

function validId(value) {
  return value !== null && value !== undefined && String(value).trim() !== ''
}

function safeNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function validHttpUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return ''
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : ''
  } catch {
    return ''
  }
}

function imageUrls(item) {
  const source = item.evidenceImages ?? item.images ?? item.proofImages ?? item.imageUrls ?? []
  if (!Array.isArray(source)) return []
  return source.map((image) => validHttpUrl(typeof image === 'string' ? image : image?.url ?? image?.imageUrl)).filter(Boolean)
}

export function normalizeClientProof(item = {}) {
  const job = item.job ?? item.assignment?.job ?? {}
  const freelancer = item.freelancer ?? item.assignment?.freelancer ?? item.submittedBy ?? {}
  return {
    id: item.id ?? item.proofId ?? null,
    status: String(item.status ?? 'UNKNOWN').toUpperCase(),
    job: { id: job.id ?? item.jobId ?? null, title: job.title ?? item.jobTitle ?? '' },
    freelancer: {
      id: freelancer.id ?? item.freelancerId ?? null,
      name: freelancer.name ?? freelancer.fullName ?? item.freelancerName ?? 'Freelancer',
      avatarUrl: validHttpUrl(freelancer.avatarUrl ?? freelancer.avatar),
    },
    reviewContent: item.reviewContent ?? item.content ?? item.review?.content ?? '',
    shareLink: validHttpUrl(item.shareLink ?? item.reviewLink ?? item.link),
    evidenceImages: imageUrls(item),
    payoutAmount: safeNumber(item.payoutAmount ?? item.payout ?? item.amount),
    currency: typeof item.currency === 'string' && item.currency.trim() ? item.currency.trim().toUpperCase() : 'VND',
    result: item.result ?? item.reviewResult ?? null,
    submittedAt: item.submittedAt ?? item.createdAt ?? null,
    reviewedAt: item.reviewedAt ?? item.processedAt ?? item.updatedAt ?? null,
    rejectionReason: item.rejectionReason ?? item.rejectReason ?? item.reason ?? '',
  }
}

export function getClientProofs() {
  return httpClient('/client/proofs').then((response) => {
    const body = response?.data ?? response
    const items = Array.isArray(body) ? body : body?.content ?? body?.items ?? []
    return Array.isArray(items) ? items.map(normalizeClientProof).filter((proof) => validId(proof.id)) : []
  })
}

export function getClientProof(proofId) {
  if (!validId(proofId)) throw new TypeError('Proof ID không hợp lệ.')
  return httpClient(`/client/proofs/${encodeURIComponent(String(proofId).trim())}`).then((response) => {
    const body = response?.data ?? response
    return normalizeClientProof(body)
  })
}

export function approveClientProof(proofId) {
  if (!validId(proofId)) throw new TypeError('Proof ID không hợp lệ.')
  return httpClient(`/client/proofs/${encodeURIComponent(String(proofId).trim())}/approve`, { method: 'POST' })
}

export function rejectClientProof(proofId, reason) {
  if (!validId(proofId)) throw new TypeError('Proof ID không hợp lệ.')
  const normalizedReason = typeof reason === 'string' ? reason.trim() : ''
  if (!normalizedReason || normalizedReason.length > 2000) throw new TypeError('Lý do từ chối không hợp lệ.')
  return httpClient(`/client/proofs/${encodeURIComponent(String(proofId).trim())}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason: normalizedReason }),
  })
}
