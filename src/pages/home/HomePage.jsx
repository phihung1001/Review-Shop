import { useCallback, useEffect, useState } from 'react'
import {
  Alert, Avatar, Button, Card, Col, Collapse, Empty, Flex, Rate, Row,
  Segmented, Skeleton, Space, Statistic, Steps, Tag, Typography,
} from 'antd'
import {
  ArrowRightOutlined, CalendarOutlined, CrownOutlined,
  RocketOutlined, TeamOutlined,
} from '@ant-design/icons'
import { audiences, faqs, heroSignals, metrics, testimonials, trustItems, workflow } from './model/homeData.js'
import { getOpenFreelancerJobs } from '@/features/freelancer-jobs/api/freelancerJobApi.js'
import { ApiError } from '@/shared/api/httpClient.js'
import { formatCurrency } from '@/shared/lib/formatCurrency.js'
import styles from './HomePage.module.css'

const { Title, Paragraph, Text } = Typography

function SectionHeading({ eyebrow, title, description, centered = false, dark = false }) {
  return (
    <header className={`${styles.sectionHeading} ${centered ? styles.centered : ''}`}>
      <Text className={styles.eyebrow}>{eyebrow}</Text>
      <Title level={2}>{title}</Title>
      {description && <Paragraph className={dark ? styles.darkDescription : undefined}>{description}</Paragraph>}
    </header>
  )
}

export function HeroSection() {
  return (
    <section className={styles.hero} aria-labelledby="home-title">
      <div className={styles.container}>
        <Row align="middle" gutter={[48, 56]}>
          <Col xs={24} lg={13}>
            <Tag variant="filled" className={styles.heroTag} icon={<RocketOutlined />}>Đánh giá Google Maps có bằng chứng</Tag>
            <Title id="home-title" className={styles.heroTitle}>Kết nối đúng người.<br /><span>Đánh giá có cơ sở.</span></Title>
            <Paragraph className={styles.heroCopy}>Review GG Maps kết nối nhu cầu đánh giá Google Maps với người thực hiện phù hợp, theo tiêu chí rõ ràng và kết quả có thể kiểm tra.</Paragraph>
            <Flex gap="middle" wrap className={styles.heroActions}>
              <Button type="primary" size="large" href="/register?role=CLIENT">Bắt đầu ngay · Đánh giá Google Maps <ArrowRightOutlined /></Button>
              <Button size="large" href="#opportunities">Xem nhiệm vụ đánh giá</Button>
            </Flex>
            <Flex gap="large" wrap className={styles.heroSignals}>
              {heroSignals.map(({ icon: Icon, text }) => <span key={text}><Icon aria-hidden="true" /> {text}</span>)}
            </Flex>
          </Col>
          <Col xs={24} lg={11}>
            <div className={styles.heroVisual} aria-label="Bản ghi đánh giá Google Maps minh họa trên Review GG Maps">
              <div className={styles.ledgerPanel}>
                <div className={styles.ledgerHeader}><Text type="secondary">Bản ghi Google Maps / 024</Text><Tag color="green">Đã kiểm tra</Tag></div>
                <Title level={3}>Đánh giá địa điểm · Quận 1</Title>
                <div className={styles.ledgerRule} />
                <div className={styles.ledgerRows}>
                  <div><Text type="secondary">Contributor</Text><Text strong>Hà Linh · Level 4</Text></div>
                  <div><Text type="secondary">Tiêu chí</Text><Text strong>Thông tin địa điểm đã đối chiếu</Text></div>
                  <div><Text type="secondary">Kết quả</Text><Text strong>Đạt 5/5 tiêu chí</Text></div>
                </div>
                <div className={styles.ledgerProgress}><span style={{ '--progress': '100%' }} /><Text>100% tiêu chí đã kiểm tra</Text></div>
                <div className={styles.ledgerFooter}><Avatar.Group><Avatar>NA</Avatar><Avatar className={styles.avatarAccent}>HL</Avatar></Avatar.Group><Text type="secondary">Cập nhật 12 phút trước</Text></div>
              </div>
              <div className={styles.reviewNote}><Text strong>Đánh giá có bằng chứng</Text><Rate disabled defaultValue={5} className={styles.rateSmall} /><Paragraph>Thông tin được đối chiếu trước khi gửi kết quả.</Paragraph></div>
            </div>
          </Col>
        </Row>
      </div>
    </section>
  )
}

function MetricsSection() {
  return <section className={styles.metrics} aria-label="Số liệu minh họa"><div className={styles.container}><Text className={styles.demoNote}>Dữ liệu minh họa cho trải nghiệm sản phẩm</Text><Row gutter={[24, 24]}>{metrics.map((item) => <Col xs={24} sm={12} md={6} key={item.title}><Statistic {...item} /></Col>)}</Row></div></section>
}

export function AudienceSection() {
  return (
    <section className={styles.section} id="audience"><div className={styles.container}>
      <SectionHeading centered eyebrow="Một nền tảng · Hai hành trình" title="Đánh giá Google Maps rõ ràng hơn" description="Một phía tạo nhiệm vụ và tiêu chí; phía còn lại kiểm tra, ghi nhận và gửi kết quả có bằng chứng." />
      <Row gutter={[24, 24]}>{audiences.map(({ icon: Icon, ...item }) => <Col xs={24} md={12} key={item.key}><Card className={`${styles.audienceCard} ${styles[item.key]}`} variant="borderless"><div className={styles.audienceIcon}><Icon aria-hidden="true" /></div><Text className={styles.cardEyebrow}>{item.label}</Text><Title level={3}>{item.title}</Title><Paragraph>{item.description}</Paragraph><ul className={styles.audienceList}>{item.items.map((value) => <li key={value}><Space><span className={styles.check}>✓</span>{value}</Space></li>)}</ul><Button type="primary" href={item.href}>{item.cta} <ArrowRightOutlined /></Button></Card></Col>)}</Row>
    </div></section>
  )
}

function jobMoney(job) {
  if (!Number.isFinite(job.payoutPerTask)) return 'Chưa cập nhật payout'
  try { return formatCurrency(job.payoutPerTask, job.currency) } catch { return new Intl.NumberFormat('vi-VN').format(job.payoutPerTask) }
}

export function FeaturedJobsSection({ state = 'success', jobs = [], error = '', onRetry }) {
  let content
  if (state === 'loading') content = <Row gutter={[24, 24]}>{[1, 2, 3].map((id) => <Col xs={24} md={12} lg={8} key={id}><Card><Skeleton active /></Card></Col>)}</Row>
  else if (state === 'empty') content = <Empty description="Hiện chưa có Job nào đang mở" />
  else if (state === 'error') content = <Alert type="error" showIcon title={error || 'Không thể tải nhiệm vụ đánh giá lúc này'} action={<Button onClick={onRetry}>Thử lại</Button>} />
  else content = <Row gutter={[24, 24]}>{jobs.map((job) => <Col xs={24} md={12} lg={8} key={job.id}><Card className={styles.jobCard} hoverable><Flex justify="space-between" align="center"><Tag color="geekblue">{job.requiredLevel.description || 'Chưa xác định level'}</Tag><Tag color="green">Đang mở</Tag></Flex><Title level={4}>{job.title || `Nhiệm vụ đánh giá #${job.id}`}</Title><Paragraph ellipsis={{ rows: 2 }}>{job.description || 'Nhiệm vụ chưa có mô tả.'}</Paragraph><Flex gap="small" wrap>{job.requiredLevel.rank !== null && <Tag>Rank {job.requiredLevel.rank}</Tag>}<Tag>{job.reviewContents.filter((item) => item.available).length} tiêu chí khả dụng</Tag></Flex><div className={styles.jobMeta}><span><CrownOutlined aria-hidden="true" /> {jobMoney(job)}</span><span><TeamOutlined aria-hidden="true" /> {job.availableSlots ?? '—'}/{job.totalSlots ?? '—'} người thực hiện</span></div><Button type="link" href={`/login?redirect=${encodeURIComponent('/freelancer/dashboard')}`}>Xem nhiệm vụ <ArrowRightOutlined aria-hidden="true" /></Button></Card></Col>)}</Row>
  return <section className={`${styles.section} ${styles.softSection}`} id="opportunities"><div className={styles.container}><Flex justify="space-between" align="end" wrap gap="middle"><SectionHeading eyebrow="Nhiệm vụ mới" title="Đánh giá Google Maps đang mở" description="Các nhiệm vụ cần người kiểm tra thông tin và gửi kết quả theo tiêu chí rõ ràng." /><Button href="/freelancer/dashboard">Xem tất cả</Button></Flex>{content}</div></section>
}

export function HomeOpenJobs() {
  const [state, setState] = useState({ status: 'loading', jobs: [], error: '' })
  const loadJobs = useCallback(async () => {
    setState((current) => ({ ...current, status: 'loading', error: '' }))
    try {
      const jobs = await getOpenFreelancerJobs()
      setState({ status: jobs.length ? 'success' : 'empty', jobs: jobs.slice(0, 6), error: '' })
    } catch (requestError) {
      setState({ status: 'error', jobs: [], error: requestError instanceof ApiError ? requestError.message : 'Không thể tải cơ hội lúc này' })
    }
  }, [])
  useEffect(() => { queueMicrotask(loadJobs) }, [loadJobs])
  return <FeaturedJobsSection state={state.status} jobs={state.jobs} error={state.error} onRetry={loadJobs} />
}

export function WorkflowSection() {
  const [role, setRole] = useState('CLIENT')
  return <section className={styles.section} id="workflow"><div className={styles.container}><SectionHeading centered eyebrow="Cách hoạt động" title="Bắt đầu chỉ với vài bước" description="Tạo nhiệm vụ, kiểm tra Google Maps theo tiêu chí và gửi kết quả có thể đối chiếu." /><div className={styles.workflowSwitch}><Segmented value={role} onChange={setRole} options={[{ label: 'Tôi là khách hàng', value: 'CLIENT' }, { label: 'Tôi là Freelancer', value: 'FREELANCER' }]} /></div><Steps responsive current={-1} items={workflow[role]} /></div></section>
}

function TrustSection() {
  return <section className={`${styles.section} ${styles.darkSection}`}><div className={styles.container}><SectionHeading centered dark eyebrow="Niềm tin được xây từ quy trình" title="An tâm hơn trong mỗi lần hợp tác" description="Các nguyên tắc sản phẩm hướng tới sự rõ ràng, công bằng và trách nhiệm cho cả hai phía." /><Row gutter={[24, 24]}>{trustItems.map(({ icon: Icon, ...item }) => <Col xs={24} sm={12} lg={6} key={item.title}><div className={styles.trustItem}><Icon aria-hidden="true" /><Title level={4}>{item.title}</Title><Paragraph className={styles.trustDescription}>{item.description}</Paragraph></div></Col>)}</Row></div></section>
}

function TestimonialsSection() {
  return <section className={styles.section}><div className={styles.container}><SectionHeading centered eyebrow="Góc nhìn cộng đồng" title="Kết quả đánh giá tạo nên uy tín" description="Nội dung dưới đây là ví dụ minh họa, chưa phải đánh giá từ người dùng thật." /><Row gutter={[24, 24]}>{testimonials.map((item) => <Col xs={24} md={8} key={item.name}><Card className={styles.testimonial}><Rate disabled value={item.rating} /><Paragraph>{item.quote}</Paragraph><Flex gap="small" align="center"><Avatar>{item.initials}</Avatar><div><Text strong>{item.name}</Text><br /><Text type="secondary">{item.role}</Text></div></Flex></Card></Col>)}</Row></div></section>
}

function FaqSection() {
  return <section className={`${styles.section} ${styles.softSection}`} id="faq"><div className={`${styles.container} ${styles.faqContainer}`}><SectionHeading centered eyebrow="Giải đáp nhanh" title="Câu hỏi thường gặp" description="Những điều bạn cần biết trước khi bắt đầu." /><Collapse items={faqs} accordion /></div></section>
}

function FinalCtaSection() {
  return <section className={styles.finalCta}><div className={styles.container}><div className={styles.ctaPanel}><CalendarOutlined className={styles.ctaIcon} aria-hidden="true" /><Title level={2}>Sẵn sàng đánh giá Google Maps rõ ràng hơn?</Title><Paragraph className={styles.ctaDescription}>Tạo nhiệm vụ đánh giá hoặc tham gia kiểm tra thông tin địa điểm theo tiêu chí cụ thể.</Paragraph><Flex justify="center" gap="middle" wrap><Button type="primary" size="large" href="/register?role=CLIENT">Tạo nhiệm vụ đánh giá</Button><Button size="large" href="/register?role=FREELANCER">Tham gia đánh giá</Button></Flex></div></div></section>
}

export function HomePage() {
  return <><HeroSection /><MetricsSection /><AudienceSection /><HomeOpenJobs /><WorkflowSection /><TrustSection /><TestimonialsSection /><FaqSection /><FinalCtaSection /></>
}
