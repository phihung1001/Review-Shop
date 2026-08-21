import { getClientAccount, getFreelancerAccount } from '../api/accountApi.js'
import { ApiError } from '@/shared/api/httpClient.js'
import { authSession } from '@/features/auth/model/authSession.js'
import { navigate } from '@/shared/lib/navigation.js'

let snapshot = { role: '', status: 'idle', account: null, error: '' }
const listeners = new Set()
let request = null

function emit(next) {
  snapshot = next
  listeners.forEach((listener) => listener())
}

async function loadAccount(role, { preserveAccount = false } = {}) {
  if (request) return request
  emit({ role, status: 'loading', account: preserveAccount && snapshot.role === role ? snapshot.account : null, error: '' })
  request = (role === 'CLIENT' ? getClientAccount() : getFreelancerAccount())
    .then((account) => emit({ role, status: 'success', account, error: '' }))
    .catch((error) => {
      if (error instanceof ApiError && [401, 403].includes(error.status)) {
        emit({ role: '', status: 'idle', account: null, error: '' })
        authSession.clear()
        navigate('/login', { replace: true })
        return
      }
      emit({ role, status: 'error', account: preserveAccount && snapshot.role === role ? snapshot.account : null, error: error instanceof ApiError ? error.message : 'Không thể tải số dư.' })
    })
    .finally(() => { request = null })
  return request
}

export const accountBalance = {
  subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) },
  getSnapshot() { return snapshot },
  load(role) {
    if (role === 'CLIENT' || role === 'FREELANCER') return loadAccount(role)
    emit({ role, status: 'idle', account: null, error: '' })
    return Promise.resolve()
  },
  refresh() { return snapshot.role === 'CLIENT' || snapshot.role === 'FREELANCER' ? loadAccount(snapshot.role, { preserveAccount: true }) : Promise.resolve() },
  clear() { request = null; emit({ role: '', status: 'idle', account: null, error: '' }) },
}
