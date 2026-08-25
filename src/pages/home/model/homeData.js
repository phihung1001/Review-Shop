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
  { title: 'Contributor đã xác minh', value: 1200, suffix: '+' },
  { title: 'Nhiệm vụ đánh giá', value: 3400, suffix: '+' },
  { title: 'Đánh giá Google Maps', value: 8600, suffix: '+' },
  { title: 'Kết quả đạt tiêu chí', value: 96, suffix: '%' },
]

export const audiences = [
  {
    key: 'client',
    label: 'Dành cho khách hàng',
    title: 'Tạo nhiệm vụ đánh giá Google Maps',
    description: 'Mô tả địa điểm, tiêu chí cần kiểm tra và nhận kết quả có bằng chứng.',
    items: ['Chọn nội dung cần đánh giá', 'Đặt tiêu chí kiểm tra cụ thể', 'Theo dõi kết quả minh bạch', 'Xác nhận khi nhiệm vụ hoàn tất'],
    cta: 'Thuê Freelancer để đánh giá',
    href: '/register?role=CLIENT',
    icon: SearchOutlined,
  },
  {
    key: 'freelancer',
    label: 'Dành cho người đánh giá',
    title: 'Kiểm tra Google Maps theo tiêu chí rõ ràng',
    description: 'Thực hiện nhiệm vụ bản đồ, gửi bằng chứng và xây dựng uy tín từ kết quả chính xác.',
    items: ['Xem nhiệm vụ phù hợp', 'Kiểm tra thông tin địa điểm', 'Gửi bằng chứng theo yêu cầu', 'Tích lũy đánh giá đáng tin cậy'],
    cta: 'Trở thành Freelancer đánh giá',
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
    { title: 'Tạo tài khoản', content: 'Cho chúng tôi biết địa điểm hoặc nội dung cần đánh giá.' },
    { title: 'Tạo nhiệm vụ', content: 'Mô tả tiêu chí kiểm tra và bằng chứng cần có.' },
    { title: 'Chọn người đánh giá', content: 'Xem hồ sơ và lịch sử đánh giá phù hợp.' },
    { title: 'Xác nhận kết quả', content: 'Kiểm tra bằng chứng và ghi nhận kết quả.' },
  ],
  FREELANCER: [
    { title: 'Tạo tài khoản', content: 'Đăng ký với vai trò Freelancer.' },
    { title: 'Hoàn thiện hồ sơ', content: 'Kết nối Contributor Profile và thông tin cần thiết.' },
    { title: 'Nhận nhiệm vụ', content: 'Chọn nhiệm vụ Google Maps phù hợp với năng lực.' },
    { title: 'Gửi kết quả', content: 'Kiểm tra theo tiêu chí và tải lên bằng chứng.' },
  ],
}

export const trustItems = [
  { icon: SafetyCertificateOutlined, title: 'Hồ sơ minh bạch', description: 'Kinh nghiệm và lịch sử đánh giá giúp bạn đưa ra lựa chọn có cơ sở.' },
  { icon: AuditOutlined, title: 'Tiêu chí rõ ràng', description: 'Nội dung cần kiểm tra và điều kiện đạt được thống nhất từ đầu.' },
  { icon: DollarOutlined, title: 'Bằng chứng có thể đối chiếu', description: 'Kết quả được gắn với thông tin địa điểm và bằng chứng phù hợp.' },
  { icon: StarOutlined, title: 'Uy tín từ kết quả', description: 'Lịch sử đánh giá được hình thành từ độ chính xác và tính nhất quán.' },
]

export const testimonials = [
  { name: 'Minh Anh', role: 'Khách hàng · Chuỗi cửa hàng', initials: 'MA', rating: 5, quote: 'Ví dụ minh họa: Tôi dễ giao tiêu chí đánh giá địa điểm và kiểm tra lại kết quả hơn.' },
  { name: 'Hoàng Nam', role: 'Người đánh giá · Google Maps', initials: 'HN', rating: 5, quote: 'Ví dụ minh họa: Nhiệm vụ rõ ràng giúp tôi biết cần kiểm tra gì và gửi bằng chứng nào.' },
  { name: 'Thu Hà', role: 'Khách hàng · F&B', initials: 'TH', rating: 5, quote: 'Ví dụ minh họa: Lịch sử đánh giá giúp đội ngũ của tôi có thêm cơ sở khi quyết định.' },
]

export const faqs = [
  { key: '1', label: 'Review GG Maps đánh giá Google Maps như thế nào?', children: 'Khách hàng tạo nhiệm vụ với tiêu chí cụ thể, người đánh giá kiểm tra thông tin địa điểm và gửi kết quả kèm bằng chứng.' },
  { key: '2', label: 'Tôi có thể yêu cầu đánh giá địa điểm nào?', children: 'Bạn có thể tạo nhiệm vụ cho nội dung Google Maps phù hợp với tiêu chí và chính sách của nền tảng.' },
  { key: '3', label: 'Làm sao để trở thành người đánh giá?', children: 'Chọn vai trò Freelancer khi đăng ký, hoàn thiện hồ sơ và kết nối Contributor Profile Google Maps nếu được yêu cầu.' },
  { key: '4', label: 'Kết quả đánh giá có được kiểm tra không?', children: 'Kết quả được gắn với tiêu chí và bằng chứng của nhiệm vụ. Cơ chế kiểm tra chi tiết phụ thuộc vào từng luồng backend.' },
  { key: '5', label: 'Review có được xác minh không?', children: 'Mục tiêu sản phẩm là gắn đánh giá với nhiệm vụ, tài khoản và bằng chứng thực tế; cơ chế xác minh chi tiết sẽ được công bố khi sẵn sàng.' },
  { key: '6', label: 'Nếu kết quả đánh giá không chính xác thì sao?', children: 'Nền tảng định hướng lưu lại tiêu chí, bằng chứng và các mốc trao đổi để hỗ trợ việc kiểm tra lại.' },
  { key: '7', label: 'Tôi có thể vừa tạo nhiệm vụ vừa đánh giá không?', children: 'Hiện tại mỗi lần đăng ký chọn một vai trò. Cơ chế sử dụng nhiều vai trò sẽ phụ thuộc chính sách tài khoản trong giai đoạn tiếp theo.' },
]

export const heroSignals = [
  { icon: CheckCircleOutlined, text: 'Tiêu chí rõ ràng' },
  { icon: TeamOutlined, text: 'Contributor phù hợp' },
  { icon: SafetyCertificateOutlined, text: 'Bằng chứng minh bạch' },
]
