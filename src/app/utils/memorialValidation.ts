import { parseLocalDate, todayLocalISO } from './dateUtils';

export const MAX_BIO_LENGTH = 500;
export const MAX_NAME_LENGTH = 120;
export const MAX_QUOTE_LENGTH = 200;

/** Grupos de acesso que o dono pode escolher (regras da migration 0005). */
export const ACCESS_GROUPS = ['public', 'family', 'invited'] as const;
export type AccessGroup = (typeof ACCESS_GROUPS)[number];

export type MemorialFormValues = {
  name: string;
  birthDate: string;
  deathDate: string;
  bio: string;
  quote: string;
  accessGroup: string;
};

/**
 * Valida os campos editáveis de um memorial. Devolve a mensagem de erro
 * (em pt-BR) ou null se estiver tudo certo. Datas são "só dia" (YYYY-MM-DD)
 * e comparadas como datas locais, para não errar por causa do fuso.
 */
export function validateMemorialForm(values: MemorialFormValues, today = todayLocalISO()): string | null {
  const name = values.name.trim();
  if (!name) return 'Informe o nome.';
  if (name.length > MAX_NAME_LENGTH) return `O nome pode ter no máximo ${MAX_NAME_LENGTH} caracteres.`;

  if (!values.birthDate || !values.deathDate) return 'Informe as datas de nascimento e falecimento.';
  const birth = parseLocalDate(values.birthDate);
  const death = parseLocalDate(values.deathDate);
  const todayDate = parseLocalDate(today);
  if (!birth || !death) return 'Data inválida.';
  if (todayDate && death > todayDate) return 'A data de falecimento não pode ser no futuro.';
  if (birth >= death) return 'A data de nascimento deve ser anterior à data de falecimento.';

  if (!values.bio.trim()) return 'Escreva a biografia.';
  if (values.bio.length > MAX_BIO_LENGTH) return `A biografia pode ter no máximo ${MAX_BIO_LENGTH} caracteres.`;
  if (values.quote.length > MAX_QUOTE_LENGTH) return `A frase pode ter no máximo ${MAX_QUOTE_LENGTH} caracteres.`;

  if (!(ACCESS_GROUPS as readonly string[]).includes(values.accessGroup)) {
    return 'Escolha quem pode ver o memorial.';
  }
  return null;
}
