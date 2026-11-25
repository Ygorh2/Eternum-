import React, { useState, useEffect } from 'react';
import { todayLocalISO } from '../utils/dateUtils';
import { motion } from 'motion/react';
import { ArrowLeft, User, Bone, Check, Users, Lock, Sparkles, Loader2 } from 'lucide-react';
import { AvatarUpload, CoverUpload, MediaUpload } from './MediaUpload';
import { uploadMedia, uploadManyMedia } from '../data/api';

interface Props {
  onCancel: () => void;
  onFinish: (memorial: any) => void;
  initialType?: 'person' | 'pet';
}

export function CreateMemorial({ onCancel, onFinish, initialType = 'person' }: Props) {
  const [step, setStep] = useState(1);
  
  // Form State
  const [type, setType] = useState<'person' | 'pet'>(initialType);
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [deathDate, setDeathDate] = useState('');
  const [bio, setBio] = useState('');
  const [quote, setQuote] = useState('');
  const [privacyChecked, setPrivacyChecked] = useState(false);
  
  // Media State
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [coverPhoto, setCoverPhoto] = useState<File | null>(null);
  const [galleryMedia, setGalleryMedia] = useState<File[]>([]);
  
  // New: Add to Sky Toggle
  const [addToSky, setAddToSky] = useState(true);
  
  // Group Selection
  const [selectedGroup, setSelectedGroup] = useState('family');

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Get today's date in YYYY-MM-DD format for max date validation
  const today = todayLocalISO();

  useEffect(() => {
    if (initialType) setType(initialType);
  }, [initialType]);

  const validateDates = () => {
    if (!birthDate || !deathDate) return true; // Allow empty for now
    
    const birth = new Date(birthDate);
    const death = new Date(deathDate);
    const todayDate = new Date(today);

    // Death date must be past or today
    if (death > todayDate) {
      alert('A data de falecimento não pode ser no futuro.');
      return false;
    }

    // Birth must be before death
    if (birth >= death) {
      alert('A data de nascimento deve ser anterior à data de falecimento.');
      return false;
    }

    return true;
  };

  const handleNextStep = () => {
    if (!validateDates()) return;
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!validateDates()) return;

    setUploadError('');
    setIsUploading(true);

    try {
      // Envia os arquivos de verdade para o Supabase Storage.
      // Só depois disso o memorial é criado, já com as URLs reais.
      const [photoURL, coverURL, galleryUploaded] = await Promise.all([
        profilePhoto ? uploadMedia(profilePhoto, 'profile') : Promise.resolve(''),
        coverPhoto ? uploadMedia(coverPhoto, 'cover') : Promise.resolve(''),
        galleryMedia.length > 0 ? uploadManyMedia(galleryMedia, 'gallery') : Promise.resolve([]),
      ]);

      const newMemorial = {
        id: Date.now().toString(),
        name,
        photo: photoURL,
        cover: coverURL,
        birthDate,
        deathDate,
        quote,
        bio,
        candles: 0,
        type,
        accessGroup: selectedGroup,
        addToSky,
        comments: [],
        gallery: galleryUploaded, // já com URLs reais do Storage
      };
      onFinish(newMemorial);
    } catch (err: any) {
      console.error('Erro ao enviar mídia do memorial:', err);
      setUploadError(err?.message || 'Não foi possível enviar as fotos/vídeos. Tente novamente.');
      setIsUploading(false);
    }
  };

  return (
    <div className="h-full bg-gradient-to-b from-[#0F172A] to-[#1E1B4B] flex flex-col text-white">
      {/* Header */}
      <div className="p-4 flex items-center gap-4 bg-[#0F172A]/80 backdrop-blur-md border-b border-white/10 sticky top-0 z-10">
        <button onClick={onCancel} className="p-2 hover:bg-white/10 rounded-full text-white/70">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-medium text-blue-100">Novo Memorial</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-lg mx-auto w-full pb-32">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex gap-2 mb-2">
              <div className={`h-1 flex-1 rounded-full transition-all ${step >= 1 ? 'bg-blue-500' : 'bg-white/10'}`}></div>
              <div className={`h-1 flex-1 rounded-full transition-all ${step >= 2 ? 'bg-blue-500' : 'bg-white/10'}`}></div>
              <div className={`h-1 flex-1 rounded-full transition-all ${step >= 3 ? 'bg-blue-500' : 'bg-white/10'}`}></div>
            </div>
            <h2 className="text-2xl font-serif text-blue-100 mt-4">
              {step === 1 && 'Quem você quer homenagear?'}
              {step === 2 && 'Adicione fotos e vídeos'}
              {step === 3 && 'Conte a história'}
            </h2>
            <p className="text-sm text-white/50 mt-1">
              {step === 1 && 'Informações básicas do memorial'}
              {step === 2 && 'Compartilhe momentos especiais'}
              {step === 3 && 'Biografia e configurações'}
            </p>
          </div>

          {/* STEP 1: Basic Information */}
          {step === 1 && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              {/* Type Selector */}
              <div>
                <label className="text-sm font-medium text-white/70 mb-3 block">Tipo de Memorial</label>
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => setType('person')}
                    className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                      type === 'person' 
                      ? 'border-blue-500 bg-blue-500/20 text-blue-200' 
                      : 'border-white/10 text-white/40 hover:bg-white/5 hover:border-white/20'
                    }`}
                  >
                    <User size={32} />
                    <span className="font-medium">Pessoa</span>
                  </button>
                  <button 
                    onClick={() => setType('pet')}
                    className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                      type === 'pet' 
                      ? 'border-amber-500 bg-amber-500/20 text-amber-200' 
                      : 'border-white/10 text-white/40 hover:bg-white/5 hover:border-white/20'
                    }`}
                  >
                    <Bone size={32} />
                    <span className="font-medium">Pet</span>
                  </button>
                </div>
              </div>

              {/* Name */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/70">
                  Nome Completo <span className="text-red-400">*</span>
                </label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-blue-500/50 text-white placeholder-white/30"
                  placeholder={type === 'person' ? 'Nome do ente querido' : 'Nome do pet'}
                  required
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/70">
                    Nascimento <span className="text-red-400">*</span>
                  </label>
                  <input 
                    type="date" 
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    max={today}
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-blue-500/50 text-white [&::-webkit-calendar-picker-indicator]:invert"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/70">
                    Falecimento <span className="text-red-400">*</span>
                  </label>
                  <input 
                    type="date" 
                    value={deathDate}
                    onChange={(e) => setDeathDate(e.target.value)}
                    max={today}
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-blue-500/50 text-white [&::-webkit-calendar-picker-indicator]:invert"
                    required
                  />
                </div>
              </div>

              {/* Date Validation Message */}
              {deathDate && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
                  <p className="text-xs text-blue-200">
                    💡 A data de falecimento só pode ser uma data passada ou hoje
                  </p>
                </div>
              )}

              {/* Continue Button */}
              <div className="pt-4">
                <button 
                  onClick={handleNextStep}
                  disabled={!name || !birthDate || !deathDate}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium shadow-lg shadow-blue-900/50 hover:shadow-blue-900/70 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continuar
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: Media Upload */}
          {step === 2 && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              {/* Profile Photo */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-white/70">Foto de Perfil do Memorial</label>
                <AvatarUpload 
                  onImageChange={setProfilePhoto}
                  label="Foto de Perfil"
                  size="lg"
                />
              </div>

              {/* Cover Photo */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-white/70">Foto de Capa</label>
                <CoverUpload 
                  onImageChange={setCoverPhoto}
                  label="Foto de Capa"
                />
              </div>

              {/* Gallery */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-white/70">Galeria de Fotos e Vídeos</label>
                <p className="text-xs text-white/40">Adicione momentos especiais para compartilhar</p>
                <MediaUpload 
                  onMediaChange={setGalleryMedia}
                  maxFiles={10}
                  accept="both"
                  label="Adicionar Fotos ou Vídeos"
                />
              </div>

              {/* Navigation */}
              <div className="pt-4 flex gap-4">
                <button 
                  onClick={() => setStep(1)}
                  className="flex-1 py-4 bg-white/5 text-white/70 border border-white/10 rounded-xl font-medium hover:bg-white/10 transition-colors"
                >
                  Voltar
                </button>
                <button 
                  onClick={() => setStep(3)}
                  className="flex-1 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium shadow-lg shadow-blue-900/50 hover:shadow-blue-900/70 transition-all"
                >
                  Continuar
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: Biography & Settings */}
          {step === 3 && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              {/* Biography */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/70">
                  Biografia <span className="text-red-400">*</span>
                </label>
                <textarea 
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-blue-500/50 text-white placeholder-white/30 min-h-[140px]"
                  placeholder="Conte sobre a vida, personalidade, conquistas e legado..."
                  required
                ></textarea>
                <p className="text-xs text-white/40">{bio.length}/500 caracteres</p>
              </div>

              {/* Quote */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/70">Frase Marcante ou Citação</label>
                <input 
                  type="text" 
                  value={quote}
                  onChange={(e) => setQuote(e.target.value)}
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-blue-500/50 text-white placeholder-white/30"
                  placeholder="Ex: Para sempre em nossos corações"
                />
              </div>

              {/* Add to Sky Toggle */}
              <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-4">
                <label className="flex items-start gap-4 cursor-pointer">
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      checked={addToSky}
                      onChange={(e) => setAddToSky(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-14 h-8 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-6 after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-blue-600 peer-checked:to-purple-600"></div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles size={18} className="text-blue-300" />
                      <span className="font-medium text-white">Adicionar ao Céu</span>
                    </div>
                    <p className="text-xs text-white/60 leading-relaxed">
                      Quando ativado, este memorial aparecerá na feature "O Céu", onde você pode visualizar as estrelas de todos os seus entes queridos em um mapa celestial.
                    </p>
                  </div>
                </label>
              </div>

              {/* Privacy Settings */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/70 flex items-center gap-2">
                  <Users size={14} /> 
                  Quem pode ver este memorial?
                </label>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <div className="flex items-center gap-3 text-white/60 text-sm mb-4 bg-black/20 p-3 rounded-lg">
                    <Lock size={14} />
                    <span>Todos os memoriais são privados por padrão.</span>
                  </div>
                  
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer p-3 hover:bg-white/5 rounded-lg transition-colors">
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${selectedGroup === 'family' ? 'border-blue-500 bg-blue-500/20' : 'border-white/20'}`}>
                        {selectedGroup === 'family' && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
                      </div>
                      <input type="radio" className="hidden" checked={selectedGroup === 'family'} onChange={() => setSelectedGroup('family')} />
                      <span className="text-sm text-white/80">Família e Amigos Próximos</span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer p-3 hover:bg-white/5 rounded-lg transition-colors">
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${selectedGroup === 'invited' ? 'border-blue-500 bg-blue-500/20' : 'border-white/20'}`}>
                        {selectedGroup === 'invited' && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
                      </div>
                      <input type="radio" className="hidden" checked={selectedGroup === 'invited'} onChange={() => setSelectedGroup('invited')} />
                      <span className="text-sm text-white/80">Apenas Convidados</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Privacy Agreement */}
              <div className="pt-2">
                <label className="flex items-start gap-3 p-4 bg-red-500/10 rounded-xl border border-red-500/20 cursor-pointer hover:bg-red-500/20 transition-colors">
                  <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors ${privacyChecked ? 'bg-blue-500 border-blue-500' : 'border-white/20'}`}>
                    {privacyChecked && <Check size={12} className="text-white" />}
                    <input type="checkbox" className="hidden" checked={privacyChecked} onChange={(e) => setPrivacyChecked(e.target.checked)} />
                  </div>
                  <span className="text-xs text-white/70 leading-relaxed">
                    Declaro que esta homenagem é para alguém que já partiu. Memoriais de pessoas ou animais vivos violam nossos termos e serão removidos.
                  </span>
                </label>
              </div>

              {/* Erro de upload */}
              {uploadError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-200">
                  {uploadError}
                </div>
              )}

              {/* Submit Buttons */}
              <div className="pt-4 flex gap-4">
                <button 
                  onClick={() => setStep(2)}
                  disabled={isUploading}
                  className="flex-1 py-4 bg-white/5 text-white/70 border border-white/10 rounded-xl font-medium hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Voltar
                </button>
                <button 
                  onClick={handleSubmit}
                  disabled={!privacyChecked || !bio || isUploading}
                  className="flex-1 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium shadow-lg shadow-blue-900/50 hover:shadow-blue-900/70 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Enviando fotos...
                    </>
                  ) : (
                    'Criar Memorial'
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}