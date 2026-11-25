import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReportDialog } from './ReportDialog'

const target = { type: 'comment' as const, id: '22222222-2222-4222-8222-222222222222' }

describe('<ReportDialog />', () => {
  it('fechado quando não há alvo', () => {
    render(<ReportDialog target={null} onClose={vi.fn()} onSubmit={vi.fn()} />)
    expect(screen.queryByText(/Denunciar/)).not.toBeInTheDocument()
  })

  it('só envia depois de escolher um motivo, com o texto opcional', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<ReportDialog target={target} onClose={vi.fn()} onSubmit={onSubmit} />)
    const send = screen.getByRole('button', { name: 'Enviar denúncia' })
    expect(send).toBeDisabled()

    await userEvent.click(screen.getByLabelText('Assédio, ofensa ou bullying'))
    await userEvent.type(screen.getByLabelText(/Quer contar mais/), '  Me ofendeu  ')
    await userEvent.click(send)

    expect(onSubmit).toHaveBeenCalledWith(target, 'harassment', 'Me ofendeu')
    expect(await screen.findByText('Obrigado por avisar')).toBeInTheDocument()
  })

  it('mostra o erro do servidor e permite tentar de novo', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Você já denunciou isto. Obrigado por avisar!'))
    render(<ReportDialog target={target} onClose={vi.fn()} onSubmit={onSubmit} />)
    await userEvent.click(screen.getByLabelText('Spam, propaganda ou golpe'))
    await userEvent.click(screen.getByRole('button', { name: 'Enviar denúncia' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Você já denunciou isto')
    expect(screen.getByRole('button', { name: 'Enviar denúncia' })).toBeEnabled()
  })

  it('mostra os telefones de ajuda quando o motivo é risco à vida', async () => {
    render(<ReportDialog target={target} onClose={vi.fn()} onSubmit={vi.fn()} />)
    await userEvent.click(screen.getByLabelText('Fala em suicídio ou automutilação'))
    expect(screen.getByText(/CVV no 188/)).toBeInTheDocument()
  })
})
