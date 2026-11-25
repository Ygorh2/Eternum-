import React, { useState } from 'react';
import { Flag, Send, Trash2 } from 'lucide-react';
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
  /** Apaga o comentário. Deve rejeitar (throw) com uma mensagem em caso de erro. */
  onDelete?: (comment: PostComment) => Promise<void>;
  /** Se o usuário atual pode apagar este comentário (autor ou dono do memorial). */
  canDelete?: (comment: PostComment) => boolean;
  /** Abre a janela de denúncia do comentário. */
  onReport?: (comment: PostComment) => void;
  /** Se o usuário atual pode denunciar este comentário (não é dele). */
  canReport?: (comment: PostComment) => boolean;
}

/** Lista de comentários de um post + campo para comentar (usado no Feed e no Memorial). */
export function PostComments({
  comments,
  showInput,
  onSubmit,
  canComment,
  onDelete,
  canDelete,
  onReport,
  canReport,
}: Props) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = async (comment: PostComment) => {
    if (!onDelete || deletingId) return;
    setDeletingId(comment.id);
    setDeleteError(null);
    try {
      await onDelete(comment);
      setConfirmingId(null);
    } catch (err: any) {
      setDeleteError(err?.message || 'Não foi possível apagar o comentário.');
    } finally {
      setDeletingId(null);
    }
  };

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
          {comments.map((comment) => {
            const deletable = !!onDelete && !!canDelete?.(comment);
            const reportable = !!onReport && !!canReport?.(comment);
            const confirming = confirmingId === comment.id;
            const deleting = deletingId === comment.id;
            return (
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
              {deletable &&
                (confirming ? (
                  <div className="flex items-center gap-2 shrink-0 text-xs">
                    <span className="text-white/50">Apagar?</span>
                    <button
                      type="button"
                      onClick={() => handleDelete(comment)}
                      disabled={deleting}
                      className="text-red-300 hover:text-red-200 transition-colors disabled:opacity-40"
                    >
                      {deleting ? 'Apagando...' : 'Apagar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmingId(null);
                        setDeleteError(null);
                      }}
                      disabled={deleting}
                      className="text-white/50 hover:text-white/80 transition-colors disabled:opacity-40"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmingId(comment.id);
                      setDeleteError(null);
                    }}
                    aria-label={`Apagar comentário de ${comment.authorName}`}
                    className="shrink-0 p-1 -m-1 text-white/30 hover:text-red-300 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                ))}
              {reportable && !confirming && (
                <button
                  type="button"
                  onClick={() => onReport!(comment)}
                  aria-label={`Denunciar comentário de ${comment.authorName}`}
                  title="Denunciar comentário"
                  className="shrink-0 p-1 -m-1 text-white/25 hover:text-red-300 transition-colors"
                >
                  <Flag size={13} />
                </button>
              )}
            </li>
            );
          })}
        </ul>
      )}
      {deleteError && (
        <p role="alert" className="mb-3 text-xs text-red-300">
          {deleteError}
        </p>
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
