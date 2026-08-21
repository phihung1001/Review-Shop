function decimalPlaces(value) {
  const text = String(value)
  return text.includes('.') ? text.split('.')[1].length : 0
}

export function validateRequiredLevel(values) {
  const errors = {}
  if (!values.description?.trim()) errors.description = 'Vui lòng nhập mô tả cấp độ.'
  if (values.pricePerReview === '' || values.pricePerReview == null || !Number.isFinite(Number(values.pricePerReview)) || Number(values.pricePerReview) <= 0) {
    errors.pricePerReview = 'Giá mỗi review phải lớn hơn 0.'
  } else if (decimalPlaces(values.pricePerReview) > 2) {
    errors.pricePerReview = 'Giá mỗi review chỉ được có tối đa 2 chữ số thập phân.'
  }
  if (values.rank !== '' && values.rank != null && (!Number.isInteger(Number(values.rank)) || Number(values.rank) < 1 || Number(values.rank) > 10)) {
    errors.rank = 'Rank phải là số nguyên từ 1 đến 10.'
  }
  return errors
}

export function requiredLevelPayload(values) {
  const payload = { description: values.description.trim(), pricePerReview: Number(values.pricePerReview) }
  if (values.rank !== '' && values.rank != null) payload.rank = Number(values.rank)
  return payload
}

export function validatePlatformFee(percent) {
  if (percent === '' || percent == null || !Number.isFinite(Number(percent)) || Number(percent) < 0 || Number(percent) >= 100) {
    return 'Phí nền tảng phải từ 0% đến nhỏ hơn 100%.'
  }
  if (decimalPlaces(percent) > 2) return 'Phí nền tảng chỉ được có tối đa 2 chữ số thập phân khi nhập theo phần trăm.'
  return ''
}

export function percentToRate(percent) {
  return Number((Number(percent) / 100).toFixed(4))
}
