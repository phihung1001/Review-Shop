import { authSession } from '@/features/auth/model/authSession.js'
import { ApiError } from '@/shared/api/httpClient.js'
import { navigate } from '@/shared/lib/navigation.js'

export function handleExpiredAdminSession(error, redirectPath) {
  if (!(error instanceof ApiError) || error.status !== 401) return false
  authSession.clear()
  navigate(`/login?redirect=${encodeURIComponent(redirectPath)}`, { replace: true })
  return true
}
