import {
  AuditOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  StarOutlined,
  TeamOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'

export const metrics = [
  { title: 'Freelancer demo', value: 1200, suffix: '+' },
  { title: 'Công việc demo', value: 3400, suffix: '+' },
  { title: 'Đánh giá mẫu', value: 8600, suffix: '+' },
  { title: 'Hoàn thành đúng hạn', value: 96, suffix: '%' },
]

export const audiences = [
  {
    key: 'client',
    label: 'Dành cho khách hàng',
    title: 'Tìm đúng người cho công việc của bạn',
    description: 'Từ nhu cầu đến kết quả, mọi bước đều rõ ràng và dễ theo dõi.',
    items: ['Đăng yêu cầu trong vài phút', 'So sánh hồ sơ và đánh giá', 'Theo dõi tiến độ minh bạch', 'Xác nhận khi công việc hoàn tất'],
    cta: 'Thuê Freelancer',
    href: '/register?role=CLIENT',
    icon: SearchOutlined,
  },
  {
    key: 'freelancer',
    label: 'Dành cho Freelancer',
    title: 'Biến kỹ năng thành cơ hội bền vững',
    description: 'Tiếp cận công việc phù hợp và xây dựng uy tín từ kết quả thực tế.',
    items: ['Khám phá cơ hội phù hợp', 'Chủ động ứng tuyển', 'Làm việc theo quy trình rõ ràng', 'Tích lũy đánh giá đáng tin cậy'],
    cta: 'Trở thành Freelancer',
    href: '/register?role=FREELANCER',
    icon: ThunderboltOutlined,
  },
]

export const featuredJobs = [
  { id: 1, title: 'Thiết kế bộ nhận diện cửa hàng', category: 'Thiết kế', description: 'Xây dựng logo và bộ nhận diện nhất quán cho thương hiệu bán lẻ mới.', budget: '8–12 triệu', deadline: '14 ngày', slots: 2, skills: ['Branding', 'Figma'], status: 'Đang tuyển' },
  { id: 2, title: 'Phát triển landing page sản phẩm', category: 'Công nghệ', description: 'Triển khai landing page responsive, tối ưu chuyển đổi và hiệu năng.', budget: '12–18 triệu', deadline: '21 ngày', slots: 1, skills: ['React', 'Ant Design'], status: 'Nổi bật' },
  { id: 3, title: 'Sản xuất nội dung mạng xã hội', category: 'Marketing', description: 'Lập kế hoạch và sản xuất nội dung cho chiến dịch ra mắt trong một tháng.', budget: '6–10 triệu', deadline: '30 ngày', slots: 3, skills: ['Content', 'Social'], status: 'Đang tuyển' },
]

export const workflow = {
  CLIENT: [
    { title: 'Tạo tài khoản', content: 'Cho chúng tôi biết nhu cầu của bạn.' },
    { title: 'Đăng công việc', content: 'Mô tả kết quả, ngân sách và thời hạn.' },
    { title: 'Chọn Freelancer', content: 'So sánh kỹ năng và đánh giá phù hợp.' },
    { title: 'Xác nhận kết quả', content: 'Nghiệm thu và chia sẻ đánh giá thật.' },
  ],
  FREELANCER: [
    { title: 'Tạo tài khoản', content: 'Đăng ký với vai trò Freelancer.' },
    { title: 'Hoàn thiện hồ sơ', content: 'Trình bày kỹ năng và kinh nghiệm nổi bật.' },
    { title: 'Nhận công việc', content: 'Chọn cơ hội phù hợp với năng lực.' },
    { title: 'Xây dựng uy tín', content: 'Hoàn thành tốt và tích lũy đánh giá.' },
  ],
}

export const trustItems = [
  { icon: SafetyCertificateOutlined, title: 'Hồ sơ minh bạch', description: 'Kinh nghiệm và lịch sử đánh giá giúp bạn đưa ra lựa chọn có cơ sở.' },
  { icon: AuditOutlined, title: 'Quy trình rõ ràng', description: 'Phạm vi, thời hạn và kết quả mong đợi được thống nhất từ đầu.' },
  { icon: DollarOutlined, title: 'Giao dịch có kiểm soát', description: 'Luồng xác nhận được thiết kế để giảm rủi ro cho cả hai phía.' },
  { icon: StarOutlined, title: 'Đánh giá từ trải nghiệm', description: 'Uy tín được hình thành từ chất lượng công việc và phản hồi thực tế.' },
]

export const testimonials = [
  { name: 'Minh Anh', role: 'Khách hàng · Bán lẻ', initials: 'MA', rating: 5, quote: 'Mock review: Tôi tìm được Freelancer phù hợp nhanh hơn và dễ theo dõi các mốc công việc.' },
  { name: 'Hoàng Nam', role: 'Freelancer · Thiết kế', initials: 'HN', rating: 5, quote: 'Mock review: Yêu cầu công việc rõ ràng giúp tôi tập trung vào chất lượng sản phẩm.' },
  { name: 'Thu Hà', role: 'Khách hàng · F&B', initials: 'TH', rating: 5, quote: 'Mock review: Hồ sơ và đánh giá giúp đội ngũ của tôi lựa chọn tự tin hơn.' },
]

export const faqs = [
  { key: '1', label: 'Review Shop hoạt động như thế nào?', children: 'Khách hàng đăng nhu cầu, Freelancer tiếp cận cơ hội phù hợp và hai bên phối hợp theo các mốc công việc rõ ràng.' },
  { key: '2', label: 'Đăng ký có mất phí không?', children: 'Chính sách giá chưa được công bố. Thông tin chính thức sẽ được hiển thị trước khi bạn sử dụng dịch vụ có tính phí.' },
  { key: '3', label: 'Làm sao để trở thành Freelancer?', children: 'Chọn vai trò Freelancer khi đăng ký, sau đó hoàn thiện hồ sơ kỹ năng và kinh nghiệm của bạn.' },
  { key: '4', label: 'Thanh toán được xử lý như thế nào?', children: 'Quy trình thanh toán đang được hoàn thiện. Mọi điều kiện áp dụng sẽ được trình bày minh bạch trước khi xác nhận công việc.' },
  { key: '5', label: 'Review có được xác minh không?', children: 'Mục tiêu sản phẩm là gắn review với trải nghiệm công việc thực tế; cơ chế xác minh chi tiết phụ thuộc backend và sẽ được công bố khi sẵn sàng.' },
  { key: '6', label: 'Nếu xảy ra tranh chấp thì sao?', children: 'Nền tảng định hướng cung cấp luồng hỗ trợ và lưu lại các mốc trao đổi; chính sách giải quyết chính thức sẽ được công bố riêng.' },
  { key: '7', label: 'Có thể vừa là khách hàng vừa là Freelancer không?', children: 'Hiện tại mỗi lần đăng ký chọn một vai trò. Cơ chế sử dụng nhiều vai trò sẽ phụ thuộc chính sách tài khoản trong giai đoạn tiếp theo.' },
]

export const heroSignals = [
  { icon: CheckCircleOutlined, text: 'Hồ sơ rõ ràng' },
  { icon: TeamOutlined, text: 'Kết nối đúng người' },
  { icon: SafetyCertificateOutlined, text: 'Quy trình minh bạch' },
]
