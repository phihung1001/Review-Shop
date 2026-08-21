import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App as AntApp } from 'antd'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DepositPage } from './DepositPage.jsx'

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function renderPage() {
  return render(<AntApp><DepositPage /></AntApp>)
}

afterEach(() => vi.unstubAllGlobals())

describe('DepositPage', () => {
  it('submits the amount and displays the QR payment instructions', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({
      amount: 500000,
      provider: 'SEPAY',
      payment: { paymentCode: 'RS-DEP-001', qrCodeUrl: 'https://example.test/qr.png' },
    }, 201))
    vi.stubGlobal('fetch', fetchMock)

    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Tạo mã nạp tiền' }))

    expect(await screen.findByText('Đã tạo yêu cầu nạp tiền')).toBeInTheDocument()
    expect(screen.getByText('RS-DEP-001')).toBeInTheDocument()
    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/client/account/deposits')
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ amount: 500000, provider: 'SEPAY' })
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).idempotencyKey).toEqual(expect.any(String))
  })

  it('keeps the form available and explains a server error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ message: 'Số tiền không hợp lệ.' }, 400)))

    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Tạo mã nạp tiền' }))

    expect(await screen.findByText('Số tiền không hợp lệ.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tạo mã nạp tiền' })).toBeEnabled()
  })
})
