import { httpClient } from '@/shared/api/httpClient.js'

function getCookie(name) {
  const prefix = `${encodeURIComponent(name)}=`
  const cookie = document.cookie.split(';').map((item) => item.trim()).find((item) => item.startsWith(prefix))
  return cookie ? cookie.slice(prefix.length) : ''
}

function csrfHeaders() {
  const csrfToken = getCookie('csrf_token')
  return csrfToken ? { 'X-CSRF-Token': csrfToken } : undefined
}

export function hasCsrfToken() {
  return Boolean(getCookie('csrf_token'))
}

export function login(credentials) {
  return httpClient('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  })
}

export function logout() {
  return httpClient('/auth/logout', {
    method: 'POST',
    headers: csrfHeaders(),
  })
}

export function refreshSession() {
  return httpClient('/auth/refresh', {
    method: 'POST',
    headers: csrfHeaders(),
  })
}

const REGISTER_ROLES = new Set(['CLIENT', 'FREELANCER'])

export function register({ fullName, email, password, role }) {
  const safeRole = REGISTER_ROLES.has(role) ? role : 'CLIENT'
  return httpClient('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ fullName, email, password, role: safeRole }),
  })
}

export function forgotPassword(email) {
  return httpClient('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export function resetPassword({ email, otp, newPassword }) {
  return httpClient('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ email, otp, newPassword }),
  })
}
