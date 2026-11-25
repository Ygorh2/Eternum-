/**
 * Compressão de fotos no próprio aparelho, antes do envio ao Storage.
 *
 * Fotos de celular costumam ter 3–8 MB e 4000px ou mais. Para o app, 1600px
 * no maior lado basta, e o arquivo fica bem menor (envio mais rápido, menos
 * dados móveis e menos espaço no bucket).
 *
 * Regras:
 * - Só mexe em fotos (JPEG, PNG, WebP, HEIC quando o navegador consegue abrir).
 *   GIF (pode ser animado), SVG e vídeos seguem como estão.
 * - Respeita a rotação da câmera (EXIF): a foto não fica deitada.
 * - Se algo der errado, ou se o resultado não ficar menor, envia o original.
 *   A compressão nunca impede um envio.
 * - O arquivo novo não carrega os metadados EXIF (inclusive a localização GPS).
 */

export const MAX_IMAGE_DIMENSION = 1600;
export const IMAGE_QUALITY = 0.8;

export type CompressOptions = {
  maxDimension?: number;
  quality?: number;
};

const SKIP_TYPES = new Set(['image/gif', 'image/svg+xml']);

/** Diz se vale a pena tentar comprimir este arquivo. */
export function shouldCompress(file: { type: string }): boolean {
  return file.type.startsWith('image/') && !SKIP_TYPES.has(file.type);
}

/** Novo tamanho mantendo a proporção, com o maior lado limitado a `max`. Nunca aumenta. */
export function fitWithin(width: number, height: number, max: number): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= max || longest <= 0) return { width, height };
  const scale = max / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** Troca a extensão do nome do arquivo de acordo com o novo formato. */
export function renameForType(name: string, mime: string): string {
  const ext = mime === 'image/webp' ? 'webp' : 'jpg';
  const base = name.replace(/\.[^./\\]+$/, '') || 'foto';
  return `${base}.${ext}`;
}

type Decoded = { source: CanvasImageSource; width: number; height: number; close: () => void };

/** Abre a imagem já com a rotação do EXIF aplicada. */
async function decodeImage(file: File): Promise<Decoded> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
    } catch {
      // Alguns navegadores não aceitam as opções; tenta com <img> abaixo
    }
  }

  // <img> também aplica a rotação do EXIF nos navegadores atuais
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    return {
      source: img,
      width: img.naturalWidth,
      height: img.naturalHeight,
      close: () => URL.revokeObjectURL(url),
    };
  } catch (err) {
    URL.revokeObjectURL(url);
    throw err;
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

async function encode(
  decoded: Decoded,
  width: number,
  height: number,
  quality: number
): Promise<Blob | null> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // WebP: menor e mantém transparência
  ctx.drawImage(decoded.source, 0, 0, width, height);
  const webp = await canvasToBlob(canvas, 'image/webp', quality);
  if (webp && webp.type === 'image/webp') return webp;

  // Navegador sem WebP (Safari antigo): JPEG com fundo branco no lugar da transparência
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(decoded.source, 0, 0, width, height);
  const jpeg = await canvasToBlob(canvas, 'image/jpeg', quality);
  return jpeg && jpeg.type === 'image/jpeg' ? jpeg : null;
}

/**
 * Reduz e comprime uma foto. Devolve o próprio arquivo original quando não é
 * foto, quando não dá para comprimir ou quando o resultado não fica menor.
 */
export async function compressImage(file: File, options: CompressOptions = {}): Promise<File> {
  const { maxDimension = MAX_IMAGE_DIMENSION, quality = IMAGE_QUALITY } = options;
  if (!shouldCompress(file)) return file;

  let decoded: Decoded | null = null;
  try {
    decoded = await decodeImage(file);
    if (!decoded.width || !decoded.height) return file;

    const target = fitWithin(decoded.width, decoded.height, maxDimension);
    const blob = await encode(decoded, target.width, target.height, quality);
    if (!blob || blob.size >= file.size) return file;

    return new File([blob], renameForType(file.name, blob.type), {
      type: blob.type,
      lastModified: file.lastModified,
    });
  } catch {
    return file;
  } finally {
    decoded?.close();
  }
}
