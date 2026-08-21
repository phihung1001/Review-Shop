import styles from './Alert.module.css'

export function Alert({ children, type = 'error' }) {
  return <div className={`${styles.alert} ${styles[type]}`} role={type === 'error' ? 'alert' : 'status'}>{children}</div>
}

