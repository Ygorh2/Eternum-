import React from 'react';
import { motion } from 'motion/react';
import { Copy, Loader2, Play } from 'lucide-react';

export type PostGridItem = {
  /** Identificador único do quadradinho. */
  id: string;
  /** Primeira foto/vídeo da publicação (já com link temporário, se for do bucket). */
  url: string;
  type: 'image' | 'video';
  /** Quantos arquivos a publicação tem (mostra o ícone de "várias fotos"). */
  count?: number;
  /** Descrição para leitores de tela (ex.: legenda). */
  label: string;
};

interface Props {
  items: PostGridItem[];
  onSelect: (id: string) => void;
  loading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  error?: string | null;
  emptyText?: string;
}

/**
 * Grade de fotos em 3 colunas, como no perfil do Instagram. Cada quadrado é
 * um botão que abre a publicação.
 */
export function PostGrid({ items, onSelect, loading, hasMore, onLoadMore, error, emptyText }: Props) {
  if (items.length === 0) {
    if (loading) {
      return (
        <div role="status" className="py-10 flex justify-center text-white/40">
          <Loader2 size={24} className="animate-spin" />
          <span className="sr-only">Carregando publicações…</span>
        </div>
      );
    }
    if (error) return <p className="py-8 text-center text-sm text-red-300">{error}</p>;
    return <p className="py-8 text-center text-sm text-white/40">{emptyText || 'Nenhuma publicação ainda.'}</p>;
  }

  return (
    <div className="w-full">
      <ul className="grid grid-cols-3 gap-0.5" aria-label="Publicações em grade">
        {items.map((item, index) => (
          <motion.li
            key={item.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: Math.min(index, 12) * 0.03 }}
          >
            <button
              type="button"
              onClick={() => onSelect(item.id)}
              aria-label={item.label}
              className="relative block w-full aspect-square overflow-hidden bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              {item.type === 'video' ? (
                // #t=0.1 faz o navegador (inclusive no iPhone) mostrar o primeiro quadro
                <video
                  src={`${item.url}#t=0.1`}
                  preload="metadata"
                  muted
                  playsInline
                  aria-hidden="true"
                  className="w-full h-full object-cover pointer-events-none"
                />
              ) : (
                <img src={item.url} alt="" loading="lazy" className="w-full h-full object-cover" />
              )}
              {item.type === 'video' ? (
                <Play size={16} aria-hidden="true" className="absolute top-1.5 right-1.5 text-white fill-white drop-shadow" />
              ) : (item.count ?? 1) > 1 ? (
                <Copy size={16} aria-hidden="true" className="absolute top-1.5 right-1.5 text-white drop-shadow" />
              ) : null}
            </button>
          </motion.li>
        ))}
      </ul>

      {error && <p className="pt-4 text-center text-sm text-red-300">{error}</p>}

      {hasMore && onLoadMore && (
        <div className="pt-4 flex justify-center">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loading}
            className="px-5 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white/70 hover:bg-white/10 transition-colors disabled:opacity-60 flex items-center gap-2"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            Carregar mais
          </button>
        </div>
      )}
    </div>
  );
}

/** Converte publicações (memorial_posts) em quadrados da grade. */
export function gridItemsFromPosts(
  posts: { id: string; caption: string; media: { url: string; type: 'image' | 'video' }[] }[]
): PostGridItem[] {
  return posts
    .filter((p) => p.media.length > 0)
    .map((p) => ({
      id: p.id,
      url: p.media[0].url,
      type: p.media[0].type,
      count: p.media.length,
      label: p.caption ? `Abrir publicação: ${p.caption.slice(0, 80)}` : 'Abrir publicação',
    }));
}
