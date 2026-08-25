import { useState } from 'react'
import { App, Button, Drawer, Grid, Layout, Menu, Space, Typography } from 'antd'
import { DollarOutlined, HomeOutlined, LogoutOutlined, MenuOutlined, SafetyCertificateOutlined, TeamOutlined, WalletOutlined } from '@ant-design/icons'
import { logout } from '@/features/auth/api/authApi.js'
import { authSession } from '@/features/auth/model/authSession.js'
import { navigate } from '@/shared/lib/navigation.js'
import { ThemeToggle } from '@/app/theme/ThemeToggle.jsx'
import styles from './AdminLayout.module.css'
import { ReviewGgmMark } from '@/shared/ui/branding/ReviewGgmMark.jsx'

const { Header, Sider, Content } = Layout
const items = [
  { key: '/dashboard', icon: <HomeOutlined aria-hidden="true" />, label: <a href="/dashboard">Tổng quan</a> },
  { key: '/admin/users', icon: <TeamOutlined aria-hidden="true" />, label: <a href="/admin/users">Quản lý người dùng</a> },
  { key: '/admin/required-levels', icon: <SafetyCertificateOutlined aria-hidden="true" />, label: <a href="/admin/required-levels">Required Level</a> },
  { key: '/admin/platform-fee', icon: <DollarOutlined aria-hidden="true" />, label: <a href="/admin/platform-fee">Platform Fee</a> },
  { key: '/admin/withdrawals', icon: <WalletOutlined aria-hidden="true" />, label: <a href="/admin/withdrawals">Yêu cầu rút tiền</a> },
]

function Navigation({ pathname, onNavigate }) {
  return <Menu mode="inline" selectedKeys={[pathname]} items={items} onClick={onNavigate} aria-label="Điều hướng quản trị" />
}

export function AdminLayout({ pathname, children }) {
  const { message } = App.useApp()
  const screens = Grid.useBreakpoint()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const desktop = screens.lg

  async function handleLogout() {
    try {
      await logout()
      message.success('Đăng xuất thành công.')
    } catch {
      message.warning('Phiên đăng nhập đã được kết thúc trên thiết bị này.')
    } finally {
      authSession.clear()
      navigate('/login', { replace: true })
    }
  }

  return (
    <Layout className={styles.shell}>
      {desktop && <Sider width={260} theme="light" className={styles.sider}><a className={styles.brand} href="/"><span className={styles.brandMark}><ReviewGgmMark /></span><span>Review GG Maps Admin</span></a><Navigation pathname={pathname} /></Sider>}
      <Layout>
        <Header className={styles.header}>
          <Space>
            {!desktop && <Button type="text" icon={<MenuOutlined aria-hidden="true" />} aria-label="Mở menu quản trị" onClick={() => setDrawerOpen(true)} />}
            <Typography.Title level={4} className={styles.title}>Bảng điều khiển quản trị</Typography.Title>
          </Space>
          <Space className={styles.headerActions}>
            <ThemeToggle />
            <Button href="/" icon={<HomeOutlined aria-hidden="true" />} aria-label="Về trang chính"><span className={styles.buttonLabel}>Về trang chính</span></Button>
            <Button danger icon={<LogoutOutlined aria-hidden="true" />} aria-label="Đăng xuất" onClick={handleLogout}><span className={styles.buttonLabel}>Đăng xuất</span></Button>
          </Space>
        </Header>
        <Content className={styles.content}>{children}</Content>
      </Layout>
      <Drawer title="Review GG Maps Admin" placement="left" size="min(320px, 90vw)" open={!desktop && drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Navigation pathname={pathname} onNavigate={() => setDrawerOpen(false)} />
      </Drawer>
    </Layout>
  )
}
