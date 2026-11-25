// Identificador estável de cada "post" (usado para salvar reações e comentários).
// O mesmo post precisa ter a mesma chave no Feed e na página do memorial.

export function memorialPostKey(memorialId: string) {
  return `memorial:${memorialId}`;
}

/** Usa a URL da mídia (e não a posição na galeria) para não embaralhar se a galeria mudar. */
export function galleryPostKey(mediaUrl: string) {
  return `gallery:${mediaUrl}`;
}

export function tributePostKey(tributeId: string) {
  return `tribute:${tributeId}`;
}

/** Devolve o id da homenagem se a chave for de uma homenagem. */
export function tributeIdFromPostKey(postKey: string): string | null {
  return postKey.startsWith('tribute:') ? postKey.slice('tribute:'.length) : null;
}

/** Publicação com foto/vídeo e legenda (tabela memorial_posts). */
export function memorialPostItemKey(postId: string) {
  return `post:${postId}`;
}
