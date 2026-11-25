// Denúncias e bloqueios: regras puras (sem Supabase), usadas pelas telas e pelo api.ts.

export type ReportTargetType = 'memorial' | 'tribute' | 'post' | 'comment' | 'user';

export type ReportReason =
  | 'harassment'
  | 'hate'
  | 'violence'
  | 'sexual'
  | 'spam'
  | 'false_info'
  | 'privacy'
  | 'self_harm'
  | 'other';

export type ReportTarget = { type: ReportTargetType; id: string };

export const MAX_REPORT_DETAILS = 1000;

/** Motivos na ordem em que aparecem na tela (mesmos valores aceitos pelo banco). */
export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'harassment', label: 'Assédio, ofensa ou bullying' },
  { value: 'hate', label: 'Discurso de ódio ou preconceito' },
  { value: 'violence', label: 'Violência ou ameaça' },
  { value: 'sexual', label: 'Conteúdo sexual ou impróprio' },
  { value: 'spam', label: 'Spam, propaganda ou golpe' },
  { value: 'false_info', label: 'Memorial falso ou se passando por alguém' },
  { value: 'privacy', label: 'Expõe dados pessoais ou privados' },
  { value: 'self_harm', label: 'Fala em suicídio ou automutilação' },
  { value: 'other', label: 'Outro motivo' },
];

export function reportReasonLabel(reason: string): string {
  return REPORT_REASONS.find((r) => r.value === reason)?.label || 'Outro motivo';
}

export const REPORT_TARGET_LABELS: Record<ReportTargetType, string> = {
  memorial: 'Memorial',
  tribute: 'Homenagem',
  post: 'Publicação',
  comment: 'Comentário',
  user: 'Perfil',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

/**
 * O que denunciar a partir da chave de um post (ver postKeys.ts):
 *   tribute:<id> -> a homenagem;  post:<id> -> a publicação;
 *   memorial:<id> e gallery:<url> -> o memorial (a galeria faz parte dele).
 */
export function reportTargetFromPostKey(postKey: string, memorialId: string): ReportTarget | null {
  const [prefix, ...rest] = postKey.split(':');
  const value = rest.join(':');
  if (prefix === 'tribute' && isUuid(value)) return { type: 'tribute', id: value };
  if (prefix === 'post' && isUuid(value)) return { type: 'post', id: value };
  if ((prefix === 'memorial' || prefix === 'gallery') && isUuid(memorialId)) {
    return { type: 'memorial', id: memorialId };
  }
  return null;
}

/** Erro do Postgres "violou a RLS" (ex.: quem bloqueou você). */
export function isPermissionError(error: any): boolean {
  return !!error && (error.code === '42501' || /row-level security/i.test(error.message || ''));
}

export const BLOCKED_INTERACTION_MESSAGE = 'Não é possível interagir com este conteúdo.';
