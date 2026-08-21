import { useState } from 'react'
import { Alert, Button, Form, Input } from 'antd'
import { forgotPassword } from '../api/authApi.js'
import { validateForgotPassword } from '../lib/validation.js'
import { ApiError } from '@/shared/api/httpClient.js'
import styles from './AuthForm.module.css'

const NEUTRAL_MESSAGE = 'Nếu email tồn tại trong hệ thống, mã xác thực đã được gửi.'

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submittedEmail, setSubmittedEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [apiError, setApiError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    if (submitting) return
    const validationError = validateForgotPassword({ email }).email ?? ''
    setError(validationError)
    setApiError('')
    if (validationError) return

    const normalizedEmail = email.trim()
    setSubmitting(true)
    try {
      await forgotPassword(normalizedEmail)
    } catch (requestError) {
      if (requestError instanceof ApiError && (requestError.code === 'NETWORK_ERROR' || requestError.status >= 500)) {
        setApiError(requestError.code === 'NETWORK_ERROR' ? requestError.message : 'Hệ thống đang bận. Vui lòng thử lại sau.')
        return
      }
      // Deliberately treat account-related responses uniformly to prevent enumeration.
      setSubmittedEmail(normalizedEmail)
      setSubmitted(true)
    } finally {
      setSubmitting(false)
    }
    setSubmittedEmail(normalizedEmail)
    setSubmitted(true)
  }

  if (submitted) {
    const resetUrl = `/reset-password?email=${encodeURIComponent(submittedEmail)}`
    return (
      <div className={styles.form}>
        <Alert type="success" showIcon title={NEUTRAL_MESSAGE} />
        <Button type="primary" size="large" block href={resetUrl}>Nhập mã OTP</Button>
        <a className={styles.link} href="/login">← Quay lại đăng nhập</a>
      </div>
    )
  }

  return (
    <Form className={styles.form} layout="vertical" onSubmitCapture={handleSubmit} noValidate>
      {apiError && <Alert type="error" showIcon title={apiError} />}
      <Form.Item label="Email" htmlFor="email" validateStatus={error ? 'error' : undefined} help={error}>
        <Input id="email" name="email" type="email" size="large" value={email} onChange={(event) => { setEmail(event.target.value); setError('') }} autoComplete="email" placeholder="client@example.com" aria-invalid={Boolean(error)} />
      </Form.Item>
      <Button type="primary" size="large" htmlType="submit" loading={submitting} disabled={submitting} block>Gửi yêu cầu đặt lại mật khẩu</Button>
      <a className={styles.link} href="/login">← Quay lại đăng nhập</a>
    </Form>
  )
}
