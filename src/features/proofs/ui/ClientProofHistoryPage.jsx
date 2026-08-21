import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert, Button, Card, Descriptions, Drawer, Empty, Flex, Image, Input,
  Pagination, Select, Skeleton, Statistic, Tag, Typography,
} from 'antd'
import {
  CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined, EyeOutlined,
  FileImageOutlined, HistoryOutlined, LinkOutlined, ReloadOutlined, SearchOutlined,
} from '@ant-design/icons'
import { getClientProof, getClientProofs } from '../api/clientProofApi.js'
import { getProofStatusMeta } from '../model/proofStatus.js'
import { ApiError } from '@/shared/api/httpClient.js'
import { authSession } from '@/features/auth/model/authSession.js'
import { navigate } from '@/shared/lib/navigation.js'
import { formatCurrency } from '@/shared/lib/formatCurrency.js'
import styles from './ClientProofHistoryPage.module.css'

const { Paragraph, Text, Title } = Typography
const PAGE_SIZE = 8
const statusOptions = [
  { value: 'ALL', label: 'Tất cả trạng thái' },
  { value: 'PENDING', label: 'Chờ duyệt' },
  { value: 'APPROVED', label: 'Đã duyệt' },
  { value: 'REJECTED', label: 'Đã từ chối' },
]

function dateTime(value) {
  if (!value) return 'Chưa có thông tin'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Chưa có thông tin'
    : new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function money(proof) {
  if (!Number.isFinite(proof.payoutAmount)) return 'Chưa có thông tin'
  try { return formatCurrency(proof.payoutAmount, proof.currency) }
  catch { return new Intl.NumberFormat('vi-VN').format(proof.payoutAmount) }
}

function handleAuthError(error) {
  if (!(error instanceof ApiError) || ![401, 403].includes(error.status)) return false
  authSession.clear()
  navigate('/login?redirect=%2Fclient%2Fproofs%2Fhistory', { replace: true })
  return true
}

function DetailDrawer({ proofId, initialProof, onClose }) {
  const [proof, setProof] = useState(initialProof)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')

  const loadDetail = useCallback(async () => {
    if (proofId === null || proofId === undefined) return
    setStatus('loading')
    setError('')
    try {
      setProof(await getClientProof(proofId))
      setStatus('success')
    } catch (requestError) {
      if (handleAuthError(requestError)) return
      setError(requestError instanceof ApiError ? requestError.message : 'Không thể tải chi tiết Proof.')
      setStatus('error')
    }
  }, [proofId])

  useEffect(() => { queueMicrotask(loadDetail) }, [loadDetail])

  const statusMeta = getProofStatusMeta(proof?.status)
  return <Drawer
    title="Chi tiết Proof"
    open={proofId !== null && proofId !== undefined}
    onClose={onClose}
    width="min(40rem, 100vw)"
    destroyOnHidden
    extra={proof ? <Tag color={statusMeta.color}>{statusMeta.label}</Tag> : null}
  >
    {status === 'loading' && <div role="status" aria-label="Đang tải chi tiết Proof"><Skeleton active avatar paragraph={{ rows: 8 }} /></div>}
    {status === 'error' && <Alert type="error" showIcon title="Không thể tải chi tiết" description={error} action={<Button onClick={loadDetail}>Thử lại</Button>} />}
    {status === 'success' && proof && <div className={styles.detail}>
      <section className={styles.detailHero} aria-labelledby="proof-detail-title">
        <Text type="secondary">Proof #{proof.id}</Text>
        <Title id="proof-detail-title" level={3}>{proof.job.title || `Job #${proof.job.id ?? '—'}`}</Title>
        <Paragraph>Gửi bởi <Text strong>{proof.freelancer.name}</Text></Paragraph>
      </section>

      {proof.status === 'PENDING' && <Alert type="warning" showIcon title="Proof đang chờ duyệt" description="Proof này chưa có kết quả xử lý." />}
      {proof.status === 'APPROVED' && <Alert type="success" showIcon title="Proof đã được duyệt" description={proof.reviewedAt ? `Xử lý lúc ${dateTime(proof.reviewedAt)}.` : undefined} />}
      {proof.status === 'REJECTED' && <Alert type="error" showIcon title="Proof đã bị từ chối" description={proof.rejectionReason || 'Chưa có lý do từ chối.'} />}

      <Descriptions bordered column={{ xs: 1, sm: 2 }} size="small">
        <Descriptions.Item label="Mã Proof">{proof.id}</Descriptions.Item>
        <Descriptions.Item label="Mã Job">{proof.job.id ?? 'Chưa có'}</Descriptions.Item>
        <Descriptions.Item label="Freelancer">{proof.freelancer.name}</Descriptions.Item>
        <Descriptions.Item label="Payout">{money(proof)}</Descriptions.Item>
        <Descriptions.Item label="Ngày gửi">{dateTime(proof.submittedAt)}</Descriptions.Item>
        <Descriptions.Item label="Ngày xử lý">{dateTime(proof.reviewedAt)}</Descriptions.Item>
      </Descriptions>

      <section><Title level={5}>Nội dung review</Title><Paragraph className={styles.reviewContent}>{proof.reviewContent || 'Proof chưa có nội dung review.'}</Paragraph>{proof.shareLink && <Button type="link" href={proof.shareLink} target="_blank" rel="noreferrer" icon={<LinkOutlined aria-hidden="true" />}>Mở bài review</Button>}</section>
      <section><Title level={5}>Ảnh bằng chứng ({proof.evidenceImages.length})</Title>{proof.evidenceImages.length ? <Image.PreviewGroup><div className={styles.images}>{proof.evidenceImages.map((src, index) => <Image key={src} src={src} alt={`Ảnh bằng chứng ${index + 1} của Proof ${proof.id}`} />)}</div></Image.PreviewGroup> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Proof không có ảnh bằng chứng." />}</section>
    </div>}
  </Drawer>
}

function ProofCard({ proof, onView }) {
  const status = getProofStatusMeta(proof.status)
  return <article className={styles.cardArticle}>
    <Card className={styles.proofCard}>
      <Flex justify="space-between" align="start" gap="small" wrap>
        <Tag color={status.color}>{status.label}</Tag>
        <Text type="secondary">#{proof.id}</Text>
      </Flex>
      <Title level={3}>{proof.job.title || `Job #${proof.job.id ?? '—'}`}</Title>
      <Text type="secondary">Freelancer</Text>
      <Paragraph strong>{proof.freelancer.name}</Paragraph>
      <div className={styles.cardMeta}>
        <div><Text type="secondary">Payout</Text><strong>{money(proof)}</strong></div>
        <div><Text type="secondary">Ngày gửi</Text><strong>{dateTime(proof.submittedAt)}</strong></div>
        <div><Text type="secondary">Ảnh bằng chứng</Text><strong>{proof.evidenceImages.length}</strong></div>
        <div><Text type="secondary">Ngày xử lý</Text><strong>{proof.reviewedAt ? dateTime(proof.reviewedAt) : 'Chưa xử lý'}</strong></div>
      </div>
      {proof.status === 'REJECTED' && <Alert className={styles.reason} type="error" showIcon title="Lý do từ chối" description={proof.rejectionReason || 'Xem chi tiết để biết thêm.'} />}
      <Button block className={styles.viewButton} icon={<EyeOutlined aria-hidden="true" />} onClick={() => onView(proof)}>Xem chi tiết</Button>
    </Card>
  </article>
}

export function ClientProofHistoryPage() {
  const [proofs, setProofs] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('ALL')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState(null)

  const loadProofs = useCallback(async () => {
    setStatus('loading')
    setError('')
    try {
      setProofs(await getClientProofs())
      setStatus('success')
    } catch (requestError) {
      if (handleAuthError(requestError)) return
      setProofs([])
      setError(requestError instanceof ApiError ? requestError.message : 'Không thể tải lịch sử Proof.')
      setStatus('error')
    }
  }, [])

  useEffect(() => { queueMicrotask(loadProofs) }, [loadProofs])

  const filtered = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase('vi')
    return proofs.filter((proof) => {
      const matchesStatus = filter === 'ALL' || proof.status === filter
      const searchable = `${proof.id} ${proof.job.title} ${proof.job.id ?? ''} ${proof.freelancer.name} ${proof.reviewContent} ${proof.rejectionReason}`.toLocaleLowerCase('vi')
      return matchesStatus && (!keyword || searchable.includes(keyword))
    })
  }, [filter, proofs, query])

  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const count = (value) => proofs.filter((proof) => proof.status === value).length
  const filteredOut = proofs.length > 0 && filtered.length === 0
  function clearFilters() { setQuery(''); setFilter('ALL') }

  return <>
    <header className={styles.heading}>
      <div><Text className={styles.eyebrow}>QUẢN LÝ PROOF</Text><Title id="account-page-title">Lịch sử Proof</Title><Paragraph>Theo dõi toàn bộ Proof, trạng thái duyệt và phản hồi đã gửi cho Freelancer.</Paragraph></div>
      <Button icon={<ReloadOutlined aria-hidden="true" />} loading={status === 'loading'} disabled={status === 'loading'} onClick={loadProofs}>Làm mới</Button>
    </header>

    <div className={styles.summary} aria-label="Thống kê lịch sử Proof">
      <Card><Statistic title="Tổng Proof" value={status === 'loading' ? '—' : proofs.length} prefix={<HistoryOutlined aria-hidden="true" />} /></Card>
      <Card><Statistic title="Chờ duyệt" value={status === 'loading' ? '—' : count('PENDING')} prefix={<ClockCircleOutlined aria-hidden="true" />} /></Card>
      <Card><Statistic title="Đã duyệt" value={status === 'loading' ? '—' : count('APPROVED')} prefix={<CheckCircleOutlined aria-hidden="true" />} /></Card>
      <Card><Statistic title="Đã từ chối" value={status === 'loading' ? '—' : count('REJECTED')} prefix={<CloseCircleOutlined aria-hidden="true" />} /></Card>
    </div>

    <Card className={styles.toolbar}>
      <Input allowClear aria-label="Tìm kiếm lịch sử Proof" prefix={<SearchOutlined aria-hidden="true" />} value={query} onChange={(event) => { setQuery(event.target.value); setPage(1) }} placeholder="Tìm theo Proof, Job hoặc Freelancer" />
      <Select aria-label="Lọc lịch sử Proof theo trạng thái" value={filter} onChange={(value) => { setFilter(value); setPage(1) }} options={statusOptions} />
    </Card>

    {status === 'error' && <Alert className={styles.feedback} type="error" showIcon title="Không thể tải lịch sử Proof" description={error} action={<Button onClick={loadProofs}>Thử lại</Button>} />}
    {status === 'loading' && <div className={styles.grid} role="status" aria-label="Đang tải lịch sử Proof">{[1, 2, 3, 4].map((key) => <Card key={key}><Skeleton active paragraph={{ rows: 5 }} /></Card>)}</div>}
    {status === 'success' && visible.length === 0 && <Card><Empty image={<FileImageOutlined aria-hidden="true" />} description={filteredOut ? 'Không tìm thấy Proof phù hợp.' : 'Chưa có Proof nào trong lịch sử.'}>{filteredOut && <Button onClick={clearFilters}>Xóa bộ lọc</Button>}</Empty></Card>}
    {status === 'success' && visible.length > 0 && <>
      <div className={styles.resultHeading}><Text type="secondary">Hiển thị {visible.length} trong {filtered.length} Proof</Text></div>
      <div className={styles.grid} aria-live="polite">{visible.map((proof) => <ProofCard key={proof.id} proof={proof} onView={setSelected} />)}</div>
      {filtered.length > PAGE_SIZE && <Flex className={styles.pagination} justify="center"><Pagination current={page} pageSize={PAGE_SIZE} total={filtered.length} showSizeChanger={false} onChange={setPage} /></Flex>}
    </>}

    {selected && <DetailDrawer key={selected.id} proofId={selected.id} initialProof={selected} onClose={() => setSelected(null)} />}
  </>
}
