import styles from './FormField.module.css'

export function FormField({ id, label, error, hint, children }) {
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      {typeof children === 'function' ? children({ describedBy, invalid: Boolean(error) }) : children}
      {hint && <span className={styles.hint} id={`${id}-hint`}>{hint}</span>}
      {error && <span className={styles.error} id={`${id}-error`}>{error}</span>}
    </div>
  )
}

