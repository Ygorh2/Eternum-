import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemorialDetail } from './MemorialDetail'

const memorial = {
  id: 'm1',
  name: 'Maria',
  photo: '',
  cover: '',
  birthDate: '1950-01-01',
  deathDate: '2020-01-01',
  gallery: [],
  createdAt: '2024-01-01T00:00:00Z',
}
const tributes = [
  { id: 't1', memorialId: 'm1', author: { id: 'u2', name: 'João' }, content: 'Saudade', date: '2024-02-01' },
]

function renderDetail(extra: Record<string, unknown> = {}) {
  const props = {
    memorial,
    tributes,
    onBack: vi.fn(),
    onViewLivingMemory: vi.fn(),
    onWriteTribute: vi.fn(),
    onToggleReaction: vi.fn(),
    onAddComment: vi.fn().mockResolvedValue(undefined),
    onLightCandle: vi.fn(),
    onToggleFollow: vi.fn(),
    canInteract: true,
    ...extra,
  }
  render(<MemorialDetail {...(props as any)} />)
  return props
}

describe('<MemorialDetail /> interações', () => {
  it('mostra o número real de seguidores (não mais 142 fixo)', () => {
    renderDetail({ follow: { count: 3, isFollowing: true } })
    expect(screen.queryByText('142')).not.toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Seguindo/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('Seguir chama onToggleFollow', async () => {
    const props = renderDetail()
    await userEvent.click(screen.getByRole('button', { name: /Seguir/ }))
    expect(props.onToggleFollow).toHaveBeenCalled()
  })

  it('mostra os contadores de reação salvos e envia a reação com a chave da homenagem', async () => {
    const props = renderDetail({
      interactions: {
        reactions: { 'tribute:t1': { amen: 2, love: 5, mine: { amen: false, love: true } } },
        comments: {},
      },
    })
    const love = screen.getByRole('button', { name: /Amor/ })
    expect(love).toHaveTextContent('5')
    expect(love).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(screen.getByRole('button', { name: /Amém/ }))
    expect(props.onToggleReaction).toHaveBeenCalledWith('m1', 'tribute:t1', 'amen')
  })

  it('comentário é enviado para o post certo', async () => {
    const props = renderDetail()
    await userEvent.click(screen.getByRole('button', { name: 'Comentar' }))
    await userEvent.type(screen.getByLabelText('Escreva um comentário'), 'Que saudade{Enter}')
    expect(props.onAddComment).toHaveBeenCalledWith('m1', 'tribute:t1', 'Que saudade')
  })

  it('vela: botão acende uma vez e fica desativado depois', async () => {
    const props = renderDetail({ candles: { count: 7, litByMe: false } })
    await userEvent.click(screen.getByRole('button', { name: 'Acender vela' }))
    expect(props.onLightCandle).toHaveBeenCalled()
  })

  it('vela já acesa: botão desativado', () => {
    renderDetail({ candles: { count: 7, litByMe: true } })
    expect(screen.getByRole('button', { name: 'Você já acendeu uma vela' })).toBeDisabled()
    expect(screen.getByText('7')).toBeInTheDocument()
  })
})
