import { ForgotPasswordForm } from '@/features/auth/ui/ForgotPasswordForm.jsx'
import { AuthLayout } from '@/features/auth/ui/AuthLayout/AuthLayout.jsx'

export function ForgotPasswordPage() {
  return <AuthLayout title="Quên mật khẩu?" description="Nhập email đã đăng ký để khôi phục quyền truy cập vào tài khoản đánh giá Google Maps."><ForgotPasswordForm /></AuthLayout>
}
