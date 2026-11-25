import React, { useState } from 'react';
import { Send } from 'lucide-react';
import type { PostComment } from '../data/api';
import { hasForbiddenWords } from '../utils/postInteractions';

const MAX_LENGTH = 1000;

interface Props {
  comments: PostComment[];
  /** Mostra o campo para escrever um comentário. */
  showInput: boolean;
  /** Salva o comentário. Deve rejeitar (throw) com uma mensagem em caso de erro. */
  onSubmit: (text: string) => Promise<void>;
  /** Visitante não pode comentar: mostra o aviso no lugar do campo. */
  canComment: boolean;
}

/** Lista de comentários de um post + campo para comentar (usado no Feed e no Memorial). */
export function PostComments({ comments, showInput, onSubmit, canComment }: Props) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const value = text.trim();
    if (!value || sending) return;
    if (hasForbiddenWords(value)) {
      setError('Seu comentário contém palavras que violam nossa política de respeito.');
      return;
    }
    setSending(true);
    setError(null);
    try {
      await onSubmit(value);
      setText('');
    } catch (err: any) {
      setError(err?.message || 'Não foi possível salvar o comentário.');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {comments.length > 0 && (
        <ul className="mb-3 space-y-2" aria-label="Comentários">
          {comments.map((comment) => (
            <li key={comment.id} className="flex gap-2 text-sm">
              <div
                aria-hidden="true"
                className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs text-white/70 font-bold border border-white/10 shrink-0"
              >
                {comment.authorName.charAt(0).toUpperCase()}
              </div>
              <p className="flex-1 min-w-0 break-words">
                <span className="font-medium text-white/90 text-xs">{comment.authorName}</span>{' '}
                <span className="text-white/70 text-xs">{comment.content}</span>
              </p>
            </li>
          ))}
        </ul>
      )}

      {showInput &&
        (canComment ? (
          <div>
            <div className="bg-white/5 rounded-lg p-2 border border-white/10 flex gap-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={MAX_LENGTH}
                disabled={sending}
                aria-label="Escreva um comentário"
                className="flex-1 bg-transparent text-sm text-white placeholder-white/30 focus:outline-none px-2"
                placeholder="Adicione um comentário..."
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              />
              <button
                type="button"
                onClick={handleSubmit}
                disabled={sending || !text.trim()}
                aria-label="Enviar comentário"
                className="text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-40"
              >
                <Send size={16} />
              </button>
            </div>
            {error && (
              <p role="alert" className="mt-2 text-xs text-red-300">
                {error}
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs text-white/50">Entre com sua conta para comentar.</p>
        ))}
    </>
  );
}
