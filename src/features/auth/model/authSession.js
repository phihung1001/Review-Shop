import { hasCsrfToken, refreshSession } from '../api/authApi.js'
import { ApiError } from '@/shared/api/httpClient.js'
import { clearAccessToken, setAccessToken } from '@/shared/api/accessToken.js'

let snapshot = { status: 'checking', user: null }
const listeners = new Set()
let restorePromise = null

function emit() {
  listeners.forEach((listener) => listener())
}

function normalizeUser(payload, fallback = {}) {
  const user = payload?.user ?? payload?.data?.user ?? payload?.data ?? payload ?? {}
  const roles = user.roles ?? user.authorities ?? []
  const firstRole = Array.isArray(roles) ? roles[0] : roles
  const normalizedRole = typeof firstRole === 'string' ? firstRole : firstRole?.authority ?? firstRole?.name
  return {
    id: user.id ?? null,
    name: user.fullName ?? user.name ?? fallback.name ?? '',
    email: user.email ?? fallback.email ?? '',
    avatarUrl: user.avatarUrl ?? user.avatar ?? '',
    role: String(user.role?.name ?? user.role ?? normalizedRole ?? fallback.role ?? '').replace(/^ROLE_/, '').toUpperCase(),
  }
}

export const authSession = {
  subscribe: (listener) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  getSnapshot: () => snapshot,
  isAuthenticated: () => snapshot.status === 'authenticated',
  markAuthenticated: (payload, fallback) => {
    setAccessToken(payload?.accessToken ?? payload?.data?.accessToken)
    snapshot = { status: 'authenticated', user: normalizeUser(payload, fallback) }
    emit()
  },
  clear: () => {
    clearAccessToken()
    snapshot = { status: 'anonymous', user: null }
    emit()
  },
  restore: () => {
    if (snapshot.status !== 'checking') return Promise.resolve(snapshot)
    if (restorePromise) return restorePromise
    if (!hasCsrfToken()) {
      snapshot = { status: 'anonymous', user: null }
      emit()
      return Promise.resolve(snapshot)
    }

    restorePromise = refreshSession()
      .then((response) => {
        setAccessToken(response?.accessToken ?? response?.data?.accessToken)
        snapshot = { status: 'authenticated', user: normalizeUser(response) }
        emit()
        return snapshot
      })
      .catch((error) => {
        clearAccessToken()
        if (error instanceof ApiError && [401, 403].includes(error.status)) {
          snapshot = { status: 'anonymous', user: null }
        } else {
          snapshot = { status: 'error', user: null }
        }
        emit()
        return snapshot
      })
      .finally(() => {
        restorePromise = null
      })

    return restorePromise
  },
  retryRestore: () => {
    snapshot = { status: 'checking', user: null }
    emit()
    return authSession.restore()
  },
}
