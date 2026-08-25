import { LoginForm } from '@/features/auth/ui/LoginForm.jsx'
import { AuthLayout } from '@/features/auth/ui/AuthLayout/AuthLayout.jsx'

export function LoginPage() {
  return <AuthLayout title="Chào mừng trở lại" description="Đăng nhập để tiếp tục tạo và thực hiện nhiệm vụ đánh giá Google Maps."><LoginForm /></AuthLayout>
}
