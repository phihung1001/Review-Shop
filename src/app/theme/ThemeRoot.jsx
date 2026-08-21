import { useMemo, useSyncExternalStore } from 'react'
import { App as AntApp, ConfigProvider } from 'antd'
import viVN from 'antd/locale/vi_VN'
import { App } from '@/app/App.jsx'
import { createAntdTheme } from './antdTheme.js'
import { themePreference } from './themePreference.js'

export function ThemeRoot() {
  const mode = useSyncExternalStore(themePreference.subscribe, themePreference.getSnapshot)
  const theme = useMemo(() => createAntdTheme(mode), [mode])

  return (
    <ConfigProvider locale={viVN} theme={theme}>
      <AntApp>
        <App />
      </AntApp>
    </ConfigProvider>
  )
}
