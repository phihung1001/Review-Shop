import { httpClient } from '@/shared/api/httpClient.js'

function normalizeJob(item) {
  const pricePerReview = Number(item.pricePerReview ?? 0)
  const totalReviews = Number(item.totalReviews ?? item.totalSlots ?? 0)
  return {
    id: item.id,
    title: item.title ?? '',
    description: item.description ?? '',
    mapLink: item.mapLink ?? item.linkUrlMap ?? '',
    requiredLevelId: item.requiredLevelId ?? item.requiredLevel?.id ?? null,
    requiredLevel: item.requiredLevel?.description ?? item.requiredLevelDescription ?? '',
    pricePerReview,
    totalReviews,
    totalSpent: Number(item.totalSpent ?? item.spentAmount ?? item.totalAmount ?? item.totalBudget ?? (pricePerReview * totalReviews)),
    approvedReviews: Number(item.approvedReviews ?? item.approvedReviewCount ?? item.completedReviews ?? 0),
    reviewContents: Array.isArray(item.reviewContents) ? item.reviewContents : [],
    status: item.status ?? 'UNKNOWN',
    createdAt: item.createdAt ?? null,
  }
}

export function getClientJobs() {
  return httpClient('/jobs').then((response) => {
    const body = response?.data ?? response
    const items = Array.isArray(body) ? body : body?.content ?? body?.items ?? []
    return Array.isArray(items) ? items.map(normalizeJob) : []
  })
}

export function getClientJob(jobId) {
  return httpClient(`/jobs/${encodeURIComponent(jobId)}`).then((response) => normalizeJob(response?.data ?? response))
}

export function fetchRequiredLevels() {
  return httpClient('/required-levels').then((response) => {
    const items = Array.isArray(response) ? response : response?.data ?? []
    return items.map((item) => ({
      id: Number(item.id),
      description: item.description ?? `Level ${item.id}`,
      pricePerReview: Number(item.pricePerReview ?? item.price_per_review ?? 0),
    })).filter((item) => Number.isInteger(item.id) && item.id > 0)
  })
}

export function createJob(payload, idempotencyKey) {
  if (!idempotencyKey || idempotencyKey.length > 100) throw new TypeError('Invalid Idempotency-Key')
  return httpClient('/jobs', {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify(payload),
  })
}
