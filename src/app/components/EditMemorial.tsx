import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Users, Loader2, Sparkles } from 'lucide-react';
import { AvatarUpload, CoverUpload } from './MediaUpload';
import { todayLocalISO } from '../utils/dateUtils';
import {
  MAX_BIO_LENGTH,
  MAX_QUOTE_LENGTH,
  validateMemorialForm,
  type MemorialFormValues,
} from '../utils/memorialValidation';

export type EditMemorialChanges = MemorialFormValues & {
  addToSky: boolean;
  /** Arquivos novos escolhidos (null = manter a imagem atual). */
  photoFile: File | null;
  coverFile: File | null;
};

interface Props {
  memorial: any;
  onCancel: () => void;
  /** Salva as mudanças; deve rejeitar com uma mensagem amigável se falhar. */
  onSave: (changes: EditMemorialChanges) => Promise<void>;
}

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB

const GROUP_OPTIONS: { value: string; label: string; hint: string }[] = [
  { value: 'family', label: 'Família e Amigos Próximos', hint: 'Você, quem você segue e quem aceitou seu convite' },
  { value: 'invited', label: 'Apenas Convidados', hint: 'Você e quem aceitou seu convite' },
  { value: 'public', label: 'Público', hint: 'Qualquer pessoa no Eternum' },
];

const inputClass =
  'w-full p-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-blue-500/50 text-white placeholder-white/30';

export function EditMemorial({ memorial, onCancel, onSave }: Props) {
  const [name, setName] = useState(memorial.name || '');
  const [birthDate, setBirthDate] = useState(memorial.birthDate || '');
  const [deathDate, setDeathDate] = useState(memorial.deathDate || '');
  const [bio, setBio] = useState(memorial.bio || '');
  const [quote, setQuote] = useState(memorial.quote || '');
  const [accessGroup, setAccessGroup] = useState(memorial.accessGroup || 'family');
  const [addToSky, setAddToSky] = useState(memorial.addToSky ?? true);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const today = todayLocalISO();

  const pickImage = (setter: (f: File | null) => void) => (file: File | null) => {
    if (file && !file.type.startsWith('image/')) {
      setError('Escolha um arquivo de imagem.');
      return;
    }
    if (file && file.size > MAX_IMAGE_BYTES) {
      setError('A imagem pode ter no máximo 10 MB.');
      return;
    }
    setError('');
    setter(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const values = { name, birthDate, deathDate, bio, quote, accessGroup };
    const validationError = validateMemorialForm(values, today);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setSaving(true);
    try {
      await onSave({ ...values, name: name.trim(), addToSky, photoFile, coverFile });
    } catch (err: any) {
      setError(err?.message || 'Não foi possível salvar as alterações.');
      setSaving(false);
    }
  };

  return (
    <div className="h-full bg-gradient-to-b from-[#0F172A] to-[#1E1B4B] flex flex-col text-white">
      <div className="p-4 flex items-center gap-4 bg-[#0F172A]/80 backdrop-blur-md border-b border-white/10 sticky top-0 z-10">
        <button
          type="button"
          onClick={onCancel}
          aria-label="Voltar"
          className="p-2 hover:bg-white/10 rounded-full text-white/70"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-medium text-blue-100">Editar Memorial</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 max-w-lg mx-auto w-full pb-32 space-y-6"
          noValidate
        >
          <div className="space-y-3">
            <span className="text-sm font-medium text-white/70">Foto de Perfil</span>
            <AvatarUpload currentImage={memorial.photo || undefined} onImageChange={pickImage(setPhotoFile)} size="lg" />
          </div>

          <div className="space-y-3">
            <span className="text-sm font-medium text-white/70">Foto de Capa</span>
            <CoverUpload currentImage={memorial.cover || undefined} onImageChange={pickImage(setCoverFile)} />
          </div>

          <div className="space-y-2">
            <label htmlFor="edit-name" className="text-sm font-medium text-white/70">
              Nome Completo <span className="text-red-400">*</span>
            </label>
            <input
              id="edit-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="edit-birth" className="text-sm font-medium text-white/70">
                Nascimento <span className="text-red-400">*</span>
              </label>
              <input
                id="edit-birth"
                type="date"
                value={birthDate}
                max={today}
                onChange={(e) => setBirthDate(e.target.value)}
                className={`${inputClass} [&::-webkit-calendar-picker-indicator]:invert`}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="edit-death" className="text-sm font-medium text-white/70">
                Falecimento <span className="text-red-400">*</span>
              </label>
              <input
                id="edit-death"
                type="date"
                value={deathDate}
                max={today}
                onChange={(e) => setDeathDate(e.target.value)}
                className={`${inputClass} [&::-webkit-calendar-picker-indicator]:invert`}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="edit-bio" className="text-sm font-medium text-white/70">
              Biografia <span className="text-red-400">*</span>
            </label>
            <textarea
              id="edit-bio"
              value={bio}
              maxLength={MAX_BIO_LENGTH}
              onChange={(e) => setBio(e.target.value)}
              className={`${inputClass} min-h-[140px]`}
              required
            />
            <p className="text-xs text-white/40">
              {bio.length}/{MAX_BIO_LENGTH} caracteres
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="edit-quote" className="text-sm font-medium text-white/70">
              Frase Marcante ou Citação
            </label>
            <input
              id="edit-quote"
              type="text"
              value={quote}
              maxLength={MAX_QUOTE_LENGTH}
              onChange={(e) => setQuote(e.target.value)}
              className={inputClass}
              placeholder="Ex: Para sempre em nossos corações"
            />
          </div>

          <label className="flex items-center gap-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-4 cursor-pointer">
            <input
              type="checkbox"
              checked={addToSky}
              onChange={(e) => setAddToSky(e.target.checked)}
              className="w-5 h-5 accent-blue-500"
            />
            <Sparkles size={18} className="text-blue-300" />
            <span className="text-sm text-white">Mostrar no Céu</span>
          </label>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-white/70 flex items-center gap-2 mb-2">
              <Users size={14} /> Quem pode ver este memorial?
            </legend>
            <div className="bg-white/5 border border-white/10 rounded-xl p-2 space-y-1">
              {GROUP_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-start gap-3 cursor-pointer p-3 hover:bg-white/5 rounded-lg transition-colors"
                >
                  <input
                    type="radio"
                    name="access-group"
                    value={opt.value}
                    checked={accessGroup === opt.value}
                    onChange={() => setAccessGroup(opt.value)}
                    className="mt-1 accent-blue-500"
                  />
                  <span>
                    <span className="block text-sm text-white/80">{opt.label}</span>
                    <span className="block text-xs text-white/40">{opt.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {error && (
            <div role="alert" className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="pt-2 flex gap-4">
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="flex-1 py-4 bg-white/5 text-white/70 border border-white/10 rounded-xl font-medium hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium shadow-lg shadow-blue-900/50 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Salvando...
                </>
              ) : (
                'Salvar alterações'
              )}
            </button>
          </div>
        </motion.form>
      </div>
    </div>
  );
}
