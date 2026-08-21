import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App as AntApp } from 'antd'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AccountPage } from './AccountPage.jsx'

function renderDashboard() {
  return render(<AntApp><AccountPage pathname="/freelancer/dashboard" role="FREELANCER" user={{ name: 'Freelancer' }} /></AntApp>)
}

function mockOpenJobs() {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify([{
    id: 10,
    title: 'Review địa điểm A',
    description: 'Đăng review theo nội dung cung cấp',
    requiredLevel: { id: 1, description: 'Level 3', rank: 3, pricePerReview: 50000 },
    payoutPerTask: 25000,
    availableSlots: 2,
    totalSlots: 2,
    reviewContents: [{ index: 0, content: 'Nội dung cần đăng', available: true, images: [] }],
  }]), { status: 200, headers: { 'Content-Type': 'application/json' } })))
}

afterEach(() => vi.unstubAllGlobals())

describe('Dashboard page', () => {
  it('renders Freelancer navigation and open jobs from the API', async () => {
    mockOpenJobs()
    renderDashboard()
    expect(await screen.findByRole('heading', { name: 'Review địa điểm A' })).toBeInTheDocument()
    expect(document.querySelector('aside[aria-label="Điều hướng Dashboard Freelancer"]')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Nhận Job' })).toBeEnabled()
    expect(screen.queryByText('Minh chứng của tôi')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Lịch sử Proof/ })).toHaveAttribute('href', '/freelancer/proofs/history')
    expect(screen.getByRole('link', { name: /Xác thực tài khoản/ })).toHaveAttribute('href', '/freelancer/google-maps-accounts')
  })

  it('filters jobs and clears an empty result', async () => {
    mockOpenJobs()
    renderDashboard()
    const search = await screen.findByRole('textbox', { name: 'Tìm kiếm Job đang mở' })
    await userEvent.type(search, 'không tồn tại')
    expect(screen.getByText('Không tìm thấy Job phù hợp.')).toBeVisible()
    await userEvent.click(screen.getByRole('button', { name: 'Xóa bộ lọc' }))
    expect(screen.getByRole('heading', { name: 'Review địa điểm A' })).toBeInTheDocument()
  })

  it('loads eligible accounts and reveals the pending claim action after selection', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify([{ id: 10, title: 'Review địa điểm A', requiredLevel: { id: 1, description: 'Level 3', rank: 3 }, reviewContents: [] }]), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify([{ id: 12, contributorId: '117642509766343273456', profileUrl: 'https://www.google.com/maps/contrib/117642509766343273456', accountName: 'Local Guide A', localGuideLevel: 5, accountType: 'VIETNAM', readyForJobs: true }]), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 50, jobId: 10, jobTitle: 'Review địa điểm A', jobDescription: 'Đăng review theo nội dung', mapLink: 'https://www.google.com/maps/place/example', payoutPerTask: 25000, reviewContent: 'Nội dung cần đăng', reviewContentImages: [], googleMapsAccountId: 12, googleMapsAccountName: 'Local Guide A', status: 'CLAIMED', expiresAt: '2026-08-02T10:10:00Z' }), { status: 201, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)
    renderDashboard()
    await userEvent.click(await screen.findByRole('button', { name: 'Nhận Job' }))
    expect(await screen.findByText('Local Guide A')).toBeInTheDocument()
    expect(fetchMock.mock.calls[1][0]).toBe('/api/v1/freelancer/jobs/10/eligible-google-maps-accounts')
    expect(screen.queryByText('Vẫn nhận Job')).not.toBeInTheDocument()
    await userEvent.click(screen.getByLabelText('Chọn Local Guide A'))
    const confirmButton = screen.getByText('Vẫn nhận Job').closest('button')
    expect(confirmButton).toBeEnabled()
    await userEvent.click(confirmButton)
    expect(await screen.findByText('Nội dung cần đăng')).toBeInTheDocument()
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4))
    expect(fetchMock.mock.calls[2][0]).toBe('/api/v1/freelancer/jobs/10/assignments')
    expect(JSON.parse(fetchMock.mock.calls[2][1].body)).toEqual({ googleMapsAccountId: 12 })
    expect(fetchMock.mock.calls[3][0]).toBe('/api/v1/freelancer/jobs/open')
    expect(screen.getByText('Hủy Job').closest('button')).toBeEnabled()
    expect(screen.getByText('Nộp Proof').closest('button')).toBeEnabled()
  })

  it('renders only Client navigation and the Client overview', () => {
    render(<AntApp><AccountPage pathname="/client/dashboard" role="CLIENT" user={{ name: 'Client' }} /></AntApp>)
    expect(screen.getByRole('heading', { name: 'Tổng quan công việc' })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /Tạo Job mới/ })[0]).toHaveAttribute('href', '/client/jobs/create')
    expect(screen.getByRole('link', { name: /Duyệt Proof/ })).toHaveAttribute('href', '/client/proofs/review')
    expect(screen.queryByRole('button', { name: 'Nhận công việc' })).not.toBeInTheDocument()
  })

  it('loads the current Client jobs without unsupported mutation actions', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify([{ id: 9, title: 'Job mới nhất', status: 'FUNDED', pricePerReview: 10000, totalReviews: 2 }]), { status: 200, headers: { 'Content-Type': 'application/json' } })))
    render(<AntApp><AccountPage pathname="/client/dashboard" role="CLIENT" user={{ name: 'Client' }} /></AntApp>)
    expect(await screen.findByRole('heading', { name: 'Job mới nhất' })).toBeInTheDocument()
    expect(screen.getByText('FUNDED')).toBeInTheDocument()
    expect(screen.getByText('Tổng chi tiêu')).toBeInTheDocument()
    expect(screen.getByText('Số lượng Job đã đăng')).toBeInTheDocument()
    expect(screen.getByText('Review đã duyệt')).toBeInTheDocument()
    expect(screen.getByText('Số dư hiện tại')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Thống kê Job' })).toBeInTheDocument()
    expect(screen.getByText('Job mở')).toBeInTheDocument()
    expect(screen.getByText('Đang thực hiện')).toBeInTheDocument()
    expect(screen.getByText('Chờ duyệt')).toBeInTheDocument()
    expect(screen.getByText('Hoàn thành')).toBeInTheDocument()
    expect(screen.getByText('Đã từ chối')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Sửa|Hủy|Xóa/ })).not.toBeInTheDocument()
  })

  it('loads Job and Proof statistics in parallel and counts unique Jobs by Proof status', async () => {
    const fetchMock = vi.fn((url) => Promise.resolve(new Response(JSON.stringify(url === '/api/v1/jobs' ? [
      { id: 1, title: 'Job mở', status: 'OPEN' },
      { id: 2, title: 'Job đang làm', status: 'IN_PROGRESS' },
    ] : [
      { id: 11, jobId: 3, status: 'PENDING' },
      { id: 12, jobId: 3, status: 'PENDING' },
      { id: 13, jobId: 4, status: 'APPROVED' },
      { id: 14, jobId: 5, status: 'REJECTED' },
    ]), { status: 200, headers: { 'Content-Type': 'application/json' } })))
    vi.stubGlobal('fetch', fetchMock)

    render(<AntApp><AccountPage pathname="/client/dashboard" role="CLIENT" user={{ name: 'Client' }} /></AntApp>)

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(expect.arrayContaining(['/api/v1/jobs', '/api/v1/client/proofs']))
    const statistics = document.querySelector('[aria-label="Thống kê trạng thái Job"]')
    expect(statistics).toHaveTextContent('Job mở1')
    expect(statistics).toHaveTextContent('Đang thực hiện1')
    expect(statistics).toHaveTextContent('Chờ duyệt1')
    expect(statistics).toHaveTextContent('Hoàn thành1')
    expect(statistics).toHaveTextContent('Đã từ chối1')
  })

  it('loads and renders a Client job detail from its detail endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      id: 9,
      title: 'Client job detail',
      description: 'Full job description',
      status: 'OPEN',
      pricePerReview: 15000,
      totalReviews: 2,
      requiredLevel: { id: 3, description: 'Level 3' },
      reviewContents: [{ id: 1, content: 'Sample review content' }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)

    render(<AntApp><AccountPage pathname="/client/jobs/9" role="CLIENT" user={{ name: 'Client' }} /></AntApp>)

    expect(await screen.findByRole('heading', { name: 'Client job detail' })).toBeInTheDocument()
    expect(screen.getByText('Full job description')).toBeInTheDocument()
    expect(screen.getByText('Sample review content')).toBeInTheDocument()
    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/jobs/9')
  })

  it('loads the Freelancer proof history without Client review actions', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify([{ id: 12, jobId: 10, jobTitle: 'Proof Job', reviewContentIndex: 0, reviewContent: 'Nội dung đã đăng', status: 'REJECTED', rejectionReason: 'Ảnh chưa hợp lệ', payoutAmount: 25000, reviewedAt: '2026-08-02T10:30:00Z', createdAt: '2026-08-02T10:00:00Z' }]), { status: 200, headers: { 'Content-Type': 'application/json' } })))
    render(<AntApp><AccountPage pathname="/freelancer/proofs/history" role="FREELANCER" user={{ name: 'Freelancer' }} /></AntApp>)
    expect(screen.getByRole('heading', { name: 'Lịch sử Proof' })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Proof Job' })).toBeInTheDocument()
    expect(screen.getByText('Ảnh chưa hợp lệ')).toBeInTheDocument()
    expect(screen.queryByText('Duyệt Proof')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Từ chối' })).not.toBeInTheDocument()
  })

  it('loads Google Maps accounts and opens account details', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify([{ id: 12, contributorId: '117642509766343273456', profileUrl: 'https://www.google.com/maps/contrib/117642509766343273456', accountName: 'Local Guide A', localGuideLevel: 5, points: 1000, reviewCount: 100, accountType: 'VIETNAM', readyForJobs: true, verifiedAt: '2026-08-02T10:00:00Z' }]), { status: 200, headers: { 'Content-Type': 'application/json' } })))
    render(<AntApp><AccountPage pathname="/freelancer/google-maps-accounts" role="FREELANCER" user={{ name: 'Freelancer' }} /></AntApp>)
    expect(screen.getByRole('heading', { name: 'Xác thực tài khoản' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Thêm tài khoản' })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Local Guide A' })).toBeInTheDocument()
    expect(screen.getByText('Sẵn sàng nhận Job')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Xem chi tiết Local Guide A' }))
    expect(await screen.findByText('Chi tiết tài khoản Google Maps')).toBeInTheDocument()
    expect(screen.getAllByText('1.000').length).toBeGreaterThan(0)
  })

})
