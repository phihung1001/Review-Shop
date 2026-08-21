import { Tag } from 'antd'
import { getWithdrawalStatusMeta } from '../model/adminWithdrawal.js'

export function WithdrawalStatusTag({ status }) {
  const meta = getWithdrawalStatusMeta(status)
  return <Tag color={meta.color}>{meta.label}</Tag>
}
