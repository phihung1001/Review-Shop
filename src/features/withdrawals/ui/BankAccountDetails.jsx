import { useState } from 'react'
import { Button, Card, Descriptions, Empty, Image, Space, Typography } from 'antd'
import { CopyOutlined, QrcodeOutlined } from '@ant-design/icons'
import styles from './AdminWithdrawals.module.css'

const { Title } = Typography

function CopyButton({ label, value, onCopy }) {
  if (!value) return null
  return <Button icon={<CopyOutlined aria-hidden="true" />} onClick={() => onCopy(String(value), label)}>Sao chép {label.toLowerCase()}</Button>
}

function QrImage({ withdrawal }) {
  const url = withdrawal.bank.qrImageUrl
  const [failed, setFailed] = useState(false)
  const content = url && !failed
    ? <Image className={styles.qrImage} src={url} alt={`QR chuyển khoản ${withdrawal.bank.name || 'ngân hàng'} cho yêu cầu ${withdrawal.code || withdrawal.id}`} preview={{ mask: 'Xem QR' }} onError={() => setFailed(true)} />
    : <Empty image={<QrcodeOutlined aria-hidden="true" />} description={failed ? 'Không thể tải ảnh QR chuyển khoản.' : 'Yêu cầu này không có ảnh QR chuyển khoản.'} />

  return (
    <section aria-labelledby="withdrawal-qr-title" className={styles.qrSection}>
      <Title id="withdrawal-qr-title" level={5}>QR chuyển khoản</Title>
      {content}
    </section>
  )
}

export function BankAccountDetails({ withdrawal, onCopy }) {
  const bank = withdrawal.bank
  const bankName = [bank.code, bank.name].filter(Boolean).join(' — ') || 'Chưa có thông tin'
  const items = [
    { key: 'bank', label: 'Ngân hàng', children: bankName },
    { key: 'accountNumber', label: 'Số tài khoản', children: bank.accountNumber || 'Chưa có thông tin' },
    { key: 'holder', label: 'Chủ tài khoản', children: bank.accountHolderName || 'Chưa có thông tin' },
    ...(withdrawal.transferContent ? [{ key: 'content', label: 'Nội dung chuyển khoản', children: withdrawal.transferContent }] : []),
  ]

  return (
    <Card size="small" title="Thông tin nhận tiền">
      <div className={styles.bankDetails}>
        <Descriptions bordered size="small" column={1} items={items} />
        <Space wrap>
          <CopyButton label="Số tài khoản" value={bank.accountNumber} onCopy={onCopy} />
          <CopyButton label="Số tiền thực chuyển" value={withdrawal.netAmount} onCopy={onCopy} />
          <CopyButton label="Nội dung chuyển khoản" value={withdrawal.transferContent} onCopy={onCopy} />
        </Space>
        <QrImage key={bank.qrImageUrl || 'missing-qr'} withdrawal={withdrawal} />
      </div>
    </Card>
  )
}
