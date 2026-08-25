import styles from './AuthLayout.module.css'
import { ReviewGgmMark } from '@/shared/ui/branding/ReviewGgmMark.jsx'

export function AuthLayout({ children, title, description }) {
  return (
    <main className={styles.page}>
      <section className={styles.intro} aria-label="Giới thiệu Review GG Maps">
        <a className={styles.brand} href="/" aria-label="Review GG Maps - Trang chủ"><span className={styles.brandMark}><ReviewGgmMark /></span><span>Review<span>GGM</span></span></a>
        <div className={styles.introContent}>
          <p className={styles.eyebrow}>Đánh giá Google Maps có bằng chứng</p>
          <h1>Kiểm tra rõ ràng.<br />Đánh giá có cơ sở.</h1>
          <p>Tạo nhiệm vụ, kiểm tra thông tin địa điểm và ghi nhận kết quả theo tiêu chí cụ thể.</p>
          <div className={styles.proof} aria-label="Điểm nổi bật">
            <span><strong>Contributor</strong> được xác minh</span>
            <span><strong>Tiêu chí</strong> rõ ràng</span>
          </div>
        </div>
        <div className={styles.decoration} aria-hidden="true" />
      </section>

      <section className={styles.formSide}>
        <div className={styles.mobileBrand}><a href="/"><span className={styles.brandMark}><ReviewGgmMark /></span><span>Review<span>GGM</span></span></a></div>
        <div className={styles.card}>
          <header className={styles.heading}>
            <h2>{title}</h2>
            <p>{description}</p>
          </header>
          {children}
        </div>
        <p className={styles.footer}>© {new Date().getFullYear()} Review GG Maps</p>
      </section>
    </main>
  )
}
