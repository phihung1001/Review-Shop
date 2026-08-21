import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPayoutMethod, createWithdrawal, getPayoutMethods } from './withdrawalApi.js'

function json(body = {}, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

describe('Freelancer withdrawal API', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('loads and normalizes active payout methods', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ data: [{ id: 15, type: 'bank_account', bankCode: 'vcb', bankName: 'Vietcombank', maskedAccountNumber: '******6789', accountHolderName: 'NGUYEN VAN A', qrImageUrl: 'https://cdn.example.com/qr.png', isDefault: true, status: 'active' }] }))
    vi.stubGlobal('fetch', fetchMock)
    await expect(getPayoutMethods()).resolves.toEqual([expect.objectContaining({ id: 15, bankCode: 'VCB', status: 'ACTIVE', isDefault: true })])
    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/freelancer/payout-methods')
  })

  it('creates a bank payout method with the uploaded QR object key', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ id: 15, bankCode: 'VCB', status: 'ACTIVE' }))
    vi.stubGlobal('fetch', fetchMock)
    await createPayoutMethod({ bankCode: ' vcb ', bankName: ' Vietcombank ', accountNumber: '0123 456 789', accountHolderName: ' Nguyen Van A ', qrImageObjectKey: 'payout-methods/1/qr.png', isDefault: true })
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ type: 'BANK_ACCOUNT', bankCode: 'VCB', bankName: 'Vietcombank', accountNumber: '0123456789', accountHolderName: 'NGUYEN VAN A', qrImageObjectKey: 'payout-methods/1/qr.png', isDefault: true })
  })

  it('rejects a payout method without a bank name or QR object key before calling the API', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    expect(() => createPayoutMethod({ bankCode: 'VCB', accountNumber: '0123456789', accountHolderName: 'NGUYEN VAN A' }))
      .toThrow('Thông tin tài khoản ngân hàng và ảnh QR chưa đầy đủ.')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('creates an idempotent VND withdrawal', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ id: 1024, status: 'PENDING' }, 201))
    vi.stubGlobal('fetch', fetchMock)
    await createWithdrawal({ amount: 500000, payoutMethodId: 15, idempotencyKey: 'withdrawal-key' })
    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/freelancer/withdrawals')
    expect(fetchMock.mock.calls[0][1].headers['Idempotency-Key']).toBe('withdrawal-key')
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ amount: 500000, currency: 'VND', payoutMethodId: 15 })
  })
})
