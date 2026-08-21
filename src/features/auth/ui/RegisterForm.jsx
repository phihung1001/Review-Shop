import { useState } from 'react'
import { login, register } from '../api/authApi.js'
import { getAuthError } from '../lib/errorMessages.js'
import { normalizeFullName, validateRegister } from '../lib/validation.js'
import { authSession } from '../model/authSession.js'
import { navigate } from '@/shared/lib/navigation.js'
import { Alert } from './Alert/Alert.jsx'
import { FormField } from './FormField/FormField.jsx'
import { PasswordField } from './PasswordField/PasswordField.jsx'
import styles from './AuthForm.module.css'

function getInitialRole() {
  const role = new URLSearchParams(window.location.search).get('role')
  return role === 'FREELANCER' ? 'FREELANCER' : 'CLIENT'
}

export function RegisterForm() {
  const [values, setValues] = useState({ role: getInitialRole(), fullName: '', email: '', password: '', confirmPassword: '', acceptTerms: false })
  const [errors, setErrors] = useState({})
  const [apiError, setApiError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function update(event) {
    const { name, type, checked, value } = event.target
    setValues((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }))
    setErrors((current) => ({ ...current, [name]: '' }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (submitting) return
    const form = event.currentTarget
    const nextErrors = validateRegister(values)
    setErrors(nextErrors)
    setApiError('')
    if (Object.keys(nextErrors).length) {
      requestAnimationFrame(() => form.querySelector('[aria-invalid="true"]')?.focus())
      return
    }

    setSubmitting(true)
    let registered = false
    try {
      const fullName = normalizeFullName(values.fullName)
      const email = values.email.trim()
      const registrationResponse = await register({ role: values.role, fullName, email, password: values.password })
      registered = true
      const responseHasToken = Boolean(registrationResponse?.accessToken ?? registrationResponse?.data?.accessToken)
      const sessionResponse = responseHasToken ? registrationResponse : await login({ email, password: values.password })
      authSession.markAuthenticated(sessionResponse, { name: fullName, email, role: values.role })
      navigate(values.role === 'CLIENT' ? '/welcome' : '/dashboard', { replace: true })
    } catch (error) {
      if (registered) {
        navigate('/login?registered=1&autoLogin=failed', { replace: true })
        return
      }
      if (error.fieldErrors) setErrors((current) => ({ ...current, ...error.fieldErrors }))
      setApiError(getAuthError(error, 'register'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        {apiError && <Alert>{apiError}</Alert>}
        <fieldset className={styles.roleGroup}>
          <legend>Bạn muốn tham gia với vai trò nào?</legend>
          <div className={styles.roleOptions}>
            <label className={styles.roleOption}>
              <input type="radio" name="role" value="CLIENT" checked={values.role === 'CLIENT'} onChange={update} />
              <span><strong>Khách hàng</strong><small>Tìm kiếm và đánh giá dịch vụ</small></span>
            </label>
            <label className={styles.roleOption}>
              <input type="radio" name="role" value="FREELANCER" checked={values.role === 'FREELANCER'} onChange={update} />
              <span><strong>Freelancer</strong><small>Cung cấp dịch vụ của bạn</small></span>
            </label>
          </div>
        </fieldset>
        <FormField id="fullName" label="Họ và tên" error={errors.fullName}>
          {({ describedBy, invalid }) => <input id="fullName" name="fullName" value={values.fullName} onChange={update} autoComplete="name" placeholder="Nguyễn Văn A" aria-invalid={invalid} aria-describedby={describedBy} />}
        </FormField>
        <FormField id="email" label="Email" error={errors.email}>
          {({ describedBy, invalid }) => <input id="email" name="email" type="email" value={values.email} onChange={update} autoComplete="email" placeholder="client@example.com" aria-invalid={invalid} aria-describedby={describedBy} />}
        </FormField>
        <PasswordField id="password" label="Mật khẩu" value={values.password} onChange={update} error={errors.password} autoComplete="new-password" hint="Sử dụng ít nhất 6 ký tự." />
        <PasswordField id="confirmPassword" label="Xác nhận mật khẩu" value={values.confirmPassword} onChange={update} error={errors.confirmPassword} autoComplete="new-password" />
        <div>
          <label className={styles.checkbox}><input name="acceptTerms" type="checkbox" checked={values.acceptTerms} onChange={update} aria-invalid={Boolean(errors.acceptTerms)} aria-describedby={errors.acceptTerms ? 'acceptTerms-error' : undefined} /><span>Tôi đồng ý với điều khoản sử dụng và chính sách quyền riêng tư.</span></label>
          {errors.acceptTerms && <div className={styles.checkboxError} id="acceptTerms-error">{errors.acceptTerms}</div>}
        </div>
        <button className={styles.submit} type="submit" disabled={submitting}>{submitting ? 'Đang tạo tài khoản…' : 'Đăng ký'}</button>
      </form>
      <p className={styles.switch}>Đã có tài khoản? <a className={styles.link} href="/login">Đăng nhập</a></p>
    </>
  )
}
