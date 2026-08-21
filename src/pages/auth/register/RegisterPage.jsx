import { RegisterForm } from '@/features/auth/ui/RegisterForm.jsx'
import { AuthLayout } from '@/features/auth/ui/AuthLayout/AuthLayout.jsx'

export function RegisterPage() {
  return <AuthLayout title="Tạo tài khoản" description="Tham gia cộng đồng và chia sẻ trải nghiệm mua sắm của bạn.">
    <RegisterForm />
    </AuthLayout>
}

