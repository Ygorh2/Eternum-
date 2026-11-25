import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { email: 'a@b.com' }, updateEmail: vi.fn(), updatePassword: vi.fn() }),
}))

import { Settings } from './Settings'

describe('<Settings /> notificações', () => {
  it('a chave reflete o valor salvo e chama onToggleNotifications', async () => {
    const onToggle = vi.fn()
    render(<Settings onBack={vi.fn()} onLogout={vi.fn()} notificationsEnabled={true} onToggleNotifications={onToggle} />)
    const sw = screen.getByRole('switch', { name: 'Notificações' })
    expect(sw).toHaveAttribute('aria-checked', 'true')
    await userEvent.click(sw)
    expect(onToggle).toHaveBeenCalledWith(false)
  })

  it('mostra desligada e fica travada enquanto carrega', () => {
    const { rerender } = render(<Settings onBack={vi.fn()} onLogout={vi.fn()} notificationsEnabled={false} onToggleNotifications={vi.fn()} />)
    expect(screen.getByRole('switch', { name: 'Notificações' })).toHaveAttribute('aria-checked', 'false')
    rerender(<Settings onBack={vi.fn()} onLogout={vi.fn()} notificationsEnabled={null} onToggleNotifications={vi.fn()} />)
    expect(screen.getByRole('switch', { name: 'Notificações' })).toBeDisabled()
  })
})
