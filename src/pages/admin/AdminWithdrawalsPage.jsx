import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Alert, App, Button, Card, Empty, Pagination, Select, Skeleton, Table, Typography } from 'antd'
import { BankOutlined, ReloadOutlined } from '@ant-design/icons'
import {
  approveAdminWithdrawal,
  completeAdminWithdrawal,
  failAdminWithdrawal,
  getAdminWithdrawal,
  getAdminWithdrawals,
  rejectAdminWithdrawal,
} from '@/features/withdrawals/api/adminWithdrawalApi.js'
import { formatWithdrawalDate, formatWithdrawalMoney } from '@/features/withdrawals/lib/adminWithdrawalFormat.js'
import { isWithdrawalStatus, WITHDRAWAL_STATUS_OPTIONS } from '@/features/withdrawals/model/adminWithdrawal.js'
import { AdminWithdrawalDetailDrawer } from '@/features/withdrawals/ui/AdminWithdrawalDetailDrawer.jsx'
import { WithdrawalActionButtons } from '@/features/withdrawals/ui/WithdrawalActionButtons.jsx'
import { WithdrawalActionModal } from '@/features/withdrawals/ui/WithdrawalActionModal.jsx'
import { WithdrawalStatusTag } from '@/features/withdrawals/ui/WithdrawalStatusTag.jsx'
import { handleExpiredAdminSession } from '@/features/admin/lib/adminErrors.js'
import { ApiError } from '@/shared/api/httpClient.js'
import styles from '@/features/withdrawals/ui/AdminWithdrawals.module.css'

const { Paragraph, Text, Title } = Typography
const PAGE_PATH = '/admin/withdrawals'
const MUTATIONS = Object.freeze({
  approve: approveAdminWithdrawal,
  reject: rejectAdminWithdrawal,
  complete: completeAdminWithdrawal,
  fail: failAdminWithdrawal,
})
const SUCCESS_MESSAGES = Object.freeze({
  approve: 'Đã duyệt yêu cầu. Yêu cầu đang chờ chuyển khoản.',
  reject: 'Đã từ chối yêu cầu rút tiền.',
  complete: 'Đã xác nhận chuyển khoản thành công.',
  fail: 'Đã ghi nhận giao dịch chuyển khoản thất bại.',
})

function initialStatus() {
  const status = new URLSearchParams(window.location.search).get('status')?.toUpperCase()
  return isWithdrawalStatus(status) ? status : 'PENDING'
}

function requestLabel(withdrawal) {
  return withdrawal.code || `#${withdrawal.id}`
}

function errorMessage(error, fallback) {
  if (!(error instanceof ApiError)) return fallback
  if (error.status === 403) return 'Bạn không có quyền thực hiện thao tác này.'
  if (error.status === 404) return 'Yêu cầu rút tiền không còn tồn tại.'
  if (error.status === 409) return 'Yêu cầu đã được Admin khác xử lý hoặc không còn ở trạng thái hợp lệ.'
  return error.message || fallback
}

function WithdrawalMobileCard({ withdrawal, busy, processingAction, onView, onAction }) {
  return (
    <article>
      <Card className={styles.withdrawalCard}>
        <div className={styles.cardHeader}>
          <div><Text type="secondary">Mã yêu cầu</Text><strong>{requestLabel(withdrawal)}</strong></div>
          <WithdrawalStatusTag status={withdrawal.status} />
        </div>
        <div className={styles.freelancerIdentity}>
          <strong>{withdrawal.freelancer.name}</strong>
          <Text type="secondary">{withdrawal.freelancer.email || `Freelancer #${withdrawal.freelancer.id ?? '—'}`}</Text>
        </div>
        <dl className={styles.cardMeta}>
          <div><dt>Số tiền yêu cầu</dt><dd>{formatWithdrawalMoney(withdrawal.amount, withdrawal.currency)}</dd></div>
          <div><dt>Phí</dt><dd>{formatWithdrawalMoney(withdrawal.feeAmount, withdrawal.currency)}</dd></div>
          <div className={styles.cardNetAmount}><dt>Thực chuyển</dt><dd>{formatWithdrawalMoney(withdrawal.netAmount, withdrawal.currency)}</dd></div>
          <div><dt>Ngân hàng</dt><dd>{withdrawal.bank.name || withdrawal.bank.code || 'Chưa có thông tin'}</dd></div>
          <div><dt>Thời gian tạo</dt><dd>{formatWithdrawalDate(withdrawal.createdAt)}</dd></div>
        </dl>
        <WithdrawalActionButtons {...{ withdrawal, busy, processingAction, onView, onAction }} />
      </Card>
    </article>
  )
}

export function AdminWithdrawalsPage() {
  const { message } = App.useApp()
  const [filter, setFilter] = useState(initialStatus)
  const [withdrawals, setWithdrawals] = useState([])
  const [listStatus, setListStatus] = useState('loading')
  const [listError, setListError] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selectedId, setSelectedId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailStatus, setDetailStatus] = useState('idle')
  const [detailError, setDetailError] = useState('')
  const [action, setAction] = useState(null)
  const [actionTarget, setActionTarget] = useState(null)
  const [mutationError, setMutationError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const mutationLock = useRef(false)
  const listRequest = useRef(0)
  const detailRequest = useRef(0)

  const loadList = useCallback(async ({ preserve = false } = {}) => {
    const requestId = ++listRequest.current
    if (preserve) setRefreshing(true)
    else setListStatus('loading')
    setListError('')
    try {
      const next = await getAdminWithdrawals(filter)
      if (requestId !== listRequest.current) return false
      setWithdrawals(next)
      setPage((current) => Math.min(current, Math.max(1, Math.ceil(next.length / pageSize))))
      setListStatus('success')
      return true
    } catch (requestError) {
      if (requestId !== listRequest.current) return false
      if (handleExpiredAdminSession(requestError, PAGE_PATH)) return false
      setListError(errorMessage(requestError, 'Không thể tải danh sách yêu cầu rút tiền. Vui lòng thử lại.'))
      if (!preserve) setListStatus('error')
      return false
    } finally {
      if (requestId === listRequest.current) setRefreshing(false)
    }
  }, [filter, pageSize])

  const loadDetail = useCallback(async (withdrawalId) => {
    const requestId = ++detailRequest.current
    setDetailStatus('loading')
    setDetailError('')
    try {
      const next = await getAdminWithdrawal(withdrawalId)
      if (requestId !== detailRequest.current) return false
      setDetail(next)
      setDetailStatus('success')
      return true
    } catch (requestError) {
      if (requestId !== detailRequest.current) return false
      if (handleExpiredAdminSession(requestError, PAGE_PATH)) return false
      setDetail(null)
      setDetailError(errorMessage(requestError, 'Không thể tải chi tiết yêu cầu. Vui lòng thử lại.'))
      setDetailStatus('error')
      return false
    }
  }, [])

  useEffect(() => { queueMicrotask(() => loadList()) }, [loadList])

  function changeFilter(value) {
    setFilter(value)
    setPage(1)
    const url = new URL(window.location.href)
    url.searchParams.set('status', value)
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
  }

  function openDetail(withdrawal) {
    setSelectedId(withdrawal.id)
    setDetail(null)
    loadDetail(withdrawal.id)
  }

  function closeDetail() {
    if (submitting) return
    detailRequest.current += 1
    setSelectedId(null)
    setDetail(null)
    setDetailStatus('idle')
    setDetailError('')
  }

  function openAction(nextAction, withdrawal) {
    setAction(nextAction)
    setActionTarget(withdrawal)
    setMutationError('')
  }

  function closeAction() {
    if (submitting) return
    setAction(null)
    setActionTarget(null)
    setMutationError('')
  }

  async function refreshCurrentData(targetId) {
    const results = await Promise.all([
      loadList({ preserve: true }),
      selectedId !== null && String(selectedId) === String(targetId) ? loadDetail(targetId) : Promise.resolve(true),
    ])
    if (results.some((succeeded) => !succeeded)) {
      message.warning('Yêu cầu đã được xử lý nhưng một số dữ liệu chưa đồng bộ. Hãy tải lại sau.')
    }
  }

  async function submitAction(payload) {
    if (mutationLock.current || !action || !actionTarget) return
    mutationLock.current = true
    setSubmitting(true)
    setMutationError('')
    const currentAction = action
    const targetId = actionTarget.id
    try {
      await MUTATIONS[currentAction](targetId, payload)
      message.success(SUCCESS_MESSAGES[currentAction])
      setAction(null)
      setActionTarget(null)
      await refreshCurrentData(targetId)
    } catch (requestError) {
      if (handleExpiredAdminSession(requestError, PAGE_PATH)) {
        setAction(null)
        setActionTarget(null)
        return
      }
      const text = errorMessage(requestError, 'Không thể xử lý yêu cầu rút tiền. Vui lòng thử lại.')
      setMutationError(text)
      if (requestError instanceof ApiError && [404, 409].includes(requestError.status)) {
        message.warning('Dữ liệu yêu cầu đã thay đổi. Hệ thống đang tải lại thông tin mới nhất.')
        await refreshCurrentData(targetId)
        setAction(null)
        setActionTarget(null)
        return
      }
      throw requestError
    } finally {
      mutationLock.current = false
      setSubmitting(false)
    }
  }

  async function copyValue(value, label) {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(String(value))
      message.success(`Đã sao chép ${label.toLowerCase()}.`)
    } catch {
      message.error(`Không thể sao chép ${label.toLowerCase()}. Vui lòng sao chép thủ công.`)
    }
  }

  const pagedWithdrawals = useMemo(() => withdrawals.slice((page - 1) * pageSize, page * pageSize), [page, pageSize, withdrawals])
  const columns = [
    { title: 'Mã yêu cầu', key: 'code', width: 140, fixed: 'left', render: (_, item) => requestLabel(item) },
    { title: 'Freelancer', key: 'freelancer', width: 210, render: (_, item) => <div className={styles.freelancerIdentity}><strong>{item.freelancer.name}</strong><Text type="secondary">{item.freelancer.email || `#${item.freelancer.id ?? '—'}`}</Text></div> },
    { title: 'Số tiền yêu cầu', dataIndex: 'amount', width: 160, align: 'right', render: (value, item) => formatWithdrawalMoney(value, item.currency) },
    { title: 'Phí', dataIndex: 'feeAmount', width: 140, align: 'right', render: (value, item) => formatWithdrawalMoney(value, item.currency) },
    { title: 'Thực chuyển', dataIndex: 'netAmount', width: 160, align: 'right', render: (value, item) => <Text strong>{formatWithdrawalMoney(value, item.currency)}</Text> },
    { title: 'Ngân hàng', key: 'bank', width: 180, render: (_, item) => item.bank.name || item.bank.code || 'Chưa có thông tin' },
    { title: 'Trạng thái', dataIndex: 'status', width: 140, render: (value) => <WithdrawalStatusTag status={value} /> },
    { title: 'Thời gian tạo', dataIndex: 'createdAt', width: 190, render: formatWithdrawalDate },
    {
      title: 'Thao tác', key: 'actions', width: 360, fixed: 'right',
      render: (_, item) => <WithdrawalActionButtons withdrawal={item} compact busy={submitting} processingAction={submitting && String(actionTarget?.id) === String(item.id) ? action : null} onView={openDetail} onAction={openAction} />,
    },
  ]

  const emptyDescription = `Không có yêu cầu ở trạng thái “${WITHDRAWAL_STATUS_OPTIONS.find((option) => option.value === filter)?.label}”.`

  return (
    <section className={styles.page} aria-labelledby="admin-withdrawals-title">
      <div className={styles.pageHeader}>
        <div>
          <Text type="secondary">QUẢN LÝ TÀI CHÍNH</Text>
          <Title id="admin-withdrawals-title" level={1}>Yêu cầu rút tiền</Title>
          <Paragraph>Kiểm tra thông tin nhận tiền và ghi nhận kết quả chuyển khoản cho Freelancer.</Paragraph>
        </div>
        <Button icon={<ReloadOutlined aria-hidden="true" />} loading={refreshing} disabled={listStatus === 'loading'} onClick={() => loadList({ preserve: listStatus === 'success' })}>Làm mới</Button>
      </div>

      <div className={styles.toolbar}>
        <label htmlFor="withdrawal-status-filter">Lọc theo trạng thái</label>
        <Select id="withdrawal-status-filter" value={filter} onChange={changeFilter} options={WITHDRAWAL_STATUS_OPTIONS} aria-label="Lọc yêu cầu rút tiền theo trạng thái" />
      </div>

      {listError && <Alert className={styles.listAlert} type="error" showIcon message="Không thể tải danh sách" description={listError} action={<Button onClick={() => loadList()}>Thử lại</Button>} />}

      <div className={styles.desktopTable}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={withdrawals}
          loading={listStatus === 'loading' || refreshing}
          scroll={{ x: 1680 }}
          locale={{ emptyText: emptyDescription }}
          pagination={{
            current: page,
            pageSize,
            total: withdrawals.length,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50],
            showTotal: (total) => `${total} yêu cầu`,
            onChange: (nextPage, nextSize) => { setPage(nextPage); setPageSize(nextSize) },
          }}
        />
      </div>

      <div className={styles.mobileList}>
        {listStatus === 'loading'
          ? <div role="status" aria-label="Đang tải danh sách yêu cầu" className={styles.skeletonList}>{[1, 2, 3].map((key) => <Card key={key}><Skeleton active /></Card>)}</div>
          : withdrawals.length === 0
            ? <Card><Empty image={<BankOutlined aria-hidden="true" />} description={emptyDescription} /></Card>
            : <>
              <div className={styles.cardList}>{pagedWithdrawals.map((item) => <WithdrawalMobileCard key={item.id} withdrawal={item} busy={submitting} processingAction={submitting && String(actionTarget?.id) === String(item.id) ? action : null} onView={openDetail} onAction={openAction} />)}</div>
              {withdrawals.length > pageSize && <Pagination simple current={page} pageSize={pageSize} total={withdrawals.length} showSizeChanger={false} onChange={setPage} aria-label="Phân trang yêu cầu rút tiền" />}
            </>}
      </div>

      <AdminWithdrawalDetailDrawer
        open={selectedId !== null}
        withdrawal={detail}
        status={detailStatus}
        error={detailError}
        busy={submitting}
        processingAction={submitting && String(actionTarget?.id) === String(detail?.id) ? action : null}
        onClose={closeDetail}
        onRetry={() => loadDetail(selectedId)}
        onAction={openAction}
        onCopy={copyValue}
      />
      <WithdrawalActionModal action={action} withdrawal={actionTarget} submitting={submitting} error={mutationError} onCancel={closeAction} onSubmit={submitAction} />
    </section>
  )
}
