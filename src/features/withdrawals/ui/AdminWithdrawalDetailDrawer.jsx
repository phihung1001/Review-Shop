import { Alert, Button, Card, Descriptions, Drawer, Skeleton, Typography } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import { formatWithdrawalDate, formatWithdrawalMoney } from '../lib/adminWithdrawalFormat.js'
import { BankAccountDetails } from './BankAccountDetails.jsx'
import { WithdrawalActionButtons } from './WithdrawalActionButtons.jsx'
import { WithdrawalAmountSummary } from './WithdrawalAmountSummary.jsx'
import { WithdrawalStatusTag } from './WithdrawalStatusTag.jsx'
import styles from './AdminWithdrawals.module.css'

const { Paragraph, Text, Title } = Typography

function DetailContent({ withdrawal, busy, processingAction, onAction, onCopy }) {
  const requestItems = [
    { key: 'id', label: 'Mã yêu cầu', children: withdrawal.code || `#${withdrawal.id}` },
    { key: 'freelancer', label: 'Freelancer', children: <div><strong>{withdrawal.freelancer.name}</strong>{withdrawal.freelancer.email && <><br /><Text type="secondary">{withdrawal.freelancer.email}</Text></>}</div> },
    { key: 'created', label: 'Thời gian tạo', children: formatWithdrawalDate(withdrawal.createdAt) },
    { key: 'updated', label: 'Cập nhật gần nhất', children: formatWithdrawalDate(withdrawal.updatedAt) },
    { key: 'status', label: 'Trạng thái', children: <WithdrawalStatusTag status={withdrawal.status} /> },
  ]
  const historyItems = [
    ...(withdrawal.provider ? [{ key: 'provider', label: 'Phương thức', children: withdrawal.provider }] : []),
    ...(withdrawal.providerReference ? [{ key: 'reference', label: 'Mã giao dịch', children: withdrawal.providerReference }] : []),
    ...(withdrawal.adminNote ? [{ key: 'note', label: 'Ghi chú Admin', children: withdrawal.adminNote }] : []),
    ...(withdrawal.reason ? [{ key: 'reason', label: 'Lý do', children: withdrawal.reason }] : []),
  ]

  return (
    <div className={styles.drawerContent}>
      <section aria-labelledby="withdrawal-request-title">
        <Title id="withdrawal-request-title" level={4}>Thông tin yêu cầu</Title>
        <Descriptions bordered size="small" column={1} items={requestItems} />
      </section>
      <WithdrawalAmountSummary withdrawal={withdrawal} />
      {withdrawal.status === 'PROCESSING' && <Alert
        type="warning"
        showIcon
        message="Yêu cầu đang chờ chuyển khoản"
        description={<>Chuyển chính xác <strong>{formatWithdrawalMoney(withdrawal.netAmount, withdrawal.currency)}</strong> đến tài khoản đã xác minh, sau đó ghi nhận kết quả giao dịch.</>}
      />}
      <BankAccountDetails withdrawal={withdrawal} onCopy={onCopy} />
      <Card size="small" title="Trạng thái xử lý">
        {historyItems.length
          ? <Descriptions size="small" column={1} items={historyItems} />
          : <Paragraph type="secondary">Chưa có ghi chú hoặc thông tin giao dịch.</Paragraph>}
      </Card>
      <section aria-labelledby="withdrawal-actions-title">
        <Title id="withdrawal-actions-title" level={4}>Thao tác</Title>
        {['PENDING', 'PROCESSING'].includes(withdrawal.status)
          ? <WithdrawalActionButtons withdrawal={withdrawal} busy={busy} processingAction={processingAction} onAction={onAction} />
          : <Alert type="info" showIcon message="Yêu cầu đã được xử lý" description="Thông tin hiện ở chế độ chỉ đọc và không còn hành động khả dụng." />}
      </section>
    </div>
  )
}

export function AdminWithdrawalDetailDrawer({ open, withdrawal, status, error, busy, processingAction, onClose, onRetry, onAction, onCopy }) {
  return (
    <Drawer
      title="Chi tiết yêu cầu rút tiền"
      open={open}
      onClose={onClose}
      size="min(42rem, 100vw)"
      extra={withdrawal ? <WithdrawalStatusTag status={withdrawal.status} /> : null}
      closable={!busy}
      keyboard={!busy}
      mask={{ closable: !busy }}
      destroyOnHidden
    >
      {status === 'loading' && <div role="status" aria-label="Đang tải chi tiết yêu cầu"><Skeleton active paragraph={{ rows: 12 }} /></div>}
      {status === 'error' && <Alert type="error" showIcon message="Không thể tải chi tiết yêu cầu" description={error} action={<Button icon={<ReloadOutlined aria-hidden="true" />} onClick={onRetry}>Thử lại</Button>} />}
      {status === 'success' && withdrawal && <DetailContent {...{ withdrawal, busy, processingAction, onAction, onCopy }} />}
    </Drawer>
  )
}
