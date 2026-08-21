import { useRef, useState } from 'react'
import {
  Alert, App, Button, Card, Empty, Flex, Form, Image, InputNumber, Result, Tag, Typography,
} from 'antd'
import {
  ArrowLeftOutlined, CheckCircleOutlined, CopyOutlined, QrcodeOutlined, SafetyCertificateOutlined, WalletOutlined,
} from '@ant-design/icons'
import { createClientDeposit } from '../api/accountApi.js'
import { ApiError } from '@/shared/api/httpClient.js'
import { authSession } from '@/features/auth/model/authSession.js'
import { accountBalance } from '../model/accountBalance.js'
import { navigate } from '@/shared/lib/navigation.js'
import { formatCurrency } from '@/shared/lib/formatCurrency.js'
import styles from './DepositPage.module.css'

const { Paragraph, Text, Title } = Typography
const presetAmounts = [100000, 500000, 1000000]

function uniqueKey() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `deposit-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function errorText(error) {
  return error instanceof ApiError ? error.message : 'Không thể tạo yêu cầu nạp tiền. Vui lòng thử lại.'
}

function CopyField({ label, value, onCopy }) {
  return <div className={styles.copyField}>
    <div className={styles.copyValue}>
      <Text type="secondary">{label}</Text>
      <strong>{value}</strong>
    </div>
    <Button type="text" icon={<CopyOutlined aria-hidden="true" />} onClick={() => onCopy(value)} aria-label={`Sao chép ${label}`}>
      Sao chép
    </Button>
  </div>
}

function DepositInstructions() {
  return <Card className={styles.instructionCard} title={<Flex gap="small" align="center"><SafetyCertificateOutlined aria-hidden="true" />Hướng dẫn thanh toán</Flex>}>
    <ol className={styles.instructionList}>
      <li>Nhập số tiền và tạo yêu cầu nạp tiền.</li>
      <li>Quét mã QR bằng ứng dụng ngân hàng hoặc ví hỗ trợ chuyển khoản.</li>
      <li>Chuyển đúng số tiền và giữ nguyên nội dung thanh toán do hệ thống cung cấp.</li>
      <li>Số dư sẽ được cập nhật sau khi hệ thống nhận và xác thực giao dịch.</li>
    </ol>
    <Alert
      type="info"
      showIcon
      title="Lưu ý quan trọng"
      description="Chỉ giao dịch đúng số tiền và nội dung thanh toán. Giao dịch sai thông tin có thể cần được kiểm tra thủ công."
    />
  </Card>
}

function DepositSuccess({ deposit, onReset }) {
  const { message } = App.useApp()
  const [qrError, setQrError] = useState(false)
  const payment = deposit.payment
  const currency = deposit.currency || 'VND'

  async function copyValue(value) {
    if (!navigator.clipboard?.writeText) {
      message.warning('Trình duyệt không hỗ trợ sao chép tự động.')
      return
    }
    try {
      await navigator.clipboard.writeText(value)
      message.success('Đã sao chép thông tin thanh toán.')
    } catch {
      message.error('Không thể sao chép. Vui lòng chọn và sao chép thủ công.')
    }
  }

  return <section aria-labelledby="deposit-result-title">
    <Result
      status="success"
      title="Đã tạo yêu cầu nạp tiền"
      subTitle="Hoàn tất giao dịch chuyển khoản để hệ thống tự động cộng tiền vào tài khoản."
      extra={<Tag icon={<CheckCircleOutlined aria-hidden="true" />} color="processing">Chờ thanh toán</Tag>}
    />
    <Card className={styles.paymentCard}>
      <div className={styles.paymentHeading}>
        <div>
          <Text className={styles.eyebrow}>THANH TOÁN SEPAY</Text>
          <Title id="deposit-result-title" level={2}>Quét mã QR để nạp tiền</Title>
          <Paragraph type="secondary">Mã QR đã bao gồm thông tin tài khoản nhận. Bạn vẫn cần kiểm tra lại số tiền trước khi xác nhận.</Paragraph>
        </div>
        <Tag color="blue">{deposit.provider || 'SEPAY'}</Tag>
      </div>
      <div className={styles.paymentGrid}>
        <div className={styles.qrSection}>
          <Text strong>Mã QR thanh toán</Text>
          <div className={styles.qrFrame}>
            {qrError ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không thể tải mã QR."><Button href={payment.qrCodeUrl} target="_blank" rel="noreferrer">Mở ảnh QR</Button></Empty> : <Image className={styles.qrImage} src={payment.qrCodeUrl} alt="Mã QR thanh toán nạp tiền" onError={() => setQrError(true)} />}
          </div>
        </div>
        <div className={styles.paymentDetails}>
          <CopyField label="Số tiền cần chuyển" value={formatCurrency(deposit.amount, currency)} onCopy={() => copyValue(String(deposit.amount))} />
          <CopyField label="Nội dung chuyển khoản" value={payment.paymentCode} onCopy={copyValue} />
          <Alert type="warning" showIcon title="Chuyển khoản chính xác" description={`Số tiền: ${formatCurrency(deposit.amount, currency)} · Nội dung: ${payment.paymentCode}`} />
          <Text type="secondary">Nếu đã chuyển khoản, hãy chờ hệ thống xác nhận giao dịch. Không tạo yêu cầu mới cho cùng một lần chuyển.</Text>
        </div>
      </div>
      <Flex className={styles.paymentActions} gap="small" wrap>
        <Button type="primary" onClick={onReset}>Tạo yêu cầu nạp khác</Button>
        <Button href="/client/dashboard">Về tổng quan</Button>
      </Flex>
    </Card>
  </section>
}

export function DepositPage() {
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(null)
  const idempotencyKey = useRef(null)

  async function submit(values) {
    setError('')
    setSubmitting(true)
    try {
      idempotencyKey.current ||= uniqueKey()
      const deposit = await createClientDeposit({
        amount: values.amount,
        provider: 'SEPAY',
        idempotencyKey: idempotencyKey.current,
      })
      setSuccess(deposit)
      idempotencyKey.current = null
      void accountBalance.refresh()
    } catch (requestError) {
      if (requestError instanceof ApiError && [401, 403].includes(requestError.status)) {
        authSession.clear()
        navigate('/login?redirect=%2Fclient%2Fdeposit', { replace: true })
        return
      }
      setError(errorText(requestError))
    } finally {
      setSubmitting(false)
    }
  }

  function reset() {
    form.resetFields()
    idempotencyKey.current = null
    setError('')
    setSuccess(null)
  }

  return <>
    <header className={styles.pageHeading}>
      <div>
        <Button type="link" href="/client/dashboard" icon={<ArrowLeftOutlined aria-hidden="true" />} className={styles.backLink}>Về tổng quan</Button>
        <Text className={styles.eyebrow}>TÀI KHOẢN CLIENT</Text>
        <Title id="account-page-title">Nạp tiền vào tài khoản</Title>
        <Paragraph>Thêm số dư để thanh toán cho các Job và theo dõi chi phí minh bạch.</Paragraph>
      </div>
      <Tag icon={<WalletOutlined aria-hidden="true" />} color="blue">Thanh toán qua SePay</Tag>
    </header>
    {success ? <DepositSuccess deposit={success} onReset={reset} /> : <div className={styles.depositGrid}>
      <Card className={styles.formCard} title={<Flex gap="small" align="center"><QrcodeOutlined aria-hidden="true" />Tạo yêu cầu nạp tiền</Flex>}>
        <Paragraph type="secondary">Nhập số tiền bạn muốn nạp. Hệ thống sẽ tạo một mã thanh toán riêng cho giao dịch này.</Paragraph>
        {error && <Alert className={styles.formAlert} type="error" showIcon title="Không thể tạo yêu cầu" description={error} />}
        <Form form={form} layout="vertical" initialValues={{ amount: 500000 }} onFinish={submit} disabled={submitting}>
          <Form.Item
            name="amount"
            label="Số tiền nạp"
            extra="Số tiền được tính bằng Việt Nam đồng."
            rules={[
              { required: true, message: 'Vui lòng nhập số tiền cần nạp.' },
              { validator: (_, value) => value && Number.isInteger(value) && value > 0 ? Promise.resolve() : Promise.reject(new Error('Số tiền phải là số nguyên lớn hơn 0.')) },
            ]}
          >
            <InputNumber
              className={styles.amountInput}
              min={1}
              precision={0}
              controls={false}
              prefix="₫"
              placeholder="500.000"
              inputMode="numeric"
              formatter={(value) => value === undefined || value === null ? '' : new Intl.NumberFormat('vi-VN').format(Number(value))}
              parser={(value) => Number(String(value ?? '').replace(/\D/g, '')) || 0}
            />
          </Form.Item>
          <div className={styles.presets} aria-label="Mức nạp nhanh">
            <Text type="secondary">Chọn nhanh:</Text>
            {presetAmounts.map((amount) => <Button key={amount} type="default" size="small" onClick={() => form.setFieldValue('amount', amount)}>{formatCurrency(amount)}</Button>)}
          </div>
          <Alert className={styles.formNotice} type="info" showIcon title="Sau khi tạo yêu cầu" description="Bạn sẽ nhận được mã QR và nội dung chuyển khoản riêng. Hãy giữ nguyên thông tin đó khi thanh toán." />
          <Button type="primary" htmlType="submit" block loading={submitting} disabled={submitting} icon={<QrcodeOutlined aria-hidden="true" />}>Tạo mã nạp tiền</Button>
        </Form>
      </Card>
      <DepositInstructions />
    </div>}
  </>
}
