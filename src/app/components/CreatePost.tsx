import React, { useState } from 'react';
import { X, Loader2, User } from 'lucide-react';
import { MediaUpload } from './MediaUpload';
import { MAX_CAPTION_LENGTH, MAX_POST_MEDIA } from '../utils/mediaValidation';

interface Props {
  memorialName: string;
  memorialPhoto?: string;
  onCancel: () => void;
  /** Envia os arquivos e salva a publicação. Deve lançar erro se falhar. */
  onPublish: (caption: string, files: File[]) => Promise<void>;
}

export function CreatePost({ memorialName, memorialPhoto, onCancel, onPublish }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [caption, setCaption] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canPublish = files.length > 0 && !publishing && caption.length <= MAX_CAPTION_LENGTH;

  const handlePublish = async () => {
    if (!canPublish) return;
    setPublishing(true);
    setError(null);
    try {
      await onPublish(caption, files);
    } catch (err: any) {
      console.error('Erro ao publicar:', err);
      setError(err?.message || 'Não foi possível publicar. Tente de novo.');
      setPublishing(false);
    }
  };

  return (
    <div className="h-full bg-gradient-to-b from-[#0F172A] to-[#1E1B4B] flex flex-col text-white">
      <div className="p-4 flex items-center justify-between bg-[#0F172A]/80 backdrop-blur-md border-b border-white/10 sticky top-0 z-10">
        <button
          type="button"
          onClick={onCancel}
          disabled={publishing}
          aria-label="Cancelar"
          className="p-2 hover:bg-white/10 rounded-full text-white/70 disabled:opacity-50"
        >
          <X size={24} />
        </button>
        <h1 className="text-lg font-medium text-blue-100">Nova publicação</h1>
        <button
          type="button"
          onClick={handlePublish}
          disabled={!canPublish}
          className="px-3 py-2 text-blue-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/5 rounded-lg transition-colors flex items-center gap-2"
        >
          {publishing && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
          {publishing ? 'Publicando…' : 'Publicar'}
        </button>
      </div>

      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-white/20 bg-white/5 flex items-center justify-center shrink-0">
            {memorialPhoto ? (
              <img src={memorialPhoto} alt={memorialName} className="w-full h-full object-cover" />
            ) : (
              <User size={20} className="text-white/30" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-white/50 text-xs">Publicando em</p>
            <p className="text-base font-serif text-white font-medium truncate">{memorialName}</p>
          </div>
        </div>

        <MediaUpload
          onMediaChange={setFiles}
          maxFiles={MAX_POST_MEDIA}
          accept="both"
          label="Escolher fotos ou vídeos"
          disabled={publishing}
        />

        <div>
          <label htmlFor="post-caption" className="text-xs font-medium text-white/50 uppercase tracking-wide mb-2 block">
            Legenda
          </label>
          <textarea
            id="post-caption"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            disabled={publishing}
            maxLength={MAX_CAPTION_LENGTH}
            placeholder="Conte a história desta lembrança…"
            className="w-full h-32 bg-white/5 border border-white/10 rounded-xl p-3 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 resize-none disabled:opacity-60"
          />
          <p className="text-right text-[11px] text-white/30 mt-1">
            {caption.length}/{MAX_CAPTION_LENGTH}
          </p>
        </div>

        {error && (
          <div role="alert" className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-400/30 text-red-100 text-sm">
            {error}
          </div>
        )}

        {publishing && (
          <p role="status" className="text-center text-xs text-white/50">
            Enviando {files.length === 1 ? 'o arquivo' : `${files.length} arquivos`}… não feche esta tela.
          </p>
        )}
      </div>
    </div>
  );
}
