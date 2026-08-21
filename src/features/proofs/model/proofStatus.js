const STATUS_META = {
  PENDING: { label: 'Chờ duyệt', color: 'gold' },
  APPROVED: { label: 'Đã duyệt', color: 'green' },
  REJECTED: { label: 'Đã từ chối', color: 'red' },
}

export function getProofStatusMeta(status) {
  return STATUS_META[String(status).toUpperCase()] ?? { label: 'Không xác định', color: 'default' }
}
