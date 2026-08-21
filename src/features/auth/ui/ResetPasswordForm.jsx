import { useRef, useState } from 'react'
import { Alert, Button, Form, Input } from 'antd'
import { resetPassword } from '../api/authApi.js'
import { getAuthError } from '../lib/errorMessages.js'
import { validateResetPassword } from '../lib/validation.js'
import { navigate } from '@/shared/lib/navigation.js'
import styles from './AuthForm.module.css'

export function ResetPasswordForm() {
  const [values, setValues] = useState(() => ({
    email: new URLSearchParams(window.location.search).get('email') ?? '',
    otp: '',
    newPassword: '',
    confirmPassword: '',
  }))
  const [errors, setErrors] = useState({})
  const [apiError, setApiError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const refs = { email: useRef(null), otp: useRef(null), newPassword: useRef(null), confirmPassword: useRef(null) }

  function update(field, value) {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: '' }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (submitting) return
    const nextErrors = validateResetPassword(values)
    setErrors(nextErrors)
    setApiError('')
    const firstInvalidField = Object.keys(nextErrors)[0]
    if (firstInvalidField) {
      requestAnimationFrame(() => refs[firstInvalidField]?.current?.focus())
      return
    }

    setSubmitting(true)
    try {
      await resetPassword({
        email: values.email.trim(),
        otp: values.otp.trim(),
        newPassword: values.newPassword,
      })
      navigate('/login?reset=1', { replace: true })
    } catch (error) {
      if (error.fieldErrors) {
        const allowedFields = ['email', 'otp', 'newPassword']
        setErrors((current) => ({
          ...current,
          ...Object.fromEntries(Object.entries(error.fieldErrors).filter(([field]) => allowedFields.includes(field))),
        }))
      }
      setApiError(getAuthError(error, 'reset-password'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Form className={styles.form} layout="vertical" onSubmitCapture={handleSubmit} noValidate>
      {apiError && <Alert type="error" showIcon title={apiError} />}
      <Form.Item label="Email" htmlFor="reset-email" validateStatus={errors.email ? 'error' : undefined} help={errors.email}>
        <Input ref={refs.email} id="reset-email" name="email" type="email" size="large" value={values.email} onChange={(event) => update('email', event.target.value)} autoComplete="email" aria-invalid={Boolean(errors.email)} />
      </Form.Item>
      <Form.Item label="Mã OTP" htmlFor="otp" validateStatus={errors.otp ? 'error' : undefined} help={errors.otp}>
        <Input ref={refs.otp} id="otp" name="otp" size="large" value={values.otp} onChange={(event) => update('otp', event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" maxLength={6} aria-invalid={Boolean(errors.otp)} />
      </Form.Item>
      <Form.Item label="Mật khẩu mới" htmlFor="new-password" validateStatus={errors.newPassword ? 'error' : undefined} help={errors.newPassword}>
        <Input.Password ref={refs.newPassword} id="new-password" name="newPassword" size="large" value={values.newPassword} onChange={(event) => update('newPassword', event.target.value)} autoComplete="new-password" aria-invalid={Boolean(errors.newPassword)} />
      </Form.Item>
      <Form.Item label="Xác nhận mật khẩu mới" htmlFor="confirm-password" validateStatus={errors.confirmPassword ? 'error' : undefined} help={errors.confirmPassword}>
        <Input.Password ref={refs.confirmPassword} id="confirm-password" name="confirmPassword" size="large" value={values.confirmPassword} onChange={(event) => update('confirmPassword', event.target.value)} autoComplete="new-password" aria-invalid={Boolean(errors.confirmPassword)} />
      </Form.Item>
      <Button type="primary" size="large" htmlType="submit" loading={submitting} disabled={submitting} block>Đặt lại mật khẩu</Button>
      <a className={styles.link} href="/login">← Quay lại đăng nhập</a>
    </Form>
  )
}
