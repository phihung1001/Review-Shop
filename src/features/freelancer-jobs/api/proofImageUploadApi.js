import { ApiError, httpClient } from '@/shared/api/httpClient.js'

function normalizeUploadResponse(response) {
  const body = response?.data ?? response
  const objectKey = typeof body?.objectKey === 'string' ? body.objectKey.trim() : ''
  const uploadUrl = typeof body?.uploadUrl === 'string' ? body.uploadUrl.trim() : ''
  const requiredHeaders = body?.requiredHeaders && typeof body.requiredHeaders === 'object' && !Array.isArray(body.requiredHeaders)
    ? Object.fromEntries(Object.entries(body.requiredHeaders).map(([key, value]) => [key, String(value)]))
    : {}
  if (!objectKey || !uploadUrl) throw new ApiError({ message: 'Máy chủ không trả về thông tin upload ảnh hợp lệ.', code: 'INVALID_UPLOAD_RESPONSE' })
  try {
    if (new URL(uploadUrl).protocol !== 'https:') throw new Error()
  } catch {
    throw new ApiError({ message: 'URL upload ảnh không hợp lệ.', code: 'INVALID_UPLOAD_URL' })
  }
  return { objectKey, uploadUrl, requiredHeaders, expiresAt: body?.expiresAt ?? null }
}

export function createProofImageUpload(file) {
  if (!(file instanceof Blob) || !file.name || !file.type.startsWith('image/') || file.size <= 0) {
    throw new TypeError('Vui lòng chọn file ảnh hợp lệ.')
  }
  return httpClient('/freelancer/proof-images/uploads', {
    method: 'POST',
    body: JSON.stringify({ fileName: file.name, contentType: file.type, size: file.size }),
  }).then(normalizeUploadResponse)
}

export async function uploadProofImage(file) {
  const upload = await createProofImageUpload(file)
  let response
  try {
    response = await fetch(upload.uploadUrl, {
      method: 'PUT',
      headers: upload.requiredHeaders,
      body: file,
    })
  } catch {
    throw new ApiError({ message: `Không thể tải ảnh “${file.name}” lên kho lưu trữ.`, code: 'IMAGE_UPLOAD_NETWORK_ERROR' })
  }
  if (!response.ok) {
    throw new ApiError({ message: `Tải ảnh “${file.name}” thất bại. Vui lòng thử lại.`, status: response.status, code: `IMAGE_UPLOAD_HTTP_${response.status}` })
  }
  return upload.objectKey
}

export function uploadProofImages(files) {
  if (!Array.isArray(files) || files.length === 0 || files.length > 10) throw new TypeError('Vui lòng chọn từ 1 đến 10 ảnh Proof.')
  return Promise.all(files.map(uploadProofImage))
}
