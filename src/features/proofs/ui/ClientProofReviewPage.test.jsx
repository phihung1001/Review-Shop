import { render, screen } from '@testing-library/react'
import { App as AntApp } from 'antd'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ClientProofReviewPage } from './ClientProofReviewPage.jsx'

function response(body) {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })
}

describe('Client Proof review page', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('shows Proof data and only exposes processing actions for PENDING', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response([
      { id: 1, status: 'PENDING', jobTitle: 'Job đang chờ', freelancerName: 'An', payoutAmount: 10000 },
      { id: 2, status: 'APPROVED', jobTitle: 'Job đã duyệt', freelancerName: 'Bình', payoutAmount: 20000 },
    ])))
    render(<AntApp><ClientProofReviewPage /></AntApp>)

    expect(await screen.findByRole('heading', { name: 'Job đang chờ' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Job đã duyệt' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Duyệt' })).toHaveLength(1)
    expect(screen.getAllByRole('button', { name: 'Từ chối' })).toHaveLength(1)
  })

  it('does not expose processing actions for an unknown status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response([{ id: 3, status: 'CUSTOM', jobTitle: 'Unknown proof' }])))
    render(<AntApp><ClientProofReviewPage /></AntApp>)
    expect(await screen.findByRole('heading', { name: 'Unknown proof' })).toBeInTheDocument()
    expect(screen.getAllByText('Không xác định').length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: 'Duyệt' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Từ chối' })).not.toBeInTheDocument()
  })
})
