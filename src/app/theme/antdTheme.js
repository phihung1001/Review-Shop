import { theme as antd } from 'antd'

const fontFamily = '"Be Vietnam Pro", "Segoe UI", "Noto Sans", Arial, sans-serif'

export function createAntdTheme(mode = 'light') {
  const dark = mode === 'dark'
  return {
    algorithm: dark ? antd.darkAlgorithm : antd.defaultAlgorithm,
    token: {
      colorPrimary: dark ? '#f0a45b' : '#b45309',
      colorInfo: dark ? '#f0a45b' : '#b45309',
      colorSuccess: dark ? '#69cf9d' : '#16704a',
      colorWarning: dark ? '#f4c266' : '#a15c00',
      colorError: dark ? '#fb7185' : '#b42318',
      colorBgLayout: dark ? '#101512' : '#f3f5f0',
      colorBgContainer: dark ? '#171d19' : '#fbfcf8',
      colorBorder: dark ? '#334036' : '#d8dfd5',
      borderRadius: 10,
      borderRadiusLG: 16,
      controlHeight: 44,
      fontFamily,
      fontSize: 15,
      lineHeight: 1.55,
    },
    components: {
      Button: {
        controlHeight: 48,
        fontWeight: 700,
      primaryShadow: dark ? '0 8px 20px rgb(0 0 0 / 32%)' : '0 8px 20px rgb(180 83 9 / 20%)',
      },
      Input: {
        activeShadow: dark ? '0 0 0 3px rgb(240 164 91 / 24%)' : '0 0 0 3px rgb(180 83 9 / 18%)',
        controlHeight: 48,
      },
      Form: {
        itemMarginBottom: 20,
        labelFontSize: 14,
      },
      Card: { headerFontSize: 16 },
      Typography: { titleMarginBottom: '0.55em', titleFontFamily: fontFamily },
    },
  }
}

export const antdTheme = createAntdTheme('light')
