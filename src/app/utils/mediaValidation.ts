/**
 * Validação de fotos e vídeos antes do upload (o banco/Storage também limita,
 * mas aqui a pessoa recebe o aviso na hora, sem esperar o envio falhar).
 */

export const MAX_IMAGE_SIZE_MB = 10;
export const MAX_VIDEO_SIZE_MB = 50; // limite do bucket "memorial-media" (migration 0007)
export const MAX_POST_MEDIA = 10;
export const MAX_CAPTION_LENGTH = 2200;

export type MediaAccept = 'image' | 'video' | 'both';

export type MediaKind = 'image' | 'video';

export type RejectedFile = { name: string; reason: string };

export type MediaValidationOptions = {
  accept?: MediaAccept;
  maxImageSizeMB?: number;
  maxVideoSizeMB?: number;
  /** Quantos arquivos ainda cabem (máximo menos os já escolhidos). */
  remainingSlots?: number;
};

export function mediaKindOf(file: { type: string }): MediaKind | null {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  return null;
}

function formatMB(mb: number) {
  return `${mb} MB`;
}

/**
 * Separa os arquivos válidos dos inválidos, com o motivo de cada recusa.
 * Um arquivo ruim não descarta os outros.
 */
export function validateMediaFiles<T extends { name: string; type: string; size: number }>(
  files: T[],
  {
    accept = 'both',
    maxImageSizeMB = MAX_IMAGE_SIZE_MB,
    maxVideoSizeMB = MAX_VIDEO_SIZE_MB,
    remainingSlots = Infinity,
  }: MediaValidationOptions = {}
): { valid: T[]; rejected: RejectedFile[] } {
  const valid: T[] = [];
  const rejected: RejectedFile[] = [];

  for (const file of files) {
    const kind = mediaKindOf(file);
    if (!kind || (accept === 'image' && kind !== 'image') || (accept === 'video' && kind !== 'video')) {
      const allowed = accept === 'image' ? 'fotos' : accept === 'video' ? 'vídeos' : 'fotos ou vídeos';
      rejected.push({ name: file.name, reason: `formato não aceito (só ${allowed})` });
      continue;
    }
    const maxMB = kind === 'image' ? maxImageSizeMB : maxVideoSizeMB;
    if (file.size > maxMB * 1024 * 1024) {
      const what = kind === 'image' ? 'fotos' : 'vídeos';
      rejected.push({ name: file.name, reason: `maior que ${formatMB(maxMB)} (limite para ${what})` });
      continue;
    }
    if (valid.length >= remainingSlots) {
      rejected.push({ name: file.name, reason: 'limite de arquivos atingido' });
      continue;
    }
    valid.push(file);
  }

  return { valid, rejected };
}
