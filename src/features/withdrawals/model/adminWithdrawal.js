export const WITHDRAWAL_STATUS_OPTIONS = Object.freeze([
  { value: 'PENDING', label: 'Chờ duyệt' },
  { value: 'PROCESSING', label: 'Đang xử lý' },
  { value: 'SUCCEEDED', label: 'Thành công' },
  { value: 'REJECTED', label: 'Đã từ chối' },
  { value: 'FAILED', label: 'Chuyển thất bại' },
])

const STATUS_META = Object.freeze({
  PENDING: { label: 'Chờ duyệt', color: 'warning' },
  PROCESSING: { label: 'Đang xử lý', color: 'processing' },
  SUCCEEDED: { label: 'Thành công', color: 'success' },
  REJECTED: { label: 'Đã từ chối', color: 'error' },
  FAILED: { label: 'Chuyển thất bại', color: 'error' },
})

const ACTIONS_BY_STATUS = Object.freeze({
  PENDING: Object.freeze(['approve', 'reject']),
  PROCESSING: Object.freeze(['complete', 'fail']),
})

export function getWithdrawalStatusMeta(status) {
  return STATUS_META[status] ?? { label: 'Không xác định', color: 'default' }
}

export function getAllowedWithdrawalActions(status) {
  return ACTIONS_BY_STATUS[status] ?? []
}

export function isWithdrawalStatus(value) {
  return WITHDRAWAL_STATUS_OPTIONS.some((option) => option.value === value)
}
