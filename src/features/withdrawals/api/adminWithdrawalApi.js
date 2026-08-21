import { httpClient } from '@/shared/api/httpClient.js'

function validId(value) {
  if (value === null || value === undefined || !String(value).trim()) {
    throw new TypeError('Mã yêu cầu rút tiền không hợp lệ.')
  }
  return String(value).trim()
}

function finiteNumber(value) {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function safeResourceUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return ''
  const candidate = value.trim()
  if (candidate.startsWith('/') && !candidate.startsWith('//')) return candidate
  try {
    const url = new URL(candidate)
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : ''
  } catch {
    return ''
  }
}

function normalizedText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function optionalText(value, label, maxLength = 2000) {
  const text = normalizedText(value)
  if (text.length > maxLength) throw new TypeError(`${label} không được vượt quá ${maxLength} ký tự.`)
  return text
}

function requiredText(value, label, maxLength = 2000) {
  const text = optionalText(value, label, maxLength)
  if (!text) throw new TypeError(`${label} là bắt buộc.`)
  return text
}

function responseBody(response) {
  return response?.data ?? response
}

export function normalizeAdminWithdrawal(item = {}) {
  const payout = item.payoutMethodSnapshot ?? item.payoutMethod ?? item.bankAccount ?? item.bankDetails ?? item.destination ?? {}
  const freelancer = item.freelancer ?? item.requester ?? item.user ?? {}
  const amount = finiteNumber(item.amount ?? item.grossAmount)
  const feeAmount = finiteNumber(item.feeAmount ?? item.fee)
  const responseNetAmount = finiteNumber(item.netAmount ?? item.receivableAmount)

  return {
    id: item.id ?? item.withdrawalId ?? null,
    code: normalizedText(item.code ?? item.withdrawalCode ?? item.referenceCode),
    status: String(item.status ?? 'UNKNOWN').trim().toUpperCase(),
    freelancer: {
      id: freelancer.id ?? item.freelancerId ?? item.userId ?? null,
      name: normalizedText(freelancer.fullName ?? freelancer.name ?? item.freelancerName) || 'Freelancer',
      email: normalizedText(freelancer.email ?? item.freelancerEmail),
    },
    amount,
    feeAmount,
    netAmount: responseNetAmount ?? (amount !== null && feeAmount !== null ? amount - feeAmount : null),
    currency: normalizedText(item.currency).toUpperCase() || 'VND',
    bank: {
      code: normalizedText(payout.bankCode ?? item.bankCode).toUpperCase(),
      name: normalizedText(payout.bankName ?? item.bankName),
      accountNumber: normalizedText(payout.accountNumber ?? payout.maskedAccountNumber ?? item.accountNumber),
      accountHolderName: normalizedText(payout.accountHolderName ?? payout.accountName ?? item.accountHolderName ?? item.accountName),
      qrImageUrl: safeResourceUrl(payout.qrImageUrl ?? payout.qrUrl ?? item.qrImageUrl ?? item.qrUrl),
    },
    transferContent: normalizedText(item.transferContent ?? item.transferDescription ?? item.paymentContent),
    provider: normalizedText(item.provider),
    providerReference: normalizedText(item.providerReference ?? item.transactionReference),
    adminNote: normalizedText(item.adminNote ?? item.note),
    reason: normalizedText(item.rejectionReason ?? item.failureReason ?? item.reason),
    createdAt: item.createdAt ?? item.requestedAt ?? null,
    updatedAt: item.updatedAt ?? item.processedAt ?? null,
  }
}

export function normalizeAdminWithdrawalList(response) {
  const body = responseBody(response)
  const container = body?.data ?? body
  const items = Array.isArray(container) ? container : container?.content ?? container?.items ?? container?.results ?? []
  return Array.isArray(items)
    ? items.map(normalizeAdminWithdrawal).filter((item) => item.id !== null && item.id !== undefined)
    : []
}

export function getAdminWithdrawals(status = 'PENDING') {
  const query = new URLSearchParams({ status: String(status).trim().toUpperCase() })
  return httpClient(`/admin/withdrawals?${query}`).then(normalizeAdminWithdrawalList)
}

export function getAdminWithdrawal(withdrawalId) {
  const id = validId(withdrawalId)
  return httpClient(`/admin/withdrawals/${encodeURIComponent(id)}`)
    .then((response) => normalizeAdminWithdrawal(responseBody(response)))
}

export function approveAdminWithdrawal(withdrawalId, { adminNote = '' } = {}) {
  const id = validId(withdrawalId)
  return httpClient(`/admin/withdrawals/${encodeURIComponent(id)}/approve`, {
    method: 'POST',
    body: JSON.stringify({ adminNote: optionalText(adminNote, 'Ghi chú') }),
  })
}

export function rejectAdminWithdrawal(withdrawalId, { reason } = {}) {
  const id = validId(withdrawalId)
  return httpClient(`/admin/withdrawals/${encodeURIComponent(id)}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason: requiredText(reason, 'Lý do từ chối') }),
  })
}

export function completeAdminWithdrawal(withdrawalId, values = {}) {
  const id = validId(withdrawalId)
  const provider = normalizedText(values.provider).toUpperCase() || 'BANK_TRANSFER'
  return httpClient(`/admin/withdrawals/${encodeURIComponent(id)}/complete`, {
    method: 'POST',
    body: JSON.stringify({
      provider,
      providerReference: requiredText(values.providerReference, 'Mã giao dịch', 255),
      adminNote: optionalText(values.adminNote, 'Ghi chú'),
    }),
  })
}

export function failAdminWithdrawal(withdrawalId, { reason } = {}) {
  const id = validId(withdrawalId)
  return httpClient(`/admin/withdrawals/${encodeURIComponent(id)}/fail`, {
    method: 'POST',
    body: JSON.stringify({ reason: requiredText(reason, 'Lý do chuyển khoản thất bại') }),
  })
}
