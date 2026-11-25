import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Candle } from './Candle'

describe('<Candle />', () => {
  it('renderiza com rótulo acessível', () => {
    render(<Candle />)
    expect(screen.getByRole('img', { name: 'Candle' })).toBeInTheDocument()
  })

  it('chama onClick ao ser clicada', async () => {
    const onClick = vi.fn()
    render(<Candle onClick={onClick} />)
    await userEvent.click(screen.getByRole('img', { name: 'Candle' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
