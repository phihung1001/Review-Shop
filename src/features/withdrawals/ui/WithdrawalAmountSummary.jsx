import { Card, Typography } from 'antd'
import { formatWithdrawalMoney } from '../lib/adminWithdrawalFormat.js'
import styles from './AdminWithdrawals.module.css'

const { Text, Title } = Typography

export function WithdrawalAmountSummary({ withdrawal }) {
  const currency = withdrawal.currency
  return (
    <Card size="small" title="Chi tiết số tiền">
      <div className={styles.amountSummary}>
        <div>
          <Text type="secondary">Số tiền yêu cầu</Text>
          <strong>{formatWithdrawalMoney(withdrawal.amount, currency)}</strong>
        </div>
        <div>
          <Text type="secondary">Phí giao dịch</Text>
          <strong>{formatWithdrawalMoney(withdrawal.feeAmount, currency)}</strong>
        </div>
        <div className={styles.netAmount}>
          <Text type="secondary">Số tiền thực chuyển</Text>
          <Title level={3}>{formatWithdrawalMoney(withdrawal.netAmount, currency)}</Title>
          <Text type="secondary">Thực chuyển = Số tiền yêu cầu − Phí giao dịch</Text>
        </div>
      </div>
    </Card>
  )
}
