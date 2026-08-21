import { env } from '@/shared/config/env.js'
import { getAccessToken } from './accessToken.js'

export class ApiError extends Error {
  constructor({ message, status = 0, code = 'UNKNOWN_ERROR', fieldErrors = {} }) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fieldErrors = fieldErrors
  }
}

function normalizeFieldErrors(payload) {
  const errors = payload?.fieldErrors ?? payload?.errors
  if (!errors || Array.isArray(errors) || typeof errors !== 'object') return {}
  return Object.fromEntries(
    Object.entries(errors).map(([field, value]) => [field, Array.isArray(value) ? value[0] : String(value)]),
  )
}

export async function httpClient(path, options = {}) {
  let response
  const accessToken = getAccessToken()
  const headers = Object.fromEntries(
    Object.entries(options.headers ?? {}).filter(([name]) => name.toLowerCase() !== 'authorization'),
  )

  // Authentication is owned by this boundary. Do not allow a feature-level
  // request to accidentally replace the current session token.
  try {
    response = await fetch(`${env.apiUrl}${path}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        // Ngrok free injects an HTML interstitial for browser-like requests.
        // This header is forwarded by the Vite proxy to the API tunnel.
        'ngrok-skip-browser-warning': '1',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...headers,
      },
    })
  } catch {
    throw new ApiError({
      message: 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng và thử lại.',
      code: 'NETWORK_ERROR',
    })
  }

  if (response.status === 204) return null

  const contentType = response.headers.get('content-type') ?? ''
  const payload = contentType.includes('application/json') ? await response.json().catch(() => null) : null

  if (!response.ok) {
    const backendMessage = typeof payload?.message === 'string' ? payload.message.trim() : ''
    throw new ApiError({
      message: backendMessage || 'Yêu cầu không thành công.',
      status: response.status,
      code: payload?.code ?? `HTTP_${response.status}`,
      fieldErrors: normalizeFieldErrors(payload),
    })
  }

  return payload
}
