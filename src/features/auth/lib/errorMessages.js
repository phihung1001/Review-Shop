import { ApiError } from '@/shared/api/httpClient.js'

export function getAuthError(error, context) {
  if (!(error instanceof ApiError)) return 'Đã có lỗi xảy ra. Vui lòng thử lại.'
  if (error.code === 'NETWORK_ERROR') return error.message
  if (context === 'login' && [400, 401, 403].includes(error.status)) return 'Email hoặc mật khẩu không chính xác.'
  if (context === 'register' && error.status === 409) return 'Email này đã được đăng ký.'
  if (context === 'reset-password' && [400, 401, 403, 404, 409, 410, 422].includes(error.status)) return 'Mã xác thực không hợp lệ hoặc đã hết hạn.'
  if (error.status >= 500) return 'Hệ thống đang bận. Vui lòng thử lại sau.'
  return 'Không thể xử lý yêu cầu. Vui lòng kiểm tra thông tin và thử lại.'
}
