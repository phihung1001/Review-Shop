import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ForgotPasswordForm } from './ForgotPasswordForm.jsx'
import { LoginForm } from './LoginForm.jsx'
import { RegisterForm } from './RegisterForm.jsx'
import { ResetPasswordForm } from './ResetPasswordForm.jsx'
import { forgotPassword, login, register, resetPassword } from '../api/authApi.js'
import { authSession } from '../model/authSession.js'

vi.mock('../api/authApi.js', () => ({ login: vi.fn(), register: vi.fn(), forgotPassword: vi.fn(), resetPassword: vi.fn() }))

describe('auth forms', () => {
  beforeEach(() => {
    authSession.clear()
    window.history.replaceState({}, '', '/')
  })

  it('shows login validation errors', async () => {
    render(<LoginForm />)
    await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }))
    expect(screen.getByText('Vui lòng nhập email.')).toBeVisible()
    expect(screen.getByText('Vui lòng nhập mật khẩu.')).toBeVisible()
  })

  it('requires terms and a matching registration password', async () => {
    render(<RegisterForm />)
    await userEvent.type(screen.getByLabelText('Họ và tên'), 'Nguyen Van A')
    await userEvent.type(screen.getByLabelText('Email'), 'client@example.com')
    await userEvent.type(screen.getByLabelText('Mật khẩu'), 'password-12-chars')
    await userEvent.type(screen.getByLabelText('Xác nhận mật khẩu'), 'different-value')
    await userEvent.click(screen.getByRole('button', { name: 'Đăng ký' }))
    expect(screen.getByText('Mật khẩu xác nhận không khớp.')).toBeVisible()
    expect(screen.getByText('Bạn cần đồng ý với điều khoản sử dụng.')).toBeVisible()
  })

  it('allows choosing the Freelancer account type', async () => {
    render(<RegisterForm />)
    const freelancer = screen.getByRole('radio', { name: /Freelancer/ })
    await userEvent.click(freelancer)
    expect(freelancer).toBeChecked()
  })

  it('reads only a whitelisted role from the URL', () => {
    window.history.replaceState({}, '', '/register?role=FREELANCER')
    render(<RegisterForm />)
    expect(screen.getByRole('radio', { name: /Freelancer/ })).toBeChecked()
  })

  it('automatically logs in and opens the dashboard after registration', async () => {
    register.mockResolvedValue({ message: 'Register successfully' })
    login.mockResolvedValue({ accessToken: 'new-user-token', user: { id: 8, fullName: 'Nguyễn Văn A', email: 'client@example.com', role: 'CLIENT' } })
    render(<RegisterForm />)
    fireEvent.change(screen.getByLabelText('Họ và tên'), { target: { value: 'Nguyễn Văn A' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'client@example.com' } })
    fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: 'secret1' } })
    fireEvent.change(screen.getByLabelText('Xác nhận mật khẩu'), { target: { value: 'secret1' } })
    await userEvent.click(screen.getByRole('checkbox'))
    await userEvent.click(screen.getByRole('button', { name: 'Đăng ký' }))
    expect(login).toHaveBeenCalledWith({ email: 'client@example.com', password: 'secret1' })
    expect(authSession.getSnapshot().status).toBe('authenticated')
    expect(window.location.pathname).toBe('/welcome')
  })

  it('uses a neutral forgot-password success message', async () => {
    render(<ForgotPasswordForm />)
    await userEvent.type(screen.getByLabelText('Email'), 'client@example.com')
    await userEvent.click(screen.getByRole('button', { name: 'Gửi yêu cầu đặt lại mật khẩu' }))
    expect(await screen.findByText('Nếu email tồn tại trong hệ thống, mã xác thực đã được gửi.')).toBeVisible()
    expect(screen.getByRole('link', { name: 'Nhập mã OTP' })).toHaveAttribute('href', '/reset-password?email=client%40example.com')
    expect(forgotPassword).toHaveBeenCalledWith('client@example.com')
  })

  it('prefills email and submits a normalized reset-password payload', async () => {
    window.history.replaceState({}, '', '/reset-password?email=client%40example.com')
    render(<ResetPasswordForm />)
    expect(screen.getByLabelText('Email')).toHaveValue('client@example.com')
    fireEvent.change(screen.getByLabelText('Mã OTP'), { target: { value: '123456' } })
    fireEvent.change(screen.getByLabelText('Mật khẩu mới'), { target: { value: ' secret1 ' } })
    fireEvent.change(screen.getByLabelText('Xác nhận mật khẩu mới'), { target: { value: ' secret1 ' } })
    await userEvent.click(screen.getByRole('button', { name: 'Đặt lại mật khẩu' }))
    expect(resetPassword).toHaveBeenCalledWith({ email: 'client@example.com', otp: '123456', newPassword: ' secret1 ' })
    expect(window.location.pathname).toBe('/login')
    expect(window.location.search).toBe('?reset=1')
  })

  it('does not submit reset password with invalid values', async () => {
    render(<ResetPasswordForm />)
    await userEvent.type(screen.getByLabelText('Email'), 'client@example.com')
    await userEvent.type(screen.getByLabelText('Mã OTP'), '12345')
    await userEvent.type(screen.getByLabelText('Mật khẩu mới'), '12345')
    await userEvent.type(screen.getByLabelText('Xác nhận mật khẩu mới'), 'other')
    await userEvent.click(screen.getByRole('button', { name: 'Đặt lại mật khẩu' }))
    expect(screen.getByText('Mã OTP phải gồm đúng 6 chữ số.')).toBeInTheDocument()
    expect(screen.getByText('Mật khẩu phải có ít nhất 6 ký tự.')).toBeInTheDocument()
    expect(screen.getByText('Xác nhận mật khẩu không khớp.')).toBeInTheDocument()
    expect(resetPassword).not.toHaveBeenCalled()
  })

  it('shows reset success feedback on login', () => {
    window.history.replaceState({}, '', '/login?reset=1')
    render(<LoginForm />)
    expect(screen.getByText('Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới.')).toBeVisible()
  })
})
