import { theme as antd } from 'antd'

const fontFamily = '"Be Vietnam Pro", Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'

export function createAntdTheme(mode = 'light') {
  const dark = mode === 'dark'
  return {
    algorithm: dark ? antd.darkAlgorithm : antd.defaultAlgorithm,
    token: {
      colorPrimary: dark ? '#8b83ff' : '#4f46e5',
      colorInfo: dark ? '#8b83ff' : '#4f46e5',
      colorSuccess: dark ? '#4ade80' : '#15803d',
      colorWarning: dark ? '#fbbf24' : '#b45309',
      colorError: dark ? '#fb7185' : '#b91c1c',
      colorBgLayout: dark ? '#0b1020' : '#f6f8fc',
      colorBgContainer: dark ? '#121a2d' : '#ffffff',
      colorBorder: dark ? '#2b3852' : '#dbe2ea',
      borderRadius: 12,
      borderRadiusLG: 18,
      controlHeight: 44,
      fontFamily,
      fontSize: 15,
      lineHeight: 1.55,
    },
    components: {
      Button: {
        controlHeight: 48,
        fontWeight: 700,
        primaryShadow: dark ? '0 10px 28px rgb(0 0 0 / 32%)' : '0 10px 26px rgb(79 70 229 / 22%)',
      },
      Input: {
        activeShadow: dark ? '0 0 0 3px rgb(139 131 255 / 24%)' : '0 0 0 3px rgb(99 102 241 / 18%)',
        controlHeight: 48,
      },
      Form: {
        itemMarginBottom: 20,
        labelFontSize: 14,
      },
      Card: { headerFontSize: 16 },
      Typography: { titleMarginBottom: '0.55em' },
    },
  }
}

export const antdTheme = createAntdTheme('light')
