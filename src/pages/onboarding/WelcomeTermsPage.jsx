import { useState } from 'react'
import { Button, Card, Typography } from 'antd'
import { CheckCircleFilled, CloseCircleFilled } from '@ant-design/icons'
import { navigate } from '@/shared/lib/navigation.js'
import styles from './WelcomeTermsPage.module.css'

const sections = [
  { title: 'Hướng dẫn dành cho Freelancer', items: ['Chọn một Job phù hợp và nhấn Review (nhớ đọc kỹ yêu cầu của Client).', 'Truy cập link Google Maps được cung cấp và thực hiện đánh giá.', 'Chụp ảnh màn hình phần đánh giá của bạn, trong đó thấy rõ tên và nội dung.', 'Upload ảnh proof lên hệ thống và chờ Client duyệt.', 'Sau khi được duyệt, tiền sẽ được cộng ngay vào ví của bạn.'] },
  { title: 'Hướng dẫn dành cho Client', items: ['Đảm bảo số dư ví đủ trước khi đăng Job.', 'Điền đầy đủ thông tin: tiêu đề, link Google Maps, số lượng review và giá mỗi review.', 'Kiểm tra proof cẩn thận trước khi duyệt vì tiền sẽ được chuyển ngay.', 'Từ chối proof nếu ảnh không hợp lệ và điền lý do rõ ràng.', 'Bắt buộc duyệt hoặc từ chối proof trong vòng 24 giờ.'] },
  { title: 'Hệ thống ví tiền', items: ['Tiền nạp hoặc nhận từ Job được lưu trong ví khả dụng.', 'Tiền đang dùng cho Job đang mở sẽ bị khóa (Escrow) cho đến khi Job hoàn thành.', 'Freelancer có thể rút tối thiểu 10.000đ về tài khoản ngân hàng.', 'Yêu cầu rút tiền sẽ được Admin xử lý trong vòng 24 giờ.'] },
  { title: 'Quy định nghiêm cấm', prohibited: true, items: ['Giả mạo ảnh proof, chỉnh sửa hoặc tái sử dụng ảnh cũ.', 'Đánh giá rác hoặc nội dung không liên quan đến địa điểm.', 'Spam hoặc quấy rối người dùng khác qua kênh chat.', 'Nếu Freelancer và Client liên hệ và làm việc ngoài hệ thống, chúng tôi không chịu trách nhiệm khi xảy ra vấn đề.', 'Mọi hành vi vi phạm có thể dẫn đến khóa tài khoản vĩnh viễn và mất toàn bộ số dư.'] },
  { title: 'Cơ chế bảo vệ và khiếu nại', items: ['Nếu proof bị từ chối oan, hoặc Client quá lâu không duyệt hay từ chối proof, Freelancer có thể gửi khiếu nại để Admin xem xét.', 'Admin có quyền duyệt proof thay Client nếu khiếu nại hợp lệ.', 'Mọi tranh chấp sẽ được xử lý công bằng, minh bạch trong vòng 48 giờ.'] },
]

function RuleList({ items, prohibited }) {
  const Icon = prohibited ? CloseCircleFilled : CheckCircleFilled
  return <ul className={styles.list}>{items.map((item) => <li key={item}><Icon className={prohibited ? styles.prohibitedIcon : styles.allowedIcon} aria-hidden="true" /><span>{item}</span></li>)}</ul>
}

export function WelcomeTermsPage() {
  const [reachedEnd, setReachedEnd] = useState(false)

  function handleScroll(event) {
    const element = event.currentTarget
    if (element.scrollTop + element.clientHeight >= element.scrollHeight - 4) setReachedEnd(true)
  }

  return (
    <main className={styles.page}>
      <Card className={styles.card}>
        <header className={styles.heading}><Typography.Title level={1}>Chào mừng đến với VoteMaps!</Typography.Title><Typography.Paragraph>Vui lòng đọc kỹ hướng dẫn và quy định trước khi bắt đầu.</Typography.Paragraph></header>
        <div className={styles.scrollArea} onScroll={handleScroll} tabIndex={0} role="region" aria-label="Hướng dẫn và quy định sử dụng">
          <Typography.Paragraph>VoteMaps là nền tảng kết nối Client (người đăng task đánh giá Google Maps) và Freelancer (người thực hiện đánh giá). Mọi giao dịch đều được bảo vệ bằng hệ thống Escrow – tiền chỉ được giải phóng khi task được duyệt.</Typography.Paragraph>
          {sections.map((section) => <section key={section.title}><Typography.Title level={2}>{section.title}</Typography.Title><RuleList items={section.items} prohibited={section.prohibited} /></section>)}
          <Typography.Paragraph strong>Bằng cách nhấn “Tôi đồng ý”, bạn xác nhận đã đọc và đồng ý tuân thủ toàn bộ quy định trên.</Typography.Paragraph>
        </div>
        <footer className={styles.footer} aria-live="polite">{reachedEnd ? <Button type="primary" size="large" block onClick={() => navigate('/dashboard', { replace: true })}>Tôi đồng ý</Button> : <Typography.Text type="secondary">Cuộn xuống cuối nội dung để tiếp tục.</Typography.Text>}</footer>
      </Card>
    </main>
  )
}
