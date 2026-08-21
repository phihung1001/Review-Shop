import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import {
  Alert, Avatar, Button, Card, Empty, Flex, Form, Input,
  Progress, Select, Skeleton, Statistic, Tag, Typography,
} from 'antd'
import {
  DashboardOutlined, DollarOutlined, FileAddOutlined, FileDoneOutlined, HistoryOutlined,
  ArrowLeftOutlined, EnvironmentOutlined, EyeOutlined, SafetyCertificateOutlined, UserOutlined, WalletOutlined,
} from '@ant-design/icons'
import styles from './AccountPage.module.css'
import { CreateJobPage as ClientCreateJobPage } from '@/features/jobs/ui/CreateJobPage.jsx'
import { getClientJob, getClientJobs } from '@/features/jobs/api/jobApi.js'
import { getClientProofs } from '@/features/proofs/api/clientProofApi.js'
import { ApiError } from '@/shared/api/httpClient.js'
import { authSession } from '@/features/auth/model/authSession.js'
import { navigate } from '@/shared/lib/navigation.js'
import { accountBalance } from '@/features/account/model/accountBalance.js'
import { ClientProofReviewPage } from '@/features/proofs/ui/ClientProofReviewPage.jsx'
import { ClientProofHistoryPage } from '@/features/proofs/ui/ClientProofHistoryPage.jsx'
import { FreelancerOpenJobs } from '@/features/freelancer-jobs/ui/FreelancerOpenJobs.jsx'
import { FreelancerProofHistoryPage } from '@/features/proofs/ui/FreelancerProofHistoryPage.jsx'
import { GoogleMapsAccountsPage } from '@/features/google-maps-accounts/ui/GoogleMapsAccountsPage.jsx'
import { DepositPage } from '@/features/account/ui/DepositPage.jsx'

const { Paragraph, Text, Title } = Typography
const currencyFormatter = new Intl.NumberFormat('vi-VN')

/* Legacy mock jobs retained only for migration history.
const jobs = [
  { id: 1, title: 'Review trải nghiệm sản phẩm chăm sóc da', description: 'Trải nghiệm sản phẩm và viết bài đánh giá chân thực, tập trung vào cảm nhận và hiệu quả.', category: 'Viết nội dung', price: 120000, deadline: '5 ngày', slots: 3, applications: 7, client: 'Lumi Beauty', clientInitials: 'LB', rating: 4.9 },
  { id: 2, title: 'Đánh giá ứng dụng quản lý chi tiêu cá nhân', description: 'Sử dụng các tính năng chính, ghi lại trải nghiệm và đề xuất cải thiện.', category: 'Công nghệ', price: 180000, deadline: '7 ngày', slots: 2, applications: 4, client: 'Finan Studio', clientInitials: 'FS', rating: 4.8 },
  { id: 3, title: 'Quay video review không gian quán cà phê', description: 'Sản xuất video ngắn giới thiệu không gian, đồ uống và trải nghiệm dịch vụ.', category: 'Video', price: 350000, deadline: '10 ngày', slots: 1, applications: 9, client: 'Mộc Coffee', clientInitials: 'MC', rating: 5 },
]
*/

const freelancerNavigation = [
  { href: '/freelancer/dashboard', label: 'Tổng quan', icon: DashboardOutlined },
  { href: '/freelancer/proofs/history', label: 'Lịch sử Proof', icon: HistoryOutlined },
  { href: '/freelancer/google-maps-accounts', label: 'Xác thực tài khoản', icon: SafetyCertificateOutlined },
  { href: '/freelancer/profile', label: 'Hồ sơ cá nhân', icon: UserOutlined },
]

const clientNavigation = [
  { href: '/client/dashboard', label: 'Tổng quan', icon: DashboardOutlined },
  { href: '/client/deposit', label: 'Nạp tiền', icon: WalletOutlined },
  { href: '/client/jobs/create', label: 'Tạo Job mới', icon: FileAddOutlined },
  { href: '/client/proofs/review', label: 'Duyệt Proof', icon: FileDoneOutlined },
  { href: '/client/proofs/history', label: 'Lịch sử Proof', icon: HistoryOutlined },
  { href: '/client/profile', label: 'Hồ sơ cá nhân', icon: UserOutlined },
]

function DashboardNav({ pathname, role, user }) {
  const navigation = role === 'CLIENT' ? clientNavigation : freelancerNavigation
  return (
    <aside className={styles.sidebar} aria-label={`Điều hướng Dashboard ${role === 'CLIENT' ? 'Client' : 'Freelancer'}`}>
      <div className={styles.userSummary}>
        <Avatar size={48} src={user?.avatarUrl || undefined} icon={!user?.avatarUrl ? <UserOutlined aria-hidden="true" /> : undefined} />
        <div><strong>{user?.name || (role === 'CLIENT' ? 'Client' : 'Freelancer')}</strong><Text type="secondary">{user?.email || role}</Text></div>
      </div>
      <nav className={styles.accountNav}>
        {navigation.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return <a key={href} href={href} className={active ? styles.activeNav : undefined} aria-current={active ? 'page' : undefined}><Icon aria-hidden="true" /><span>{label}</span></a>
        })}
      </nav>
      {role === 'FREELANCER' && <Card size="small" className={styles.profileCard}><Flex justify="space-between"><Text strong>Hoàn thiện hồ sơ</Text><Text strong>72%</Text></Flex><Progress percent={72} showInfo={false} size="small" /><Button type="link" href="/freelancer/profile">Cập nhật hồ sơ</Button></Card>}
    </aside>
  )
}

function PageHeading({ eyebrow, title, description, action }) {
  return <header className={styles.heading}><div><Text className={styles.eyebrow}>{eyebrow}</Text><Title id="account-page-title">{title}</Title><Paragraph>{description}</Paragraph></div>{action}</header>
}

/* Legacy hard-coded Freelancer UI retained only for migration history.
function JobCard({ job, accepted, onAccept }) {
  return <Card className={styles.jobCard}><div className={styles.jobContent}><div className={styles.jobMain}><Flex gap="small" wrap><Tag color="blue">{job.category}</Tag><Tag icon={<CheckCircleOutlined />} color="green">Đã xác minh</Tag></Flex><Title level={3}>{job.title}</Title><Paragraph>{job.description}</Paragraph><Flex className={styles.client} gap="small" align="center" wrap><Avatar>{job.clientInitials}</Avatar><div><Text strong>{job.client}</Text><span><StarFilled aria-hidden="true" /> {job.rating} · Khách hàng uy tín</span></div></Flex></div><div className={styles.jobAside} aria-label={`Thông tin công việc ${job.title}`}><div><Text type="secondary">Thù lao</Text><strong>{currencyFormatter.format(job.price)}đ</strong></div><div><Text type="secondary"><ClockCircleOutlined /> Thời hạn</Text><span>{job.deadline}</span></div><div><Text type="secondary"><TeamOutlined /> Ứng viên</Text><span>{job.applications} · còn {job.slots} vị trí</span></div><Button type="primary" block disabled={accepted} icon={accepted ? <CheckCircleOutlined /> : undefined} onClick={() => onAccept(job)}>{accepted ? 'Đã nhận việc' : 'Nhận công việc'}</Button></div></div></Card>
}

function FreelancerDashboard() {
  const { message } = App.useApp()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [acceptedJobs, setAcceptedJobs] = useState(() => new Set())
  const filteredJobs = useMemo(() => jobs.filter((job) => (category === 'all' || job.category === category) && (!query.trim() || `${job.title} ${job.description}`.toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi')))), [category, query])
  function acceptJob(job) { setAcceptedJobs((current) => new Set(current).add(job.id)); message.success(`Đã nhận “${job.title}”.`) }
  return <><PageHeading eyebrow="KHÔNG GIAN LÀM VIỆC" title="Công việc dành cho bạn" description="Khám phá cơ hội phù hợp và xây dựng uy tín từ những dự án chất lượng." action={<Button type="primary" icon={<WalletOutlined />}>Rút tiền</Button>} /><div className={styles.stats} aria-label="Tổng quan tài khoản"><Card><Statistic title="Số dư khả dụng" value={1250000} formatter={(value) => currencyFormatter.format(value)} suffix="đ" prefix={<WalletOutlined />} /></Card><Card><Statistic title="Việc đang thực hiện" value={3} prefix={<DashboardOutlined />} /></Card><Card><Statistic title="Thu nhập tháng này" value={860000} formatter={(value) => currencyFormatter.format(value)} suffix="đ" prefix={<DollarOutlined />} /></Card></div><Card className={styles.toolbar}><Input allowClear prefix={<SearchOutlined aria-hidden="true" />} aria-label="Tìm kiếm công việc" placeholder="Tìm theo tên hoặc mô tả công việc" value={query} onChange={(event) => setQuery(event.target.value)} /><Select aria-label="Lọc theo lĩnh vực" value={category} onChange={setCategory} options={[{ value: 'all', label: 'Tất cả lĩnh vực' }, ...jobs.map((job) => ({ value: job.category, label: job.category }))]} /></Card><Flex className={styles.listHeading} justify="space-between" align="center" wrap gap="small"><Title level={2}>Công việc mới nhất</Title><Text type="secondary">{filteredJobs.length} cơ hội phù hợp</Text></Flex><div className={styles.jobList} aria-live="polite">{filteredJobs.length ? filteredJobs.map((job) => <JobCard key={job.id} job={job} accepted={acceptedJobs.has(job.id)} onAccept={acceptJob} />) : <Card><Empty description="Không tìm thấy công việc phù hợp"><Button onClick={() => { setQuery(''); setCategory('all') }}>Xóa bộ lọc</Button></Empty></Card>}</div></>
  */
function FreelancerDashboard() {
  return <FreelancerOpenJobs />
}

function countProofJobs(proofs, status) {
  const jobIds = new Set()
  let proofsWithoutJob = 0
  proofs.forEach((proof) => {
    if (proof.status !== status) return
    const jobId = proof.job?.id
    if (jobId === null || jobId === undefined || String(jobId).trim() === '') proofsWithoutJob += 1
    else jobIds.add(String(jobId))
  })
  return jobIds.size + proofsWithoutJob
}

function ClientSummary({ jobs, proofs, balance, loading }) {
  const count = (statuses) => jobs.filter((job) => statuses.includes(String(job.status).toUpperCase())).length
  const totalSpent = jobs.reduce((sum, job) => sum + (Number.isFinite(job.totalSpent) ? job.totalSpent : 0), 0)
  const approvedReviews = jobs.reduce((sum, job) => sum + (Number.isFinite(job.approvedReviews) ? job.approvedReviews : 0), 0)
  const pendingValue = (value) => loading ? '—' : value
  const currentBalance = balance.account?.availableAmount
  return <><div className={styles.stats} aria-label="Tổng quan Client"><Card><Statistic title="Tổng chi tiêu" value={pendingValue(currencyFormatter.format(totalSpent))} prefix={<DollarOutlined />} /></Card><Card><Statistic title="Số lượng Job đã đăng" value={pendingValue(jobs.length)} prefix={<DashboardOutlined />} /></Card><Card><Statistic title="Review đã duyệt" value={pendingValue(proofs.filter((proof) => proof.status === 'APPROVED').length || approvedReviews)} prefix={<FileDoneOutlined />} /></Card><Card><Statistic title="Số dư hiện tại" value={balance.status === 'loading' && !balance.account ? '—' : currentBalance == null ? 'Không khả dụng' : currencyFormatter.format(currentBalance)} prefix={<WalletOutlined />} /></Card></div><Flex className={styles.listHeading} justify="space-between" align="center"><Title level={2}>Thống kê Job</Title></Flex><div className={styles.stats} aria-label="Thống kê trạng thái Job"><Card><Statistic title="Job mở" value={pendingValue(count(['OPEN', 'POSTED', 'FUNDED']))} /></Card><Card><Statistic title="Đang thực hiện" value={pendingValue(count(['IN_PROGRESS', 'PROCESSING']))} /></Card><Card><Statistic title="Chờ duyệt" value={pendingValue(countProofJobs(proofs, 'PENDING'))} /></Card><Card><Statistic title="Hoàn thành" value={pendingValue(countProofJobs(proofs, 'APPROVED'))} /></Card><Card><Statistic title="Đã từ chối" value={pendingValue(countProofJobs(proofs, 'REJECTED'))} /></Card></div></>
}

function ClientJobList({ jobs }) {
  const [filter, setFilter] = useState('ALL')
  const visibleJobs = filter === 'OPEN' ? jobs.filter((job) => String(job.status).toUpperCase() === 'OPEN') : jobs
  return <section aria-labelledby="client-jobs-title"><Flex className={styles.listHeading} justify="space-between" align="center" wrap gap="small"><Title id="client-jobs-title" level={2}>Tất cả Job</Title><Flex align="center" gap="small"><Text type="secondary">{visibleJobs.length} Job</Text><Select aria-label="Lọc Job Client theo trạng thái" value={filter} onChange={setFilter} options={[{ value: 'ALL', label: 'Tất cả Job' }, { value: 'OPEN', label: 'Job đang mở' }]} /></Flex></Flex>{visibleJobs.length === 0 ? <Card><Empty description="Không có Job đang mở."><Button onClick={() => setFilter('ALL')}>Xóa bộ lọc</Button></Empty></Card> : <div className={styles.clientJobGrid} aria-live="polite">{visibleJobs.map((job) => <Card key={job.id} size="small" className={styles.clientJobCard}><Flex justify="space-between" align="start" gap="small"><Tag color={job.status === 'OPEN' ? 'green' : 'blue'}>{job.status === 'UNKNOWN' ? 'Chưa rõ trạng thái' : job.status}</Tag>{job.requiredLevel && <Tag>{job.requiredLevel}</Tag>}</Flex><Title level={4}>{job.title || `Job #${job.id}`}</Title>{job.description && <Paragraph ellipsis={{ rows: 2 }}>{job.description}</Paragraph>}<div className={styles.clientJobMeta}><div><Text type="secondary">Giá/review</Text><strong>{currencyFormatter.format(job.pricePerReview)}đ</strong></div><div><Text type="secondary">Số review</Text><strong>{job.totalReviews}</strong></div>{job.createdAt && <div><Text type="secondary">Ngày tạo</Text><strong>{new Intl.DateTimeFormat('vi-VN').format(new Date(job.createdAt))}</strong></div>}</div><Flex justify="space-between" align="center" gap="small" wrap><Button className={styles.clientJobAction} type="link" size="small" icon={<EyeOutlined aria-hidden="true" />} href={`/client/jobs/${encodeURIComponent(job.id)}`}>Xem chi tiết</Button>{job.mapLink && <Button className={styles.clientJobAction} type="link" size="small" icon={<EnvironmentOutlined aria-hidden="true" />} href={job.mapLink} target="_blank" rel="noreferrer">Google Maps</Button>}</Flex></Card>)}</div>}</section>
}

function ClientOverview() {
  const [clientJobs, setClientJobs] = useState([])
  const [clientProofs, setClientProofs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const balance = useSyncExternalStore(accountBalance.subscribe, accountBalance.getSnapshot)

  const loadJobs = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [jobs, proofs] = await Promise.all([getClientJobs(), getClientProofs()])
      setClientJobs(jobs)
      setClientProofs(proofs)
    } catch (requestError) {
      if (requestError instanceof ApiError && [401, 403].includes(requestError.status)) {
        authSession.clear()
        navigate('/login?redirect=%2Fclient%2Fdashboard', { replace: true })
        return
      }
      setError(requestError instanceof ApiError ? requestError.message : 'Không thể tải danh sách Job.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { queueMicrotask(loadJobs) }, [loadJobs])

  return <><PageHeading eyebrow="KHÔNG GIAN KHÁCH HÀNG" title="Tổng quan công việc" description="Theo dõi các Job của bạn, được sắp xếp mới nhất trước." action={<Button type="primary" href="/client/jobs/create" icon={<FileAddOutlined />}>Tạo Job mới</Button>} /><ClientSummary jobs={clientJobs} proofs={clientProofs} balance={balance} loading={loading} />{error && <Alert type="error" showIcon title={error} action={<Button onClick={loadJobs}>Thử lại</Button>} />}{loading ? <div className={styles.clientJobGrid} role="status" aria-label="Đang tải danh sách Job">{[1, 2, 3, 4].map((key) => <Card key={key} size="small"><Skeleton active paragraph={{ rows: 2 }} /></Card>)}</div> : clientJobs.length === 0 ? <Card><Empty description="Bạn chưa tạo Job nào"><Button type="primary" href="/client/jobs/create">Tạo Job đầu tiên</Button></Empty></Card> : <ClientJobList jobs={clientJobs} />}</>
}

function ClientJobDetail({ jobId }) {
  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadJob = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setJob(await getClientJob(jobId))
    } catch (requestError) {
      if (requestError instanceof ApiError && [401, 403].includes(requestError.status)) {
        authSession.clear()
        navigate(`/login?redirect=${encodeURIComponent(`/client/jobs/${encodeURIComponent(jobId)}`)}`, { replace: true })
        return
      }
      setError(requestError instanceof ApiError ? requestError.message : 'Không thể tải chi tiết Job.')
    } finally {
      setLoading(false)
    }
  }, [jobId])

  useEffect(() => { queueMicrotask(loadJob) }, [loadJob])

  if (loading) return <><Button type="link" icon={<ArrowLeftOutlined />} href="/client/dashboard">Quay lại Tổng quan</Button><Card><Skeleton active /></Card></>
  if (error) return <><Button type="link" icon={<ArrowLeftOutlined />} href="/client/dashboard">Quay lại Tổng quan</Button><Alert type="error" showIcon title={error} action={<Button onClick={loadJob}>Thử lại</Button>} /></>
  if (!job) return null
  return <><Flex className={styles.detailHeading} justify="space-between" align="start" wrap gap="middle"><div><Button type="link" icon={<ArrowLeftOutlined />} href="/client/dashboard">Quay lại Tổng quan</Button><Title id="account-page-title">{job.title || `Job #${job.id}`}</Title><Flex gap="small" wrap><Tag color="blue">{job.status === 'UNKNOWN' ? 'Chưa rõ trạng thái' : job.status}</Tag>{job.requiredLevel && <Tag>{job.requiredLevel}</Tag>}</Flex></div>{job.mapLink && <Button icon={<EnvironmentOutlined />} href={job.mapLink} target="_blank" rel="noreferrer">Mở Google Maps</Button>}</Flex><div className={styles.detailGrid}><Card title="Thông tin Job"><div className={styles.detailMeta}><div><Text type="secondary">Mã Job</Text><strong>{job.id}</strong></div><div><Text type="secondary">Giá mỗi review</Text><strong>{currencyFormatter.format(job.pricePerReview)}đ</strong></div><div><Text type="secondary">Tổng số review</Text><strong>{job.totalReviews}</strong></div><div><Text type="secondary">Required Level</Text><strong>{job.requiredLevel || job.requiredLevelId || 'Không xác định'}</strong></div>{job.createdAt && <div><Text type="secondary">Ngày tạo</Text><strong>{new Intl.DateTimeFormat('vi-VN').format(new Date(job.createdAt))}</strong></div>}</div></Card><Card title="Mô tả"><Paragraph className={styles.detailDescription}>{job.description || 'Job chưa có mô tả.'}</Paragraph></Card>{job.reviewContents.length > 0 && <Card title={`Nội dung review (${job.reviewContents.length})`} className={styles.detailWide}><div className={styles.reviewContents}>{job.reviewContents.map((item, index) => <Card size="small" key={item.id ?? `${job.id}-${index}`}><Text strong>Nội dung {index + 1}</Text><Paragraph>{item.content || 'Không có nội dung.'}</Paragraph></Card>)}</div></Card>}</div><Alert className={styles.detailNotice} type="info" showIcon title="Job hiện chỉ có thể xem." description="Hệ thống chưa hỗ trợ sửa, hủy hoặc xóa Job. Nếu muốn thay đổi nội dung hoặc số lượng, vui lòng tạo Job mới." /></>
}

function CreateJobPage() {
  return <ClientCreateJobPage />
}

function ProfilePage({ role, user }) {
  return <><PageHeading eyebrow={role === 'CLIENT' ? 'TÀI KHOẢN CLIENT' : 'TÀI KHOẢN FREELANCER'} title="Hồ sơ cá nhân" description="Thông tin cơ bản đang được đồng bộ từ phiên đăng nhập của bạn." /><Alert type="info" showIcon title="API cập nhật hồ sơ chưa sẵn sàng." description="Thông tin hiện tại được hiển thị ở chế độ chỉ đọc để tránh giả lập thao tác lưu thành công." /><Card><Form layout="vertical"><Form.Item label="Họ và tên"><Input value={user?.name || ''} readOnly /></Form.Item><Form.Item label="Email"><Input value={user?.email || ''} readOnly /></Form.Item><Form.Item label="Vai trò"><Input value={role} readOnly /></Form.Item><Button type="primary" disabled>Lưu thay đổi</Button></Form></Card></>
}

function AccountContent({ pathname, role, user }) {
  if (role === 'FREELANCER') {
    if (pathname === '/freelancer/profile') return <ProfilePage role={role} user={user} />
    if (pathname === '/freelancer/proofs/history') return <FreelancerProofHistoryPage />
    if (pathname === '/freelancer/google-maps-accounts') return <GoogleMapsAccountsPage />
    return <FreelancerDashboard />
  }
  if (pathname === '/client/deposit') return <DepositPage />
  if (pathname === '/client/jobs/create') return <CreateJobPage />
  if (pathname.startsWith('/client/jobs/')) return <ClientJobDetail jobId={decodeURIComponent(pathname.slice('/client/jobs/'.length))} />
  if (pathname === '/client/proofs/review') return <ClientProofReviewPage />
  if (pathname === '/client/proofs/history') return <ClientProofHistoryPage />
  if (pathname === '/client/profile') return <ProfilePage role={role} user={user} />
  return <ClientOverview />
}

export function AccountPage({ pathname, role, user }) {
  return <section className={styles.dashboard} aria-labelledby="account-page-title"><div className={styles.dashboardShell}><DashboardNav pathname={pathname} role={role} user={user} /><main className={styles.content}><AccountContent pathname={pathname} role={role} user={user} /></main></div></section>
}
