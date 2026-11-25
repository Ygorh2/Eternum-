import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Home, Cloud, Heart, User, Mail, Bone, Book, Users, Bell } from 'lucide-react';

export type View = 'onboarding' | 'auth' | 'feed' | 'memorial' | 'create-memorial' | 'living-memory' | 'profile' | 'write-tribute' | 'sky' | 'invites' | 'my-memorials' | 'pets' | 'settings' | 'people' | 'notifications';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentView: View;
  onNavigate: (view: View) => void;
}

export function SideMenu({ isOpen, onClose, currentView, onNavigate }: Props) {
  const menuItems = [
    { id: 'feed', label: 'Feed', icon: Home },
    { id: 'notifications', label: 'Notificações', icon: Bell },
    { id: 'sky', label: 'O Céu', icon: Cloud },
    { id: 'my-memorials', label: 'Meus Memoriais', icon: Book },
    { id: 'pets', label: 'Meus Pets', icon: Bone },
    { id: 'people', label: 'Buscar Pessoas', icon: Users },
    { id: 'profile', label: 'Meu Perfil', icon: User },
    { id: 'invites', label: 'Convites', icon: Mail },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 z-[2000] bg-black/60 backdrop-blur-sm"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute top-0 left-0 bottom-0 w-[80%] max-w-[300px] z-[2001] bg-[#0F172A] border-r border-white/10 shadow-2xl overflow-hidden"
          >
            {/* Celestial Background Effect inside Drawer */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#1E1B4B] via-[#0F172A] to-[#0F172A] z-0"></div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

            <div className="relative z-10 flex flex-col h-full">
              {/* Header */}
              <div className="p-6 pt-12 flex justify-between items-center">
                <div>
                   <h2 className="text-xl font-serif text-white font-medium tracking-wide">ETERNUM</h2>
                   <p className="text-xs text-white/50 uppercase tracking-widest mt-1">Memorial Digital</p>
                </div>
                <button onClick={onClose} className="p-2 text-white/70 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>

              {/* Menu Items */}
              <div className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
                {menuItems.map((item, index) => {
                  const isActive = currentView === item.id;
                  
                  return (
                    <button
                      key={index}
                      onClick={() => {
                        onNavigate(item.id as View);
                        onClose();
                      }}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-200 group ${
                        isActive 
                          ? 'bg-white/10 text-white shadow-[0_0_15px_rgba(255,255,255,0.1)] border border-white/10' 
                          : 'text-white/50 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <item.icon size={22} className={`transition-colors ${isActive ? 'text-blue-300' : 'text-white/50 group-hover:text-white'}`} />
                      <span className="font-medium">{item.label}</span>
                      {isActive && (
                        <motion.div 
                          layoutId="activeIndicator"
                          className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-300 shadow-[0_0_8px_rgba(147,197,253,0.8)]"
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-white/10">
                 <div className="bg-white/5 rounded-xl p-4 flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-serif">
                     A
                   </div>
                   <div className="flex-1 overflow-hidden">
                     <p className="text-sm font-medium text-white truncate">Ana Silva</p>
                     <p className="text-xs text-white/50 truncate">ana.silva@email.com</p>
                   </div>
                 </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
