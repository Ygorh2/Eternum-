import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const signInWithPassword = vi.fn()
vi.mock('/utils/supabase/client', () => ({
  supabase: {
    auth: {
      signInWithPassword: (...args: unknown[]) => signInWithPassword(...args),
      signInWithOAuth: vi.fn(),
      resetPasswordForEmail: vi.fn(),
    },
  },
}))

vi.mock('../data/api', () => ({
  signUpWithEmail: vi.fn(),
  resendSignupConfirmation: vi.fn(),
}))

import * as api from '../data/api'
import { Auth } from './Auth'

const fetchSpy = vi.fn()

async function fillSignup() {
  await userEvent.click(screen.getByRole('button', { name: 'Criar conta Eternum' }))
  await userEvent.type(screen.getByPlaceholderText('Email'), 'ana@exemplo.com')
  await userEvent.type(screen.getByPlaceholderText('Senha'), 'segredo123')
  await userEvent.type(screen.getByPlaceholderText('Confirmar Senha'), 'segredo123')
  await userEvent.type(screen.getByPlaceholderText('Nome Completo'), 'Ana Lima')
  await userEvent.type(screen.getByPlaceholderText('Nome de Usuário'), 'ana')
  const date = screen.getByPlaceholderText('Data de Nascimento')
  await userEvent.type(date, '1990-05-10')
  await userEvent.click(screen.getByRole('button', { name: 'Criar conta Eternum' }))
}

describe('<Auth /> cadastro com confirmação de e-mail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', fetchSpy)
    window.history.replaceState(null, '', '/login')
  })

  it('cria a conta pelo Supabase Auth (não pela Edge Function) e mostra "Confira seu e-mail"', async () => {
    vi.mocked(api.signUpWithEmail).mockResolvedValue({ needsConfirmation: true })
    const onLogin = vi.fn()
    render(<Auth onLogin={onLogin} />)

    await fillSignup()

    expect(await screen.findByRole('heading', { name: 'Confira seu e-mail' })).toBeInTheDocument()
    expect(screen.getByText('ana@exemplo.com')).toBeInTheDocument()
    expect(api.signUpWithEmail).toHaveBeenCalledWith(
      { email: 'ana@exemplo.com', password: 'segredo123', displayName: 'Ana Lima', username: 'ana', birthDate: '1990-05-10' },
      `${window.location.origin}/login`,
    )
    expect(fetchSpy).not.toHaveBeenCalled() // nada de /signup da Edge Function
    expect(onLogin).not.toHaveBeenCalled() // não entra antes de confirmar
    // Reenvio começa bloqueado pela contagem regressiva
    expect(screen.getByRole('button', { name: /Reenviar e-mail \(\d+s\)/ })).toBeDisabled()
  })

  it('se o Supabase não exigir confirmação (já veio sessão), entra direto', async () => {
    vi.mocked(api.signUpWithEmail).mockResolvedValue({ needsConfirmation: false })
    const onLogin = vi.fn()
    render(<Auth onLogin={onLogin} />)
    await fillSignup()
    await waitFor(() => expect(onLogin).toHaveBeenCalledWith('email'))
  })

  it('mostra erro traduzido quando o envio de e-mails estoura o limite', async () => {
    vi.mocked(api.signUpWithEmail).mockRejectedValue({ status: 429, message: 'email rate limit exceeded' })
    render(<Auth onLogin={vi.fn()} />)
    await fillSignup()
    expect(await screen.findByText(/Aguarde alguns minutos/)).toBeInTheDocument()
  })

  it('login com e-mail não confirmado oferece reenviar o link', async () => {
    signInWithPassword.mockResolvedValue({ data: {}, error: { message: 'Email not confirmed' } })
    vi.mocked(api.resendSignupConfirmation).mockResolvedValue(undefined)
    render(<Auth onLogin={vi.fn()} />)

    await userEvent.type(screen.getByPlaceholderText('Email'), 'ana@exemplo.com')
    await userEvent.type(screen.getByPlaceholderText('Senha'), 'segredo123')
    await userEvent.click(screen.getByRole('button', { name: 'Entrar com conta Eternum' }))

    await userEvent.click(await screen.findByRole('button', { name: 'Reenviar e-mail de confirmação' }))

    expect(api.resendSignupConfirmation).toHaveBeenCalledWith('ana@exemplo.com', `${window.location.origin}/login`)
    expect(await screen.findByRole('heading', { name: 'Confira seu e-mail' })).toBeInTheDocument()
    expect(screen.getByText(/Enviamos um novo link/)).toBeInTheDocument()
  })

  it('voltou do e-mail com link expirado: mostra aviso e limpa a URL', async () => {
    window.history.replaceState(null, '', '/login#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired')
    render(<Auth onLogin={vi.fn()} />)
    expect(await screen.findByText(/expirou ou já foi usado/)).toBeInTheDocument()
    expect(window.location.hash).toBe('')
  })
})
