import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, Plus, Copy, Check, Clock, Mail, Share2, Loader2 } from 'lucide-react';
import * as api from '../data/api';

interface Props {
  onOpenMenu: () => void;
}

interface Invite {
  id: string;
  code: string;
  email?: string;
  status: 'pending' | 'accepted';
  createdAt: string;
}

export function Invites({ onOpenMenu }: Props) {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showNewInvite, setShowNewInvite] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .fetchInvites()
      .then((data) => {
        if (!cancelled) setInvites(data);
      })
      .catch((err) => {
        console.error('Erro ao carregar convites:', err);
        if (!cancelled) setError('Não foi possível carregar seus convites.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCreateInvite = async () => {
    setIsCreating(true);
    setError('');
    try {
      const saved = await api.createInvite();
      setGeneratedCode(saved.code);
      setShowNewInvite(true);
      setInvites((prev) => [saved, ...prev]);
    } catch (err: any) {
      console.error('Erro ao criar convite:', err);
      setError(err?.message || 'Não foi possível criar o convite. Você precisa estar logado.');
    } finally {
      setIsCreating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(`${window.location.origin}/invite/${generatedCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-full flex flex-col bg-transparent text-white">
      {/* Header */}
      <div className="bg-[#0F172A]/80 backdrop-blur-md px-6 py-4 sticky top-0 z-10 shadow-lg border-b border-white/10 flex items-center justify-between">
         <div className="flex items-center gap-4">
             <button onClick={onOpenMenu} className="p-2 -ml-2 text-white/70 hover:text-white transition-colors">
               <Menu size={24} />
             </button>
             <h1 className="text-xl font-serif text-blue-100">Convites</h1>
          </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 pb-24">
        {/* Create Action */}
        <motion.button
          onClick={handleCreateInvite}
          whileTap={{ scale: 0.98 }}
          disabled={isCreating}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 p-4 rounded-xl shadow-lg shadow-blue-900/40 flex items-center justify-between group mb-8 border border-white/10 disabled:opacity-60"
        >
          <div className="flex items-center gap-3">
             <div className="p-2 bg-white/20 rounded-full text-white">
               {isCreating ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />}
             </div>
             <div className="text-left">
               <h3 className="font-medium text-white">Novo Convite</h3>
               <p className="text-xs text-white/60">Gerar link único de acesso</p>
             </div>
          </div>
          <Share2 className="text-white/40 group-hover:text-white transition-colors" />
        </motion.button>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-200 mb-4">
            {error}
          </div>
        )}

        {/* List */}
        <h3 className="text-sm font-medium text-white/40 uppercase tracking-widest mb-4">Histórico</h3>

        {isLoading ? (
          <div className="flex items-center justify-center py-10 text-white/40">
            <Loader2 size={24} className="animate-spin" />
          </div>
        ) : invites.length === 0 ? (
          <p className="text-center text-white/30 text-sm py-6">Você ainda não criou nenhum convite.</p>
        ) : (
        <div className="space-y-3">
          {invites.map((invite, index) => (
            <motion.div
              key={invite.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${invite.status === 'accepted' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'}`}>
                   {invite.status === 'accepted' ? <Check size={16} /> : <Clock size={16} />}
                </div>
                <div>
                  <p className="font-mono text-blue-100 text-lg tracking-wider">{invite.code}</p>
                  <p className="text-xs text-white/40">
                    {invite.email || 'Aguardando uso'} • {new Date(invite.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              {invite.status === 'pending' && (
                <button className="p-2 text-white/30 hover:text-white transition-colors">
                   <Share2 size={18} />
                </button>
              )}
            </motion.div>
          ))}
        </div>
        )}
      </div>

      {/* Generated Modal */}
      <AnimatePresence>
        {showNewInvite && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNewInvite(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm bg-[#0F172A] border border-blue-500/30 rounded-2xl p-6 z-50 shadow-2xl"
            >
              <h3 className="text-xl font-serif text-white mb-2">Convite Criado</h3>
              <p className="text-sm text-white/60 mb-6">Compartilhe este código ou link com familiares para que eles possam contribuir.</p>
              
              <div className="bg-black/40 rounded-xl p-4 border border-white/10 mb-4 flex items-center justify-between">
                 <code className="text-xl font-mono text-blue-300 tracking-widest">{generatedCode}</code>
                 <button onClick={copyToClipboard} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                   {copied ? <Check size={20} className="text-green-400" /> : <Copy size={20} className="text-white/50" />}
                 </button>
              </div>

              <button 
                onClick={() => setShowNewInvite(false)}
                className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-colors"
              >
                Concluído
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}