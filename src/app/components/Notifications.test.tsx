import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Notifications } from './Notifications'
import type { AppNotification } from '../data/api'

const n = (id: string, extra: Partial<AppNotification> = {}): AppNotification => ({
  id,
  type: 'follow',
  actorId: 'u1',
  actorName: 'Ana',
  memorialId: null,
  memorialName: '',
  postKey: null,
  reaction: null,
  createdAt: new Date().toISOString(),
  read: false,
  ...extra,
})

function renderList(extra: Record<string, unknown> = {}) {
  const props = {
    notifications: [n('1'), n('2', { type: 'candle', actorName: 'Bruno', memorialId: 'm1', memorialName: 'Vovó', read: true })],
    onBack: vi.fn(),
    onOpen: vi.fn(),
    onLoadMore: vi.fn(),
    onOpenSettings: vi.fn(),
    ...extra,
  }
  render(<Notifications {...(props as any)} />)
  return props
}

describe('<Notifications />', () => {
  it('separa novas e anteriores e abre ao tocar', async () => {
    const props = renderList()
    expect(screen.getByRole('heading', { name: 'Novas' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Anteriores' })).toBeInTheDocument()
    expect(screen.getByText('começou a seguir você.')).toBeInTheDocument()
    await userEvent.click(screen.getByText('acendeu uma vela para Vovó.'))
    expect(props.onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: '2' }))
  })

  it('mostra estado vazio', () => {
    renderList({ notifications: [] })
    expect(screen.getByText('Nenhuma notificação por enquanto')).toBeInTheDocument()
  })

  it('avisa quando as notificações estão desligadas', async () => {
    const props = renderList({ enabled: false })
    expect(screen.getByText(/Suas notificações estão desligadas/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Configurações' }))
    expect(props.onOpenSettings).toHaveBeenCalled()
  })

  it('carrega mais antigas', async () => {
    const props = renderList({ hasMore: true })
    await userEvent.click(screen.getByRole('button', { name: 'Ver mais antigas' }))
    expect(props.onLoadMore).toHaveBeenCalled()
  })
})
