import { httpClient } from '@/shared/api/httpClient.js'

function finiteAmount(value, field) {
  if (value === null || value === undefined || value === '') throw new TypeError(`Invalid ${field}`)
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount < 0) throw new TypeError(`Invalid ${field}`)
  return amount
}

export function getClientAccount() {
  return httpClient('/client/account').then((response) => {
    const account = response?.data ?? response
    if (!account || typeof account.currency !== 'string' || !account.currency.trim()) throw new TypeError('Invalid account currency')
    return {
      currency: account.currency.trim().toUpperCase(),
      availableAmount: finiteAmount(account.availableAmount, 'availableAmount'),
      heldAmount: finiteAmount(account.heldAmount, 'heldAmount'),
    }
  })
}

export function getFreelancerAccount() {
  return httpClient('/freelancer/account').then((response) => {
    const account = response?.data ?? response
    if (!account || typeof account.currency !== 'string' || !account.currency.trim()) throw new TypeError('Invalid account currency')
    return {
      currency: account.currency.trim().toUpperCase(),
      availableAmount: finiteAmount(account.availableAmount, 'availableAmount'),
    }
  })
}

function requiredString(value, field) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`Invalid ${field}`)
  return value.trim()
}

function positiveInteger(value, field) {
  const amount = finiteAmount(value, field)
  if (!Number.isInteger(amount) || amount <= 0) throw new TypeError(`Invalid ${field}`)
  return amount
}

export function createClientDeposit({ amount, provider = 'SEPAY', idempotencyKey }) {
  const request = {
    amount: positiveInteger(amount, 'amount'),
    provider: requiredString(provider, 'provider').toUpperCase(),
    idempotencyKey: requiredString(idempotencyKey, 'idempotencyKey'),
  }

  return httpClient('/client/account/deposits', {
    method: 'POST',
    body: JSON.stringify(request),
  }).then((response) => {
    const deposit = response?.data ?? response
    const payment = deposit?.payment
    const paymentCode = requiredString(payment?.paymentCode, 'payment.paymentCode')
    const qrCodeUrl = requiredString(payment?.qrCodeUrl, 'payment.qrCodeUrl')

    return {
      ...deposit,
      amount: deposit?.amount === undefined ? request.amount : finiteAmount(deposit.amount, 'amount'),
      provider: deposit?.provider ? requiredString(deposit.provider, 'provider').toUpperCase() : request.provider,
      payment: { ...payment, paymentCode, qrCodeUrl },
    }
  })
}
