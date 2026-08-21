import { Button, Skeleton, Tooltip } from 'antd'
import { LockOutlined, WalletOutlined } from '@ant-design/icons'
import { formatCurrency } from '@/shared/lib/formatCurrency.js'
import styles from './AccountBalanceSummary.module.css'

function BalanceItem({ label, description, value, currency, icon: Icon }) {
  return <Tooltip title={description}><div className={styles.balanceItem} aria-label={`${label}: ${formatCurrency(value, currency)}`}><Icon className={styles.icon} aria-hidden="true" /><div className={styles.balanceText}><span>{label}</span><strong>{formatCurrency(value, currency)}</strong></div></div></Tooltip>
}

export function AccountBalanceSummary({ role, state, onRetry, onDeposit, onWithdraw }) {
  if (state.status === 'loading' && !state.account) return <div role="status" aria-label="Đang tải số dư"><Skeleton.Input active size="small" />{role === 'CLIENT' && <Skeleton.Input active size="small" />}</div>
  if (state.status === 'error' && !state.account) return <div className={styles.summary}><span className={styles.unavailable}>Không tải được số dư</span><Button type="link" className={styles.retry} onClick={onRetry}>Thử lại</Button></div>
  if (!state.account) return null
  if (role === 'FREELANCER') return <div className={styles.summary}><BalanceItem label="Số dư khả dụng" description="Số tiền hiện có trong tài khoản Freelancer." value={state.account.availableAmount} currency={state.account.currency} icon={WalletOutlined} /><Button type="primary" onClick={onWithdraw} disabled={state.account.availableAmount <= 0}>Rút tiền</Button>{state.status === 'error' && <Button type="link" className={styles.retry} onClick={onRetry}>Tải lại</Button>}</div>
  return <div className={styles.summary}><BalanceItem label="Số dư khả dụng" description="Số tiền có thể dùng để tạo Job." value={state.account.availableAmount} currency={state.account.currency} icon={WalletOutlined} /><BalanceItem label="Đang khóa (Escrow)" description="Số tiền đang được giữ cho các Job đã tạo." value={state.account.heldAmount} currency={state.account.currency} icon={LockOutlined} /><Button type="primary" onClick={onDeposit}>Nạp tiền</Button>{state.status === 'error' && <Button type="link" className={styles.retry} onClick={onRetry}>Tải lại</Button>}</div>
}
