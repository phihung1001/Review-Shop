import styles from './ReviewGgmMark.module.css'

export function ReviewGgmMark({ className = '' }) {
  return (
    <svg className={`${styles.mark} ${className}`} viewBox="0 0 48 56" aria-hidden="true" focusable="false">
      <path className={styles.pin} d="M24 54S6 35.7 6 20.6C6 9.9 14.1 2 24 2s18 7.9 18 18.6C42 35.7 24 54 24 54Z" />
      <path className={styles.inner} d="M24 45.2C18.7 39.3 11.5 30 11.5 20.7c0-7.4 5.6-13.1 12.5-13.1s12.5 5.7 12.5 13.1c0 9.3-7.2 18.6-12.5 24.5Z" />
      <path className={styles.grid} d="M14.3 28.1h19.4M16.9 34h14.2M19.7 39.7h8.6M17 22.7h14M19 16.7h10" />
      <path className={styles.star} d="m24 10.3 2.8 5.7 6.3.9-4.6 4.5 1.1 6.3-5.6-3-5.6 3 1.1-6.3-4.6-4.5 6.3-.9 2.8-5.7Z" />
    </svg>
  )
}
