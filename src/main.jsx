import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeRoot } from './app/theme/ThemeRoot.jsx'
import './app/styles/index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeRoot />
  </StrictMode>,
)
