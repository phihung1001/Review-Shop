import { useState } from 'react'
import { FormField } from '../FormField/FormField.jsx'
import styles from './PasswordField.module.css'

export function PasswordField({ id, label, value, onChange, error, autoComplete, hint }) {
  const [visible, setVisible] = useState(false)
  return (
    <FormField id={id} label={label} error={error} hint={hint}>
      {({ describedBy, invalid }) => (
        <div className={styles.wrapper}>
          <input id={id} name={id} type={visible ? 'text' : 'password'} value={value} onChange={onChange} autoComplete={autoComplete} aria-invalid={invalid} aria-describedby={describedBy} />
          <button type="button" className={styles.toggle} onClick={() => setVisible((current) => !current)} aria-label={visible ? `Ẩn ${label.toLowerCase()}` : `Hiện ${label.toLowerCase()}`} aria-pressed={visible}>
            {visible ? 'Ẩn' : 'Hiện'}
          </button>
        </div>
      )}
    </FormField>
  )
}

