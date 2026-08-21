import { Card, Col, Row, Typography } from 'antd'
import { DollarOutlined, SafetyCertificateOutlined, TeamOutlined, WalletOutlined } from '@ant-design/icons'

const sections = [
  { href: '/admin/users', title: 'Quản lý người dùng', description: 'Khu vực quản lý tài khoản đang chờ API backend.', icon: <TeamOutlined aria-hidden="true" /> },
  { href: '/admin/required-levels', title: 'Required Level', description: 'Thiết lập cấp độ và giá cho mỗi review.', icon: <SafetyCertificateOutlined aria-hidden="true" /> },
  { href: '/admin/platform-fee', title: 'Platform Fee', description: 'Theo dõi và cập nhật tỷ lệ phí nền tảng.', icon: <DollarOutlined aria-hidden="true" /> },
  { href: '/admin/withdrawals', title: 'Yêu cầu rút tiền', description: 'Kiểm tra và xử lý yêu cầu rút tiền của Freelancer.', icon: <WalletOutlined aria-hidden="true" /> },
]

export function AdminOverviewPage() {
  return <section><Typography.Title level={2}>Tổng quan</Typography.Title><Row gutter={[16, 16]}>{sections.map((item) => <Col xs={24} md={12} xl={8} key={item.href}><Card hoverable title={<>{item.icon} {item.title}</>}><Typography.Paragraph>{item.description}</Typography.Paragraph><a href={item.href}>Mở chức năng →</a></Card></Col>)}</Row></section>
}
