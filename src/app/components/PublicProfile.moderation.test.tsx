import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Testes de componente não chamam o Supabase: mockamos api.ts
vi.mock('../data/api', () => ({
  fetchProfile: vi.fn(async () => ({ id: 'u2', displayName: 'Carlos' })),
  fetchProfileStats: vi.fn(async () => ({ tributesCount: 0, candlesCount: 0, followersCount: 3, followingCount: 1 })),
  isFollowingUser: vi.fn(async () => true),
  isUserBlocked: vi.fn(async () => false),
  blockUser: vi.fn(async () => undefined),
  unblockUser: vi.fn(async () => undefined),
  followUser: vi.fn(),
  unfollowUser: vi.fn(),
}))

import * as api from '../data/api'
import { PublicProfile } from './PublicProfile'

const memorials = [{ id: 'm1', name: 'Vovó Rosa', type: 'person', createdBy: 'u2' }]

function renderProfile(extra: Partial<React.ComponentProps<typeof PublicProfile>> = {}) {
  return render(
    <PublicProfile
      userId="u2"
      currentUserId="me"
      memorials={memorials}
      onBack={vi.fn()}
      onSelectMemorial={vi.fn()}
      {...extra}
    />
  )
}

describe('<PublicProfile /> — bloquear e denunciar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.isUserBlocked).mockResolvedValue(false)
  })

  it('bloqueia depois de confirmar e esconde os memoriais da pessoa', async () => {
    const onBlockedChange = vi.fn()
    renderProfile({ onBlockedChange })
    expect(await screen.findByText('Vovó Rosa')).toBeInTheDocument()

    await userEvent.click(screen.getByLabelText('Mais opções do perfil'))
    await userEvent.click(await screen.findByRole('menuitem', { name: /Bloquear/ }))
    expect(api.blockUser).not.toHaveBeenCalled() // ainda falta confirmar

    await userEvent.click(await screen.findByRole('button', { name: 'Bloquear' }))
    expect(api.blockUser).toHaveBeenCalledWith('u2')
    expect(onBlockedChange).toHaveBeenCalled()
    expect(await screen.findByText('Você bloqueou esta pessoa.')).toBeInTheDocument()
    expect(screen.queryByText('Vovó Rosa')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Deixar de seguir/ })).not.toBeInTheDocument()
  })

  it('perfil já bloqueado mostra o aviso e permite desbloquear', async () => {
    vi.mocked(api.isUserBlocked).mockResolvedValue(true)
    renderProfile()
    await userEvent.click(await screen.findByRole('button', { name: 'Desbloquear' }))
    expect(api.unblockUser).toHaveBeenCalledWith('u2')
    expect(await screen.findByText('Vovó Rosa')).toBeInTheDocument()
  })

  it('denunciar perfil abre a denúncia com o id da pessoa', async () => {
    const onReport = vi.fn()
    renderProfile({ onReport })
    await userEvent.click(await screen.findByLabelText('Mais opções do perfil'))
    await userEvent.click(await screen.findByRole('menuitem', { name: /Denunciar perfil/ }))
    expect(onReport).toHaveBeenCalledWith({ type: 'user', id: 'u2' })
  })

  it('no próprio perfil não há opções de bloquear/denunciar', async () => {
    renderProfile({ userId: 'me', currentUserId: 'me' })
    await screen.findByText('Carlos')
    expect(screen.queryByLabelText('Mais opções do perfil')).not.toBeInTheDocument()
  })
})
