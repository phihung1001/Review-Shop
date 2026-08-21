import { httpClient } from '@/shared/api/httpClient.js'

function validId(value, label) {
  if (value === null || value === undefined || !String(value).trim()) throw new TypeError(`${label} không hợp lệ.`)
  return value
}

function httpsUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return ''
  try {
    const url = new URL(value)
    return url.protocol === 'https:' ? url.toString() : ''
  } catch { return '' }
}

export function normalizePayoutMethod(item = {}) {
  return {
    id: item.id ?? null,
    type: String(item.type ?? 'BANK_ACCOUNT').toUpperCase(),
    bankCode: typeof item.bankCode === 'string' ? item.bankCode.trim().toUpperCase() : '',
    bankName: typeof item.bankName === 'string' ? item.bankName.trim() : '',
    maskedAccountNumber: typeof item.maskedAccountNumber === 'string' ? item.maskedAccountNumber.trim() : '',
    accountHolderName: typeof item.accountHolderName === 'string' ? item.accountHolderName.trim() : '',
    qrImageUrl: httpsUrl(item.qrImageUrl),
    isDefault: item.isDefault === true,
    status: String(item.status ?? 'UNKNOWN').toUpperCase(),
    createdAt: item.createdAt ?? null,
  }
}

export function getPayoutMethods() {
  return httpClient('/freelancer/payout-methods').then((response) => {
    const body = response?.data ?? response
    const items = Array.isArray(body) ? body : body?.items ?? body?.content ?? []
    return Array.isArray(items) ? items.map(normalizePayoutMethod).filter((item) => item.id !== null && item.id !== undefined) : []
  })
}

export function createPayoutMethod(values = {}) {
  const payload = {
    type: 'BANK_ACCOUNT',
    bankCode: String(values.bankCode ?? '').trim().toUpperCase(),
    bankName: String(values.bankName ?? '').trim(),
    accountNumber: String(values.accountNumber ?? '').replace(/\s/g, ''),
    accountHolderName: String(values.accountHolderName ?? '').trim().toUpperCase(),
    qrImageObjectKey: String(values.qrImageObjectKey ?? '').trim(),
    isDefault: values.isDefault !== false,
  }
  if (!payload.bankCode || !payload.bankName || !payload.accountNumber || !payload.accountHolderName || !payload.qrImageObjectKey) {
    throw new TypeError('Thông tin tài khoản ngân hàng và ảnh QR chưa đầy đủ.')
  }
  return httpClient('/freelancer/payout-methods', { method: 'POST', body: JSON.stringify(payload) })
    .then((response) => normalizePayoutMethod(response?.data ?? response))
}

export function deletePayoutMethod(payoutMethodId) {
  validId(payoutMethodId, 'Payout method ID')
  return httpClient(`/freelancer/payout-methods/${encodeURIComponent(String(payoutMethodId))}`, { method: 'DELETE' })
}

export function createWithdrawal({ amount, payoutMethodId, idempotencyKey } = {}) {
  validId(payoutMethodId, 'Tài khoản nhận tiền')
  const normalizedAmount = Number(amount)
  if (!Number.isSafeInteger(normalizedAmount) || normalizedAmount <= 0) throw new TypeError('Số tiền rút không hợp lệ.')
  if (!idempotencyKey || !String(idempotencyKey).trim()) throw new TypeError('Idempotency key là bắt buộc.')
  return httpClient('/freelancer/withdrawals', {
    method: 'POST',
    headers: { 'Idempotency-Key': String(idempotencyKey).trim() },
    body: JSON.stringify({ amount: normalizedAmount, currency: 'VND', payoutMethodId }),
  }).then((response) => response?.data ?? response)
}
