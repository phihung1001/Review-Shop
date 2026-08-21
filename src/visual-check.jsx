import { createRoot } from 'react-dom/client'
import { App, ConfigProvider } from 'antd'
import viVN from 'antd/locale/vi_VN'
import { createAntdTheme } from '@/app/theme/antdTheme.js'
import { AdminLayout } from '@/features/admin/ui/AdminLayout/AdminLayout.jsx'
import { AdminWithdrawalsPage } from '@/pages/admin/AdminWithdrawalsPage.jsx'
import '@/app/styles/index.css'

const detail = {
  id: 1024,
  code: 'WD-20260809-0001024',
  status: 'PENDING',
  freelancer: { id: 87, fullName: 'Nguyễn Hoàng Minh Anh với tên hiển thị rất dài', email: 'freelancer.with.a.long.email.address@example.com' },
  amount: 12500000,
  feeAmount: 125000,
  netAmount: 12375000,
  currency: 'VND',
  payoutMethod: { bankCode: 'VCB', bankName: 'Ngân hàng TMCP Ngoại thương Việt Nam', accountNumber: '012345678901234567890123456789', accountHolderName: 'NGUYEN HOANG MINH ANH' },
  transferContent: 'RSH WD-20260809-0001024 NGUYEN HOANG MINH ANH',
  createdAt: '2026-08-09T08:30:00+07:00',
  updatedAt: '2026-08-09T08:35:00+07:00',
}

const rows = [
  detail,
  { ...detail, id: 1025, code: 'WD-20260809-0001025', freelancer: { id: 88, fullName: 'Trần Bình', email: 'binh@example.com' }, amount: 800000, feeAmount: 8000, netAmount: 792000, payoutMethod: { bankCode: 'BIDV', bankName: 'BIDV', accountNumber: '1234567890', accountHolderName: 'TRAN BINH' } },
  { ...detail, id: 1026, code: 'WD-20260809-0001026', freelancer: { id: 89, fullName: 'Lê An', email: 'an@example.com' }, amount: 500000, feeAmount: 5000, netAmount: 495000, payoutMethod: { bankCode: 'MB', bankName: 'MBBank', accountNumber: '9876543210', accountHolderName: 'LE AN' } },
]

window.fetch = async (url) => {
  const requestUrl = String(url)
  const body = /\/admin\/withdrawals\/[^/?]+$/.test(requestUrl) ? detail : rows
  return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })
}

createRoot(document.getElementById('root')).render(
  <ConfigProvider locale={viVN} theme={createAntdTheme('light')}>
    <App>
      <AdminLayout pathname="/admin/withdrawals"><AdminWithdrawalsPage /></AdminLayout>
    </App>
  </ConfigProvider>,
)

if (new URLSearchParams(window.location.search).get('view') === 'detail') {
  window.setTimeout(() => {
    const visibleButton = [...document.querySelectorAll('button')]
      .find((button) => button.textContent.includes('Xem chi tiết') && button.getClientRects().length)
    visibleButton?.click()
  }, 800)
}
