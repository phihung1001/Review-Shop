import { render, screen } from '@testing-library/react'
import { App as AntApp } from 'antd'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AdminWithdrawalsPage } from './AdminWithdrawalsPage.jsx'

function response(body) {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })
}

describe('Admin withdrawals page', () => {
  afterEach(() => {
    window.history.replaceState({}, '', '/')
    vi.unstubAllGlobals()
  })

  it('shows bank and amount data with actions allowed for PENDING only', async () => {
    window.history.replaceState({}, '', '/admin/withdrawals?status=PENDING')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response([
      { id: 1, code: 'WD-001', status: 'PENDING', freelancerName: 'Nguyễn An', amount: 500000, feeAmount: 5000, netAmount: 495000, bankName: 'Vietcombank' },
      { id: 2, code: 'WD-002', status: 'SUCCEEDED', freelancerName: 'Trần Bình', amount: 300000, feeAmount: 3000, netAmount: 297000, bankName: 'BIDV' },
    ])))

    render(<AntApp><AdminWithdrawalsPage /></AntApp>)

    expect(await screen.findAllByText('WD-001')).not.toHaveLength(0)
    expect(screen.getAllByText('Vietcombank').length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: /Duyệt/ }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: /Từ chối/ }).length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: /Xác nhận đã chuyển/ })).not.toBeInTheDocument()
  }, 20000)

  it('renders an explicit empty state for the selected status', async () => {
    window.history.replaceState({}, '', '/admin/withdrawals?status=FAILED')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response([])))

    render(<AntApp><AdminWithdrawalsPage /></AntApp>)

    expect(await screen.findAllByText('Không có yêu cầu ở trạng thái “Chuyển thất bại”.')).not.toHaveLength(0)
  })
})
