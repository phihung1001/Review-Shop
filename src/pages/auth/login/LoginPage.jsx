import { LoginForm } from '@/features/auth/ui/LoginForm.jsx'
import { AuthLayout } from '@/features/auth/ui/AuthLayout/AuthLayout.jsx'

export function LoginPage() {
  return <AuthLayout title="Chào mừng trở lại" description="Đăng nhập để tiếp tục khám phá những đánh giá hữu ích."><LoginForm /></AuthLayout>
}

