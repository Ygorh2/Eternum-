import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Bell, Lock, Mail, Users, Moon, Palette, HelpCircle, ChevronRight, LogOut, Loader2, Check, Ban, Flag } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  onBack: () => void;
  onLogout: () => void;
  /** Valor salvo no banco; null enquanto carrega. */
  notificationsEnabled?: boolean | null;
  onToggleNotifications?: (enabled: boolean) => void;
  notificationsError?: string | null;
  /** Abre a lista de pessoas bloqueadas. */
  onOpenBlocked?: () => void;
  /** Só para administradores: abre as denúncias recebidas. */
  onOpenReports?: () => void;
}

export function Settings({
  onBack,
  onLogout,
  notificationsEnabled = null,
  onToggleNotifications,
  notificationsError,
  onOpenBlocked,
  onOpenReports,
}: Props) {
  const { user, updateEmail, updatePassword } = useAuth();
  const notifications = notificationsEnabled !== false;
  const [darkMode, setDarkMode] = useState(true);

  // Alterar email
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailStatus, setEmailStatus] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');
  const [emailError, setEmailError] = useState('');

  // Alterar senha
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');
  const [passwordError, setPasswordError] = useState('');

  const handleSaveEmail = async () => {
    if (!newEmail || newEmail === user?.email) return;
    setEmailStatus('saving');
    setEmailError('');
    try {
      await updateEmail(newEmail);
      setEmailStatus('done');
    } catch (err: any) {
      setEmailStatus('error');
      setEmailError(err?.message || 'Não foi possível alterar o email.');
    }
  };

  const handleSavePassword = async () => {
    if (newPassword.length < 6) {
      setPasswordStatus('error');
      setPasswordError('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus('error');
      setPasswordError('As senhas não coincidem.');
      return;
    }
    setPasswordStatus('saving');
    setPasswordError('');
    try {
      await updatePassword(newPassword);
      setPasswordStatus('done');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordStatus('error');
      setPasswordError(err?.message || 'Não foi possível alterar a senha.');
    }
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-[#0F172A] to-[#1E1B4B] text-white">
      {/* Header */}
      <div className="p-4 flex items-center gap-4 bg-[#0F172A]/80 backdrop-blur-md border-b border-white/10 sticky top-0 z-10">
        <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/70">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-medium text-blue-100">Configurações</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-24">
        {/* Account Section */}
        <section>
          <h2 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3 ml-2">Conta</h2>
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
             <button
               onClick={() => setShowEmailForm(!showEmailForm)}
               className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors border-b border-white/5"
             >
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-blue-500/10 text-blue-300 rounded-lg"><Mail size={18} /></div>
                   <div className="text-left">
                     <span className="text-sm font-medium block">Alterar Email</span>
                     <span className="text-xs text-white/40">{user?.email}</span>
                   </div>
                </div>
                <ChevronRight size={16} className={`text-white/30 transition-transform ${showEmailForm ? 'rotate-90' : ''}`} />
             </button>

             {showEmailForm && (
               <div className="p-4 border-b border-white/5 space-y-3 bg-black/20">
                 <input
                   type="email"
                   value={newEmail}
                   onChange={(e) => { setNewEmail(e.target.value); setEmailStatus('idle'); }}
                   placeholder="novo@email.com"
                   className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/50"
                 />
                 {emailStatus === 'error' && <p className="text-xs text-red-300">{emailError}</p>}
                 {emailStatus === 'done' && (
                   <p className="text-xs text-green-300 flex items-center gap-1">
                     <Check size={14} /> Verifique sua caixa de entrada para confirmar o novo email.
                   </p>
                 )}
                 <button
                   onClick={handleSaveEmail}
                   disabled={emailStatus === 'saving' || !newEmail}
                   className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                 >
                   {emailStatus === 'saving' ? <Loader2 size={16} className="animate-spin" /> : 'Salvar novo email'}
                 </button>
               </div>
             )}

             <button
               onClick={() => setShowPasswordForm(!showPasswordForm)}
               className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors border-b border-white/5"
             >
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-purple-500/10 text-purple-300 rounded-lg"><Lock size={18} /></div>
                   <span className="text-sm font-medium">Alterar Senha</span>
                </div>
                <ChevronRight size={16} className={`text-white/30 transition-transform ${showPasswordForm ? 'rotate-90' : ''}`} />
             </button>

             {showPasswordForm && (
               <div className="p-4 border-b border-white/5 space-y-3 bg-black/20">
                 <input
                   type="password"
                   value={newPassword}
                   onChange={(e) => { setNewPassword(e.target.value); setPasswordStatus('idle'); }}
                   placeholder="Nova senha (mín. 6 caracteres)"
                   className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/50"
                 />
                 <input
                   type="password"
                   value={confirmPassword}
                   onChange={(e) => { setConfirmPassword(e.target.value); setPasswordStatus('idle'); }}
                   placeholder="Confirmar nova senha"
                   className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/50"
                 />
                 {passwordStatus === 'error' && <p className="text-xs text-red-300">{passwordError}</p>}
                 {passwordStatus === 'done' && (
                   <p className="text-xs text-green-300 flex items-center gap-1">
                     <Check size={14} /> Senha alterada com sucesso.
                   </p>
                 )}
                 <button
                   onClick={handleSavePassword}
                   disabled={passwordStatus === 'saving' || !newPassword}
                   className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                 >
                   {passwordStatus === 'saving' ? <Loader2 size={16} className="animate-spin" /> : 'Salvar nova senha'}
                 </button>
               </div>
             )}

             <button className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-amber-500/10 text-amber-300 rounded-lg"><Users size={18} /></div>
                   <span className="text-sm font-medium">Meus Grupos (Família)</span>
                </div>
                <ChevronRight size={16} className="text-white/30" />
             </button>
          </div>
        </section>

        {/* Privacidade e segurança */}
        {(onOpenBlocked || onOpenReports) && (
          <section>
            <h2 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3 ml-2">Privacidade e segurança</h2>
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              {onOpenBlocked && (
                <button
                  onClick={onOpenBlocked}
                  className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors border-b border-white/5 last:border-b-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-500/10 text-slate-300 rounded-lg"><Ban size={18} /></div>
                    <span className="text-sm font-medium">Pessoas bloqueadas</span>
                  </div>
                  <ChevronRight size={16} className="text-white/30" />
                </button>
              )}
              {onOpenReports && (
                <button
                  onClick={onOpenReports}
                  className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-500/10 text-red-300 rounded-lg"><Flag size={18} /></div>
                    <div className="text-left">
                      <span className="text-sm font-medium block">Denúncias recebidas</span>
                      <span className="text-xs text-white/40">Só administradores veem esta opção</span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-white/30" />
                </button>
              )}
            </div>
          </section>
        )}

        {/* Preferences */}
        <section>
          <h2 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3 ml-2">Preferências</h2>
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
             <div className="w-full p-4 border-b border-white/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <div className="p-2 bg-red-500/10 text-red-300 rounded-lg"><Bell size={18} /></div>
                     <div className="text-left">
                       <span id="notifications-label" className="text-sm font-medium block">Notificações</span>
                       <span className="text-xs text-white/40">Seguidores, velas, reações, comentários e homenagens</span>
                     </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={notifications}
                    aria-labelledby="notifications-label"
                    disabled={notificationsEnabled === null || !onToggleNotifications}
                    onClick={() => onToggleNotifications?.(!notifications)}
                    className={`w-10 h-6 shrink-0 rounded-full p-1 transition-colors disabled:opacity-50 ${notifications ? 'bg-blue-500' : 'bg-white/20'}`}
                  >
                    <motion.div className="w-4 h-4 bg-white rounded-full shadow-sm" layout transition={{ type: 'spring', stiffness: 700, damping: 30 }} animate={{ x: notifications ? 16 : 0 }} />
                  </button>
                </div>
                {notificationsError && <p role="alert" className="text-xs text-red-300 mt-2">{notificationsError}</p>}
             </div>
             
             <button className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors border-b border-white/5">
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-indigo-500/10 text-indigo-300 rounded-lg"><Palette size={18} /></div>
                   <span className="text-sm font-medium">Aparência</span>
                </div>
                <ChevronRight size={16} className="text-white/30" />
             </button>
          </div>
        </section>

        {/* Support */}
        <section>
          <h2 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3 ml-2">Suporte</h2>
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
             <button className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors border-b border-white/5">
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-emerald-500/10 text-emerald-300 rounded-lg"><HelpCircle size={18} /></div>
                   <span className="text-sm font-medium">Central de Ajuda</span>
                </div>
                <ChevronRight size={16} className="text-white/30" />
             </button>
             <button 
               onClick={onLogout}
               className="w-full p-4 flex items-center gap-3 hover:bg-red-500/10 transition-colors text-red-300"
             >
                <div className="p-2 bg-red-500/10 rounded-lg"><LogOut size={18} /></div>
                <span className="text-sm font-medium">Sair da Conta</span>
             </button>
          </div>
        </section>

        <p className="text-center text-[10px] text-white/20 pt-4">Versão 1.0.0 (Alpha)</p>
      </div>
    </div>
  );
}