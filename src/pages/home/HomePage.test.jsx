import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App as AntApp } from 'antd'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { authSession } from '@/features/auth/model/authSession.js'
import { AppLayout } from '@/shared/ui/layouts/AppLayout/AppLayout.jsx'
import { AudienceSection, FeaturedJobsSection, HeroSection, HomeOpenJobs, WorkflowSection } from './HomePage.jsx'

function renderAppLayout() {
  return render(<AntApp><AppLayout><div>Content</div></AppLayout></AntApp>)
}

describe('Home page', () => {
  beforeEach(() => window.history.replaceState({}, '', '/'))
  afterEach(() => {
    authSession.clear()
    vi.unstubAllGlobals()
  })

  it('renders the main value proposition and role-safe CTAs', () => {
    render(<HeroSection />)
    expect(screen.getByRole('heading', { level: 1, name: /Kết nối đúng người/i })).toBeVisible()
    expect(screen.getByRole('link', { name: /Bắt đầu ngay/i })).toHaveAttribute('href', '/register?role=CLIENT')
  })

  it('links each audience to its whitelisted registration role', () => {
    render(<AudienceSection />)
    expect(screen.getByRole('link', { name: /Thuê Freelancer/i })).toHaveAttribute('href', '/register?role=CLIENT')
    expect(screen.getByRole('link', { name: /Trở thành Freelancer/i })).toHaveAttribute('href', '/register?role=FREELANCER')
  })

  it('switches the workflow to Freelancer', async () => {
    render(<WorkflowSection />)
    await userEvent.click(screen.getByTitle('Tôi là Freelancer'))
    expect(screen.getByText('Hoàn thiện hồ sơ')).toBeVisible()
  })

  it.each(['loading', 'empty', 'error'])('renders the %s opportunity state', (state) => {
    render(<FeaturedJobsSection state={state} onRetry={vi.fn()} />)
    if (state === 'loading') expect(document.querySelector('.ant-skeleton')).toBeInTheDocument()
    if (state === 'empty') expect(screen.getByText('Hiện chưa có Job nào đang mở')).toBeVisible()
    if (state === 'error') expect(screen.getByRole('button', { name: 'Thử lại' })).toBeVisible()
  })

  it('loads open Jobs from the API on the Home page', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([{
      id: 10,
      title: 'Review địa điểm từ API',
      description: 'Mô tả Job',
      requiredLevel: { id: 1, description: 'Level 3', rank: 3 },
      payoutPerTask: 25000,
      availableSlots: 2,
      totalSlots: 2,
      reviewContents: [{ index: 0, available: true }],
    }]), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)

    render(<HomeOpenJobs />)

    expect(await screen.findByRole('heading', { name: 'Review địa điểm từ API' })).toBeInTheDocument()
    expect(screen.getByText(/Rank 3/)).toBeInTheDocument()
    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/freelancer/jobs/open')
  })

  it('opens and closes the mobile navigation drawer', async () => {
    renderAppLayout()
    await userEvent.click(screen.getByRole('button', { name: 'Mở menu' }))
    expect(screen.getByRole('navigation', { name: 'Điều hướng di động' })).toBeVisible()
    const mobileNav = screen.getByRole('navigation', { name: 'Điều hướng di động' })
    await userEvent.click(within(mobileNav).getByRole('link', { name: 'Cách hoạt động' }))
    await waitFor(() => expect(mobileNav).not.toBeVisible())
  })

  it('shows the authenticated account menu and Dashboard action', async () => {
    authSession.markAuthenticated({ user: { fullName: 'Nguyễn Văn A' } })
    renderAppLayout()

    expect(screen.getAllByRole('link', { name: 'Vào Dashboard' })[0]).toHaveAttribute('href', '/dashboard')
    await userEvent.click(screen.getAllByRole('button', { name: /Mở menu tài khoản của Nguyễn Văn A/ })[0])
    expect(await screen.findByText('Hồ sơ cá nhân')).toBeInTheDocument()
    expect(screen.getByText('Đăng xuất')).toBeInTheDocument()
  })

  it('logs out once, clears the session, and stays on the home page', async () => {
    authSession.markAuthenticated({ user: { fullName: 'Nguyễn Văn A' } })
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: 'Logout successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))
    vi.stubGlobal('fetch', fetchMock)
    renderAppLayout()

    await userEvent.click(screen.getAllByRole('button', { name: /Mở menu tài khoản/ })[0])
    const logoutItem = await screen.findByText('Đăng xuất')
    await userEvent.dblClick(logoutItem)

    await waitFor(() => expect(authSession.isAuthenticated()).toBe(false))
    expect(window.location.pathname).toBe('/')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('Đăng xuất thành công.')).toBeInTheDocument()
  })

  it('clears an invalid session after a forbidden logout response', async () => {
    authSession.markAuthenticated({ user: { fullName: 'Nguyễn Văn A' } })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 'CSRF_INVALID' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })))
    renderAppLayout()

    await userEvent.click(screen.getAllByRole('button', { name: /Mở menu tài khoản/ })[0])
    await userEvent.click(await screen.findByText('Đăng xuất'))

    await waitFor(() => expect(window.location.pathname).toBe('/login'))
    expect(authSession.isAuthenticated()).toBe(false)
    expect(await screen.findByText('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')).toBeInTheDocument()
  })

  it('keeps the session and enables retry after a server error', async () => {
    authSession.markAuthenticated({ user: { fullName: 'Nguyễn Văn A' } })
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 'SERVER_ERROR' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    }))
    vi.stubGlobal('fetch', fetchMock)
    renderAppLayout()

    await userEvent.click(screen.getAllByRole('button', { name: /Mở menu tài khoản/ })[0])
    await userEvent.click(await screen.findByText('Đăng xuất'))

    expect(await screen.findByText('Không thể đăng xuất lúc này. Vui lòng thử lại.')).toBeInTheDocument()
    expect(authSession.isAuthenticated()).toBe(true)
    expect(window.location.pathname).toBe('/')
    await userEvent.click(screen.getAllByRole('button', { name: /Mở menu tài khoản/ })[0])
    await userEvent.click(await screen.findByText('Đăng xuất'))
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
