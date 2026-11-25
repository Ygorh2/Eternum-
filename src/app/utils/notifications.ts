import type { AppNotification } from '../data/api';

/** Frase da notificação, sem o nome de quem fez (o nome vai em negrito na tela). */
export function notificationAction(n: AppNotification): string {
  const memorial = n.memorialName || 'um memorial';
  switch (n.type) {
    case 'follow':
      return 'começou a seguir você.';
    case 'candle':
      return `acendeu uma vela para ${memorial}.`;
    case 'reaction':
      if (n.reaction === 'amen') return `reagiu com 🙏 Amém à sua publicação em ${memorial}.`;
      if (n.reaction === 'love') return `reagiu com ❤️ Amor à sua publicação em ${memorial}.`;
      return `reagiu à sua publicação em ${memorial}.`;
    case 'comment':
      return `comentou na sua publicação em ${memorial}.`;
    case 'tribute':
      return `deixou uma homenagem para ${memorial}.`;
    case 'post':
      return `publicou uma foto em ${memorial}.`;
    default:
      return 'interagiu com você.';
  }
}

/** Para onde a notificação leva ao ser tocada. */
export function notificationTarget(n: AppNotification): string | null {
  if (n.type === 'follow') return n.actorId ? `/user/${n.actorId}` : null;
  return n.memorialId ? `/memorial/${n.memorialId}` : null;
}

/** "agora mesmo", "Há 5 min", "Há 3h", "Há 2 dias", "12 de jan." */
export function formatNotificationTime(isoDate: string, now: number = Date.now()): string {
  if (!isoDate) return '';
  const diff = now - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora mesmo';
  if (mins < 60) return `Há ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Há 1 dia';
  if (days < 7) return `Há ${days} dias`;
  return new Date(isoDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}
