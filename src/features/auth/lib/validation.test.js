import { describe, expect, it } from 'vitest'
import { normalizeFullName, validateForgotPassword, validateLogin, validateRegister, validateResetPassword } from './validation.js'

describe('auth validation', () => {
  it('validates required login fields', () => {
    expect(validateLogin({ email: '', password: '' })).toEqual({ email: 'Vui lòng nhập email.', password: 'Vui lòng nhập mật khẩu.' })
  })

  it('validates registration policy and confirmation', () => {
    const errors = validateRegister({ fullName: 'A', email: 'wrong', password: 'short', confirmPassword: 'different', acceptTerms: false })
    expect(errors.email).toBeTruthy()
    expect(errors.password).toContain('6')
    expect(errors.confirmPassword).toBeTruthy()
    expect(errors.acceptTerms).toBeTruthy()
  })

  it('normalizes whitespace in full name', () => {
    expect(normalizeFullName('  Nguyen   Van   A  ')).toBe('Nguyen Van A')
  })

  it('validates forgot password email', () => {
    expect(validateForgotPassword({ email: 'invalid' }).email).toBeTruthy()
    expect(validateForgotPassword({ email: 'client@example.com' })).toEqual({})
  })

  it.each(['12345', '1234567', '12345a', '12 345'])('rejects invalid OTP %s', (otp) => {
    const errors = validateResetPassword({ email: 'client@example.com', otp, newPassword: 'secret1', confirmPassword: 'secret1' })
    expect(errors.otp).toContain('6 chữ số')
  })

  it('accepts a trimmed six digit OTP', () => {
    expect(validateResetPassword({ email: 'client@example.com', otp: ' 123456 ', newPassword: 'secret1', confirmPassword: 'secret1' })).toEqual({})
  })

  it('enforces a six character minimum and matching confirmation', () => {
    expect(validateResetPassword({ email: 'client@example.com', otp: '123456', newPassword: '12345', confirmPassword: '12345' }).newPassword).toContain('6')
    expect(validateResetPassword({ email: 'client@example.com', otp: '123456', newPassword: '123456', confirmPassword: 'different' }).confirmPassword).toBeTruthy()
    expect(validateResetPassword({ email: 'client@example.com', otp: '123456', newPassword: '123456', confirmPassword: '123456' })).toEqual({})
  })
})
