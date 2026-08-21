import styles from './AuthLayout.module.css'

export function AuthLayout({ children, title, description }) {
  return (
    <main className={styles.page}>
      <section className={styles.intro} aria-label="Giới thiệu Review Shop">
        <a className={styles.brand} href="/" aria-label="Review Shop - Trang chủ">Review<span>Shop</span></a>
        <div className={styles.introContent}>
          <p className={styles.eyebrow}>Cộng đồng mua sắm thông thái</p>
          <h1>Review thật.<br />Lựa chọn tốt hơn.</h1>
          <p>Khám phá đánh giá đáng tin cậy và chia sẻ trải nghiệm của bạn với cộng đồng.</p>
          <div className={styles.proof} aria-label="Điểm nổi bật">
            <span><strong>10K+</strong> đánh giá</span>
            <span><strong>5K+</strong> sản phẩm</span>
          </div>
        </div>
        <div className={styles.decoration} aria-hidden="true" />
      </section>

      <section className={styles.formSide}>
        <div className={styles.mobileBrand}><a href="/">Review<span>Shop</span></a></div>
        <div className={styles.card}>
          <header className={styles.heading}>
            <h2>{title}</h2>
            <p>{description}</p>
          </header>
          {children}
        </div>
        <p className={styles.footer}>© {new Date().getFullYear()} Review Shop</p>
      </section>
    </main>
  )
}

