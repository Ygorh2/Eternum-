import React from 'react';
import { Flag, MoreVertical } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';

interface Props {
  /** Abre a janela de denúncia. Sem ela, o botão não aparece. */
  onReport?: () => void;
  reportLabel?: string;
  className?: string;
}

/** Botão "⋯" de um post com as opções (por enquanto: Denunciar). */
export function PostOptionsMenu({ onReport, reportLabel = 'Denunciar', className = '' }: Props) {
  if (!onReport) return null;
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Mais opções"
          className={`p-2 text-white/40 hover:text-white transition-colors flex-shrink-0 ${className}`}
        >
          <MoreVertical size={18} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-[#1E293B] border-white/10 text-white">
        <DropdownMenuItem
          onSelect={onReport}
          className="text-red-300 focus:bg-red-500/10 focus:text-red-200 cursor-pointer"
        >
          <Flag size={14} className="text-red-300" />
          {reportLabel}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
