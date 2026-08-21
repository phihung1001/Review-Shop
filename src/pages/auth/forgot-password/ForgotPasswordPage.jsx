import { ForgotPasswordForm } from '@/features/auth/ui/ForgotPasswordForm.jsx'
import { AuthLayout } from '@/features/auth/ui/AuthLayout/AuthLayout.jsx'

export function ForgotPasswordPage() {
  return <AuthLayout title="Quên mật khẩu?" description="Nhập email đã đăng ký. Chúng tôi sẽ gửi hướng dẫn nếu tài khoản tồn tại."><ForgotPasswordForm /></AuthLayout>
}
