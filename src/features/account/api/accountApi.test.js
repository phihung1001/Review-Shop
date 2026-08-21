import { afterEach, describe, expect, it, vi } from 'vitest'
import { createClientDeposit, getClientAccount, getFreelancerAccount } from './accountApi.js'

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

describe('client account API', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('loads and normalizes the Client account without a duplicated API prefix', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ currency: 'VND', availableAmount: '700000.00', heldAmount: '300000.00' }))
    vi.stubGlobal('fetch', fetchMock)
    await expect(getClientAccount()).resolves.toEqual({ currency: 'VND', availableAmount: 700000, heldAmount: 300000 })
    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/client/account')
  })

  it('supports a data wrapper', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ data: { currency: 'vnd', availableAmount: 1, heldAmount: 2 } })))
    await expect(getClientAccount()).resolves.toEqual({ currency: 'VND', availableAmount: 1, heldAmount: 2 })
  })

  it('loads only the available balance for a Freelancer', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ currency: 'VND', availableAmount: '450000.00' }))
    vi.stubGlobal('fetch', fetchMock)
    await expect(getFreelancerAccount()).resolves.toEqual({ currency: 'VND', availableAmount: 450000 })
    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/freelancer/account')
  })

  it.each([
    { currency: 'VND', availableAmount: 'invalid', heldAmount: 0 },
    { currency: 'VND', availableAmount: 0, heldAmount: null },
    { currency: '', availableAmount: 0, heldAmount: 0 },
  ])('rejects invalid financial data', async (payload) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(payload)))
    await expect(getClientAccount()).rejects.toBeInstanceOf(TypeError)
  })

  it('creates a SePay deposit and normalizes payment details', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({
      data: {
        amount: '500000',
        provider: 'SEPAY',
        payment: { paymentCode: 'RS-001', qrCodeUrl: 'https://example.test/qr.png' },
      },
    }, 201))
    vi.stubGlobal('fetch', fetchMock)

    await expect(createClientDeposit({ amount: 500000, provider: 'SEPAY', idempotencyKey: 'deposit-request-001' })).resolves.toEqual({
      amount: 500000,
      provider: 'SEPAY',
      payment: { paymentCode: 'RS-001', qrCodeUrl: 'https://example.test/qr.png' },
    })
    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/client/account/deposits')
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'POST' })
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ amount: 500000, provider: 'SEPAY', idempotencyKey: 'deposit-request-001' })
  })

  it('rejects a deposit response without payment instructions', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ amount: 500000 })))
    await expect(createClientDeposit({ amount: 500000, idempotencyKey: 'deposit-request-002' })).rejects.toBeInstanceOf(TypeError)
  })
})
