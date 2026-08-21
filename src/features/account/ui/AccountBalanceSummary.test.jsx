import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AccountBalanceSummary } from './AccountBalanceSummary.jsx'

describe('AccountBalanceSummary', () => {
  it('shows available, held, and deposit actions for a Client', () => {
    render(<AccountBalanceSummary role="CLIENT" state={{ status: 'success', account: { currency: 'VND', availableAmount: 700000, heldAmount: 300000 } }} onRetry={vi.fn()} onDeposit={vi.fn()} />)
    expect(screen.getByLabelText(/Số dư khả dụng: 700\.000/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Đang khóa \(Escrow\): 300\.000/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Nạp tiền' })).toBeInTheDocument()
  })

  it('does not expose Client-only financial information to a Freelancer', () => {
    render(<AccountBalanceSummary role="FREELANCER" state={{ status: 'success', account: { currency: 'VND', availableAmount: 450000 } }} onRetry={vi.fn()} onDeposit={vi.fn()} />)
    expect(screen.getByLabelText(/Số dư khả dụng: 450\.000/)).toBeInTheDocument()
    expect(screen.queryByText(/Escrow/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Nạp tiền' })).not.toBeInTheDocument()
  })

  it('does not display a fake zero balance while loading or on error', () => {
    const { rerender } = render(<AccountBalanceSummary role="CLIENT" state={{ status: 'loading', account: null }} onRetry={vi.fn()} onDeposit={vi.fn()} />)
    expect(screen.getByRole('status', { name: 'Đang tải số dư' })).toBeInTheDocument()
    expect(screen.queryByText(/0 ₫/)).not.toBeInTheDocument()
    rerender(<AccountBalanceSummary role="CLIENT" state={{ status: 'error', account: null }} onRetry={vi.fn()} onDeposit={vi.fn()} />)
    expect(screen.getByText('Không tải được số dư')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeInTheDocument()
  })
})
