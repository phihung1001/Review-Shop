import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, App, Avatar, Button, Card, Drawer, Empty, Flex, Form, Input, Modal, Select, Skeleton, Tag, Typography } from 'antd'
import { EyeOutlined, LinkOutlined, PlusOutlined, ReloadOutlined, SafetyCertificateOutlined, UserOutlined } from '@ant-design/icons'
import { getGoogleMapsAccounts, updateGoogleMapsAccountType, verifyGoogleMapsAccount } from '../api/googleMapsAccountApi.js'
import { isValidGoogleMapsContributorUrl } from '../lib/googleMapsAccountValidation.js'
import { ApiError } from '@/shared/api/httpClient.js'
import { authSession } from '@/features/auth/model/authSession.js'
import { navigate } from '@/shared/lib/navigation.js'
import styles from './GoogleMapsAccountsPage.module.css'

const { Paragraph, Text, Title } = Typography
const numberFormatter = new Intl.NumberFormat('vi-VN')
const typeLabels = { VIETNAM: 'Việt Nam', FOREIGN: 'Nước ngoài' }
const accountTypeOptions = Object.entries(typeLabels).map(([value, label]) => ({ value, label }))

function valueOrUnavailable(value) { return Number.isInteger(value) ? numberFormatter.format(value) : 'Không xác định' }
function typeLabel(type) { return type ? typeLabels[type] ?? type : 'Chưa thiết lập' }
function verifiedDate(value) { const date = value ? new Date(value) : null; return date && !Number.isNaN(date.getTime()) ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(date) : 'Không xác định' }
function readiness(account) {
  if (!account.accountType) return { label: 'Chưa thiết lập loại tài khoản', color: 'gold' }
  if (account.readyForJobs) return { label: 'Sẵn sàng nhận Job', color: 'green' }
  return { label: 'Chưa sẵn sàng nhận Job', color: 'default' }
}

function AccountDetail({ account, onClose }) {
  if (!account) return null
  const ready = readiness(account)
  return <Drawer title="Chi tiết tài khoản Google Maps" open onClose={onClose} size="large" destroyOnHidden><div className={styles.detail}>
    <Flex gap="middle" align="center"><Avatar size={64} src={account.thumbnail || undefined} icon={!account.thumbnail ? <UserOutlined aria-hidden="true" /> : undefined} /><div><Title level={3}>{account.accountName || 'Tài khoản Google Maps'}</Title><Tag color={ready.color}>{ready.label}</Tag></div></Flex>
    <div className={styles.detailGrid}><div><Text type="secondary">Contributor ID</Text><strong>{account.contributorId || 'Không xác định'}</strong></div><div><Text type="secondary">Cấp Local Guide</Text><strong>{valueOrUnavailable(account.localGuideLevel)}</strong></div><div><Text type="secondary">Điểm</Text><strong>{valueOrUnavailable(account.points)}</strong></div><div><Text type="secondary">Bài đánh giá</Text><strong>{valueOrUnavailable(account.reviewCount)}</strong></div><div><Text type="secondary">Loại tài khoản</Text><strong>{typeLabel(account.accountType)}</strong></div><div><Text type="secondary">Xác minh lúc</Text><strong>{verifiedDate(account.verifiedAt)}</strong></div></div>
    {account.profileUrl && <Button href={account.profileUrl} target="_blank" rel="noreferrer" icon={<LinkOutlined aria-hidden="true" />}>Mở Contributor Profile</Button>}
  </div></Drawer>
}

export function GoogleMapsAccountsPage() {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [accounts, setAccounts] = useState([])
  const [listStatus, setListStatus] = useState('loading')
  const [listError, setListError] = useState('')
  const [syncWarning, setSyncWarning] = useState('')
  const [selected, setSelected] = useState(null)
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const requestLock = useRef(false)

  const loadAccounts = useCallback(async ({ preserve = false } = {}) => {
    if (!preserve) setListStatus('loading')
    setListError('')
    try { setAccounts(await getGoogleMapsAccounts()); setListStatus('success'); return true }
    catch (requestError) {
      if (!preserve) setAccounts([])
      if (requestError instanceof ApiError && requestError.status === 401) { setAccounts([]); authSession.clear(); navigate('/login?redirect=%2Ffreelancer%2Fgoogle-maps-accounts', { replace: true }); return false }
      setListError(requestError instanceof ApiError ? requestError.message : 'Không thể tải danh sách tài khoản Google Maps.'); setListStatus('error'); return false
    }
  }, [])
  useEffect(() => { queueMicrotask(loadAccounts) }, [loadAccounts])

  async function submit() {
    const { profileUrl, accountType } = await form.validateFields()
    if (requestLock.current) return
    requestLock.current = true; setSubmitting(true); setError(''); setSyncWarning('')
    try {
      const normalizedProfileUrl = profileUrl.trim()
      const verifyResponse = await verifyGoogleMapsAccount(normalizedProfileUrl)
      const verifiedBody = verifyResponse?.data ?? verifyResponse
      let accountId = verifiedBody?.id
      if (accountId === null || accountId === undefined || !String(accountId).trim()) {
        const refreshedAccounts = await getGoogleMapsAccounts()
        accountId = refreshedAccounts.find((account) => account.profileUrl === normalizedProfileUrl)?.id
      }
      if (accountId === null || accountId === undefined || !String(accountId).trim()) throw new Error('Tài khoản đã được xác minh nhưng không nhận được ID để cập nhật loại tài khoản.')
      await updateGoogleMapsAccountType(accountId, accountType)
      setOpen(false); form.resetFields(); message.success('Xác minh tài khoản Google Maps thành công.')
      if (!await loadAccounts({ preserve: true })) setSyncWarning('Tài khoản đã được xác minh nhưng danh sách chưa được cập nhật.')
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) { setAccounts([]); authSession.clear(); navigate('/login?redirect=%2Ffreelancer%2Fgoogle-maps-accounts', { replace: true }); return }
      setError(requestError instanceof ApiError ? requestError.message : requestError?.message || 'Không thể xác minh tài khoản Google Maps.')
    } finally { requestLock.current = false; setSubmitting(false) }
  }
  function closeModal() { if (!submitting) { setOpen(false); setError('') } }

  return <div className={styles.page}>
    <header className={styles.heading}><Flex justify="space-between" align="start" gap="middle" wrap><div><Text className={styles.eyebrow}>GOOGLE MAPS ACCOUNT</Text><Title id="account-page-title">Xác thực tài khoản</Title><Paragraph>Quản lý tài khoản Google Maps để đủ điều kiện nhận Job.</Paragraph></div><Button icon={<ReloadOutlined aria-hidden="true" />} loading={listStatus === 'loading'} onClick={() => loadAccounts()}>Làm mới</Button></Flex></header>
    {syncWarning && <Alert className={styles.success} type="warning" showIcon title={syncWarning} action={<Button onClick={() => loadAccounts({ preserve: true })}>Thử lại</Button>} />}
    <Card className={styles.accountCard} title={<span><SafetyCertificateOutlined aria-hidden="true" /> Tài khoản Google Maps</span>}>
      <Paragraph className={styles.cardHeader}>Các Contributor Profile đã được xác minh của bạn.</Paragraph>
      {listError && <Alert className={styles.success} type="error" showIcon title={listError} action={<Button onClick={() => loadAccounts()}>Thử lại</Button>} />}
      {listStatus === 'loading' ? <div className={styles.accountList} role="status" aria-label="Đang tải tài khoản Google Maps">{[1, 2].map((key) => <Card key={key}><Skeleton active avatar /></Card>)}</div> : accounts.length === 0 ? <Empty className={styles.empty} description="Bạn chưa xác minh tài khoản Google Maps nào." /> : <div className={styles.accountList}>{accounts.map((account) => { const ready = readiness(account); return <article key={account.id}><Card size="small" className={styles.accountItem}><Flex justify="space-between" align="start" gap="small" wrap><Flex gap="small" align="center"><Avatar size={48} src={account.thumbnail || undefined} icon={!account.thumbnail ? <UserOutlined aria-hidden="true" /> : undefined} /><div className={styles.identity}><Title level={4}>{account.accountName || 'Tài khoản Google Maps'}</Title><Text type="secondary">Contributor ID: {account.contributorId || 'Không xác định'}</Text></div></Flex><Tag color={ready.color}>{ready.label}</Tag></Flex><div className={styles.metrics}><div><Text type="secondary">Cấp Local Guide</Text><strong>{valueOrUnavailable(account.localGuideLevel)}</strong></div><div><Text type="secondary">Điểm</Text><strong>{valueOrUnavailable(account.points)}</strong></div><div><Text type="secondary">Bài đánh giá</Text><strong>{valueOrUnavailable(account.reviewCount)}</strong></div></div><Text type="secondary">Xác minh lúc: {verifiedDate(account.verifiedAt)}</Text><div className={styles.accountActions}>{account.profileUrl && <Button href={account.profileUrl} target="_blank" rel="noreferrer" icon={<LinkOutlined aria-hidden="true" />}>Mở hồ sơ</Button>}<Button icon={<EyeOutlined aria-hidden="true" />} onClick={() => setSelected(account)} aria-label={`Xem chi tiết ${account.accountName || 'tài khoản Google Maps'}`}>Xem chi tiết</Button></div></Card></article> })}</div>}
      <Button className={styles.addButton} block icon={<PlusOutlined aria-hidden="true" />} onClick={() => setOpen(true)}>Thêm tài khoản</Button>
    </Card>
    <AccountDetail account={selected} onClose={() => setSelected(null)} />
    <Modal title="Xác minh tài khoản Google Maps" open={open} onCancel={closeModal} onOk={submit} okText="Xác minh tài khoản" cancelText="Hủy" closable={!submitting} mask={{ closable: !submitting }} okButtonProps={{ loading: submitting, disabled: submitting }} cancelButtonProps={{ disabled: submitting }}>
      {error && <Alert className={styles.modalAlert} type="error" showIcon title={error} />}{submitting && <Alert className={styles.modalAlert} type="info" showIcon title="Đang xác minh và cập nhật loại tài khoản…" />}
      <Form form={form} layout="vertical"><Form.Item name="profileUrl" label="Google Maps Contributor Profile URL" validateTrigger="onBlur" rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập Contributor Profile URL.' }, { validator: (_, value) => !value || isValidGoogleMapsContributorUrl(value) ? Promise.resolve() : Promise.reject(new Error('URL phải dùng HTTPS, đúng host Google và có dạng /maps/contrib/{contributorId}.')) }]}><Input disabled={submitting} placeholder="https://www.google.com/maps/contrib/117642509766343273456" /></Form.Item><Text className={styles.helper} type="secondary">Sao chép URL có dạng /maps/contrib/{'{contributorId}'}.</Text><Form.Item name="accountType" label="Loại tài khoản" rules={[{ required: true, message: 'Vui lòng chọn loại tài khoản.' }]}><Select disabled={submitting} placeholder="Chọn loại tài khoản" options={accountTypeOptions} /></Form.Item></Form>
    </Modal>
  </div>
}
