import { useCallback, useEffect, useState } from 'react'
import { Alert, App, Button, Card, Descriptions, Form, InputNumber, Skeleton, Space, Statistic, Typography } from 'antd'
import { getPlatformSettings, updatePlatformFeeRate } from '@/features/admin/api/adminApi.js'
import { percentToRate, validatePlatformFee } from '@/features/admin/lib/validation.js'
import { handleExpiredAdminSession } from '@/features/admin/lib/adminErrors.js'
import { ApiError } from '@/shared/api/httpClient.js'

function normalizeSettings(payload) {
  return payload?.data ?? payload
}

function formatDate(value) {
  if (!value) return 'Chưa có thông tin'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Không xác định' : new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

export function PlatformFeePage() {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = normalizeSettings(await getPlatformSettings())
      setSettings(data)
      form.setFieldValue('feePercent', Number(data.platformFeeRate) * 100)
    } catch (requestError) {
      if (handleExpiredAdminSession(requestError, '/admin/platform-fee')) return
      setError('Không thể tải cấu hình phí nền tảng. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }, [form])

  useEffect(() => { queueMicrotask(load) }, [load])

  async function save({ feePercent }) {
    const validationError = validatePlatformFee(feePercent)
    if (validationError) {
      form.setFields([{ name: 'feePercent', errors: [validationError] }])
      return
    }
    setSaving(true)
    try {
      await updatePlatformFeeRate(percentToRate(feePercent))
      message.success('Cập nhật phí nền tảng thành công.')
      await load()
    } catch (requestError) {
      if (handleExpiredAdminSession(requestError, '/admin/platform-fee')) return
      if (requestError instanceof ApiError && requestError.status === 409) {
        message.warning('Cấu hình đã được cập nhật bởi người khác. Dữ liệu mới nhất đã được tải lại.')
        await load()
      } else if (requestError.fieldErrors?.platformFeeRate) {
        form.setFields([{ name: 'feePercent', errors: [requestError.fieldErrors.platformFeeRate] }])
      } else {
        message.error('Không thể cập nhật phí nền tảng. Vui lòng thử lại.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <section>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Typography.Title level={2}>Platform Fee</Typography.Title>
        <Alert type="info" showIcon message="Thay đổi phí chỉ áp dụng cho công việc được tạo sau thời điểm cập nhật. Công việc cũ giữ nguyên mức phí đã lưu." />
        {error && <Alert type="error" showIcon message={error} action={<Button onClick={load}>Thử lại</Button>} />}
        {loading ? <Card><Skeleton active /></Card> : settings && <Card><Space direction="vertical" size="large" style={{ width: '100%' }}><Statistic title="Phí nền tảng hiện tại" value={Number(settings.platformFeeRate) * 100} precision={2} suffix="%" /><Descriptions column={{ xs: 1, sm: 2 }} items={[{ key: 'updatedBy', label: 'Cập nhật bởi', children: settings.updatedBy || 'Không xác định' }, { key: 'updatedAt', label: 'Cập nhật lúc', children: formatDate(settings.updatedAt) }, { key: 'version', label: 'Version', children: settings.version ?? 'Không xác định' }]} /><Form form={form} layout="vertical" onFinish={save}><Form.Item name="feePercent" label="Phí nền tảng (%)"><InputNumber min={0} max={99.9999} step={0.01} style={{ width: '100%' }} addonAfter="%" /></Form.Item><Button type="primary" htmlType="submit" loading={saving} disabled={saving}>Lưu phí nền tảng</Button></Form></Space></Card>}
      </Space>
    </section>
  )
}
