import { Button } from 'antd'
import { CheckCircleOutlined, CheckOutlined, CloseOutlined, EyeOutlined, WarningOutlined } from '@ant-design/icons'
import { getAllowedWithdrawalActions } from '../model/adminWithdrawal.js'
import styles from './AdminWithdrawals.module.css'

const ACTION_BUTTONS = Object.freeze({
  approve: { label: 'Duyệt yêu cầu', shortLabel: 'Duyệt', icon: CheckOutlined, type: 'primary' },
  reject: { label: 'Từ chối', shortLabel: 'Từ chối', icon: CloseOutlined, danger: true },
  complete: { label: 'Xác nhận đã chuyển', shortLabel: 'Đã chuyển', icon: CheckCircleOutlined, type: 'primary' },
  fail: { label: 'Báo chuyển thất bại', shortLabel: 'Thất bại', icon: WarningOutlined, danger: true },
})

export function WithdrawalActionButtons({ withdrawal, busy, processingAction, compact = false, onView, onAction }) {
  const allowedActions = getAllowedWithdrawalActions(withdrawal.status)
  return (
    <div className={styles.actionButtons}>
      {onView && <Button icon={<EyeOutlined aria-hidden="true" />} disabled={busy} onClick={() => onView(withdrawal)}>Xem chi tiết</Button>}
      {allowedActions.map((action) => {
        const config = ACTION_BUTTONS[action]
        const Icon = config.icon
        return (
          <Button
            key={action}
            type={config.type}
            danger={config.danger}
            icon={<Icon aria-hidden="true" />}
            loading={processingAction === action}
            disabled={busy}
            onClick={() => onAction(action, withdrawal)}
          >
            {compact ? config.shortLabel : config.label}
          </Button>
        )
      })}
    </div>
  )
}
