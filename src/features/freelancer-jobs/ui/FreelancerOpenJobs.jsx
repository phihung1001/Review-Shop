import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Alert, App, Avatar, Button, Card, Drawer, Empty, Flex, Form, Image, Input, Modal, Radio, Select, Skeleton, Tag, Typography, Upload } from 'antd'
import { EnvironmentOutlined, EyeOutlined, GlobalOutlined, LinkOutlined, SearchOutlined, StarFilled, UploadOutlined, UserOutlined } from '@ant-design/icons'
import { cancelFreelancerAssignment, claimFreelancerJob, getEligibleGoogleMapsAccounts, getFreelancerAssignment, getFreelancerAssignments, getOpenFreelancerJobs, submitFreelancerProof } from '../api/freelancerJobApi.js'
import { uploadProofImages } from '../api/proofImageUploadApi.js'
import { ApiError } from '@/shared/api/httpClient.js'
import { authSession } from '@/features/auth/model/authSession.js'
import { navigate } from '@/shared/lib/navigation.js'
import { formatCurrency } from '@/shared/lib/formatCurrency.js'
import styles from './FreelancerOpenJobs.module.css'

const { Paragraph, Text, Title } = Typography
const accountTypeLabels = { VIETNAM: 'Việt Nam', FOREIGN: 'Nước ngoài' }

function money(value, currency) {
  if (!Number.isFinite(value)) return 'Không xác định'
  try { return formatCurrency(value, currency) } catch { return `${new Intl.NumberFormat('vi-VN').format(value)} ${currency || ''}`.trim() }
}

function slotText(job) {
  return job.availableSlots === null || job.totalSlots === null ? 'Không xác định' : `${job.availableSlots}/${job.totalSlots}`
}

function availableContentCount(job) {
  return job.reviewContents.filter((content) => content.available === true).length
}

function JobActions({ job, onView, onClaim }) {
  return <div className={styles.actions}>
    <Button icon={<EyeOutlined aria-hidden="true" />} onClick={() => onView(job)}>Xem chi tiết</Button>
    <Button type="primary" onClick={() => onClaim(job)}>Nhận Job</Button>
  </div>
}

function OpenJobCard({ job, onView, onClaim }) {
  return <article><Card className={styles.card}>
    <Flex justify="space-between" align="start" gap="small" wrap><Tag color="green">Đang mở</Tag>{job.requiredLevel.description && <Tag>{job.requiredLevel.description}</Tag>}</Flex>
    <Title level={3}>{job.title || `Job #${job.id}`}</Title>
    <Paragraph ellipsis={{ rows: 2 }}>{job.description || 'Job chưa có mô tả.'}</Paragraph>
    <div className={styles.meta}>
      <div><Text type="secondary">Payout/nhiệm vụ</Text><strong>{money(job.payoutPerTask, job.currency)}</strong></div>
      <div><Text type="secondary">Vị trí còn lại</Text><strong>{slotText(job)}</strong></div>
      <div><Text type="secondary">Rank yêu cầu</Text><strong>{job.requiredLevel.rank ?? 'Không xác định'}</strong></div>
      <div><Text type="secondary">Nội dung khả dụng</Text><strong>{availableContentCount(job)}</strong></div>
    </div>
    <JobActions job={job} onView={onView} onClaim={onClaim} />
  </Card></article>
}

function JobDetail({ job, onClose, onClaim }) {
  return <Drawer title="Chi tiết Job đang mở" open={Boolean(job)} onClose={onClose} size="large" destroyOnHidden>
    {job && <div className={styles.detail}>
      <section><Tag color="green">Đang mở</Tag><Title level={3}>{job.title || `Job #${job.id}`}</Title><Paragraph className={styles.detailText}>{job.description || 'Job chưa có mô tả.'}</Paragraph>{job.mapLink && <Button type="link" icon={<EnvironmentOutlined aria-hidden="true" />} href={job.mapLink} target="_blank" rel="noreferrer">Mở Google Maps</Button>}</section>
      <div className={styles.detailMeta}>
        <div><Text type="secondary">Required Level</Text><strong>{job.requiredLevel.description || 'Không xác định'}</strong></div>
        <div><Text type="secondary">Rank yêu cầu</Text><strong>{job.requiredLevel.rank ?? 'Không xác định'}</strong></div>
        <div><Text type="secondary">Giá Required Level</Text><strong>{money(job.requiredLevel.pricePerReview, job.currency)}</strong></div>
        <div><Text type="secondary">Payout Freelancer</Text><strong>{money(job.payoutPerTask, job.currency)}</strong></div>
        <div><Text type="secondary">Vị trí còn lại</Text><strong>{slotText(job)}</strong></div>
        <div><Text type="secondary">Nội dung khả dụng</Text><strong>{availableContentCount(job)}</strong></div>
      </div>
      <section><Title level={4}>Nội dung review</Title>{job.reviewContents.length === 0 ? <Empty description="Job chưa có nội dung review." /> : <div className={styles.reviewList}><Image.PreviewGroup>{job.reviewContents.map((item) => <Card size="small" key={`${job.id}-${item.index}`} title={`Nội dung ${item.index + 1}`} extra={<Tag color={item.available ? 'green' : 'default'}>{item.available ? 'Có thể nhận' : 'Đã có người nhận'}</Tag>}><Paragraph className={styles.detailText}>{item.content || 'Chưa có nội dung.'}</Paragraph>{item.images.length > 0 && <div className={styles.reviewImages}>{item.images.map((src, index) => <Image key={src} src={src} alt={`Ảnh nội dung review ${item.index + 1}-${index + 1}`} />)}</div>}</Card>)}</Image.PreviewGroup></div>}</section>
      <Alert type="info" showIcon title="Kiểm tra tài khoản trước khi nhận Job" description="Hệ thống sẽ hiển thị các tài khoản Google Maps đủ điều kiện về loại và cấp Local Guide." />
      <Button type="primary" onClick={() => onClaim(job)} block>Nhận Job</Button>
    </div>}
  </Drawer>
}

function AccountChoice({ account, selected }) {
  return <label className={`${styles.accountChoice} ${selected ? styles.accountChoiceSelected : ''}`}>
    <Radio value={String(account.id)} aria-label={`Chọn ${account.accountName || `tài khoản ${account.contributorId}`}`} />
    <Avatar size={48} src={account.thumbnail || undefined} icon={!account.thumbnail ? <UserOutlined aria-hidden="true" /> : undefined} />
    <div className={styles.accountIdentity}>
      <Text strong>{account.accountName || 'Tài khoản Google Maps'}</Text>
      <Flex gap="small" wrap><Text type="secondary"><GlobalOutlined aria-hidden="true" /> {accountTypeLabels[account.accountType] || 'Chưa xác định'}</Text><Text className={styles.accountLevel}><StarFilled aria-hidden="true" /> Cấp {account.localGuideLevel ?? '—'}</Text></Flex>
    </div>
  </label>
}

function AccountSelectionModal({ job, accounts, status, error, claimError, claiming, selectedAccountId, selectedContentIndex, onSelect, onSelectContent, onRetry, onClose, onConfirm }) {
  const hasSelection = Boolean(selectedAccountId)
  const hasReviewContents = Boolean(job?.reviewContents.length)
  const availableContents = job?.reviewContents.filter((content) => content.available) ?? []
  const canClaim = hasSelection && (!hasReviewContents || selectedContentIndex !== null)
  return <Modal title="Chọn tài khoản" open={Boolean(job)} onCancel={onClose} closable={!claiming} mask={{ closable: !claiming }} destroyOnHidden footer={<Flex justify="end" gap="small"><Button onClick={onClose} disabled={claiming}>Hủy</Button>{hasSelection && <Button type="primary" loading={claiming} disabled={!canClaim || claiming} onClick={onConfirm}>Vẫn nhận Job</Button>}</Flex>}>
    <Paragraph type="secondary">Chọn tài khoản Google Maps để nhận Job {job?.title ? `“${job.title}”` : 'này'}:</Paragraph>
    {claimError && <Alert className={styles.claimAlert} type="warning" showIcon title="Job vừa được cập nhật" description={claimError} />}
    {status === 'loading' && <div className={styles.accountChoices} role="status" aria-label="Đang kiểm tra tài khoản Google Maps đủ điều kiện">{[1, 2].map((key) => <Card size="small" key={key}><Skeleton active avatar paragraph={{ rows: 1 }} /></Card>)}</div>}
    {status === 'error' && <Alert type="error" showIcon title={error} action={<Button onClick={onRetry}>Thử lại</Button>} />}
    {status === 'success' && accounts.length === 0 && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có tài khoản Google Maps đủ điều kiện cho Job này."><Button href="/freelancer/google-maps-accounts">Quản lý tài khoản</Button></Empty>}
    {status === 'success' && accounts.length > 0 && <Radio.Group className={styles.accountChoices} value={selectedAccountId} onChange={(event) => onSelect(event.target.value)} aria-label="Tài khoản Google Maps đủ điều kiện">{accounts.map((account) => <AccountChoice key={account.id} account={account} selected={selectedAccountId === String(account.id)} />)}</Radio.Group>}
    {status === 'success' && hasSelection && hasReviewContents && <div className={styles.contentChoice}><Text strong>Chọn nội dung review</Text>{availableContents.length > 0 ? <Select value={selectedContentIndex} onChange={onSelectContent} placeholder="Chọn nội dung còn khả dụng" options={availableContents.map((content) => ({ value: content.index, label: `Nội dung ${content.index + 1}: ${content.content || 'Không có mô tả'}` }))} aria-label="Nội dung review" /> : <Alert type="warning" showIcon title="Không còn nội dung review khả dụng." />}</div>}
  </Modal>
}

function validHttpsUrl(value) {
  try { return new URL(String(value).trim()).protocol === 'https:' } catch { return false }
}

function AssignmentWorkModal({ assignmentId, assignment, status, error, actionError, submitting, cancelling, onRetry, onClose, onSubmit, onCancelAssignment }) {
  const busy = submitting || cancelling
  return <Modal title="Thực hiện Job" open={Boolean(assignmentId)} onCancel={onClose} closable={!busy} mask={{ closable: !busy }} destroyOnHidden footer={null} size="large">
    {status === 'loading' && <div role="status" aria-label="Đang tải nội dung Assignment"><Skeleton active paragraph={{ rows: 6 }} /></div>}
    {status === 'error' && <Alert type="error" showIcon title={error} action={<Button onClick={onRetry}>Thử lại</Button>} />}
    {status === 'success' && assignment && <div className={styles.assignmentWork}>
      <section><Flex justify="space-between" align="start" gap="small" wrap><Title level={3}>{assignment.jobTitle || `Job #${assignment.jobId}`}</Title><Tag color="blue">{assignment.status}</Tag></Flex><Paragraph className={styles.detailText}>{assignment.jobDescription || 'Job chưa có mô tả.'}</Paragraph></section>
      <div className={styles.assignmentMeta}><div><Text type="secondary">Payout</Text><strong>{money(assignment.payoutPerTask, 'VND')}</strong></div><div><Text type="secondary">Tài khoản Google Maps</Text><strong>{assignment.googleMapsAccountName || `#${assignment.googleMapsAccountId}`}</strong></div></div>
      {assignment.mapLink && <Button href={assignment.mapLink} target="_blank" rel="noreferrer" icon={<EnvironmentOutlined aria-hidden="true" />}>Mở địa điểm trên Google Maps</Button>}
      {assignment.reviewContent && <Card size="small" title="Nội dung review"><Paragraph className={styles.detailText} copyable>{assignment.reviewContent}</Paragraph>{assignment.reviewContentImages.length > 0 && <Image.PreviewGroup><div className={styles.reviewImages}>{assignment.reviewContentImages.map((src, index) => <Image key={src} src={src} alt={`Ảnh nội dung review ${index + 1}`} />)}</div></Image.PreviewGroup>}</Card>}
      {actionError && <Alert type="error" showIcon title="Không thể hoàn tất thao tác" description={actionError} />}
      <Form layout="vertical" onFinish={onSubmit} disabled={busy}>
        <Form.Item name="shareLink" label="URL bài đánh giá (không bắt buộc)" extra="Bỏ trống nếu bạn chỉ muốn gửi ảnh bằng chứng." rules={[{ validator: (_, value) => !value?.trim() || validHttpsUrl(value) ? Promise.resolve() : Promise.reject(new Error('URL bài đánh giá phải là URL HTTPS hợp lệ.')) }]}><Input allowClear prefix={<LinkOutlined aria-hidden="true" />} placeholder="https://www.google.com/maps/contrib/example/reviews" /></Form.Item>
        <Form.Item
          name="proofFiles"
          label="Ảnh bằng chứng"
          valuePropName="fileList"
          getValueFromEvent={(event) => Array.isArray(event) ? event : event?.fileList}
          extra="Chọn từ 1 đến 10 ảnh rõ nội dung review. Hỗ trợ thư viện ảnh trên máy tính và điện thoại."
          rules={[{ validator: (_, files) => {
            if (!Array.isArray(files) || files.length === 0) return Promise.reject(new Error('Vui lòng chọn ít nhất một ảnh Proof.'))
            if (files.length > 10) return Promise.reject(new Error('Chỉ được chọn tối đa 10 ảnh Proof.'))
            if (files.some((item) => !item.originFileObj?.type?.startsWith('image/') || item.originFileObj.size <= 0)) return Promise.reject(new Error('Danh sách có file không phải là ảnh hợp lệ.'))
            return Promise.resolve()
          } }]}
        >
          <Upload
            accept="image/*"
            multiple
            maxCount={10}
            listType="picture"
            beforeUpload={() => false}
          >
            <Button icon={<UploadOutlined aria-hidden="true" />} disabled={busy}>Chọn ảnh từ thiết bị</Button>
          </Upload>
        </Form.Item>
        <Flex className={styles.proofActions} justify="end" gap="small" wrap><Button onClick={onClose} disabled={busy}>Hoàn thành sau</Button>{assignment.status === 'CLAIMED' && <Button danger loading={cancelling} disabled={busy} onClick={onCancelAssignment}>Hủy Job</Button>}<Button type="primary" htmlType="submit" loading={submitting} disabled={busy}>Nộp Proof</Button></Flex>
      </Form>
    </div>}
  </Modal>
}

export function FreelancerOpenJobs() {
  const { message, modal } = App.useApp()
  const [jobs, setJobs] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [level, setLevel] = useState('ALL')
  const [availability, setAvailability] = useState('ALL')
  const [selected, setSelected] = useState(null)
  const [claimJob, setClaimJob] = useState(null)
  const [eligibleAccounts, setEligibleAccounts] = useState([])
  const [eligibilityStatus, setEligibilityStatus] = useState('idle')
  const [eligibilityError, setEligibilityError] = useState('')
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [selectedContentIndex, setSelectedContentIndex] = useState(null)
  const [claiming, setClaiming] = useState(false)
  const [claimError, setClaimError] = useState('')
  const [assignmentId, setAssignmentId] = useState(null)
  const [assignment, setAssignment] = useState(null)
  const [assignmentStatus, setAssignmentStatus] = useState('idle')
  const [assignmentError, setAssignmentError] = useState('')
  const [proofSubmitting, setProofSubmitting] = useState(false)
  const [proofError, setProofError] = useState('')
  const [cancellingAssignment, setCancellingAssignment] = useState(false)
  const eligibilityRequest = useRef(0)

  const refreshOpenJobs = useCallback(async () => {
    setStatus('loading'); setError('')
    try { const loadedJobs = await getOpenFreelancerJobs(); setJobs(loadedJobs); setStatus('success'); return loadedJobs }
    catch (requestError) {
      setJobs([])
      if (requestError instanceof ApiError && requestError.status === 401) { authSession.clear(); navigate('/login?redirect=%2Ffreelancer%2Fdashboard', { replace: true }); return }
      setError(requestError instanceof ApiError ? requestError.message : 'Không thể tải danh sách Job đang mở.')
      setStatus('error'); return null
    }
  }, [])
  useEffect(() => { queueMicrotask(refreshOpenJobs) }, [refreshOpenJobs])

  const levelOptions = useMemo(() => [{ value: 'ALL', label: 'Tất cả level' }, ...Array.from(new Map(jobs.filter((job) => job.requiredLevel.id !== null).map((job) => [String(job.requiredLevel.id), { value: String(job.requiredLevel.id), label: job.requiredLevel.description || `Level ${job.requiredLevel.id}` }])).values())], [jobs])
  const filtered = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase('vi')
    return jobs.filter((job) => {
      const matchesQuery = !keyword || `${job.title} ${job.description} ${job.requiredLevel.description}`.toLocaleLowerCase('vi').includes(keyword)
      const matchesLevel = level === 'ALL' || String(job.requiredLevel.id) === level
      const matchesAvailability = availability === 'ALL' || (availability === 'CONTENT' ? availableContentCount(job) > 0 : (job.availableSlots ?? 0) > 1)
      return matchesQuery && matchesLevel && matchesAvailability
    })
  }, [availability, jobs, level, query])
  const filteredOut = jobs.length > 0 && filtered.length === 0
  function clearFilters() { setQuery(''); setLevel('ALL'); setAvailability('ALL') }

  const loadEligibleAccounts = useCallback(async (job) => {
    const requestId = ++eligibilityRequest.current
    setEligibilityStatus('loading'); setEligibilityError(''); setEligibleAccounts([]); setSelectedAccountId(''); setSelectedContentIndex(null)
    try {
      const accounts = await getEligibleGoogleMapsAccounts(job.id)
      if (requestId !== eligibilityRequest.current) return
      setEligibleAccounts(accounts); setEligibilityStatus('success')
    } catch (requestError) {
      if (requestId !== eligibilityRequest.current) return
      if (requestError instanceof ApiError && requestError.status === 401) { authSession.clear(); navigate('/login?redirect=%2Ffreelancer%2Fdashboard', { replace: true }); return }
      setEligibilityError(requestError instanceof ApiError ? requestError.message : 'Không thể kiểm tra tài khoản Google Maps đủ điều kiện.'); setEligibilityStatus('error')
    }
  }, [])
  function openAccountSelection(job) { setSelected(null); setClaimError(''); setClaimJob(job); loadEligibleAccounts(job) }
  function resetAccountSelection() { eligibilityRequest.current += 1; setClaimJob(null); setEligibleAccounts([]); setEligibilityStatus('idle'); setEligibilityError(''); setSelectedAccountId(''); setSelectedContentIndex(null); setClaimError('') }
  function closeAccountSelection() { if (!claiming) resetAccountSelection() }
  const loadAssignment = useCallback(async (id) => {
    setAssignmentStatus('loading'); setAssignmentError(''); setAssignment(null)
    try { setAssignment(await getFreelancerAssignment(id)); setAssignmentStatus('success') }
    catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) { authSession.clear(); navigate('/login?redirect=%2Ffreelancer%2Fdashboard', { replace: true }); return }
      setAssignmentError(requestError instanceof ApiError ? requestError.message : 'Không thể tải nội dung Assignment.'); setAssignmentStatus('error')
    }
  }, [])
  function resetAssignment() { setAssignmentId(null); setAssignment(null); setAssignmentStatus('idle'); setAssignmentError(''); setProofError('') }
  function closeAssignment() { if (!proofSubmitting && !cancellingAssignment) resetAssignment() }
  async function submitProof(values) {
    if (!assignment) return
    setProofSubmitting(true); setProofError('')
    try {
      const proofImages = await uploadProofImages(values.proofFiles.map((item) => item.originFileObj))
      await submitFreelancerProof(assignment.jobId, { assignmentId: assignment.id, shareLink: values.shareLink?.trim(), proofImages })
      resetAssignment(); message.success('Nộp Proof thành công. Proof đang chờ Client duyệt.'); await refreshOpenJobs()
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) { authSession.clear(); navigate('/login?redirect=%2Ffreelancer%2Fdashboard', { replace: true }); return }
      setProofError(requestError instanceof ApiError ? requestError.message : 'Không thể nộp Proof lúc này.')
    } finally { setProofSubmitting(false) }
  }
  function requestCancelAssignment() {
    if (!assignment || assignment.status !== 'CLAIMED') return
    modal.confirm({
      title: 'Hủy Job đã nhận?',
      content: 'Slot và nội dung review sẽ được mở lại cho Freelancer khác. Thao tác này không thể hoàn tác.',
      okText: 'Hủy Job',
      cancelText: 'Giữ Job',
      okButtonProps: { danger: true },
      async onOk() {
        setCancellingAssignment(true); setProofError('')
        try {
          await cancelFreelancerAssignment(assignment.id)
          resetAssignment(); message.success('Đã hủy Job. Slot và nội dung review đã được mở lại.')
          await Promise.allSettled([getFreelancerAssignments(), refreshOpenJobs()])
        } catch (requestError) {
          if (requestError instanceof ApiError && requestError.status === 401) { authSession.clear(); navigate('/login?redirect=%2Ffreelancer%2Fdashboard', { replace: true }); return }
          setProofError(requestError instanceof ApiError ? requestError.message : 'Không thể hủy Job lúc này.')
          if (requestError instanceof ApiError && requestError.status === 409) await loadAssignment(assignment.id)
        } finally { setCancellingAssignment(false) }
      },
    })
  }
  async function confirmClaim() {
    if (!claimJob || !selectedAccountId || (claimJob.reviewContents.length > 0 && selectedContentIndex === null)) return
    setClaiming(true); setClaimError('')
    try {
      const assignment = await claimFreelancerJob(claimJob.id, { googleMapsAccountId: Number(selectedAccountId), reviewContentIndex: selectedContentIndex })
      if (assignment.id === null || assignment.id === undefined || !String(assignment.id).trim()) throw new Error('API claim không trả về Assignment ID.')
      resetAccountSelection()
      setAssignmentId(assignment.id); setAssignment(assignment); setAssignmentStatus('success'); setAssignmentError(''); setProofError('')
      message.success('Nhận Job thành công. Hãy hoàn thành nội dung và nộp Proof trước khi Assignment hết hạn.')
      await refreshOpenJobs()
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) { authSession.clear(); navigate('/login?redirect=%2Ffreelancer%2Fdashboard', { replace: true }); return }
      if (requestError instanceof ApiError && requestError.status === 409) {
        const refreshedJobs = await refreshOpenJobs()
        const refreshedJob = refreshedJobs?.find((job) => String(job.id) === String(claimJob.id))
        if (refreshedJob) {
          setClaimJob(refreshedJob); setSelectedContentIndex(null)
          setClaimError(`${requestError.message} Vui lòng chọn lại nội dung còn khả dụng; hệ thống sẽ không tự động gửi lại.`)
        } else {
          resetAccountSelection(); message.warning('Job vừa được người khác nhận hoặc không còn khả dụng.')
        }
        return
      }
      setClaimError(requestError instanceof ApiError ? requestError.message : 'Không thể nhận Job lúc này. Vui lòng thử lại.')
    } finally { setClaiming(false) }
  }

  return <>
    <header className={styles.heading}><Text className={styles.eyebrow}>KHÔNG GIAN LÀM VIỆC</Text><Title id="account-page-title">Job đang mở</Title><Paragraph>Khám phá các Job còn vị trí và phù hợp với điều kiện tài khoản của bạn.</Paragraph></header>
    <Alert type="info" showIcon title="Chọn tài khoản Google Maps phù hợp" description="Khi nhận Job, hệ thống sẽ kiểm tra và hiển thị các tài khoản đủ điều kiện để bạn lựa chọn." />
    <Card className={styles.toolbar}><Input allowClear prefix={<SearchOutlined aria-hidden="true" />} aria-label="Tìm kiếm Job đang mở" placeholder="Tìm theo tên, mô tả hoặc Required Level" value={query} onChange={(event) => setQuery(event.target.value)} /><Flex gap="small" wrap><Select aria-label="Lọc theo Required Level" value={level} onChange={setLevel} options={levelOptions} /><Select aria-label="Lọc theo khả dụng" value={availability} onChange={setAvailability} options={[{ value: 'ALL', label: 'Tất cả khả dụng' }, { value: 'CONTENT', label: 'Còn nội dung review' }, { value: 'MULTIPLE_SLOTS', label: 'Còn nhiều hơn một vị trí' }]} /></Flex></Card>
    <Flex className={styles.listHeading} justify="space-between" align="center" wrap gap="small"><Title level={2}>Danh sách Job</Title>{status !== 'loading' && <Text type="secondary">{filtered.length} Job</Text>}</Flex>
    {error && <Alert type="error" showIcon title={error} action={<Button onClick={refreshOpenJobs}>Thử lại</Button>} />}
    {status === 'loading' ? <div className={styles.grid} role="status" aria-label="Đang tải Job đang mở">{[1, 2, 3, 4].map((key) => <Card key={key}><Skeleton active /></Card>)}</div> : filtered.length === 0 ? <Card><Empty description={filteredOut ? 'Không tìm thấy Job phù hợp.' : 'Hiện chưa có Job nào đang mở.'}>{filteredOut && <Button onClick={clearFilters}>Xóa bộ lọc</Button>}</Empty></Card> : <div className={styles.grid} aria-live="polite">{filtered.map((job) => <OpenJobCard key={job.id} job={job} onView={setSelected} onClaim={openAccountSelection} />)}</div>}
    <JobDetail job={selected} onClose={() => setSelected(null)} onClaim={openAccountSelection} />
    <AccountSelectionModal job={claimJob} accounts={eligibleAccounts} status={eligibilityStatus} error={eligibilityError} claimError={claimError} claiming={claiming} selectedAccountId={selectedAccountId} selectedContentIndex={selectedContentIndex} onSelect={setSelectedAccountId} onSelectContent={setSelectedContentIndex} onRetry={() => loadEligibleAccounts(claimJob)} onClose={closeAccountSelection} onConfirm={confirmClaim} />
    <AssignmentWorkModal assignmentId={assignmentId} assignment={assignment} status={assignmentStatus} error={assignmentError} actionError={proofError} submitting={proofSubmitting} cancelling={cancellingAssignment} onRetry={() => loadAssignment(assignmentId)} onClose={closeAssignment} onSubmit={submitProof} onCancelAssignment={requestCancelAssignment} />
  </>
}
