import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert, App, Avatar, Button, Card, Drawer, Empty, Flex, Form, Image, Input,
  Modal, Select, Skeleton, Statistic, Tag, Typography,
} from 'antd'
import {
  CheckOutlined, CloseOutlined, EyeOutlined, FileImageOutlined, LinkOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { approveClientProof, getClientProofs, rejectClientProof } from '../api/clientProofApi.js'
import { getProofStatusMeta } from '../model/proofStatus.js'
import { accountBalance } from '@/features/account/model/accountBalance.js'
import { getClientJobs } from '@/features/jobs/api/jobApi.js'
import { ApiError } from '@/shared/api/httpClient.js'
import { authSession } from '@/features/auth/model/authSession.js'
import { navigate } from '@/shared/lib/navigation.js'
import { formatCurrency } from '@/shared/lib/formatCurrency.js'
import styles from './ClientProofReviewPage.module.css'

const { Paragraph, Text, Title } = Typography
const FILTERS = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'PENDING', label: 'Chờ duyệt' },
  { value: 'APPROVED', label: 'Đã duyệt' },
  { value: 'REJECTED', label: 'Đã từ chối' },
]

function money(value, currency) {
  if (!Number.isFinite(value)) return 'Không xác định'
  try { return formatCurrency(value, currency) } catch { return `${new Intl.NumberFormat('vi-VN').format(value)} ${currency || ''}`.trim() }
}

function dateTime(value) {
  if (!value) return 'Không xác định'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Không xác định' : new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(date)
}

function ProofActions({ proof, processing, onView, onApprove, onReject }) {
  const pending = proof.status === 'PENDING'
  return <div className={styles.actions}>
    <Button icon={<EyeOutlined aria-hidden="true" />} onClick={() => onView(proof)}>Xem chi tiết</Button>
    {pending && <Button type="primary" icon={<CheckOutlined aria-hidden="true" />} loading={processing} disabled={processing} onClick={() => onApprove(proof)}>Duyệt</Button>}
    {pending && <Button danger icon={<CloseOutlined aria-hidden="true" />} disabled={processing} onClick={() => onReject(proof)}>Từ chối</Button>}
  </div>
}

function ProofCard({ proof, processing, onView, onApprove, onReject }) {
  const status = getProofStatusMeta(proof.status)
  return <article><Card className={styles.proofCard}>
    <div className={styles.proofHeader}>
      <div className={styles.identity}><Avatar src={proof.freelancer.avatarUrl || undefined} icon={!proof.freelancer.avatarUrl ? <UserOutlined aria-hidden="true" /> : undefined} /><div><Text strong>{proof.freelancer.name}</Text><Text type="secondary">Freelancer #{proof.freelancer.id ?? '—'}</Text></div></div>
      <Tag color={status.color}>{status.label}</Tag>
    </div>
    <Title level={3}>{proof.job.title || `Job #${proof.job.id ?? '—'}`}</Title>
    <Paragraph ellipsis={{ rows: 2 }}>{proof.reviewContent || 'Chưa có nội dung review.'}</Paragraph>
    <div className={styles.meta}>
      <div><Text type="secondary">Payout</Text><strong>{money(proof.payoutAmount, proof.currency)}</strong></div>
      <div><Text type="secondary">Ngày gửi</Text><strong>{dateTime(proof.submittedAt)}</strong></div>
      <div><Text type="secondary">Mã Proof</Text><strong>{proof.id}</strong></div>
      <div><Text type="secondary">Ảnh bằng chứng</Text><strong>{proof.evidenceImages.length}</strong></div>
    </div>
    <ProofActions {...{ proof, processing, onView, onApprove, onReject }} />
  </Card></article>
}

function ProofDetailDrawer({ proof, processing, onClose, onApprove, onReject }) {
  if (!proof) return null
  const status = getProofStatusMeta(proof.status)
  return <Drawer title="Chi tiết Proof" open={Boolean(proof)} onClose={onClose} width="min(35rem, 100vw)" destroyOnHidden extra={<Tag color={status.color}>{status.label}</Tag>}>
    <div className={styles.drawerContent}>
      <section><Title level={4}>{proof.job.title || `Job #${proof.job.id ?? '—'}`}</Title><Text type="secondary">Mã Job: {proof.job.id ?? 'Không xác định'}</Text></section>
      <div className={styles.identity}><Avatar size={48} src={proof.freelancer.avatarUrl || undefined} icon={!proof.freelancer.avatarUrl ? <UserOutlined aria-hidden="true" /> : undefined} /><div><Text strong>{proof.freelancer.name}</Text><Text type="secondary">Freelancer #{proof.freelancer.id ?? '—'}</Text></div></div>
      <div className={styles.drawerMeta}><div><Text type="secondary">Payout</Text><strong>{money(proof.payoutAmount, proof.currency)}</strong></div><div><Text type="secondary">Ngày gửi</Text><strong>{dateTime(proof.submittedAt)}</strong></div><div><Text type="secondary">Ngày xử lý</Text><strong>{dateTime(proof.reviewedAt)}</strong></div><div><Text type="secondary">Kết quả</Text><strong>{proof.result || 'Chưa có'}</strong></div></div>
      <section><Title level={5}>Nội dung review</Title><Paragraph className={styles.reviewText}>{proof.reviewContent || 'Chưa có nội dung review.'}</Paragraph>{proof.shareLink && <Button type="link" href={proof.shareLink} target="_blank" rel="noreferrer" icon={<LinkOutlined aria-hidden="true" />}>Mở bài review</Button>}</section>
      {proof.evidenceImages.length > 0 && <section><Title level={5}>Ảnh bằng chứng</Title><Image.PreviewGroup><div className={styles.images}>{proof.evidenceImages.map((src, index) => <Image key={src} src={src} alt={`Ảnh bằng chứng ${index + 1}`} fallback="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='240'%3E%3Crect width='100%25' height='100%25' fill='%23e2e8f0'/%3E%3C/svg%3E" />)}</div></Image.PreviewGroup></section>}
      {proof.rejectionReason && <Alert type="error" showIcon title="Lý do từ chối" description={proof.rejectionReason} />}
      {proof.status === 'PENDING' && <div className={styles.drawerActions}><Button type="primary" icon={<CheckOutlined aria-hidden="true" />} loading={processing} disabled={processing} onClick={() => onApprove(proof)}>Duyệt Proof</Button><Button danger icon={<CloseOutlined aria-hidden="true" />} disabled={processing} onClick={() => onReject(proof)}>Từ chối</Button></div>}
    </div>
  </Drawer>
}

export function ClientProofReviewPage() {
  const { message, modal } = App.useApp()
  const [form] = Form.useForm()
  const [proofs, setProofs] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('ALL')
  const [selected, setSelected] = useState(null)
  const [rejecting, setRejecting] = useState(null)
  const [processingId, setProcessingId] = useState(null)
  const [mutationError, setMutationError] = useState('')
  const mutationLock = useRef(false)

  const loadProofs = useCallback(async ({ preserve = false } = {}) => {
    if (!preserve) setStatus('loading')
    setError('')
    try {
      const next = await getClientProofs()
      setProofs(next)
      setSelected((current) => current ? next.find((proof) => String(proof.id) === String(current.id)) ?? null : null)
      setStatus('success')
    } catch (requestError) {
      if (requestError instanceof ApiError && [401, 403].includes(requestError.status)) {
        setProofs([]); accountBalance.clear(); authSession.clear(); navigate('/login?redirect=%2Fclient%2Fproofs%2Freview', { replace: true }); return
      }
      setError(requestError instanceof ApiError ? requestError.message : 'Không tải được danh sách Proof.')
      setStatus('error')
    }
  }, [])

  useEffect(() => { queueMicrotask(() => loadProofs()) }, [loadProofs])

  const refreshAfterMutation = useCallback(async () => {
    const results = await Promise.allSettled([loadProofs({ preserve: true }), accountBalance.refresh(), getClientJobs()])
    if (results.some((result) => result.status === 'rejected')) message.warning('Proof đã được xử lý nhưng một số dữ liệu chưa đồng bộ. Vui lòng tải lại sau.')
  }, [loadProofs, message])

  const runMutation = useCallback(async (proof, action, successText) => {
    if (mutationLock.current) return false
    mutationLock.current = true
    setProcessingId(proof.id)
    setMutationError('')
    try {
      await action()
      message.success(successText)
      await refreshAfterMutation()
      return true
    } catch (requestError) {
      const text = requestError instanceof ApiError ? requestError.message : 'Không thể xử lý Proof.'
      setMutationError(text)
      message.error(text)
      if (requestError instanceof ApiError && [404, 409].includes(requestError.status)) await loadProofs({ preserve: true })
      throw requestError
    } finally { mutationLock.current = false; setProcessingId(null) }
  }, [loadProofs, message, refreshAfterMutation])

  function openApprove(proof) {
    modal.confirm({
      title: 'Duyệt Proof này?',
      content: <div><Paragraph>Freelancer <strong>{proof.freelancer.name}</strong> sẽ nhận <strong>{money(proof.payoutAmount, proof.currency)}</strong> từ ngân sách đang giữ của Job.</Paragraph><Text type="secondary">Chỉ xác nhận khi nội dung và bằng chứng hợp lệ.</Text></div>,
      okText: 'Xác nhận duyệt', cancelText: 'Hủy',
      onOk: () => runMutation(proof, () => approveClientProof(proof.id), 'Đã duyệt Proof thành công.'),
    })
  }

  function openReject(proof) { setMutationError(''); setRejecting(proof); form.resetFields() }
  async function submitReject() {
    const { reason } = await form.validateFields()
    const succeeded = await runMutation(rejecting, () => rejectClientProof(rejecting.id, reason), 'Đã từ chối Proof và mở lại vị trí của Job.').catch(() => false)
    if (succeeded) { setRejecting(null); form.resetFields() }
  }

  const filtered = useMemo(() => filter === 'ALL' ? proofs : proofs.filter((proof) => proof.status === filter), [filter, proofs])
  const count = (target) => proofs.filter((proof) => proof.status === target).length
  const approvedPayout = proofs.filter((proof) => proof.status === 'APPROVED' && Number.isFinite(proof.payoutAmount)).reduce((sum, proof) => sum + proof.payoutAmount, 0)

  return <>
    <header><Text type="secondary">QUẢN LÝ PROOF</Text><Title id="account-page-title">Duyệt Proof</Title><Paragraph>Kiểm tra bằng chứng và xử lý Proof thuộc các Job của bạn.</Paragraph></header>
    <div className={styles.summary} aria-label="Thống kê Proof"><Card><Statistic title="Chờ duyệt" value={status === 'loading' ? '—' : count('PENDING')} /></Card><Card><Statistic title="Đã duyệt" value={status === 'loading' ? '—' : count('APPROVED')} /></Card><Card><Statistic title="Đã từ chối" value={status === 'loading' ? '—' : count('REJECTED')} /></Card><Card><Statistic title="Payout đã duyệt" value={status === 'loading' ? '—' : money(approvedPayout, 'VND')} /></Card></div>
    <Flex className={styles.toolbar} justify="space-between" align="center" wrap gap="small"><Title level={2}>Danh sách Proof</Title><Select aria-label="Lọc Proof theo trạng thái" value={filter} onChange={setFilter} options={FILTERS} /></Flex>
    {error && <Alert type="error" showIcon title={error} action={<Button onClick={() => loadProofs()}>Thử lại</Button>} />}
    {status === 'loading' ? <div className={styles.proofList} role="status" aria-label="Đang tải danh sách Proof">{[1, 2, 3, 4].map((key) => <Card key={key}><Skeleton active /></Card>)}</div> : filtered.length === 0 ? <Card><Empty image={<FileImageOutlined aria-hidden="true" />} description={proofs.length ? 'Không có Proof phù hợp với bộ lọc.' : 'Chưa có Proof nào cần xử lý.'}>{proofs.length > 0 && <Button onClick={() => setFilter('ALL')}>Xóa bộ lọc</Button>}</Empty></Card> : <div className={styles.proofList}>{filtered.map((proof) => <ProofCard key={proof.id} proof={proof} processing={String(processingId) === String(proof.id)} onView={setSelected} onApprove={openApprove} onReject={openReject} />)}</div>}
    <ProofDetailDrawer proof={selected} processing={selected && String(processingId) === String(selected.id)} onClose={() => setSelected(null)} onApprove={openApprove} onReject={openReject} />
    <Modal title="Từ chối Proof" open={Boolean(rejecting)} onCancel={() => !processingId && setRejecting(null)} onOk={submitReject} okText="Xác nhận từ chối" cancelText="Hủy" okButtonProps={{ danger: true, loading: Boolean(processingId), disabled: Boolean(processingId) }} cancelButtonProps={{ disabled: Boolean(processingId) }} closable={!processingId} mask={{ closable: !processingId }}>
      {rejecting && <Paragraph>Job: <strong>{rejecting.job.title || `#${rejecting.job.id}`}</strong><br />Freelancer: <strong>{rejecting.freelancer.name}</strong></Paragraph>}
      {mutationError && <Alert type="error" showIcon title={mutationError} />}
      <Form form={form} layout="vertical"><Form.Item name="reason" label="Lý do từ chối" rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập lý do từ chối.' }, { max: 2000, message: 'Lý do không được vượt quá 2000 ký tự.' }]}><Input.TextArea rows={5} maxLength={2000} showCount placeholder="Mô tả rõ nội dung Freelancer cần kiểm tra hoặc thực hiện lại" /></Form.Item></Form>
    </Modal>
  </>
}
