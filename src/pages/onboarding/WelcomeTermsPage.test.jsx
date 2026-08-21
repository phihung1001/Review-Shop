import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { WelcomeTermsPage } from './WelcomeTermsPage.jsx'

describe('client welcome terms', () => {
  it('reveals acceptance only after the user reaches the end and then opens dashboard', async () => {
    window.history.replaceState({}, '', '/welcome')
    render(<WelcomeTermsPage />)
    expect(screen.queryByRole('button', { name: 'Tôi đồng ý' })).not.toBeInTheDocument()

    const region = screen.getByRole('region', { name: 'Hướng dẫn và quy định sử dụng' })
    Object.defineProperties(region, {
      clientHeight: { configurable: true, value: 100 },
      scrollHeight: { configurable: true, value: 300 },
      scrollTop: { configurable: true, value: 200 },
    })
    fireEvent.scroll(region)

    await userEvent.click(screen.getByRole('button', { name: 'Tôi đồng ý' }))
    expect(window.location.pathname).toBe('/dashboard')
  })
})
