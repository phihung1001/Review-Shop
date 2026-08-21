import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert, App, Button, Card, Checkbox, Drawer, Empty, Flex, Form,
  Input, InputNumber, Result, Select, Skeleton, Tag, Typography, Upload,
} from 'antd'
import {
  BankOutlined, CheckCircleOutlined, PlusOutlined, ReloadOutlined,
  SafetyCertificateOutlined, UploadOutlined, WalletOutlined,
} from '@ant-design/icons'
import { createPayoutMethod, createWithdrawal, getPayoutMethods } from '../api/withdrawalApi.js'
import { uploadPayoutMethodImage } from '../api/payoutMethodImageApi.js'
import { ApiError } from '@/shared/api/httpClient.js'
import { accountBalance } from '@/features/account/model/accountBalance.js'
import { getPayoutBank, PAYOUT_BANK_OPTIONS } from '../model/payoutBanks.js'
import { formatCurrency } from '@/shared/lib/formatCurrency.js'
import styles from './FreelancerWithdrawalDrawer.module.css'

const { Paragraph, Text, Title } = Typography

function uniqueKey() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `withdrawal-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function errorText(error, fallback) {
  return error instanceof ApiError ? error.message : fallback
}

function PayoutMethodCard({ method, selected, onSelect }) {
  const name = method.bankName || method.bankCode || 'Tài khoản ngân hàng'
  return <button type="button" className={`${styles.methodCard} ${selected ? styles.selectedMethod : ''}`} onClick={() => onSelect(method.id)} aria-pressed={selected}>
    <span className={styles.bankIcon}><BankOutlined aria-hidden="true" /></span>
    <span className={styles.methodInfo}><strong>{name}</strong><span>{method.maskedAccountNumber || 'Số tài khoản đã bảo mật'}</span><span>{method.accountHolderName}</span></span>
    <span className={styles.methodTags}>{method.isDefault && <Tag color="blue">Mặc định</Tag>}<Tag color={method.status === 'ACTIVE' ? 'green' : 'default'}>{method.status === 'ACTIVE' ? 'Đang hoạt động' : method.status}</Tag>{selected && <CheckCircleOutlined className={styles.checkIcon} aria-label="Đã chọn" />}</span>
  </button>
}

function AddPayoutMethodForm({ submitting, onCancel, onCreated }) {
  const [form] = Form.useForm()
  const selectedBank = getPayoutBank(Form.useWatch('bankCode', form))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const busy = submitting || saving

  function handleBankSearch(value) {
    const bank = getPayoutBank(value)
    if (bank) form.setFieldValue('bankCode', bank.code)
  }

  async function submit(values) {
    setError('')
    setSaving(true)
    try {
      const bank = getPayoutBank(values.bankCode)
      if (!bank) {
        form.setFields([{ name: 'bankCode', errors: ['Vui lòng chọn ngân hàng trong danh sách.'] }])
        return
      }
      const file = values.qrFile?.[0]?.originFileObj
      if (!file) {
        form.setFields([{ name: 'qrFile', errors: ['Vui lòng chọn ảnh QR chuyển khoản.'] }])
        return
      }
      const qrImageObjectKey = await uploadPayoutMethodImage(file)
      const created = await createPayoutMethod({ ...values, bankName: bank.name, qrImageObjectKey })
      form.resetFields()
      onCreated(created)
    } catch (requestError) {
      setError(errorText(requestError, 'Không thể thêm tài khoản ngân hàng.'))
    } finally { setSaving(false) }
  }

  return <Card className={styles.formCard} title={<Flex gap="small" align="center"><BankOutlined aria-hidden="true" />Thêm tài khoản nhận tiền</Flex>}>
    <Paragraph type="secondary">Nhập chính xác thông tin để tránh chuyển nhầm tài khoản.</Paragraph>
    {error && <Alert className={styles.formAlert} type="error" showIcon title="Không thể lưu tài khoản" description={error} />}
    <Form form={form} layout="vertical" onFinish={submit} disabled={busy} initialValues={{ isDefault: true }}>
      <div className={styles.twoColumns}>
        <Form.Item name="bankCode" label="Ngân hàng" rules={[{ required: true, message: 'Vui lòng chọn ngân hàng.' }]}>
          <Select showSearch optionFilterProp="label" onSearch={handleBankSearch} options={PAYOUT_BANK_OPTIONS} placeholder="Chọn hoặc tìm ngân hàng" notFoundContent="Không tìm thấy ngân hàng." />
        </Form.Item>
        <Form.Item label="Tên ngân hàng">
          <Input aria-label="Tên ngân hàng" value={selectedBank?.name ?? ''} readOnly placeholder="Hiển thị sau khi chọn mã ngân hàng" />
        </Form.Item>
      </div>
      <div className={styles.twoColumns}>
        <Form.Item name="accountNumber" label="Số tài khoản" rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập số tài khoản.' }, { pattern: /^\d{6,30}$/, message: 'Số tài khoản phải gồm 6–30 chữ số.' }]}><Input inputMode="numeric" autoComplete="off" placeholder="0123456789" /></Form.Item>
        <Form.Item name="accountHolderName" label="Tên chủ tài khoản" normalize={(value) => value?.toUpperCase()} rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập tên chủ tài khoản.' }, { max: 255, message: 'Tên chủ tài khoản không được vượt quá 255 ký tự.' }]}><Input autoComplete="name" placeholder="NGUYEN VAN A" /></Form.Item>
      </div>
      <Form.Item name="qrFile" label="Ảnh QR chuyển khoản" valuePropName="fileList" getValueFromEvent={(event) => event?.fileList} extra="Ảnh QR là bắt buộc để xác minh tài khoản nhận tiền." rules={[{ required: true, message: 'Vui lòng chọn ảnh QR chuyển khoản.' }, { validator: (_, files) => !files?.length || files[0]?.originFileObj?.type?.startsWith('image/') ? Promise.resolve() : Promise.reject(new Error('Vui lòng chọn file ảnh hợp lệ.')) }]}>
        <Upload accept="image/*" maxCount={1} listType="picture" beforeUpload={() => false}><Button icon={<UploadOutlined aria-hidden="true" />}>Chọn ảnh QR</Button></Upload>
      </Form.Item>
      <Form.Item name="isDefault" valuePropName="checked"><Checkbox>Đặt làm tài khoản mặc định</Checkbox></Form.Item>
      <Flex justify="end" gap="small" wrap>{onCancel && <Button onClick={onCancel} disabled={busy}>Hủy</Button>}<Button type="primary" htmlType="submit" loading={saving} disabled={busy}>Lưu và tiếp tục</Button></Flex>
    </Form>
  </Card>
}

export function FreelancerWithdrawalDrawer({ open, balance, onClose }) {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [methods, setMethods] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [adding, setAdding] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(null)
  const idempotencyKey = useRef(null)
  const availableAmount = balance?.account?.availableAmount ?? 0
  const currency = balance?.account?.currency ?? 'VND'

  const loadMethods = useCallback(async () => {
    setStatus('loading'); setError('')
    try {
      const loaded = await getPayoutMethods()
      setMethods(loaded)
      const active = loaded.filter((item) => item.status === 'ACTIVE')
      setSelectedId((current) => active.some((item) => String(item.id) === String(current)) ? current : (active.find((item) => item.isDefault) ?? active[0])?.id ?? null)
      setAdding(active.length === 0)
      setStatus('success')
    } catch (requestError) {
      setError(errorText(requestError, 'Không thể tải tài khoản nhận tiền.'))
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    if (open) {
      idempotencyKey.current = uniqueKey()
      queueMicrotask(loadMethods)
    }
  }, [loadMethods, open])

  const activeMethods = useMemo(() => methods.filter((item) => item.status === 'ACTIVE'), [methods])
  function created(method) {
    setMethods((current) => [...current, method])
    setSelectedId(method.id)
    setAdding(false)
    message.success('Đã thêm tài khoản ngân hàng. Hãy nhập số tiền cần rút.')
  }

  async function withdraw(values) {
    setSubmitting(true); setError('')
    try {
      idempotencyKey.current ||= uniqueKey()
      const result = await createWithdrawal({ amount: values.amount, payoutMethodId: selectedId, idempotencyKey: idempotencyKey.current })
      setSuccess(result)
      idempotencyKey.current = null
      await accountBalance.refresh()
    } catch (requestError) {
      setError(errorText(requestError, 'Không thể tạo yêu cầu rút tiền.'))
    } finally { setSubmitting(false) }
  }

  function close() {
    if (submitting) return
    form.resetFields(); setSuccess(null); setError(''); onClose()
  }

  return <Drawer title="Rút tiền" open={open} onClose={close} size="min(44rem, 100vw)" destroyOnHidden extra={<Tag icon={<SafetyCertificateOutlined aria-hidden="true" />} color="blue">Bảo mật</Tag>}>
    <div className={styles.drawerContent}>
      <Card className={styles.balanceCard}><Flex align="center" gap="middle"><span className={styles.walletIcon}><WalletOutlined aria-hidden="true" /></span><div><Text type="secondary">Số dư có thể rút</Text><Title level={3}>{formatCurrency(availableAmount, currency)}</Title></div></Flex></Card>

      {success ? <Result status="success" title="Đã tạo yêu cầu rút tiền" subTitle={success.code ? `Mã yêu cầu: ${success.code}` : 'Yêu cầu đang chờ hệ thống xử lý.'} extra={<><Card size="small" className={styles.receipt}><div><Text type="secondary">Tổng trừ khỏi ví</Text><strong>{formatCurrency(Number(success.amount ?? 0), success.currency ?? 'VND')}</strong></div><div><Text type="secondary">Phí rút tiền</Text><strong>{formatCurrency(Number(success.feeAmount ?? 0), success.currency ?? 'VND')}</strong></div><div><Text type="secondary">Thực nhận</Text><strong>{formatCurrency(Number(success.netAmount ?? 0), success.currency ?? 'VND')}</strong></div></Card><Button type="primary" onClick={close}>Hoàn tất</Button></>} /> : <>
        {status === 'loading' && <div role="status" aria-label="Đang tải tài khoản nhận tiền"><Skeleton active paragraph={{ rows: 7 }} /></div>}
        {status === 'error' && <Alert type="error" showIcon title="Không thể tải thông tin rút tiền" description={error} action={<Button icon={<ReloadOutlined aria-hidden="true" />} onClick={loadMethods}>Thử lại</Button>} />}
        {status === 'success' && adding && <AddPayoutMethodForm submitting={submitting} onCancel={activeMethods.length ? () => { setAdding(false); setError('') } : null} onCreated={created} />}
        {status === 'success' && !adding && <>
          <section aria-labelledby="payout-method-title"><Flex justify="space-between" align="center" gap="small" wrap><div><Title id="payout-method-title" level={4}>Tài khoản nhận tiền</Title><Text type="secondary">Chọn tài khoản sẽ nhận khoản rút.</Text></div><Button icon={<PlusOutlined aria-hidden="true" />} onClick={() => { setAdding(true); setError('') }}>Thêm tài khoản</Button></Flex><div className={styles.methodList}>{activeMethods.length ? activeMethods.map((method) => <PayoutMethodCard key={method.id} method={method} selected={String(selectedId) === String(method.id)} onSelect={setSelectedId} />) : <Empty description="Chưa có tài khoản đang hoạt động." />}</div></section>
          {error && <Alert type="error" showIcon title="Không thể tạo yêu cầu" description={error} />}
          <Card className={styles.formCard} title="Số tiền cần rút"><Form form={form} layout="vertical" onFinish={withdraw} disabled={submitting}>
            <Form.Item name="amount" label="Số tiền" extra="Số tiền này là tổng số tiền bị trừ khỏi ví. Phí rút tiền do hệ thống tính." rules={[{ required: true, message: 'Vui lòng nhập số tiền cần rút.' }, { validator: (_, value) => !value || value <= availableAmount ? Promise.resolve() : Promise.reject(new Error('Số tiền rút vượt quá số dư khả dụng.')) }]}><InputNumber className={styles.amountInput} min={1} max={availableAmount || undefined} precision={0} controls={false} prefix="₫" placeholder="500.000" formatter={(value) => value === undefined || value === null ? '' : new Intl.NumberFormat('vi-VN').format(String(value).replace(/\D/g, ''))} parser={(value) => Number(String(value).replace(/\D/g, '')) || 0} /></Form.Item>
            <Alert className={styles.notice} type="info" showIcon title="Yêu cầu sẽ được kiểm tra" description="Mức rút tối thiểu và phí được áp dụng theo cấu hình nền tảng. Mỗi Freelancer chỉ nên có một yêu cầu đang chờ xử lý." />
            <Button type="primary" htmlType="submit" block loading={submitting} disabled={!selectedId || availableAmount <= 0}>Xác nhận rút tiền</Button>
          </Form></Card>
        </>}
      </>}
    </div>
  </Drawer>
}
