const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function normalizeFullName(value) {
  return value.trim().replace(/\s+/g, ' ')
}

function validateEmail(email) {
  if (!email.trim()) return 'Vui lòng nhập email.'
  if (!EMAIL_PATTERN.test(email.trim())) return 'Email chưa đúng định dạng.'
  return ''
}

export function validateLogin(values) {
  const errors = {}
  const emailError = validateEmail(values.email)
  if (emailError) errors.email = emailError
  if (!values.password) errors.password = 'Vui lòng nhập mật khẩu.'
  return errors
}

export function validateRegister(values) {
  const errors = {}
  if (!normalizeFullName(values.fullName)) errors.fullName = 'Vui lòng nhập họ và tên.'
  const emailError = validateEmail(values.email)
  if (emailError) errors.email = emailError
  if (!values.password) errors.password = 'Vui lòng nhập mật khẩu.'
  else if (values.password.length < 6) errors.password = 'Mật khẩu phải có ít nhất 6 ký tự.'
  if (!values.confirmPassword) errors.confirmPassword = 'Vui lòng xác nhận mật khẩu.'
  else if (values.confirmPassword !== values.password) errors.confirmPassword = 'Mật khẩu xác nhận không khớp.'
  if (!values.acceptTerms) errors.acceptTerms = 'Bạn cần đồng ý với điều khoản sử dụng.'
  return errors
}

export function validateForgotPassword(values) {
  const emailError = validateEmail(values.email)
  return emailError ? { email: emailError } : {}
}

export function validateResetPassword(values) {
  const errors = {}
  const emailError = validateEmail(values.email)
  if (emailError) errors.email = emailError

  const otp = values.otp.trim()
  if (!otp) errors.otp = 'Vui lòng nhập mã OTP.'
  else if (!/^\d{6}$/.test(otp)) errors.otp = 'Mã OTP phải gồm đúng 6 chữ số.'

  if (!values.newPassword) errors.newPassword = 'Vui lòng nhập mật khẩu mới.'
  else if (values.newPassword.length < 6) errors.newPassword = 'Mật khẩu phải có ít nhất 6 ký tự.'

  if (!values.confirmPassword) errors.confirmPassword = 'Vui lòng xác nhận mật khẩu mới.'
  else if (values.confirmPassword !== values.newPassword) errors.confirmPassword = 'Xác nhận mật khẩu không khớp.'

  return errors
}
