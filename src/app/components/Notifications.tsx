import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Bell, BellOff, Flame, Heart, ImageIcon, Loader2, MessageCircle, Feather, UserPlus } from 'lucide-react';
import type { AppNotification, NotificationType } from '../data/api';
import { formatNotificationTime, notificationAction } from '../utils/notifications';

interface Props {
  notifications: AppNotification[];
  loading?: boolean;
  loadingMore?: boolean;
  hasMore?: boolean;
  error?: string | null;
  /** false quando a pessoa desligou as notificações em Configurações. */
  enabled?: boolean;
  onBack: () => void;
  onOpen: (n: AppNotification) => void;
  onLoadMore: () => void;
  onRetry?: () => void;
  onOpenSettings: () => void;
}

const ICONS: Record<NotificationType, { icon: React.ElementType; className: string }> = {
  follow: { icon: UserPlus, className: 'text-blue-300 bg-blue-500/15' },
  candle: { icon: Flame, className: 'text-amber-300 bg-amber-500/15' },
  reaction: { icon: Heart, className: 'text-rose-300 bg-rose-500/15' },
  comment: { icon: MessageCircle, className: 'text-indigo-300 bg-indigo-500/15' },
  tribute: { icon: Feather, className: 'text-purple-300 bg-purple-500/15' },
  post: { icon: ImageIcon, className: 'text-emerald-300 bg-emerald-500/15' },
};

function NotificationItem({ n, onOpen, index }: { n: AppNotification; onOpen: (n: AppNotification) => void; index: number }) {
  const { icon: Icon, className } = ICONS[n.type] || ICONS.follow;
  const initial = (n.actorName || '?').trim().charAt(0).toUpperCase();
  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 10) * 0.03, duration: 0.25 }}
    >
      <button
        onClick={() => onOpen(n)}
        className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-white/5 ${n.read ? '' : 'bg-blue-500/5'}`}
      >
        <div className="relative shrink-0">
          <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-indigo-500/60 to-purple-500/60 flex items-center justify-center font-serif text-white">
            {initial}
          </div>
          <span className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center border-2 border-[#0F172A] ${className}`}>
            <Icon size={12} aria-hidden="true" />
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white/80 leading-snug">
            <span className="font-semibold text-white">{n.actorName}</span> {notificationAction(n)}
          </p>
          <p className="text-xs text-white/40 mt-1">{formatNotificationTime(n.createdAt)}</p>
        </div>
        {!n.read && <span className="mt-2 w-2 h-2 rounded-full bg-blue-400 shrink-0" aria-label="Não lida" />}
      </button>
    </motion.li>
  );
}

export function Notifications({
  notifications,
  loading = false,
  loadingMore = false,
  hasMore = false,
  error,
  enabled = true,
  onBack,
  onOpen,
  onLoadMore,
  onRetry,
  onOpenSettings,
}: Props) {
  const unread = notifications.filter((n) => !n.read);
  const earlier = notifications.filter((n) => n.read);

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-[#0F172A] to-[#1E1B4B] text-white">
      <div className="p-4 flex items-center gap-4 bg-[#0F172A]/80 backdrop-blur-md border-b border-white/10 sticky top-0 z-10">
        <button onClick={onBack} aria-label="Voltar" className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/70">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-medium text-blue-100">Notificações</h1>
      </div>

      <div className="flex-1 overflow-y-auto pb-24">
        {!enabled && (
          <div className="mx-4 mt-4 p-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3">
            <BellOff size={18} className="text-white/50 shrink-0" aria-hidden="true" />
            <p className="text-xs text-white/60 flex-1">
              Suas notificações estão desligadas. Você não vai receber novas até ligar de novo.
            </p>
            <button onClick={onOpenSettings} className="text-xs text-blue-300 hover:text-blue-200 shrink-0">
              Configurações
            </button>
          </div>
        )}

        {error && (
          <div role="alert" className="mx-4 mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-400/30 text-amber-100 text-xs flex items-center justify-between gap-2">
            <span>{error}</span>
            {onRetry && (
              <button onClick={onRetry} className="text-amber-200 underline shrink-0">
                Tentar de novo
              </button>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16" aria-label="Carregando notificações">
            <Loader2 size={28} className="animate-spin text-white/40" />
          </div>
        ) : notifications.length === 0 && !error ? (
          <div className="text-center py-20 px-8">
            <Bell size={44} className="mx-auto text-white/20 mb-3" aria-hidden="true" />
            <p className="text-white/60 text-sm">Nenhuma notificação por enquanto</p>
            <p className="text-white/30 text-xs mt-1">
              Quando alguém seguir você, acender uma vela ou deixar uma homenagem, aparece aqui.
            </p>
          </div>
        ) : (
          <>
            {unread.length > 0 && (
              <section>
                <h2 className="px-4 pt-4 pb-1 text-xs font-bold text-white/40 uppercase tracking-widest">Novas</h2>
                <ul>
                  {unread.map((n, i) => (
                    <NotificationItem key={n.id} n={n} onOpen={onOpen} index={i} />
                  ))}
                </ul>
              </section>
            )}
            {earlier.length > 0 && (
              <section>
                <h2 className="px-4 pt-4 pb-1 text-xs font-bold text-white/40 uppercase tracking-widest">Anteriores</h2>
                <ul>
                  {earlier.map((n, i) => (
                    <NotificationItem key={n.id} n={n} onOpen={onOpen} index={i} />
                  ))}
                </ul>
              </section>
            )}
            {hasMore && (
              <div className="flex justify-center py-4">
                <button
                  onClick={onLoadMore}
                  disabled={loadingMore}
                  className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs text-white/70 hover:bg-white/10 disabled:opacity-50 flex items-center gap-2"
                >
                  {loadingMore && <Loader2 size={14} className="animate-spin" />}
                  Ver mais antigas
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
