import { lazy, Suspense, useEffect, useSyncExternalStore } from 'react'
import { Button, Result } from 'antd'
import { authSession } from '@/features/auth/model/authSession.js'
import { AppLayout } from '@/shared/ui/layouts/AppLayout/AppLayout.jsx'
import { handleInternalNavigation, navigate } from '@/shared/lib/navigation.js'

const LoginPage = lazy(() => import('@/pages/auth/login/LoginPage.jsx').then((module) => ({ default: module.LoginPage })))
const RegisterPage = lazy(() => import('@/pages/auth/register/RegisterPage.jsx').then((module) => ({ default: module.RegisterPage })))
const ForgotPasswordPage = lazy(() => import('@/pages/auth/forgot-password/ForgotPasswordPage.jsx').then((module) => ({ default: module.ForgotPasswordPage })))
const ResetPasswordPage = lazy(() => import('@/pages/auth/reset-password/ResetPasswordPage.jsx').then((module) => ({ default: module.ResetPasswordPage })))
const HomePage = lazy(() => import('@/pages/home/HomePage.jsx').then((module) => ({ default: module.HomePage })))
const AccountPage = lazy(() => import('@/pages/account/AccountPage.jsx').then((module) => ({ default: module.AccountPage })))
const AdminLayout = lazy(() => import('@/features/admin/ui/AdminLayout/AdminLayout.jsx').then((module) => ({ default: module.AdminLayout })))
const AdminOverviewPage = lazy(() => import('@/pages/admin/AdminOverviewPage.jsx').then((module) => ({ default: module.AdminOverviewPage })))
const AdminUsersPage = lazy(() => import('@/pages/admin/AdminUsersPage.jsx').then((module) => ({ default: module.AdminUsersPage })))
const RequiredLevelsPage = lazy(() => import('@/pages/admin/RequiredLevelsPage.jsx').then((module) => ({ default: module.RequiredLevelsPage })))
const PlatformFeePage = lazy(() => import('@/pages/admin/PlatformFeePage.jsx').then((module) => ({ default: module.PlatformFeePage })))
const AdminWithdrawalsPage = lazy(() => import('@/pages/admin/AdminWithdrawalsPage.jsx').then((module) => ({ default: module.AdminWithdrawalsPage })))
const WelcomeTermsPage = lazy(() => import('@/pages/onboarding/WelcomeTermsPage.jsx').then((module) => ({ default: module.WelcomeTermsPage })))

const AUTH_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password']
const CLIENT_ROUTES = ['/client/dashboard', '/client/deposit', '/client/jobs/create', '/client/proofs/review', '/client/proofs/history', '/client/profile']
const FREELANCER_ROUTES = ['/freelancer/dashboard', '/freelancer/proofs/history', '/freelancer/google-maps-accounts', '/freelancer/profile']

function dashboardForRole(role) {
  if (role === 'CLIENT') return '/client/dashboard'
  if (role === 'FREELANCER') return '/freelancer/dashboard'
  return '/'
}

function subscribe(callback) {
  window.addEventListener('popstate', callback)
  return () => window.removeEventListener('popstate', callback)
}

function getPathname() {
  return window.location.pathname.replace(/\/+$/, '') || '/'
}

function LoadingScreen() {
  return <div role="status" aria-live="polite" style={{ minHeight: '50vh', display: 'grid', placeItems: 'center' }}>Đang tải…</div>
}

function AuthRoute({ authenticated, children }) {
  if (authenticated) {
    queueMicrotask(() => navigate('/', { replace: true }))
    return null
  }
  return children
}

export function App() {
  const pathname = useSyncExternalStore(subscribe, getPathname)
  const session = useSyncExternalStore(authSession.subscribe, authSession.getSnapshot)

  useEffect(() => {
    authSession.restore()
  }, [])

  useEffect(() => {
    document.addEventListener('click', handleInternalNavigation)
    return () => document.removeEventListener('click', handleInternalNavigation)
  }, [])

  if (session.status === 'checking') return <LoadingScreen />

  if (session.status === 'error') {
    return (
      <Result
        status="warning"
        title="Không thể kiểm tra phiên đăng nhập"
        subTitle="Vui lòng kiểm tra kết nối và thử lại."
        extra={<Button type="primary" onClick={() => authSession.retryRestore()}>Thử lại</Button>}
      />
    )
  }

  if (AUTH_ROUTES.includes(pathname)) {
    const pages = {
      '/login': <LoginPage />,
      '/register': <RegisterPage />,
      '/forgot-password': <ForgotPasswordPage />,
      '/reset-password': <ResetPasswordPage />,
    }
    return <AuthRoute authenticated={session.status === 'authenticated'}><Suspense fallback={<LoadingScreen />}>{pages[pathname]}</Suspense></AuthRoute>
  }

  const isAdminArea = pathname === '/admin' || pathname.startsWith('/admin/') || (pathname === '/dashboard' && session.user?.role === 'ADMIN')
  if (isAdminArea) {
    if (session.status !== 'authenticated') {
      queueMicrotask(() => navigate(`/login?redirect=${encodeURIComponent(pathname)}`, { replace: true }))
      return null
    }
    if (session.user?.role !== 'ADMIN') {
      return <Result status="403" title="403" subTitle="Bạn không có quyền truy cập khu vực quản trị." extra={<Button type="primary" href="/">Về trang chính</Button>} />
    }
    if (pathname === '/admin') {
      queueMicrotask(() => navigate('/dashboard', { replace: true }))
      return null
    }
    const adminPages = {
      '/dashboard': <AdminOverviewPage />,
      '/admin/users': <AdminUsersPage />,
      '/admin/required-levels': <RequiredLevelsPage />,
      '/admin/platform-fee': <PlatformFeePage />,
      '/admin/withdrawals': <AdminWithdrawalsPage />,
    }
    const adminPage = adminPages[pathname] ?? <Result status="404" title="Không tìm thấy trang quản trị" extra={<Button href="/dashboard">Về Dashboard</Button>} />
    return <Suspense fallback={<LoadingScreen />}><AdminLayout pathname={pathname}>{adminPage}</AdminLayout></Suspense>
  }

  if (pathname === '/welcome') {
    if (session.status !== 'authenticated') {
      queueMicrotask(() => navigate('/login?redirect=%2Fwelcome', { replace: true }))
      return null
    }
    if (session.user?.role !== 'CLIENT') {
      queueMicrotask(() => navigate('/dashboard', { replace: true }))
      return null
    }
    return <Suspense fallback={<LoadingScreen />}><WelcomeTermsPage /></Suspense>
  }

  const isAccountRoute = pathname === '/dashboard' || pathname === '/profile' || pathname.startsWith('/client/') || pathname.startsWith('/freelancer/')
  if (isAccountRoute && session.status !== 'authenticated') {
    queueMicrotask(() => navigate(`/login?redirect=${encodeURIComponent(pathname)}`, { replace: true }))
    return null
  }

  if (isAccountRoute) {
    const role = session.user?.role
    const roleDashboard = dashboardForRole(role)
    if (pathname === '/dashboard' || pathname === '/profile') {
      const destination = pathname === '/profile' ? roleDashboard.replace('/dashboard', '/profile') : roleDashboard
      queueMicrotask(() => navigate(destination, { replace: true }))
      return null
    }

    const allowedRoutes = role === 'CLIENT' ? CLIENT_ROUTES : role === 'FREELANCER' ? FREELANCER_ROUTES : []
    const isClientJobDetail = role === 'CLIENT' && pathname !== '/client/jobs/create' && /^\/client\/jobs\/[^/]+$/.test(pathname)
    if (!allowedRoutes.includes(pathname) && !isClientJobDetail) {
      return <Result status="403" title="403" subTitle="Bạn không có quyền truy cập khu vực này." extra={<Button type="primary" href={roleDashboard}>Về Dashboard</Button>} />
    }

    return <AppLayout dashboard><Suspense fallback={<LoadingScreen />}><AccountPage pathname={pathname} role={role} user={session.user} /></Suspense></AppLayout>
  }

  const page = <HomePage />
  return <AppLayout><Suspense fallback={<LoadingScreen />}>{page}</Suspense></AppLayout>
}
