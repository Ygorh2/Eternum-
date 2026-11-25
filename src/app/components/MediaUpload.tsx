import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, X, Image as ImageIcon, Video, Play } from 'lucide-react';
import {
  MAX_IMAGE_SIZE_MB,
  MAX_VIDEO_SIZE_MB,
  mediaKindOf,
  validateMediaFiles,
  type MediaAccept,
  type RejectedFile,
} from '../utils/mediaValidation';

interface MediaFile {
  id: string;
  file: File;
  preview: string;
  type: 'image' | 'video';
}

interface Props {
  onMediaChange: (files: File[]) => void;
  maxFiles?: number;
  accept?: MediaAccept;
  preview?: boolean;
  label?: string;
  className?: string;
  maxImageSizeMB?: number;
  maxVideoSizeMB?: number;
  disabled?: boolean;
}

let nextMediaId = 0;

export function MediaUpload({ 
  onMediaChange, 
  maxFiles = 5, 
  accept = 'both',
  preview = true,
  label = 'Adicionar Foto ou Vídeo',
  className = '',
  maxImageSizeMB = MAX_IMAGE_SIZE_MB,
  maxVideoSizeMB = MAX_VIDEO_SIZE_MB,
  disabled = false,
}: Props) {
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [rejected, setRejected] = useState<RejectedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Libera as prévias (object URLs) quando a tela fecha
  const filesRef = useRef(mediaFiles);
  filesRef.current = mediaFiles;
  useEffect(() => () => filesRef.current.forEach((m) => URL.revokeObjectURL(m.preview)), []);

  const acceptTypes = () => {
    if (accept === 'image') return 'image/*';
    if (accept === 'video') return 'video/*';
    return 'image/*,video/*';
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    // Arquivos inválidos são recusados um a um, sem descartar os válidos
    const { valid, rejected: refused } = validateMediaFiles(files, {
      accept,
      maxImageSizeMB,
      maxVideoSizeMB,
      remainingSlots: Math.max(0, maxFiles - mediaFiles.length),
    });
    setRejected(refused);

    if (valid.length > 0) {
      // Object URL em vez de data URL: não carrega o vídeo inteiro na memória
      const added: MediaFile[] = valid.map((file) => ({
        id: `media-${nextMediaId++}`,
        file,
        preview: URL.createObjectURL(file),
        type: mediaKindOf(file) === 'video' ? 'video' : 'image',
      }));
      const updated = [...mediaFiles, ...added];
      setMediaFiles(updated);
      onMediaChange(updated.map((m) => m.file));
    }

    // Permite escolher o mesmo arquivo de novo
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeMedia = (id: string) => {
    const removed = mediaFiles.find((m) => m.id === id);
    if (removed) URL.revokeObjectURL(removed.preview);
    const updated = mediaFiles.filter(m => m.id !== id);
    setMediaFiles(updated);
    onMediaChange(updated.map(m => m.file));
  };

  const isFull = mediaFiles.length >= maxFiles;
  const sizeHint =
    accept === 'image'
      ? `até ${maxImageSizeMB} MB`
      : accept === 'video'
        ? `até ${maxVideoSizeMB} MB`
        : `fotos até ${maxImageSizeMB} MB, vídeos até ${maxVideoSizeMB} MB`;

  return (
    <div className={className}>
      {/* Upload Button */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isFull || disabled}
        className={`w-full p-4 rounded-xl border-2 border-dashed transition-all ${
          isFull || disabled
            ? 'border-white/10 bg-white/5 text-white/30 cursor-not-allowed'
            : 'border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 hover:border-blue-500/50 text-blue-200'
        }`}
      >
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
            {accept === 'image' ? (
              <ImageIcon size={24} />
            ) : accept === 'video' ? (
              <Video size={24} />
            ) : (
              <Upload size={24} />
            )}
          </div>
          <div>
            <p className="font-medium text-sm">{label}</p>
            <p className="text-xs text-white/40 mt-1">
              {accept === 'image' && 'Apenas imagens'}
              {accept === 'video' && 'Apenas vídeos'}
              {accept === 'both' && 'Fotos ou vídeos'}
              {' · '}
              {mediaFiles.length}/{maxFiles}
            </p>
            <p className="text-[11px] text-white/30 mt-0.5">{sizeHint}</p>
          </div>
        </div>
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept={acceptTypes()}
        multiple={maxFiles > 1}
        onChange={handleFileSelect}
        className="hidden"
      />

      {rejected.length > 0 && (
        <div
          role="alert"
          className="mt-3 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-400/30 text-amber-100 text-xs space-y-1"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium">
              {rejected.length === 1 ? '1 arquivo não foi adicionado:' : `${rejected.length} arquivos não foram adicionados:`}
            </p>
            <button
              type="button"
              onClick={() => setRejected([])}
              aria-label="Fechar aviso"
              className="text-amber-200/80 hover:text-amber-100"
            >
              <X size={14} />
            </button>
          </div>
          <ul className="space-y-0.5">
            {rejected.map((r, i) => (
              <li key={`${r.name}-${i}`} className="break-all">
                {r.name}: {r.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Media Preview Grid */}
      {preview && mediaFiles.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <AnimatePresence>
            {mediaFiles.map((media) => (
              <motion.div
                key={media.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="relative aspect-square rounded-xl overflow-hidden bg-black/20 border border-white/10"
              >
                {/* Media Content */}
                {media.type === 'image' ? (
                  <img
                    src={media.preview}
                    alt={`Prévia de ${media.file.name}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="relative w-full h-full">
                    <video
                      src={media.preview}
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <Play size={20} className="text-white ml-1" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Remove Button */}
                <button
                  type="button"
                  onClick={() => removeMedia(media.id)}
                  disabled={disabled}
                  aria-label={`Remover ${media.file.name}`}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500/80 hover:bg-red-500 text-white flex items-center justify-center transition-colors shadow-lg disabled:opacity-50"
                >
                  <X size={16} />
                </button>

                {/* Type Badge */}
                <div className="absolute bottom-2 left-2 px-2 py-1 rounded-md bg-black/50 backdrop-blur-sm">
                  <p className="text-[10px] text-white font-medium flex items-center gap-1">
                    {media.type === 'image' ? (
                      <><ImageIcon size={10} /> Foto</>
                    ) : (
                      <><Video size={10} /> Vídeo</>
                    )}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

// Avatar Upload Component (circular)
interface AvatarUploadProps {
  currentImage?: string;
  onImageChange: (file: File | null) => void;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function AvatarUpload({ 
  currentImage, 
  onImageChange, 
  label = 'Foto de Perfil',
  size = 'md'
}: AvatarUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = {
    sm: 'w-20 h-20',
    md: 'w-28 h-28',
    lg: 'w-36 h-36'
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Por favor, selecione uma imagem');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
        onImageChange(file);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setPreview(null);
    onImageChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <div className={`${sizeClasses[size]} rounded-full overflow-hidden border-2 border-white/20 bg-white/5 shadow-lg`}>
          {preview ? (
            <img src={preview} alt="Preview" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/30">
              <ImageIcon size={size === 'sm' ? 24 : size === 'md' ? 32 : 40} />
            </div>
          )}
        </div>

        {preview && (
          <button
            type="button"
            onClick={removeImage}
            className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors shadow-lg"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg text-sm font-medium text-blue-200 transition-colors"
      >
        {preview ? 'Alterar' : 'Adicionar'} {label}
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}

// Cover Upload Component (wide aspect ratio)
interface CoverUploadProps {
  currentImage?: string;
  onImageChange: (file: File | null) => void;
  label?: string;
}

export function CoverUpload({ 
  currentImage, 
  onImageChange, 
  label = 'Foto de Capa'
}: CoverUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Por favor, selecione uma imagem');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
        onImageChange(file);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setPreview(null);
    onImageChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative w-full aspect-[3/1] rounded-2xl overflow-hidden border-2 border-white/10 bg-white/5 shadow-lg">
        {preview ? (
          <img src={preview} alt="Preview" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-white/30">
            <ImageIcon size={48} />
            <p className="text-sm mt-2">{label}</p>
          </div>
        )}

        {preview && (
          <button
            type="button"
            onClick={removeImage}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-red-500/80 hover:bg-red-500 text-white flex items-center justify-center transition-colors shadow-lg backdrop-blur-sm"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="w-full px-4 py-2.5 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-xl text-sm font-medium text-blue-200 transition-colors"
      >
        {preview ? 'Alterar' : 'Adicionar'} {label}
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
