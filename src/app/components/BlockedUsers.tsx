import React from 'react';
import { ArrowLeft, Ban, Loader2, User } from 'lucide-react';

export type BlockedUser = { id: string; displayName: string; username?: string };

interface Props {
  users: BlockedUser[];
  loading: boolean;
  error?: string | null;
  /** Id de quem está sendo desbloqueado agora (mostra o carregando no botão). */
  unblockingId?: string | null;
  onUnblock: (userId: string) => void;
  onViewProfile: (userId: string) => void;
  onBack: () => void;
}

/** Configurações > Pessoas bloqueadas. */
export function BlockedUsers({ users, loading, error, unblockingId, onUnblock, onViewProfile, onBack }: Props) {
  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-[#0F172A] to-[#1E1B4B] text-white">
      <div className="p-4 flex items-center gap-4 bg-[#0F172A]/80 backdrop-blur-md border-b border-white/10 sticky top-0 z-10">
        <button
          onClick={onBack}
          aria-label="Voltar"
          className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/70"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-medium text-blue-100">Pessoas bloqueadas</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-6 pb-24">
        <p className="text-xs text-white/50 mb-5">
          Quem está nesta lista não vê seus memoriais e não pode comentar, reagir, homenagear nem seguir você. Você também
          não vê o que essas pessoas publicam. Elas não são avisadas do bloqueio.
        </p>

        {error && (
          <p role="alert" className="mb-4 text-xs text-red-300">
            {error}
          </p>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={24} className="animate-spin text-white/40" />
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center text-center py-12 text-white/40">
            <Ban size={32} className="mb-3" />
            <p className="text-sm">Você não bloqueou ninguém.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {users.map((u) => (
              <li
                key={u.id}
                className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center gap-3"
              >
                <button
                  type="button"
                  onClick={() => onViewProfile(u.id)}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
                >
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                    <User size={18} className="text-white/40" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{u.displayName}</p>
                    {u.username && <p className="text-xs text-white/40 truncate">@{u.username}</p>}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => onUnblock(u.id)}
                  disabled={!!unblockingId}
                  className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  {unblockingId === u.id && <Loader2 size={12} className="animate-spin" />}
                  Desbloquear
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
