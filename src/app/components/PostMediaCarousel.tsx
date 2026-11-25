import React, { useRef, useState } from 'react';
import type { PostMediaItem } from '../data/api';

interface Props {
  media: PostMediaItem[];
  /** Texto alternativo das fotos (ex.: legenda ou nome do memorial). */
  alt: string;
  className?: string;
}

/**
 * Fotos/vídeos de uma publicação. Com mais de um arquivo vira um carrossel
 * deslizável (como no Instagram), com pontinhos indicando a posição.
 */
export function PostMediaCarousel({ media, alt, className = '' }: Props) {
  const [index, setIndex] = useState(0);
  const scrollerRef = useRef<HTMLDivElement>(null);

  if (media.length === 0) return null;

  const handleScroll = () => {
    const el = scrollerRef.current;
    if (!el || el.clientWidth === 0) return;
    setIndex(Math.round(el.scrollLeft / el.clientWidth));
  };

  const goTo = (i: number) => {
    const el = scrollerRef.current;
    el?.scrollTo?.({ left: i * el.clientWidth, behavior: 'smooth' });
    setIndex(i);
  };

  return (
    <div className={`relative w-full aspect-square bg-black/30 ${className}`}>
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="flex h-full w-full overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {media.map((item, i) => (
          <div key={`${item.url}-${i}`} className="h-full w-full shrink-0 snap-center">
            {item.type === 'video' ? (
              <video
                src={item.url}
                controls
                playsInline
                preload="metadata"
                className="h-full w-full object-contain bg-black/40"
                aria-label={media.length > 1 ? `Vídeo ${i + 1} de ${media.length}` : 'Vídeo'}
              />
            ) : (
              <img
                src={item.url}
                alt={media.length > 1 ? `${alt} (${i + 1} de ${media.length})` : alt}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            )}
          </div>
        ))}
      </div>

      {media.length > 1 && (
        <>
          <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-black/50 text-[11px] text-white/90 pointer-events-none">
            {index + 1}/{media.length}
          </div>
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
            {media.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Ver item ${i + 1} de ${media.length}`}
                aria-current={i === index}
                className={`h-1.5 rounded-full transition-all ${i === index ? 'w-4 bg-white' : 'w-1.5 bg-white/50'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
