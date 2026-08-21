import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Button, Card, Drawer, Empty, Flex, Image, Input, Select, Skeleton, Statistic, Tag, Typography } from 'antd'
import { EyeOutlined, LinkOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { getFreelancerProofs } from '../api/freelancerProofApi.js'
import { getProofStatusMeta } from '../model/proofStatus.js'
import { ApiError } from '@/shared/api/httpClient.js'
import { authSession } from '@/features/auth/model/authSession.js'
import { navigate } from '@/shared/lib/navigation.js'
import { formatCurrency } from '@/shared/lib/formatCurrency.js'
import styles from './FreelancerProofHistoryPage.module.css'

const { Paragraph, Text, Title } = Typography
const filters = [{ value: 'ALL', label: 'Tất cả' }, { value: 'PENDING', label: 'Chờ duyệt' }, { value: 'APPROVED', label: 'Đã duyệt' }, { value: 'REJECTED', label: 'Đã từ chối' }]

function dateTime(value) {
  if (!value) return 'Không xác định'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Không xác định' : new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(date)
}
function money(proof) {
  if (!Number.isFinite(proof.payoutAmount)) return 'Không xác định'
  return formatCurrency(proof.payoutAmount, proof.currency)
}

function DetailDrawer({ proof, onClose }) {
  if (!proof) return null
  const status = getProofStatusMeta(proof.status)
  return <Drawer title="Chi tiết Proof" open onClose={onClose} width="min(35rem, 100vw)" destroyOnHidden extra={<Tag color={status.color}>{status.label}</Tag>}><div className={styles.detail}>
    <section><Title level={4}>{proof.job.title || `Job #${proof.job.id ?? '—'}`}</Title><Text type="secondary">Mã Job: {proof.job.id ?? 'Không xác định'}</Text></section>
    <div className={styles.detailMeta}><div><Text type="secondary">Mã Proof</Text><strong>{proof.id}</strong></div><div><Text type="secondary">Mã Assignment</Text><strong>{proof.assignmentId ?? 'Không xác định'}</strong></div><div><Text type="secondary">Freelancer</Text><strong>{proof.freelancer.name || 'Không xác định'}</strong></div><div><Text type="secondary">Vị trí nội dung</Text><strong>{proof.reviewContentIndex === null ? 'Không xác định' : proof.reviewContentIndex}</strong></div><div><Text type="secondary">Payout</Text><strong>{money(proof)}</strong></div><div><Text type="secondary">Ngày gửi</Text><strong>{dateTime(proof.createdAt)}</strong></div>{proof.reviewedAt && <div><Text type="secondary">Ngày Client xử lý</Text><strong>{dateTime(proof.reviewedAt)}</strong></div>}<div><Text type="secondary">Cập nhật cuối</Text><strong>{dateTime(proof.updatedAt)}</strong></div></div>
    <section><Title level={5}>Nội dung review</Title><Paragraph className={styles.content}>{proof.reviewContent || 'Chưa có nội dung.'}</Paragraph>{proof.shareLink && <Button type="link" href={proof.shareLink} target="_blank" rel="noreferrer" icon={<LinkOutlined aria-hidden="true" />}>Mở bài review</Button>}</section>
    {proof.evidenceImages.length > 0 && <section><Title level={5}>Ảnh bằng chứng</Title><Image.PreviewGroup><div className={styles.images}>{proof.evidenceImages.map((src, index) => <Image key={src} src={src} alt={`Ảnh bằng chứng ${index + 1}`} />)}</div></Image.PreviewGroup></section>}
    {proof.status === 'PENDING' && <Alert type="info" showIcon title="Chờ Client xử lý" />}
    {proof.status === 'APPROVED' && <Alert type="success" showIcon title="Proof đã được Client duyệt" />}
    {proof.status === 'REJECTED' && <Alert type="error" showIcon title="Proof đã bị từ chối" description={proof.rejectionReason || 'Client chưa cung cấp lý do.'} />}
  </div></Drawer>
}

export function FreelancerProofHistoryPage() {
  const [proofs, setProofs] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('ALL')
  const [selected, setSelected] = useState(null)
  const loadProofs = useCallback(async () => {
    setStatus('loading'); setError('')
    try { setProofs(await getFreelancerProofs()); setStatus('success') }
    catch (requestError) {
      setProofs([])
      if (requestError instanceof ApiError && requestError.status === 401) { authSession.clear(); navigate('/login?redirect=%2Ffreelancer%2Fproofs%2Fhistory', { replace: true }); return }
      setError(requestError instanceof ApiError ? requestError.message : 'Không thể tải lịch sử Proof.'); setStatus('error')
    }
  }, [])
  useEffect(() => { queueMicrotask(loadProofs) }, [loadProofs])
  const filtered = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase('vi')
    return proofs.filter((proof) => (filter === 'ALL' || proof.status === filter) && (!keyword || `${proof.job.title} ${proof.job.id ?? ''} ${proof.reviewContent} ${proof.rejectionReason}`.toLocaleLowerCase('vi').includes(keyword)))
  }, [filter, proofs, query])
  const count = (value) => proofs.filter((proof) => proof.status === value).length
  const filteredOut = proofs.length > 0 && filtered.length === 0
  function clearFilters() { setQuery(''); setFilter('ALL') }
  return <>
    <header className={styles.heading}><div><Title id="account-page-title">Lịch sử Proof</Title><Paragraph>Theo dõi các Proof bạn đã gửi và kết quả xử lý từ Client.</Paragraph></div><Button icon={<ReloadOutlined aria-hidden="true" />} loading={status === 'loading'} onClick={loadProofs}>Làm mới</Button></header>
    <div className={styles.summary} aria-label="Thống kê lịch sử Proof"><Card><Statistic title="Tổng Proof" value={status === 'loading' ? '—' : proofs.length} /></Card><Card><Statistic title="Chờ duyệt" value={status === 'loading' ? '—' : count('PENDING')} /></Card><Card><Statistic title="Đã duyệt" value={status === 'loading' ? '—' : count('APPROVED')} /></Card><Card><Statistic title="Đã từ chối" value={status === 'loading' ? '—' : count('REJECTED')} /></Card></div>
    <Card className={styles.toolbar}><Input allowClear aria-label="Tìm kiếm lịch sử Proof" prefix={<SearchOutlined aria-hidden="true" />} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm theo Job, nội dung hoặc lý do từ chối" /><Select aria-label="Lọc lịch sử Proof theo trạng thái" value={filter} onChange={setFilter} options={filters} /></Card>
    {error && <Alert type="error" showIcon title={error} action={<Button onClick={loadProofs}>Thử lại</Button>} />}
    {status === 'loading' ? <div className={styles.grid} role="status" aria-label="Đang tải lịch sử Proof">{[1, 2, 3, 4].map((key) => <Card key={key}><Skeleton active /></Card>)}</div> : filtered.length === 0 ? <Card><Empty description={filteredOut ? 'Không tìm thấy Proof phù hợp.' : 'Bạn chưa gửi Proof nào.'}>{filteredOut && <Button onClick={clearFilters}>Xóa bộ lọc</Button>}</Empty></Card> : <div className={styles.grid}>{filtered.map((proof) => { const proofStatus = getProofStatusMeta(proof.status); return <article key={proof.id}><Card className={styles.card}><Flex justify="space-between" align="start" gap="small"><Tag color={proofStatus.color}>{proofStatus.label}</Tag><Text type="secondary">Proof #{proof.id}</Text></Flex><Title level={3}>{proof.job.title || `Job #${proof.job.id ?? '—'}`}</Title><Paragraph ellipsis={{ rows: 2 }}>{proof.reviewContent || 'Chưa có nội dung review.'}</Paragraph><div className={styles.meta}><div><Text type="secondary">Payout</Text><strong>{money(proof)}</strong></div><div><Text type="secondary">Ngày gửi</Text><strong>{dateTime(proof.createdAt)}</strong></div>{proof.reviewedAt && <div><Text type="secondary">Client xử lý</Text><strong>{dateTime(proof.reviewedAt)}</strong></div>}<div><Text type="secondary">Ảnh bằng chứng</Text><strong>{proof.evidenceImages.length}</strong></div></div>{proof.status === 'REJECTED' && proof.rejectionReason && <Alert className={styles.reason} type="error" showIcon title="Lý do từ chối" description={proof.rejectionReason} />}<Button className={styles.viewButton} block icon={<EyeOutlined aria-hidden="true" />} onClick={() => setSelected(proof)}>Xem chi tiết</Button></Card></article> })}</div>}
    <DetailDrawer proof={selected} onClose={() => setSelected(null)} />
  </>
}
