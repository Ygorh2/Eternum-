// Links das fotos/vídeos do bucket "memorial-media".
//
// No banco guardamos sempre o link "público" (…/object/public/memorial-media/<caminho>):
// ele funciona como identificador estável do arquivo. Para MOSTRAR o arquivo, o
// app troca esse link por um link temporário (assinado), que o Supabase só
// entrega para quem pode ver o memorial (migration 0012). Assim, quando o
// bucket ficar privado, o link público deixa de abrir a foto.

export const MEDIA_BUCKET = 'memorial-media';

/** Quanto tempo um link temporário vale (6 horas). */
export const SIGNED_URL_TTL_SECONDS = 6 * 60 * 60;

/** Reaproveita um link do cache só se ainda faltar pelo menos isto para expirar. */
const MIN_REMAINING_MS = 60 * 60 * 1000;

const MEDIA_URL_RE = new RegExp(
  `/storage/v1/object/(public|sign|authenticated)/${MEDIA_BUCKET}/([^?#]+)`
);

/**
 * Caminho do arquivo no bucket a partir de um link público OU assinado.
 * Devolve null se o link não for do nosso bucket.
 */
export function mediaPathFromUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;
  const match = url.match(MEDIA_URL_RE);
  if (!match) return null;
  try {
    return decodeURIComponent(match[2]);
  } catch {
    return match[2];
  }
}

/**
 * Link a ser GUARDADO no banco: se vier um link assinado (temporário) do
 * nosso bucket, volta para o formato público estável. Outros links passam
 * sem mudança.
 */
export function toStoredMediaUrl(url: string, publicUrlFor: (path: string) => string): string;
export function toStoredMediaUrl(
  url: string | null | undefined,
  publicUrlFor: (path: string) => string
): string | null | undefined;
export function toStoredMediaUrl(
  url: string | null | undefined,
  publicUrlFor: (path: string) => string
) {
  if (!url || typeof url !== 'string') return url;
  if (!/\/storage\/v1\/object\/(sign|authenticated)\//.test(url)) return url;
  const path = mediaPathFromUrl(url);
  return path ? publicUrlFor(path) : url;
}

// ------------------------------------------------------------------
// Cache dos links temporários (evita pedir de novo a cada página do feed e
// mantém o mesmo link para o navegador aproveitar o cache da imagem).
// ------------------------------------------------------------------

type CachedLink = { url: string; expiresAt: number };
const signedCache = new Map<string, CachedLink>();

// A chave inclui quem está logado: ao trocar de conta no mesmo navegador, a
// nova conta não reaproveita links que só a anterior podia receber.
const cacheKey = (viewer: string, path: string) => `${viewer}::${path}`;

export function getCachedSignedUrl(viewer: string, path: string, now = Date.now()): string | null {
  const key = cacheKey(viewer, path);
  const hit = signedCache.get(key);
  if (!hit) return null;
  if (hit.expiresAt - now < MIN_REMAINING_MS) {
    signedCache.delete(key);
    return null;
  }
  return hit.url;
}

export function setCachedSignedUrl(viewer: string, path: string, url: string, now = Date.now()) {
  signedCache.set(cacheKey(viewer, path), { url, expiresAt: now + SIGNED_URL_TTL_SECONDS * 1000 });
}

/** Esquece todos os links guardados. */
export function clearSignedUrlCache() {
  signedCache.clear();
}
