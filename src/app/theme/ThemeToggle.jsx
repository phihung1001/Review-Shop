import { useSyncExternalStore } from 'react'
import { Button, Tooltip } from 'antd'
import { MoonOutlined, SunOutlined } from '@ant-design/icons'
import { themePreference } from './themePreference.js'

export function ThemeToggle({ block = false }) {
  const mode = useSyncExternalStore(themePreference.subscribe, themePreference.getSnapshot)
  const nextLabel = mode === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'

  const button = (
    <Button
      block={block}
      type="text"
      icon={mode === 'dark' ? <SunOutlined aria-hidden="true" /> : <MoonOutlined aria-hidden="true" />}
      aria-label={nextLabel}
      aria-pressed={mode === 'dark'}
      onClick={() => themePreference.toggle()}
    >
      {block ? (mode === 'dark' ? 'Giao diện sáng' : 'Giao diện tối') : null}
    </Button>
  )

  return block ? button : <Tooltip title={nextLabel}>{button}</Tooltip>
}
