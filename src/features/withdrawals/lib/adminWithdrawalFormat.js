import { formatCurrency } from '@/shared/lib/formatCurrency.js'

export function formatWithdrawalMoney(value, currency = 'VND') {
  if (!Number.isFinite(value)) return 'Không xác định'
  try {
    return formatCurrency(value, currency)
  } catch {
    return `${new Intl.NumberFormat('vi-VN').format(value)} ${currency || ''}`.trim()
  }
}

export function formatWithdrawalDate(value) {
  if (!value) return 'Chưa có thông tin'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Không xác định'
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}
