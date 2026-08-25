import { RegisterForm } from '@/features/auth/ui/RegisterForm.jsx'
import { AuthLayout } from '@/features/auth/ui/AuthLayout/AuthLayout.jsx'

export function RegisterPage() {
  return <AuthLayout title="Tạo tài khoản" description="Tham gia quy trình đánh giá Google Maps minh bạch và có bằng chứng.">
    <RegisterForm />
    </AuthLayout>
}
