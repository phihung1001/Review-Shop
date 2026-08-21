import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, App, Button, Card, Empty, Form, Input, InputNumber, Select, Space, Typography } from 'antd'
import { DeleteOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { createJob, fetchRequiredLevels } from '../api/jobApi.js'
import { createIdempotencyKey, DEFAULT_JOB_DESCRIPTION, hasAtMostTwoDecimalPlaces, isSupportedGoogleMapsUrl, mapJobPayload } from '../lib/jobForm.js'
import { ApiError } from '@/shared/api/httpClient.js'
import { authSession } from '@/features/auth/model/authSession.js'
import { navigate } from '@/shared/lib/navigation.js'
import { formatCurrency } from '@/shared/lib/formatCurrency.js'
import { accountBalance } from '@/features/account/model/accountBalance.js'
import styles from './CreateJobPage.module.css'

const { Paragraph, Title } = Typography

export function CreateJobPage() {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [levels, setLevels] = useState([])
  const [levelsLoading, setLevelsLoading] = useState(true)
  const [levelsError, setLevelsError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const idempotencyKey = useRef(null)
  const requestPending = useRef(false)
  const errorRef = useRef(null)
  const selectedLevelId = Form.useWatch('requiredLevelId', form)
  const selectedLevel = levels.find((level) => level.id === Number(selectedLevelId))

  const loadLevels = useCallback(async () => {
    setLevelsLoading(true)
    setLevelsError('')
    try {
      setLevels(await fetchRequiredLevels())
    } catch (error) {
      if (error instanceof ApiError && [401, 403].includes(error.status)) {
        authSession.clear()
        navigate('/login?redirect=%2Fclient%2Fjobs%2Fcreate', { replace: true })
        return
      }
      setLevelsError('Không thể tải Required Level. Vui lòng thử lại.')
    } finally {
      setLevelsLoading(false)
    }
  }, [])

  useEffect(() => { queueMicrotask(loadLevels) }, [loadLevels])
  useEffect(() => {
    if (selectedLevelId != null) form.validateFields(['pricePerReview']).catch(() => {})
  }, [form, selectedLevelId])

  async function submit(values) {
    if (requestPending.current) return
    requestPending.current = true
    setSubmitting(true)
    setSubmitError(null)
    idempotencyKey.current ||= createIdempotencyKey()
    try {
      await createJob(mapJobPayload(values), idempotencyKey.current)
      idempotencyKey.current = null
      form.resetFields()
      message.success('Tạo Job thành công.')
      accountBalance.refresh()
    } catch (error) {
      if (error instanceof ApiError && [401, 403].includes(error.status)) {
        authSession.clear()
        navigate('/login?redirect=%2Fclient%2Fjobs%2Fcreate', { replace: true })
        return
      }
      if (error instanceof ApiError && Object.keys(error.fieldErrors).length) {
        form.setFields(Object.entries(error.fieldErrors).map(([name, value]) => ({ name, errors: [value] })))
        form.scrollToField(Object.keys(error.fieldErrors)[0], { focus: true })
        setSubmitError({ type: 'validation', text: 'Một số thông tin chưa được backend chấp nhận. Vui lòng kiểm tra lại.' })
      } else if (error instanceof ApiError && error.code === 'NETWORK_ERROR') {
        setSubmitError({ type: 'network', text: 'Mất kết nối khi tạo Job. Dữ liệu và mã retry đã được giữ nguyên.' })
      } else {
        setSubmitError({ type: 'server', text: error instanceof ApiError ? error.message : 'Không thể tạo Job lúc này. Dữ liệu của bạn vẫn được giữ nguyên.' })
      }
      queueMicrotask(() => errorRef.current?.focus())
    } finally {
      requestPending.current = false
      setSubmitting(false)
    }
  }

  function startNewIntent() {
    idempotencyKey.current = null
    setSubmitError(null)
    form.resetFields()
  }

  const noLevels = !levelsLoading && !levelsError && levels.length === 0
  return (
    <>
      <header><Title id="account-page-title">Tạo Job mới</Title><Paragraph>Mô tả rõ yêu cầu để Freelancer hiểu chính xác kết quả bạn mong đợi.</Paragraph></header>
      {levelsError && <Alert className={styles.alert} type="error" showIcon title={levelsError} action={<Button icon={<ReloadOutlined />} onClick={loadLevels}>Thử lại</Button>} />}
      {noLevels && <Card className={styles.alert}><Empty description="Chưa có Required Level để tạo Job"><Button onClick={loadLevels}>Tải lại</Button></Empty></Card>}
      {submitError && <Alert ref={errorRef} tabIndex={-1} className={styles.alert} type="error" showIcon title={submitError.text} action={submitError.type === 'network' ? <Button onClick={() => form.submit()} loading={submitting}>Thử lại</Button> : undefined} />}
      <Card className={styles.formCard}>
        <Form form={form} layout="vertical" requiredMark="optional" disabled={submitting} onFinish={submit} initialValues={{ description: DEFAULT_JOB_DESCRIPTION, totalReviews: 1, reviewContents: [] }}>
          <Form.Item name="title" label="Tên Job" rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập tên Job.' }, { max: 255, message: 'Tên Job không được vượt quá 255 ký tự.' }]}><Input maxLength={255} showCount /></Form.Item>
          <Form.Item name="description" label="Mô tả" rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập mô tả Job.' }]}><Input.TextArea rows={5} /></Form.Item>
          <Form.Item name="mapLink" label="Google Maps URL" rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập Google Maps URL.' }, { max: 2048, message: 'URL không được vượt quá 2048 ký tự.' }, { validator: (_, value) => !value || isSupportedGoogleMapsUrl(value) ? Promise.resolve() : Promise.reject(new Error('Hãy nhập URL HTTPS Google Maps được hỗ trợ.')) }]}><Input type="url" placeholder="https://www.google.com/maps/place/..." /></Form.Item>
          <div className={styles.fieldGrid}>
            <Form.Item name="requiredLevelId" label="Required Level" rules={[{ required: true, message: 'Vui lòng chọn Required Level.' }, { validator: (_, value) => !value || levels.some((level) => level.id === Number(value)) ? Promise.resolve() : Promise.reject(new Error('Required Level không còn tồn tại.')) }]}><Select loading={levelsLoading} disabled={levelsLoading || Boolean(levelsError) || noLevels} placeholder="Chọn Required Level" options={levels.map((level) => ({ value: level.id, label: `${level.description} · tối thiểu ${formatCurrency(level.pricePerReview)}` }))} /></Form.Item>
            <Form.Item name="pricePerReview" label="Giá mỗi review" extra={selectedLevel ? `Tối thiểu ${formatCurrency(selectedLevel.pricePerReview)}` : 'Chọn Required Level để xem giá tối thiểu.'} rules={[{ required: true, message: 'Vui lòng nhập giá mỗi review.' }, { validator: (_, value) => { if (value == null || Number(value) <= 0) return Promise.reject(new Error('Giá mỗi review phải lớn hơn 0.')); if (!hasAtMostTwoDecimalPlaces(value)) return Promise.reject(new Error('Giá chỉ được có tối đa 2 chữ số thập phân.')); if (selectedLevel && Number(value) < selectedLevel.pricePerReview) return Promise.reject(new Error(`Giá không được thấp hơn ${formatCurrency(selectedLevel.pricePerReview)}.`)); return Promise.resolve() } }]}><InputNumber className={styles.fullWidth} min={0} stringMode addonAfter="đ" /></Form.Item>
          </div>
          <Form.Item name="totalReviews" label="Tổng số review" rules={[{ required: true, message: 'Vui lòng nhập tổng số review.' }, { validator: (_, value) => Number.isInteger(Number(value)) && Number(value) >= 1 ? Promise.resolve() : Promise.reject(new Error('Tổng số review phải là số nguyên tối thiểu 1.')) }]}><InputNumber min={1} precision={0} className={styles.fullWidth} /></Form.Item>
          <Form.Item label="Nội dung review" extra="Tùy chọn; số nội dung không bắt buộc bằng tổng số review.">
            <Form.List name="reviewContents">{(fields, { add, remove }) => <div className={styles.reviewList}>{fields.map((field, index) => <div className={styles.reviewItem} key={field.key}><Form.Item {...field} name={[field.name, 'content']} label={`Nội dung ${index + 1}`}><Input.TextArea rows={3} /></Form.Item><div className={styles.reviewItemActions}><Button danger icon={<DeleteOutlined />} onClick={() => remove(field.name)} aria-label={`Xóa nội dung review ${index + 1}`}>Xóa</Button></div></div>)}<Button type="dashed" icon={<PlusOutlined />} onClick={() => add({ content: '', images: [] })}>Thêm nội dung review</Button></div>}</Form.List>
          </Form.Item>
          <Form.Item noStyle shouldUpdate>
            {({ getFieldsError, getFieldsValue }) => {
              const values = getFieldsValue(['title', 'description', 'mapLink', 'requiredLevelId', 'pricePerReview', 'totalReviews'])
              const requiredFieldsFilled = Boolean(values.title?.trim() && values.description?.trim() && values.mapLink?.trim() && values.requiredLevelId && values.pricePerReview && values.totalReviews)
              const hasErrors = getFieldsError().some(({ errors }) => errors.length > 0)
              return <Space wrap className={styles.actions}><Button type="primary" htmlType="submit" loading={submitting} disabled={!requiredFieldsFilled || hasErrors || levelsLoading || Boolean(levelsError) || noLevels}>Tạo Job</Button><Button onClick={startNewIntent} disabled={submitting}>Nhập lại</Button></Space>
            }}
          </Form.Item>
        </Form>
      </Card>
    </>
  )
}
