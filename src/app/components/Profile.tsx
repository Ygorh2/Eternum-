import React, { useState, useEffect } from 'react';
import { formatDate } from '../utils/dateUtils';
import { motion } from 'motion/react';
import { Settings, Edit2, LogOut, Menu, User, Mail, Shield, AtSign, Calendar, Heart, Users, Star } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import * as api from '../data/api';

interface Props {
  onLogout: () => void;
  onOpenMenu: () => void;
  onSettings: () => void;
  memorials?: any[]; // Para contar os memoriais criados
}

export function Profile({ onLogout, onOpenMenu, onSettings, memorials }: Props) {
  const { user, userMetadata } = useAuth();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Estatísticas reais (memorialsCount já vem real via prop `memorials`;
  // followersCount/followingCount vêm da tabela follows)
  const [stats, setStats] = useState({
    memorialsCount: memorials?.length || 0,
    followersCount: 0,
    followingCount: 0,
  });

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    api
      .fetchProfileStats(user.id)
      .then((data) => {
        if (!cancelled) {
          setStats({
            memorialsCount: memorials?.length ?? data.memorialsCount,
            followersCount: data.followersCount,
            followingCount: data.followingCount,
          });
        }
      })
      .catch((err) => console.error('Erro ao carregar estatísticas do perfil:', err));
    return () => {
      cancelled = true;
    };
  }, [user?.id, memorials?.length]);

  // Formatar a data de nascimento se existir
  const formatBirthDate = (dateString?: string) => {
    if (!dateString) return 'Não informado';
    return formatDate(dateString);
  };

  // Calcular quanto tempo é membro
  const getMemberSince = () => {
    if (!user?.created_at) return 'Membro desde 2024';
    const createdDate = new Date(user.created_at);
    return `Membro desde ${createdDate.getFullYear()}`;
  };

  return (
    <div className="h-full flex flex-col bg-transparent text-white">
      {/* Header */}
      <div className="bg-[#0F172A]/80 backdrop-blur-md px-6 py-4 sticky top-0 z-10 shadow-lg border-b border-white/10 flex items-center justify-between">
         <div className="flex items-center gap-4">
             <button onClick={onOpenMenu} className="p-2 -ml-2 text-white/70 hover:text-white transition-colors">
               <Menu size={24} />
             </button>
             <h1 className="text-xl font-serif text-blue-100">Meu Perfil</h1>
          </div>
          <button onClick={onSettings} className="p-2 text-white/40 hover:text-white transition-colors">
            <Settings size={20} />
          </button>
      </div>

      <div className="flex-1 p-6 flex flex-col items-center overflow-y-auto pb-24">
         {/* Avatar Section */}
         <motion.div 
           initial={{ scale: 0.9, opacity: 0 }}
           animate={{ scale: 1, opacity: 1 }}
           className="relative mb-6 mt-8"
         >
            <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-tr from-blue-500 to-purple-500 shadow-[0_0_30px_rgba(59,130,246,0.3)]">
               <div className="w-full h-full rounded-full border-4 border-[#0F172A] overflow-hidden bg-[#1E293B] flex items-center justify-center">
                 {user?.user_metadata?.avatar_url ? (
                   <img src={user.user_metadata.avatar_url} alt={userMetadata?.display_name || 'Usuário'} className="w-full h-full object-cover" />
                 ) : (
                   <User size={48} className="text-white/30" />
                 )}
               </div>
            </div>
            <button className="absolute bottom-1 right-1 p-2 bg-blue-600 rounded-full text-white shadow-lg border-4 border-[#0F172A] hover:bg-blue-500 transition-colors">
              <Edit2 size={16} />
            </button>
         </motion.div>

         {/* Info Section */}
         <div className="text-center mb-6">
           <h2 className="text-2xl font-serif font-medium text-white mb-1">
             {userMetadata?.display_name || user?.email?.split('@')[0] || 'Usuário'}
           </h2>
           {userMetadata?.username && (
             <p className="text-blue-200/60 text-sm mb-2">@{userMetadata.username}</p>
           )}
           <p className="text-blue-200/50 text-xs">{getMemberSince()}</p>
         </div>

         {/* Statistics Section */}
         <motion.div 
           initial={{ y: 20, opacity: 0 }}
           animate={{ y: 0, opacity: 1 }}
           transition={{ delay: 0.1 }}
           className="w-full mb-8"
         >
           <div className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 backdrop-blur-sm border border-blue-500/20 rounded-2xl p-5 shadow-lg">
             <div className="flex items-center justify-around">
               {/* Memoriais */}
               <button className="flex flex-col items-center gap-2 hover:scale-105 transition-transform">
                 <div className="w-12 h-12 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                   <Star size={20} className="text-blue-300" />
                 </div>
                 <div className="text-center">
                   <p className="text-2xl font-bold text-white">{stats.memorialsCount}</p>
                   <p className="text-xs text-blue-200/60 font-medium">Memoriais</p>
                 </div>
               </button>

               {/* Divider */}
               <div className="w-px h-16 bg-white/10"></div>

               {/* Seguindo */}
               <button className="flex flex-col items-center gap-2 hover:scale-105 transition-transform">
                 <div className="w-12 h-12 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                   <Users size={20} className="text-purple-300" />
                 </div>
                 <div className="text-center">
                   <p className="text-2xl font-bold text-white">{stats.followingCount}</p>
                   <p className="text-xs text-purple-200/60 font-medium">Seguindo</p>
                 </div>
               </button>

               {/* Divider */}
               <div className="w-px h-16 bg-white/10"></div>

               {/* Seguidores */}
               <button className="flex flex-col items-center gap-2 hover:scale-105 transition-transform">
                 <div className="w-12 h-12 rounded-full bg-pink-500/20 border border-pink-500/30 flex items-center justify-center">
                   <Heart size={20} className="text-pink-300" />
                 </div>
                 <div className="text-center">
                   <p className="text-2xl font-bold text-white">{stats.followersCount}</p>
                   <p className="text-xs text-pink-200/60 font-medium">Seguidores</p>
                 </div>
               </button>
             </div>
           </div>
         </motion.div>

         {/* Details Card */}
         <div className="w-full bg-white/5 border border-white/10 rounded-2xl overflow-hidden mb-6">
            {/* Nome de exibição */}
            <div className="p-4 border-b border-white/5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/50">
                <User size={20} />
              </div>
              <div className="flex-1">
                <p className="text-xs text-white/40 uppercase font-medium">Nome Completo</p>
                <p className="text-white/90">{userMetadata?.display_name || 'Não informado'}</p>
              </div>
            </div>
            
            {/* Nome de usuário */}
            <div className="p-4 border-b border-white/5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/50">
                <AtSign size={20} />
              </div>
              <div className="flex-1">
                <p className="text-xs text-white/40 uppercase font-medium">Nome de Usuário</p>
                <p className="text-white/90">{userMetadata?.username || 'Não informado'}</p>
              </div>
            </div>

            {/* Email */}
            <div className="p-4 border-b border-white/5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/50">
                <Mail size={20} />
              </div>
              <div className="flex-1">
                <p className="text-xs text-white/40 uppercase font-medium">Email</p>
                <p className="text-white/90">{user?.email || 'Não informado'}</p>
              </div>
            </div>

            {/* Data de nascimento */}
            <div className="p-4 border-b border-white/5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/50">
                <Calendar size={20} />
              </div>
              <div className="flex-1">
                <p className="text-xs text-white/40 uppercase font-medium">Data de Nascimento</p>
                <p className="text-white/90">{formatBirthDate(userMetadata?.birth_date)}</p>
              </div>
            </div>

            {/* Privacidade */}
            <div className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/50">
                <Shield size={20} />
              </div>
              <div className="flex-1">
                <p className="text-xs text-white/40 uppercase font-medium">Privacidade</p>
                <p className="text-white/90">Perfil Público</p>
              </div>
            </div>
         </div>

         {/* Actions */}
         <div className="w-full space-y-3 mt-auto mb-8">
            <button className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white flex items-center justify-center gap-2 transition-colors">
               <Edit2 size={18} />
               Editar Perfil
            </button>
            <button 
              onClick={onLogout}
              className="w-full py-3 text-red-300 hover:bg-red-500/10 rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
               <LogOut size={18} />
               Sair da conta
            </button>
         </div>
      </div>
    </div>
  );
}