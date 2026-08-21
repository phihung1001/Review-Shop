import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { App, Avatar, Button, Drawer, Dropdown, Flex, Space, Spin } from 'antd'
import { DashboardOutlined, LogoutOutlined, MenuOutlined, UserOutlined } from '@ant-design/icons'
import { logout } from '@/features/auth/api/authApi.js'
import { authSession } from '@/features/auth/model/authSession.js'
import { ApiError } from '@/shared/api/httpClient.js'
import { navigate } from '@/shared/lib/navigation.js'
import { accountBalance } from '@/features/account/model/accountBalance.js'
import { AccountBalanceSummary } from '@/features/account/ui/AccountBalanceSummary.jsx'
import { ThemeToggle } from '@/app/theme/ThemeToggle.jsx'
import { FreelancerWithdrawalDrawer } from '@/features/withdrawals/ui/FreelancerWithdrawalDrawer.jsx'
import styles from './AppLayout.module.css'

const navigation = [
  { label: 'Cách hoạt động', href: '#workflow' },
  { label: 'Dành cho bạn', href: '#audience' },
  { label: 'Cơ hội nổi bật', href: '#opportunities' },
  { label: 'Câu hỏi thường gặp', href: '#faq' },
]

function NavLinks({ onNavigate }) {
  return <>{navigation.map((item) => <a key={item.href} href={item.href} onClick={onNavigate}>{item.label}</a>)}</>
}

function AccountMenu({ user, onNavigate }) {
  const { message } = App.useApp()
  const [loggingOut, setLoggingOut] = useState(false)
  const logoutRequestPending = useRef(false)
  const displayName = user?.name || user?.email || 'Tài khoản'

  async function handleLogout() {
    if (logoutRequestPending.current) return
    logoutRequestPending.current = true
    setLoggingOut(true)
    try {
      await logout()
      accountBalance.clear()
      authSession.clear()
      onNavigate?.()
      message.success('Đăng xuất thành công.')
      navigate('/', { replace: true })
    } catch (error) {
      if (error instanceof ApiError && [401, 403].includes(error.status)) {
        authSession.clear()
        onNavigate?.()
        message.warning('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')
        navigate('/login', { replace: true })
        return
      }

      message.error('Không thể đăng xuất lúc này. Vui lòng thử lại.')
    } finally {
      logoutRequestPending.current = false
      setLoggingOut(false)
    }
  }

  const items = [
    ...(user?.role === 'ADMIN' ? [{ key: 'admin', icon: <DashboardOutlined aria-hidden="true" />, label: <a href="/dashboard" onClick={onNavigate}>Dashboard quản trị</a> }] : []),
    { key: 'profile', icon: <UserOutlined aria-hidden="true" />, label: <a href="/profile" onClick={onNavigate}>Hồ sơ cá nhân</a> },
    { type: 'divider' },
    { key: 'logout', danger: true, disabled: loggingOut, icon: loggingOut ? <Spin size="small" /> : <LogoutOutlined aria-hidden="true" />, label: loggingOut ? 'Đang đăng xuất…' : 'Đăng xuất', onClick: handleLogout },
  ]

  return (
    <Dropdown menu={{ items }} trigger={['click']} placement="bottomRight">
      <Button type="text" className={styles.accountButton} aria-label={`Mở menu tài khoản của ${displayName}`}>
        <Space size="small">
          <Avatar size="small" src={user?.avatarUrl || undefined} icon={!user?.avatarUrl ? <UserOutlined aria-hidden="true" /> : undefined} />
          <span className={styles.accountName}>{displayName}</span>
        </Space>
      </Button>
    </Dropdown>
  )
}

function DashboardFinance({ role, balance, onDeposit, onWithdraw }) {
  return <AccountBalanceSummary role={role} state={balance} onRetry={() => accountBalance.load(role)} onDeposit={onDeposit} onWithdraw={onWithdraw} />
}

export function AppLayout({ children, dashboard = false }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [withdrawalOpen, setWithdrawalOpen] = useState(false)
  const session = useSyncExternalStore(authSession.subscribe, authSession.getSnapshot)
  const balance = useSyncExternalStore(accountBalance.subscribe, accountBalance.getSnapshot)
  const authenticated = session.status === 'authenticated'
  const role = session.user?.role
  const closeMenu = () => setMenuOpen(false)

  useEffect(() => {
    if (dashboard && authenticated && ['CLIENT', 'FREELANCER'].includes(role)) queueMicrotask(() => accountBalance.load(role))
  }, [authenticated, dashboard, role])

  const dashboardFinance = dashboard && authenticated && ['CLIENT', 'FREELANCER'].includes(role)
    ? <DashboardFinance role={role} balance={balance} onDeposit={() => navigate('/client/deposit')} onWithdraw={() => { setMenuOpen(false); setWithdrawalOpen(true) }} />
    : null

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={`${styles.container} ${dashboard ? styles.dashboardContainer : ''}`}>
          <a className={styles.brand} href="/" aria-label="Review Shop - Trang chủ"><span className={styles.brandMark}>R</span><span>Review<span className={styles.brandAccent}>Shop</span></span></a>
          {!dashboard && <nav className={styles.desktopNav} aria-label="Điều hướng chính"><NavLinks /></nav>}
          <Flex gap="small" align="center" className={styles.desktopActions}>
            <ThemeToggle />
            {dashboardFinance}
            {authenticated ? <AccountMenu user={session.user} /> : <Button type="text" href="/login">Đăng nhập</Button>}
            {!dashboard && <Button type="primary" href={authenticated ? '/dashboard' : '/register'}>{authenticated ? 'Vào Dashboard' : 'Bắt đầu ngay'}</Button>}
          </Flex>
          <span className={styles.mobileTheme}><ThemeToggle /></span>
          <Button className={styles.menuButton} type="text" icon={<MenuOutlined aria-hidden="true" />} aria-label="Mở menu" onClick={() => setMenuOpen(true)} />
        </div>
      </header>
      <main>{children}</main>
      <footer className={styles.footer}>
        <div className={styles.container}>
          <div className={styles.footerGrid}>
            <div><a className={styles.brand} href="/"><span className={styles.brandMark}>R</span><span>Review<span className={styles.brandAccent}>Shop</span></span></a><p>Nền tảng kết nối nhu cầu thật với kỹ năng phù hợp, hướng tới những lần hợp tác minh bạch và hiệu quả.</p></div>
            <div><strong>Sản phẩm</strong><a href="#workflow">Cách hoạt động</a><a href="#opportunities">Cơ hội nổi bật</a></div>
            <div><strong>Tham gia</strong><a href="/register?role=CLIENT">Dành cho khách hàng</a><a href="/register?role=FREELANCER">Dành cho Freelancer</a></div>
            <div><strong>Hỗ trợ</strong><a href="#faq">Câu hỏi thường gặp</a><a href="/login">Đăng nhập</a></div>
          </div>
          <div className={styles.copyright}>© {new Date().getFullYear()} Review Shop. Phiên bản sản phẩm đang phát triển.</div>
        </div>
      </footer>
      <Drawer title="Review Shop" placement="right" size="min(378px, 100vw)" open={menuOpen} onClose={closeMenu}>
        <nav className={styles.mobileNav} aria-label="Điều hướng di động">
          <NavLinks onNavigate={closeMenu} />
          <div className={styles.mobileActions}>
            {dashboardFinance}
            {authenticated ? <AccountMenu user={session.user} onNavigate={closeMenu} /> : <Button block href="/login" onClick={closeMenu}>Đăng nhập</Button>}
            {!dashboard && <Button block type="primary" href={authenticated ? '/dashboard' : '/register'} onClick={closeMenu}>{authenticated ? 'Vào Dashboard' : 'Bắt đầu ngay'}</Button>}
          </div>
        </nav>
      </Drawer>
      {role === 'FREELANCER' && <FreelancerWithdrawalDrawer open={withdrawalOpen} balance={balance} onClose={() => setWithdrawalOpen(false)} />}
    </div>
  )
}
