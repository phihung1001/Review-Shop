export const DEFAULT_JOB_DESCRIPTION = `- Review đúng nội dung và yêu cầu của công việc.
- Kiểm tra bằng tab ẩn danh hoặc tài khoản khác để đảm bảo review hiển thị công khai.
- Hình ảnh liên quan, rõ nét sẽ được ưu tiên duyệt.`

export function createIdempotencyKey() {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID()
  const bytes = new Uint8Array(16)
  globalThis.crypto.getRandomValues(bytes)
  return `job-${Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('')}`
}

export function isSupportedGoogleMapsUrl(value) {
  try {
    const url = new URL(String(value).trim())
    if (url.protocol !== 'https:') return false
    const host = url.hostname.toLowerCase()
    const googleDomain = host === 'google.com' || host.endsWith('.google.com') || host === 'google.com.vn' || host.endsWith('.google.com.vn')
    if (googleDomain) return url.pathname === '/maps' || url.pathname.startsWith('/maps/') || host === 'maps.google.com' || host === 'maps.google.com.vn'
    if (host === 'maps.app.goo.gl') return url.pathname.length > 1
    return host === 'goo.gl' && (url.pathname === '/maps' || url.pathname.startsWith('/maps/'))
  } catch {
    return false
  }
}

export function mapJobPayload(values) {
  return {
    title: values.title.trim(),
    description: values.description.trim(),
    mapLink: values.mapLink.trim(),
    requiredLevelId: Number(values.requiredLevelId),
    pricePerReview: Number(values.pricePerReview),
    totalReviews: Number(values.totalReviews),
    reviewContents: (values.reviewContents ?? [])
      .filter((item) => item?.content?.trim())
      .map((item) => ({ content: item.content.trim(), images: Array.isArray(item.images) ? item.images : [] })),
  }
}

export function hasAtMostTwoDecimalPlaces(value) {
  const text = String(value)
  return !text.includes('.') || text.split('.')[1].length <= 2
}
