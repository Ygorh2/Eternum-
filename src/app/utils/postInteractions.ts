import type { PostComment, PostInteractions, PostReactionSummary, ReactionType } from '../data/api';

export const EMPTY_REACTIONS: PostReactionSummary = {
  amen: 0,
  love: 0,
  mine: { amen: false, love: false },
};

export function getReactions(interactions: PostInteractions, postKey: string): PostReactionSummary {
  return interactions.reactions[postKey] || EMPTY_REACTIONS;
}

/** Marca/desmarca a reação do usuário atual, ajustando o contador (para atualização otimista). */
export function withReaction(
  interactions: PostInteractions,
  postKey: string,
  reaction: ReactionType,
  on: boolean
): PostInteractions {
  const current = getReactions(interactions, postKey);
  if (current.mine[reaction] === on) return interactions;
  const next: PostReactionSummary = {
    ...current,
    [reaction]: Math.max(0, current[reaction] + (on ? 1 : -1)),
    mine: { ...current.mine, [reaction]: on },
  };
  return { ...interactions, reactions: { ...interactions.reactions, [postKey]: next } };
}

export function withComment(interactions: PostInteractions, comment: PostComment): PostInteractions {
  const list = interactions.comments[comment.postKey] || [];
  return {
    ...interactions,
    comments: { ...interactions.comments, [comment.postKey]: [...list, comment] },
  };
}

// Filtro simples de palavras ofensivas (já existia na tela; agora compartilhado)
const FORBIDDEN_WORDS = ['ódio', 'feio', 'estúpido', 'idiota'];

export function hasForbiddenWords(text: string) {
  const lower = text.toLowerCase();
  return FORBIDDEN_WORDS.some((word) => lower.includes(word));
}
