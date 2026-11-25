/**
 * Utilitários do fluxo de confirmação de e-mail.
 *
 * Depois que a pessoa clica no link do e-mail, o Supabase a manda de volta
 * para `/login`. Se deu certo, o próprio cliente do Supabase lê a sessão da URL
 * e o Layout leva a pessoa para o feed. Se deu errado (link expirado ou já
 * usado), a URL volta com `error`/`error_code`/`error_description` no hash
 * (#...) ou na query (?...). Aqui traduzimos isso para uma mensagem em pt-BR.
 */

/** Caminho para onde o link do e-mail de confirmação leva de volta. */
export const AUTH_REDIRECT_PATH = '/login';

export function authRedirectUrl(origin: string): string {
  return `${origin.replace(/\/+$/, '')}${AUTH_REDIRECT_PATH}`;
}

/**
 * Lê o erro devolvido pelo Supabase na URL de retorno.
 * Retorna `null` quando não há erro.
 */
export function parseAuthRedirectError(search: string, hash: string): string | null {
  const params = new URLSearchParams();
  for (const part of [search, hash]) {
    const clean = part.replace(/^[?#]/, '');
    new URLSearchParams(clean).forEach((value, key) => params.set(key, value));
  }

  const error = params.get('error');
  const code = params.get('error_code');
  if (!error && !code) return null;

  if (code === 'otp_expired' || /expired|invalid/i.test(params.get('error_description') ?? '')) {
    return 'O link de confirmação expirou ou já foi usado. Digite seu e-mail e senha para entrar, ou peça um novo link abaixo.';
  }
  return 'Não foi possível confirmar seu e-mail por esse link. Tente entrar ou peça um novo link de confirmação.';
}

/** Traduz os erros mais comuns do Supabase Auth no cadastro/reenvio. */
export function signupErrorMessage(error: { message?: string; status?: number; code?: string } | null | undefined): string {
  const message = error?.message ?? '';
  if (error?.status === 429 || error?.code === 'over_email_send_rate_limit' || /rate limit/i.test(message)) {
    return 'Muitos e-mails enviados em pouco tempo. Aguarde alguns minutos e tente de novo.';
  }
  if (/already (been )?registered|already exists/i.test(message) || error?.code === 'user_already_exists') {
    return 'Este e-mail já está cadastrado. Faça login ou recupere sua senha.';
  }
  if (error?.code === 'weak_password' || /password/i.test(message)) {
    return 'Senha fraca. Use pelo menos 6 caracteres, misturando letras e números.';
  }
  if (/invalid.*email|email.*invalid/i.test(message) || error?.code === 'email_address_invalid') {
    return 'Este e-mail não parece válido. Confira e tente de novo.';
  }
  if (/fetch/i.test(message)) {
    return 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.';
  }
  return 'Não foi possível criar a conta agora. Tente novamente.';
}
