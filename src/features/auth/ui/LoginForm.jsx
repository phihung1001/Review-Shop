import { useState } from 'react'
import { login } from '../api/authApi.js'
import { getAuthError } from '../lib/errorMessages.js'
import { validateLogin } from '../lib/validation.js'
import { authSession } from '../model/authSession.js'
import { navigate, safeRedirect } from '@/shared/lib/navigation.js'
import { Alert } from './Alert/Alert.jsx'
import { FormField } from './FormField/FormField.jsx'
import { PasswordField } from './PasswordField/PasswordField.jsx'
import styles from './AuthForm.module.css'

export function LoginForm() {
  const [values, setValues] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [apiError, setApiError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const successMessage = new URLSearchParams(window.location.search).get('registered') === '1'
  const resetSuccessMessage = new URLSearchParams(window.location.search).get('reset') === '1'

  function update(event) {
    setValues((current) => ({ ...current, [event.target.name]: event.target.value }))
    setErrors((current) => ({ ...current, [event.target.name]: '' }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (submitting) return
    const form = event.currentTarget
    const nextErrors = validateLogin(values)
    setErrors(nextErrors)
    setApiError('')
    if (Object.keys(nextErrors).length) {
      requestAnimationFrame(() => form.querySelector('[aria-invalid="true"]')?.focus())
      return
    }

    setSubmitting(true)
    try {
      const email = values.email.trim()
      const response = await login({ email, password: values.password })
      authSession.markAuthenticated(response, { email })
      const redirect = safeRedirect(new URLSearchParams(window.location.search).get('redirect'))
      navigate(redirect, { replace: true })
    } catch (error) {
      if (error.fieldErrors) setErrors((current) => ({ ...current, ...error.fieldErrors }))
      setApiError(getAuthError(error, 'login'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        {successMessage && <Alert type="success">Đăng ký thành công. Vui lòng đăng nhập.</Alert>}
        {resetSuccessMessage && <Alert type="success">Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới.</Alert>}
        {apiError && <Alert>{apiError}</Alert>}
        <FormField id="email" label="Email" error={errors.email}>
          {({ describedBy, invalid }) => <input id="email" name="email" type="email" value={values.email} onChange={update} autoComplete="email" placeholder="client@example.com" aria-invalid={invalid} aria-describedby={describedBy} />}
        </FormField>
        <PasswordField id="password" label="Mật khẩu" value={values.password} onChange={update} error={errors.password} autoComplete="current-password" />
        <div className={styles.row}><span /><a className={styles.link} href="/forgot-password">Quên mật khẩu?</a></div>
        <button className={styles.submit} type="submit" disabled={submitting}>{submitting ? 'Đang đăng nhập…' : 'Đăng nhập'}</button>
      </form>
      <p className={styles.switch}>Chưa có tài khoản? <a className={styles.link} href="/register">Đăng ký tài khoản</a></p>
    </>
  )
}
