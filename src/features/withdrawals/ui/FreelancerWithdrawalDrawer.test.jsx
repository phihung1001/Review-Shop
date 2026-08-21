import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from 'antd'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FreelancerWithdrawalDrawer } from './FreelancerWithdrawalDrawer.jsx'
import { getPayoutMethods } from '../api/withdrawalApi.js'

vi.mock('../api/withdrawalApi.js', () => ({
  createPayoutMethod: vi.fn(),
  createWithdrawal: vi.fn(),
  getPayoutMethods: vi.fn(),
}))

vi.mock('../api/payoutMethodImageApi.js', () => ({ uploadPayoutMethodImage: vi.fn() }))
vi.mock('@/features/account/model/accountBalance.js', () => ({ accountBalance: { refresh: vi.fn() } }))

describe('FreelancerWithdrawalDrawer', () => {
  beforeEach(() => {
    getPayoutMethods.mockResolvedValue([])
  })

  it('shows the matching bank name after choosing a bank code', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    render(
      <App>
        <FreelancerWithdrawalDrawer
          open
          balance={{ account: { availableAmount: 500000, currency: 'VND' } }}
          onClose={vi.fn()}
        />
      </App>,
    )

    await screen.findByText('Thêm tài khoản nhận tiền')
    const bankSelect = document.querySelector('#bankCode')
    expect(bankSelect).toHaveAttribute('role', 'combobox')
    await user.click(bankSelect)
    await user.keyboard('VCB{Enter}')

    await waitFor(() => expect(document.querySelector('input[aria-label="Tên ngân hàng"]')).toHaveValue('Vietcombank'))
  })
})
