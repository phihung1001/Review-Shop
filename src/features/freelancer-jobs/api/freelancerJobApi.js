import { httpClient } from '@/shared/api/httpClient.js'

function numberOrNull(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function slotOrNull(value) {
  const number = Number(value)
  return Number.isInteger(number) && number >= 0 ? number : null
}

function safeUrl(value, { googleMaps = false } = {}) {
  if (typeof value !== 'string' || !value.trim()) return ''
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:') return ''
    if (googleMaps && !['google.com', 'www.google.com', 'google.com.vn', 'www.google.com.vn', 'maps.app.goo.gl', 'goo.gl'].includes(url.hostname)) return ''
    return url.toString()
  } catch { return '' }
}

function normalizeReviewContent(item = {}, fallbackIndex) {
  return {
    index: Number.isInteger(Number(item.index)) ? Number(item.index) : fallbackIndex,
    content: typeof item.content === 'string' ? item.content : '',
    images: Array.isArray(item.images) ? item.images.map((image) => safeUrl(typeof image === 'string' ? image : image?.url ?? image?.imageUrl)).filter(Boolean) : [],
    available: item.available === true,
  }
}

export function normalizeFreelancerJob(item = {}) {
  const level = item.requiredLevel && typeof item.requiredLevel === 'object' ? item.requiredLevel : {}
  return {
    id: item.id ?? null,
    title: typeof item.title === 'string' ? item.title : '',
    description: typeof item.description === 'string' ? item.description : '',
    mapLink: safeUrl(item.mapLink, { googleMaps: true }),
    requiredLevel: {
      id: level.id ?? null,
      description: typeof level.description === 'string' ? level.description : '',
      pricePerReview: numberOrNull(level.pricePerReview),
      rank: numberOrNull(level.rank),
    },
    payoutPerTask: numberOrNull(item.payoutPerTask),
    currency: typeof item.currency === 'string' && item.currency.trim() ? item.currency.trim().toUpperCase() : 'VND',
    availableSlots: slotOrNull(item.availableSlots),
    totalSlots: slotOrNull(item.totalSlots),
    reviewContents: Array.isArray(item.reviewContents) ? item.reviewContents.map(normalizeReviewContent) : [],
  }
}

export function getOpenFreelancerJobs() {
  return httpClient('/freelancer/jobs/open').then((response) => {
    const body = response?.data ?? response
    const items = Array.isArray(body) ? body : body?.content ?? body?.items ?? []
    return Array.isArray(items) ? items.map(normalizeFreelancerJob).filter((job) => job.id !== null && job.id !== undefined && String(job.id).trim()) : []
  })
}

function normalizeEligibleGoogleMapsAccount(item = {}) {
  return {
    id: item.id ?? null,
    contributorId: item.contributorId === null || item.contributorId === undefined ? '' : String(item.contributorId),
    profileUrl: safeUrl(item.profileUrl, { googleMaps: true }),
    accountName: typeof item.accountName === 'string' ? item.accountName.trim() : '',
    thumbnail: safeUrl(item.thumbnail),
    localGuideLevel: slotOrNull(item.localGuideLevel),
    points: slotOrNull(item.points),
    reviewCount: slotOrNull(item.reviewCount),
    accountType: ['VIETNAM', 'FOREIGN'].includes(String(item.accountType).toUpperCase()) ? String(item.accountType).toUpperCase() : null,
    readyForJobs: item.readyForJobs === true,
    verifiedAt: item.verifiedAt ?? null,
  }
}

export function getEligibleGoogleMapsAccounts(jobId) {
  if (jobId === null || jobId === undefined || !String(jobId).trim()) throw new TypeError('Job ID không hợp lệ.')
  return httpClient(`/freelancer/jobs/${encodeURIComponent(String(jobId))}/eligible-google-maps-accounts`).then((response) => {
    const body = response?.data ?? response
    const items = Array.isArray(body) ? body : body?.content ?? body?.items ?? []
    return Array.isArray(items) ? items.map(normalizeEligibleGoogleMapsAccount).filter((account) => account.id !== null && account.id !== undefined && String(account.id).trim()) : []
  })
}

export function claimFreelancerJob(jobId, { googleMapsAccountId, reviewContentIndex = null } = {}) {
  if (jobId === null || jobId === undefined || !String(jobId).trim()) throw new TypeError('Job ID không hợp lệ.')
  if (googleMapsAccountId === null || googleMapsAccountId === undefined || !String(googleMapsAccountId).trim()) throw new TypeError('Google Maps account ID là bắt buộc.')
  if (reviewContentIndex !== null && (!Number.isInteger(Number(reviewContentIndex)) || Number(reviewContentIndex) < 0)) throw new TypeError('Review content index không hợp lệ.')
  const payload = { googleMapsAccountId }
  if (reviewContentIndex !== null) payload.reviewContentIndex = Number(reviewContentIndex)

  return httpClient(`/freelancer/jobs/${encodeURIComponent(String(jobId))}/assignments`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then((response) => normalizeFreelancerAssignment(response?.data ?? response))
}

function normalizeFreelancerAssignment(item = {}) {
  return {
    id: item.id ?? null,
    jobId: item.jobId ?? null,
    jobTitle: typeof item.jobTitle === 'string' ? item.jobTitle : '',
    jobDescription: typeof item.jobDescription === 'string' ? item.jobDescription : '',
    mapLink: safeUrl(item.mapLink, { googleMaps: true }),
    payoutPerTask: numberOrNull(item.payoutPerTask),
    reviewContentIndex: Number.isInteger(Number(item.reviewContentIndex)) ? Number(item.reviewContentIndex) : null,
    reviewContent: typeof item.reviewContent === 'string' ? item.reviewContent : '',
    reviewContentImages: Array.isArray(item.reviewContentImages) ? item.reviewContentImages.map((url) => safeUrl(url)).filter(Boolean) : [],
    googleMapsAccountId: item.googleMapsAccountId ?? null,
    googleMapsAccountName: typeof item.googleMapsAccountName === 'string' ? item.googleMapsAccountName : '',
    status: String(item.status ?? 'UNKNOWN').toUpperCase(),
    expiresAt: item.expiresAt ?? null,
    createdAt: item.createdAt ?? null,
  }
}

export function getFreelancerAssignment(assignmentId) {
  if (assignmentId === null || assignmentId === undefined || !String(assignmentId).trim()) throw new TypeError('Assignment ID không hợp lệ.')
  return httpClient(`/freelancer/assignments/${encodeURIComponent(String(assignmentId))}`).then((response) => normalizeFreelancerAssignment(response?.data ?? response))
}

function requiredHttpUrl(value, fieldName) {
  const url = safeUrl(value)
  if (!url) throw new TypeError(`${fieldName} không hợp lệ.`)
  return url
}

function requiredHttpsUrl(value, fieldName) {
  const url = requiredHttpUrl(value, fieldName)
  if (new URL(url).protocol !== 'https:') throw new TypeError(`${fieldName} phải sử dụng HTTPS.`)
  return url
}

export function submitFreelancerProof(jobId, { assignmentId, shareLink, proofImages } = {}) {
  if (jobId === null || jobId === undefined || !String(jobId).trim()) throw new TypeError('Job ID không hợp lệ.')
  if (assignmentId === null || assignmentId === undefined || !String(assignmentId).trim()) throw new TypeError('Assignment ID là bắt buộc.')
  if (!Array.isArray(proofImages) || proofImages.length === 0 || proofImages.length > 10) throw new TypeError('Cần từ 1 đến 10 ảnh Proof.')
  const normalizedShareLink = typeof shareLink === 'string' ? shareLink.trim() : ''
  const payload = {
    assignmentId,
    shareLink: normalizedShareLink ? requiredHttpsUrl(normalizedShareLink, 'Share link') : '',
    proofImages: proofImages.map((objectKey) => {
      const normalized = typeof objectKey === 'string' ? objectKey.trim() : ''
      if (!normalized || normalized.length > 2048) throw new TypeError('Object key của ảnh Proof không hợp lệ.')
      return normalized
    }),
  }
  return httpClient(`/freelancer/jobs/${encodeURIComponent(String(jobId))}/proofs`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then((response) => response?.data ?? response)
}

export function cancelFreelancerAssignment(assignmentId) {
  if (assignmentId === null || assignmentId === undefined || !String(assignmentId).trim()) throw new TypeError('Assignment ID không hợp lệ.')
  return httpClient(`/freelancer/assignments/${encodeURIComponent(String(assignmentId))}`, { method: 'DELETE' })
}

export function getFreelancerAssignments() {
  return httpClient('/freelancer/assignments')
}
