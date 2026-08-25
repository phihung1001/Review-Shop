import { ResetPasswordForm } from '@/features/auth/ui/ResetPasswordForm.jsx'
import { AuthLayout } from '@/features/auth/ui/AuthLayout/AuthLayout.jsx'

export function ResetPasswordPage() {
  return <AuthLayout title="Đặt lại mật khẩu" description="Nhập mã OTP trong email để tiếp tục quản lý nhiệm vụ và kết quả đánh giá."><ResetPasswordForm /></AuthLayout>
}
