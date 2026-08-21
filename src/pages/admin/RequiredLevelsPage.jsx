import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, App, Button, Form, Input, InputNumber, Modal, Popconfirm, Space, Table, Typography } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { createRequiredLevel, deleteRequiredLevel, getRequiredLevel, getRequiredLevels, updateRequiredLevel } from '@/features/admin/api/adminApi.js'
import { requiredLevelPayload, validateRequiredLevel } from '@/features/admin/lib/validation.js'
import { handleExpiredAdminSession } from '@/features/admin/lib/adminErrors.js'
import { ApiError } from '@/shared/api/httpClient.js'
import { formatCurrency } from '@/shared/lib/formatCurrency.js'

export function RequiredLevelsPage() {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [levels, setLevels] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [editing, setEditing] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const mounted = useRef(true)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const data = await getRequiredLevels()
      if (mounted.current) setLevels(data)
    } catch (error) {
      if (handleExpiredAdminSession(error, '/admin/required-levels')) return
      if (mounted.current) setLoadError('Không thể tải danh sách Required Level. Vui lòng thử lại.')
    } finally {
      if (mounted.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    mounted.current = true
    queueMicrotask(load)
    return () => { mounted.current = false }
  }, [load])

  function openCreate() {
    setEditing(null)
    setModalOpen(true)
  }

  async function openEdit(level) {
    setEditingId(level.id)
    try {
      const response = await getRequiredLevel(level.id)
      const source = response?.data ?? response?.result ?? response ?? {}
      const detail = {
        id: source.id ?? level.id,
        description: source.description ?? level.description ?? '',
        pricePerReview: source.pricePerReview ?? source.price_per_review ?? level.pricePerReview,
        rank: source.rank ?? source.level_rank ?? level.rank,
      }
      setEditing(detail)
      setModalOpen(true)
    } catch (error) {
      if (handleExpiredAdminSession(error, '/admin/required-levels')) return
      if (error instanceof ApiError && error.status === 404) {
        message.error('Required Level không còn tồn tại. Danh sách đã được làm mới.')
        await load()
      } else {
        message.error('Không thể tải thông tin Required Level. Vui lòng thử lại.')
      }
    } finally {
      setEditingId(null)
    }
  }

  async function save(values) {
    const errors = validateRequiredLevel(values)
    if (Object.keys(errors).length) {
      form.setFields(Object.entries(errors).map(([name, errorsForField]) => ({ name, errors: [errorsForField] })))
      return
    }
    setSaving(true)
    try {
      const payload = requiredLevelPayload(values)
      if (editing) await updateRequiredLevel(editing.id, payload)
      else await createRequiredLevel(payload)
      message.success(editing ? 'Cập nhật Required Level thành công.' : 'Tạo Required Level thành công.')
      setModalOpen(false)
      await load()
    } catch (error) {
      if (handleExpiredAdminSession(error, '/admin/required-levels')) return
      if (error.fieldErrors && Object.keys(error.fieldErrors).length) {
        form.setFields(Object.entries(error.fieldErrors).map(([name, errors]) => ({ name, errors: [errors] })))
      } else if (error instanceof ApiError && error.status === 404) {
        message.error('Required Level không còn tồn tại. Danh sách đã được làm mới.')
        setModalOpen(false)
        await load()
      } else {
        message.error('Không thể lưu Required Level. Vui lòng kiểm tra thông tin và thử lại.')
      }
    } finally {
      setSaving(false)
    }
  }

  async function remove(level) {
    setDeletingId(level.id)
    try {
      await deleteRequiredLevel(level.id)
      message.success(`Đã xóa ${level.description}.`)
      await load()
    } catch (error) {
      if (handleExpiredAdminSession(error, '/admin/required-levels')) return
      if (error instanceof ApiError && error.status === 404) message.warning('Required Level không còn tồn tại. Danh sách đã được làm mới.')
      else message.error('Không thể xóa cấp độ này. Cấp độ có thể đang được sử dụng bởi một công việc.')
      await load()
    } finally {
      setDeletingId(null)
    }
  }

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 80 },
    { title: 'Mô tả', dataIndex: 'description' },
    { title: 'Giá mỗi review', dataIndex: 'pricePerReview', render: (value) => formatCurrency(value) },
    { title: 'Rank', dataIndex: 'rank', width: 100 },
    { title: 'Hành động', key: 'actions', render: (_, level) => <Space><Button loading={editingId === level.id} disabled={editingId !== null && editingId !== level.id} onClick={() => openEdit(level)}>Sửa</Button><Popconfirm title={`Xóa ${level.description}?`} description="Thao tác này có thể không thực hiện được nếu cấp độ đang được sử dụng." okText="Xóa" cancelText="Hủy" onConfirm={() => remove(level)}><Button danger loading={deletingId === level.id}>Xóa</Button></Popconfirm></Space> },
  ]

  return (
    <section>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}><Typography.Title level={2} style={{ margin: 0 }}>Required Level</Typography.Title><Button type="primary" icon={<PlusOutlined aria-hidden="true" />} onClick={openCreate}>Thêm Required Level</Button></Space>
        <Alert type="info" showIcon message="Thay đổi giá chỉ áp dụng cho công việc được tạo sau thời điểm cập nhật. Công việc cũ giữ nguyên giá và ngân sách đã lưu." />
        {loadError && <Alert type="error" showIcon message={loadError} action={<Button onClick={load}>Thử lại</Button>} />}
        <Table rowKey="id" columns={columns} dataSource={levels} loading={loading} pagination={false} scroll={{ x: 760 }} locale={{ emptyText: 'Chưa có Required Level.' }} />
      </Space>
      <Modal title={editing ? `Chỉnh sửa Required Level #${editing.id}` : 'Thêm Required Level'} open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()} okText={editing ? 'Lưu thay đổi' : 'Tạo mới'} cancelText="Hủy" confirmLoading={saving} destroyOnHidden>
        <Form key={editing ? `edit-${editing.id}` : 'create'} form={form} layout="vertical" initialValues={editing ?? undefined} onFinish={save} preserve={false}>
          <Form.Item name="description" label="Mô tả"><Input autoFocus maxLength={255} /></Form.Item>
          <Form.Item name="pricePerReview" label="Giá mỗi review"><InputNumber min={0} stringMode style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="rank" label="Local Guide rank" extra={!editing ? 'Có thể để trống; backend sẽ dùng mặc định 1.' : undefined}><InputNumber min={1} max={10} style={{ width: '100%' }} /></Form.Item>
        </Form>
      </Modal>
    </section>
  )
}
