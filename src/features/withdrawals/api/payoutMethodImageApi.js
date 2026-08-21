import { ApiError, httpClient } from '@/shared/api/httpClient.js'

export async function uploadPayoutMethodImage(file) {
  if (!(file instanceof Blob) || !file.name || !file.type.startsWith('image/') || file.size <= 0) throw new TypeError('Vui lòng chọn file ảnh QR hợp lệ.')
  const response = await httpClient('/freelancer/payout-method-images/uploads', {
    method: 'POST',
    body: JSON.stringify({ fileName: file.name, contentType: file.type, fileSize: file.size }),
  })
  const body = response?.data ?? response
  const objectKey = typeof body?.objectKey === 'string' ? body.objectKey.trim() : ''
  const uploadUrl = typeof body?.uploadUrl === 'string' ? body.uploadUrl.trim() : ''
  if (!objectKey || !uploadUrl) throw new ApiError({ message: 'Máy chủ không trả về thông tin upload QR hợp lệ.', code: 'INVALID_QR_UPLOAD_RESPONSE' })
  let uploadResponse
  try {
    uploadResponse = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file })
  } catch {
    throw new ApiError({ message: 'Không thể tải ảnh QR lên kho lưu trữ.', code: 'QR_UPLOAD_NETWORK_ERROR' })
  }
  if (!uploadResponse.ok) throw new ApiError({ message: 'Tải ảnh QR thất bại. Vui lòng thử lại.', status: uploadResponse.status, code: `QR_UPLOAD_HTTP_${uploadResponse.status}` })
  return objectKey
}
