import { Alert, Descriptions, Form, Input, Modal, Typography } from 'antd'
import { formatWithdrawalMoney } from '../lib/adminWithdrawalFormat.js'
import styles from './AdminWithdrawals.module.css'

const { Paragraph, Text } = Typography

const ACTION_META = Object.freeze({
  approve: {
    title: 'Duyệt yêu cầu rút tiền',
    okText: 'Xác nhận duyệt',
    description: 'Yêu cầu sẽ chuyển sang trạng thái đang xử lý để Admin thực hiện chuyển khoản.',
  },
  reject: {
    title: 'Từ chối yêu cầu rút tiền',
    okText: 'Xác nhận từ chối',
    danger: true,
    description: 'Hãy kiểm tra kỹ trước khi từ chối. Backend sẽ hoàn tiền đang giữ theo quy trình của yêu cầu.',
  },
  complete: {
    title: 'Xác nhận đã chuyển khoản',
    okText: 'Xác nhận đã chuyển',
    description: 'Chỉ xác nhận sau khi giao dịch ngân hàng đã thành công và thông tin bên dưới khớp hoàn toàn.',
  },
  fail: {
    title: 'Báo chuyển khoản thất bại',
    okText: 'Xác nhận thất bại',
    danger: true,
    description: 'Ghi rõ nguyên nhân ngân hàng không thể xử lý giao dịch để lưu vết và áp dụng quy trình hoàn tiền của backend.',
  },
})

function actionPayload(action, values) {
  if (action === 'approve') return { adminNote: values.adminNote ?? '' }
  if (action === 'reject' || action === 'fail') return { reason: values.reason }
  return {
    provider: values.provider || 'BANK_TRANSFER',
    providerReference: values.providerReference,
    adminNote: values.adminNote ?? '',
  }
}

export function WithdrawalActionModal({ action, withdrawal, submitting, error, onCancel, onSubmit }) {
  const [form] = Form.useForm()
  const meta = ACTION_META[action]
  const open = Boolean(meta && withdrawal)

  async function submit(values) {
    try {
      await onSubmit(actionPayload(action, values))
    } catch (requestError) {
      const knownFields = ['adminNote', 'reason', 'provider', 'providerReference']
      const fields = Object.entries(requestError?.fieldErrors ?? {})
        .filter(([name]) => knownFields.includes(name))
        .map(([name, message]) => ({ name, errors: [message] }))
      if (fields.length) form.setFields(fields)
    }
  }

  return (
    <Modal
      title={meta?.title}
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      okText={meta?.okText}
      cancelText="Hủy"
      okButtonProps={{ danger: meta?.danger, loading: submitting, disabled: submitting }}
      cancelButtonProps={{ disabled: submitting }}
      closable={!submitting}
      keyboard={!submitting}
      mask={{ closable: !submitting }}
      destroyOnHidden
      className={styles.actionModal}
      afterOpenChange={(visible) => { if (!visible) form.resetFields() }}
    >
      {withdrawal && <>
        <Alert type={meta?.danger ? 'warning' : 'info'} showIcon message={meta?.description} />
        <Descriptions
          size="small"
          column={1}
          items={[
            { key: 'request', label: 'Yêu cầu', children: withdrawal.code || `#${withdrawal.id}` },
            { key: 'bank', label: 'Tài khoản', children: `${withdrawal.bank.name || withdrawal.bank.code || 'Chưa có ngân hàng'} · ${withdrawal.bank.accountNumber || 'Chưa có số tài khoản'}` },
            { key: 'net', label: 'Thực chuyển', children: <Text strong>{formatWithdrawalMoney(withdrawal.netAmount, withdrawal.currency)}</Text> },
          ]}
        />
        {action === 'complete' && <Paragraph type="secondary">Đối chiếu mã giao dịch với sao kê ngân hàng trước khi xác nhận.</Paragraph>}
        {error && <Alert type="error" showIcon message="Không thể xử lý yêu cầu" description={error} />}
        <Form
          key={`${action}-${withdrawal.id}`}
          form={form}
          layout="vertical"
          initialValues={{ provider: 'BANK_TRANSFER' }}
          onFinish={submit}
          disabled={submitting}
          preserve={false}
        >
          {action === 'complete' && <>
            <Form.Item name="provider" label="Phương thức chuyển"><Input readOnly /></Form.Item>
            <Form.Item name="providerReference" label="Mã giao dịch ngân hàng" rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập mã giao dịch ngân hàng.' }, { max: 255, message: 'Mã giao dịch không được vượt quá 255 ký tự.' }]}>
              <Input autoFocus maxLength={255} placeholder="Ví dụ: FT260809123456" autoComplete="off" />
            </Form.Item>
          </>}
          {(action === 'reject' || action === 'fail') && <Form.Item name="reason" label={action === 'reject' ? 'Lý do từ chối' : 'Lý do chuyển khoản thất bại'} rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập lý do cụ thể.' }, { max: 2000, message: 'Lý do không được vượt quá 2000 ký tự.' }]}>
            <Input.TextArea autoFocus rows={5} maxLength={2000} showCount placeholder="Nhập lý do để lưu vào lịch sử xử lý" />
          </Form.Item>}
          {(action === 'approve' || action === 'complete') && <Form.Item name="adminNote" label="Ghi chú Admin" rules={[{ max: 2000, message: 'Ghi chú không được vượt quá 2000 ký tự.' }]}>
            <Input.TextArea autoFocus={action === 'approve'} rows={4} maxLength={2000} showCount placeholder="Ghi chú nội bộ (không bắt buộc)" />
          </Form.Item>}
        </Form>
      </>}
    </Modal>
  )
}
