import { describe, it, expect } from 'vitest';
import { withReaction, withComment, getReactions, hasForbiddenWords } from './postInteractions';
import type { PostInteractions } from '../data/api';

const empty: PostInteractions = { reactions: {}, comments: {} };

describe('withReaction', () => {
  it('adiciona a reação do usuário e soma 1', () => {
    const next = withReaction(empty, 'tribute:1', 'love', true);
    expect(getReactions(next, 'tribute:1')).toEqual({ amen: 0, love: 1, mine: { amen: false, love: true } });
  });

  it('remove a reação e subtrai 1', () => {
    const on = withReaction(empty, 'tribute:1', 'amen', true);
    const off = withReaction(on, 'tribute:1', 'amen', false);
    expect(getReactions(off, 'tribute:1')).toEqual({ amen: 0, love: 0, mine: { amen: false, love: false } });
  });

  it('não conta duas vezes se a reação já estava marcada', () => {
    const on = withReaction(empty, 'k', 'love', true);
    expect(withReaction(on, 'k', 'love', true)).toBe(on);
  });

  it('não altera o objeto original', () => {
    withReaction(empty, 'k', 'love', true);
    expect(empty.reactions).toEqual({});
  });
});

describe('withComment', () => {
  it('acrescenta o comentário no fim da lista do post', () => {
    const c = {
      id: 'c1',
      postKey: 'k',
      memorialId: 'm',
      userId: 'u',
      authorName: 'Ana',
      content: 'Saudades',
      createdAt: '2026-11-25T10:00:00Z',
    };
    const next = withComment(empty, c);
    expect(next.comments.k).toEqual([c]);
    expect(withComment(next, { ...c, id: 'c2' }).comments.k.map((x) => x.id)).toEqual(['c1', 'c2']);
  });
});

describe('hasForbiddenWords', () => {
  it('detecta palavras proibidas sem diferenciar maiúsculas', () => {
    expect(hasForbiddenWords('Que IDIOTA')).toBe(true);
    expect(hasForbiddenWords('Descanse em paz')).toBe(false);
  });
});
