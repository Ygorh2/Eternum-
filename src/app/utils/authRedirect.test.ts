import { describe, it, expect } from 'vitest'
import { authRedirectUrl, parseAuthRedirectError, signupErrorMessage } from './authRedirect'

describe('authRedirectUrl', () => {
  it('monta o endereço de volta para /login', () => {
    expect(authRedirectUrl('https://eternum.app')).toBe('https://eternum.app/login')
    expect(authRedirectUrl('http://localhost:5173/')).toBe('http://localhost:5173/login')
  })
})

describe('parseAuthRedirectError', () => {
  it('sem erro na URL retorna null', () => {
    expect(parseAuthRedirectError('', '')).toBeNull()
    expect(parseAuthRedirectError('', '#access_token=abc&type=signup')).toBeNull()
  })

  it('link expirado no hash vira mensagem amigável', () => {
    const msg = parseAuthRedirectError(
      '',
      '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired',
    )
    expect(msg).toMatch(/expirou ou já foi usado/)
  })

  it('erro na query também é lido', () => {
    expect(parseAuthRedirectError('?error=server_error&error_description=x', '')).toMatch(/Não foi possível confirmar/)
  })
})

describe('signupErrorMessage', () => {
  it('limite de envio de e-mails', () => {
    expect(signupErrorMessage({ status: 429, message: 'email rate limit exceeded' })).toMatch(/Aguarde alguns minutos/)
  })
  it('e-mail já cadastrado', () => {
    expect(signupErrorMessage({ message: 'User already registered' })).toMatch(/já está cadastrado/)
  })
  it('erro desconhecido tem mensagem genérica em português', () => {
    expect(signupErrorMessage({ message: 'boom' })).toBe('Não foi possível criar a conta agora. Tente novamente.')
  })
})
