import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  approveAdminWithdrawal,
  completeAdminWithdrawal,
  failAdminWithdrawal,
  getAdminWithdrawal,
  getAdminWithdrawals,
  rejectAdminWithdrawal,
} from './adminWithdrawalApi.js'

function json(body = {}, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

describe('Admin withdrawal API', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('loads and normalizes the documented PENDING list', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ data: { content: [{
      withdrawalId: 12,
      withdrawalCode: 'WD-12',
      status: 'pending',
      freelancer: { id: 7, fullName: 'Nguyễn An', email: 'an@example.com' },
      amount: 500000,
      feeAmount: 5000,
      payoutMethod: { bankCode: 'vcb', bankName: 'Vietcombank', accountNumber: '0123456789', accountHolderName: 'NGUYEN AN', qrImageUrl: 'https://cdn.example.com/qr.png' },
    }] } }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(getAdminWithdrawals('PENDING')).resolves.toEqual([
      expect.objectContaining({ id: 12, code: 'WD-12', status: 'PENDING', netAmount: 495000, currency: 'VND' }),
    ])
    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/admin/withdrawals?status=PENDING')
  })

  it('loads detail with an encoded ID and keeps backend netAmount', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ data: { id: 'WD/12', amount: 500000, feeAmount: 5000, netAmount: 490000 } }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(getAdminWithdrawal('WD/12')).resolves.toEqual(expect.objectContaining({ id: 'WD/12', netAmount: 490000 }))
    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/admin/withdrawals/WD%2F12')
  })

  it('sends exact payloads for all state transitions', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json())
    vi.stubGlobal('fetch', fetchMock)

    await approveAdminWithdrawal(12, { adminNote: ' Hợp lệ ' })
    await rejectAdminWithdrawal(12, { reason: ' Sai tài khoản ' })
    await completeAdminWithdrawal(12, { provider: 'BANK_TRANSFER', providerReference: ' FT123 ', adminNote: ' Đã chuyển ' })
    await failAdminWithdrawal(12, { reason: ' Ngân hàng từ chối ' })

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ adminNote: 'Hợp lệ' })
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ reason: 'Sai tài khoản' })
    expect(JSON.parse(fetchMock.mock.calls[2][1].body)).toEqual({ provider: 'BANK_TRANSFER', providerReference: 'FT123', adminNote: 'Đã chuyển' })
    expect(JSON.parse(fetchMock.mock.calls[3][1].body)).toEqual({ reason: 'Ngân hàng từ chối' })
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      '/api/v1/admin/withdrawals/12/approve',
      '/api/v1/admin/withdrawals/12/reject',
      '/api/v1/admin/withdrawals/12/complete',
      '/api/v1/admin/withdrawals/12/fail',
    ])
  })

  it('rejects an empty reason before sending a destructive action', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    expect(() => rejectAdminWithdrawal(12, { reason: '   ' })).toThrow('Lý do từ chối là bắt buộc.')
    expect(() => failAdminWithdrawal(12, { reason: '' })).toThrow('Lý do chuyển khoản thất bại là bắt buộc.')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
