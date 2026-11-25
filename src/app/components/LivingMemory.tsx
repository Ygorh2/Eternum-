import React, { useState, useEffect } from 'react';
import { formatDate, getYear } from '../utils/dateUtils';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Flame, Mail, Star, Bone, Heart, Calendar, Plus, Clock, X, Sparkles, MessageCircle } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface Tribute {
  id: string;
  memorialId: string;
  author: any;
  content: string;
  date: string;
  type?: string;
  image?: string | null;
}

interface Memorial {
  id: string;
  name: string;
  photo: string;
  birthDate: string;
  deathDate: string;
  type: 'person' | 'pet';
  [key: string]: any;
}

interface ScheduledMessage {
  id: string;
  message: string;
  frequency: number; // Days
  lastSent?: string;
  nextSend: string;
  createdAt: string;
}

interface Props {
  memorial: Memorial;
  tributes: Tribute[];
  onBack: () => void;
  isAdmin?: boolean; // Is current user the memorial administrator
  // Velas salvas no Supabase (1 por pessoa por memorial)
  candles?: { count: number; litByMe: boolean };
  candleError?: string | null;
  onLightCandle?: () => void;
}

export function LivingMemory({
  memorial,
  tributes,
  onBack,
  isAdmin = false,
  candles = { count: 0, litByMe: false },
  candleError,
  onLightCandle,
}: Props) {
  const candlesLit = candles.count;
  const [showCandleAnimation, setShowCandleAnimation] = useState(false);
  const [showAddMessageModal, setShowAddMessageModal] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [frequency, setFrequency] = useState(30);
  
  // Mock scheduled messages
  const [scheduledMessages, setScheduledMessages] = useState<ScheduledMessage[]>([
    {
      id: 'msg1',
      message: 'Lembre-se sempre de sorrir. A vida é bela!',
      frequency: 30,
      createdAt: '2024-01-15',
      nextSend: '2026-04-02',
    },
    {
      id: 'msg2',
      message: 'Estou sempre com vocês, em cada momento especial.',
      frequency: 60,
      createdAt: '2024-02-01',
      nextSend: '2026-05-02',
    }
  ]);

  // Generate "Living" messages mixed with tributes and scheduled messages
  const generateTimeline = () => {
    const events = [];

    // 1. Current Moment (Today)
    events.push({
      id: 'today',
      type: 'today',
      date: new Date().toISOString(),
      title: 'Hoje',
      description: 'Um momento de conexão.',
    });

    // 2. Map existing tributes
    tributes.forEach(t => {
      events.push({
        id: t.id,
        type: 'tribute',
        date: t.date,
        title: t.author.name,
        description: t.content,
        image: t.image,
        avatar: t.author.avatar
      });
    });

    // 3. Add scheduled messages that were "sent" (simulated as past dates)
    scheduledMessages.forEach((msg, index) => {
      // Simulate past messages based on frequency
      const createdDate = new Date(msg.createdAt);
      const daysSinceCreation = Math.floor((new Date().getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
      const timesSent = Math.floor(daysSinceCreation / msg.frequency);
      
      // Add the most recent sent message
      if (timesSent > 0) {
        const lastSentDate = new Date(createdDate);
        lastSentDate.setDate(lastSentDate.getDate() + (timesSent * msg.frequency));
        
        events.push({
          id: `scheduled-${msg.id}-${timesSent}`,
          type: 'automated-message',
          date: lastSentDate.toISOString(),
          title: `Mensagem de ${memorial.name}`,
          description: msg.message,
          frequency: msg.frequency
        });
      }
    });

    // 4. Generate some initial "Messages from the Deceased" (for demo)
    const initialMessages = memorial.type === 'pet' 
      ? [
          "Estou correndo nos campos estelares agora! 🐾",
          "Sinto saudades dos seus carinhos.",
        ]
      : [
          "O amor é o laço que nos une eternamente.",
          "Estou em paz, olhando por cada um de vocês.",
        ];
    
    // Add initial messages near birth/death dates
    events.push({
      id: 'initial-msg1',
      type: 'letter',
      date: memorial.deathDate,
      title: `Mensagem de ${memorial.name}`,
      description: initialMessages[0]
    });

    events.push({
      id: 'initial-msg2',
      type: 'letter',
      date: memorial.birthDate,
      title: `Lembrança de ${getYear(memorial.birthDate)}`,
      description: initialMessages[1]
    });

    // Sort by date descending (newest first)
    return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const timelineEvents = generateTimeline();
  const isPet = memorial.type === 'pet';
  const Icon = isPet ? Bone : Flame;

  const handleLight = () => {
    if (candles.litByMe) return;
    onLightCandle?.();
    setShowCandleAnimation(true);
    setTimeout(() => setShowCandleAnimation(false), 2000);
  };

  const handleAddScheduledMessage = () => {
    if (!newMessage.trim()) return;

    const nextSendDate = new Date();
    nextSendDate.setDate(nextSendDate.getDate() + frequency);

    const message: ScheduledMessage = {
      id: `msg-${Date.now()}`,
      message: newMessage,
      frequency,
      createdAt: new Date().toISOString(),
      nextSend: nextSendDate.toISOString()
    };

    setScheduledMessages([...scheduledMessages, message]);
    setNewMessage('');
    setFrequency(30);
    setShowAddMessageModal(false);
  };

  const handleDeleteScheduledMessage = (id: string) => {
    setScheduledMessages(scheduledMessages.filter(m => m.id !== id));
  };

  return (
    <div className="h-full flex flex-col relative overflow-hidden bg-[#0F172A] text-white">
      {/* Background with Particles/Stars */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0F172A] via-[#1E1B4B] to-[#312e81]/30"></div>
        {[...Array(40)].map((_, i) => (
           <div 
             key={i}
             className="absolute bg-white rounded-full opacity-30 animate-pulse"
             style={{
               top: `${Math.random() * 100}%`,
               left: `${Math.random() * 100}%`,
               width: `${Math.random() * 3}px`,
               height: `${Math.random() * 3}px`,
               animationDelay: `${Math.random() * 5}s`
             }}
           />
        ))}
        {/* Floating particles */}
        {[...Array(12)].map((_, i) => (
           <motion.div 
             key={`p-${i}`}
             className={`absolute ${isPet ? 'w-2 h-2 rounded-full bg-blue-200/20' : 'w-3 h-3 rounded-full bg-amber-200/20'}`}
             initial={{ y: 800, x: Math.random() * 400 }}
             animate={{ y: -100, x: Math.random() * 400 + (Math.random() > 0.5 ? 50 : -50) }}
             transition={{ duration: 15 + Math.random() * 10, repeat: Infinity, ease: "linear" }}
           />
        ))}
      </div>

      {/* Header */}
      <div className="relative z-20 pt-6 px-4 pb-2 flex items-center justify-between">
         <button onClick={onBack} className="p-2 text-white/70 hover:bg-white/10 rounded-full transition-colors">
            <ArrowLeft size={24} />
         </button>
         
         {isAdmin && (
           <button 
             onClick={() => setShowAddMessageModal(true)}
             className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-400/30 rounded-full text-blue-200 text-sm font-medium hover:bg-blue-500/30 transition-colors"
           >
             <Plus size={16} />
             Mensagem Automática
           </button>
         )}
      </div>

      <div className="relative z-10 flex flex-col items-center pt-2 pb-6 text-center px-6">
         <div className="relative mb-4">
            <div className={`absolute inset-0 ${isPet ? 'bg-blue-500/20' : 'bg-amber-500/20'} blur-2xl rounded-full`}></div>
            <ImageWithFallback 
              src={memorial.photo} 
              alt={memorial.name} 
              className="w-28 h-28 rounded-full object-cover border-4 border-white/20 shadow-2xl relative z-10"
            />
            <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-gradient-to-tr from-amber-400 to-orange-500 rounded-full flex items-center justify-center border-4 border-[#0F172A] z-20">
              <Sparkles size={18} className="text-white" />
            </div>
         </div>
         <h1 className="text-3xl font-serif font-medium text-white mb-2 drop-shadow-lg">Memória Viva</h1>
         <p className="text-white/50 text-sm font-light italic max-w-xs">Uma jornada emocional através do tempo e das lembranças</p>
         <div className="mt-3 w-20 h-[2px] bg-gradient-to-r from-transparent via-amber-300/50 to-transparent"></div>
      </div>

      {/* Timeline Scrollable Area */}
      <div className="flex-1 overflow-y-auto px-6 pb-32 relative z-10 no-scrollbar">
         {/* Vertical Line */}
         <div className="absolute left-9 top-0 bottom-0 w-[2px] bg-gradient-to-b from-amber-200/30 via-blue-200/20 to-transparent"></div>

         <div className="space-y-6">
            {timelineEvents.map((event, index) => (
               <motion.div 
                 key={event.id}
                 initial={{ opacity: 0, x: -30 }}
                 animate={{ opacity: 1, x: 0 }}
                 transition={{ delay: index * 0.08, type: "spring", stiffness: 100 }}
                 className="relative pl-12 group"
               >
                  {/* Timeline Dot */}
                  <div className={`absolute left-[0.60rem] top-3 w-4 h-4 rounded-full border-2 transition-all duration-300 ${
                    event.type === 'today' 
                      ? 'bg-white border-white animate-pulse shadow-[0_0_15px_white]' 
                      : event.type === 'automated-message'
                      ? 'bg-gradient-to-br from-blue-400 to-purple-500 border-blue-300 shadow-[0_0_8px_rgba(96,165,250,0.5)]'
                      : event.type === 'letter'
                      ? 'bg-gradient-to-br from-amber-400 to-orange-500 border-amber-300'
                      : 'bg-[#0F172A] border-white/40 group-hover:border-white/80 group-hover:bg-white/30'
                  }`}>
                    {event.type === 'automated-message' && (
                      <Clock size={8} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white" />
                    )}
                  </div>

                  {/* Content Card */}
                  <div className={`p-5 rounded-2xl border backdrop-blur-md shadow-xl transition-all group-hover:shadow-2xl ${
                     event.type === 'today' 
                       ? 'bg-gradient-to-br from-white/15 via-white/10 to-transparent border-white/40 shadow-[0_0_30px_rgba(255,255,255,0.1)]' 
                       : event.type === 'automated-message'
                       ? 'bg-gradient-to-br from-blue-900/40 via-purple-900/30 to-transparent border-blue-400/30 shadow-[0_0_20px_rgba(59,130,246,0.15)]'
                       : event.type === 'letter'
                       ? 'bg-gradient-to-br from-amber-900/40 via-orange-900/30 to-transparent border-amber-300/30 shadow-[0_0_20px_rgba(251,191,36,0.15)]'
                       : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}>
                     
                     {/* Header of Card */}
                     <div className="flex justify-between items-start mb-3">
                        <div>
                           {event.type === 'today' ? (
                             <div>
                               <h3 className="text-xl font-serif font-medium text-white mb-1">Hoje</h3>
                               <p className="text-xs text-white/50">
                                 {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                               </p>
                             </div>
                           ) : (
                             <div className="flex items-center gap-2">
                               {event.type === 'automated-message' && (
                                 <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-500/20 rounded-full border border-blue-400/30">
                                   <Clock size={10} className="text-blue-300" />
                                   <span className="text-[10px] text-blue-200 font-medium">A cada {event.frequency} dias</span>
                                 </div>
                               )}
                               <span className="text-xs font-medium text-white/60 tracking-wide">
                                  {event.date ? formatDate(event.date, { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
                               </span>
                             </div>
                           )}
                        </div>
                        
                        {event.type === 'today' && (
                           <button 
                             onClick={handleLight}
                             disabled={candles.litByMe}
                             className={`disabled:opacity-70 disabled:cursor-default flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-all active:scale-95 shadow-lg ${isPet ? 'bg-gradient-to-r from-blue-500/30 to-blue-600/30 text-blue-100 hover:from-blue-500/40 hover:to-blue-600/40 border border-blue-400/30' : 'bg-gradient-to-r from-amber-500/30 to-orange-500/30 text-amber-100 hover:from-amber-500/40 hover:to-orange-500/40 border border-amber-400/30'}`}
                           >
                             <Icon size={14} className={showCandleAnimation ? 'animate-bounce' : ''} />
                             {candles.litByMe
                               ? isPet ? 'Carinho deixado' : 'Vela acesa'
                               : isPet ? 'Deixar Carinho' : 'Acender Vela'}
                           </button>
                        )}
                     </div>

                     {/* Body */}
                     {event.type === 'today' ? (
                       <div className="text-white/90 font-light">
                          <p className="text-lg font-serif italic text-white/80 mb-2">{event.description}</p>
                          {candlesLit > 0 && (
                             <div className="mt-4 flex items-center gap-2 px-3 py-2 bg-white/10 rounded-lg border border-white/20">
                               <Flame size={16} className="text-amber-300 animate-pulse" />
                               <p className="text-sm text-white/70">
                                 {candlesLit}{' '}
                                 {isPet
                                   ? candlesLit === 1 ? 'carinho deixado' : 'carinhos deixados'
                                   : candlesLit === 1 ? 'vela acesa' : 'velas acesas'}
                               </p>
                             </div>
                          )}
                          {candleError && (
                            <p role="alert" className="mt-3 text-xs text-amber-200">{candleError}</p>
                          )}
                       </div>
                     ) : event.type === 'automated-message' ? (
                        <div className="relative">
                           <div className="flex items-center gap-2 mb-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                                <MessageCircle size={14} className="text-white" />
                              </div>
                              <span className="text-sm font-medium text-blue-200">{event.title}</span>
                           </div>
                           <div className="bg-gradient-to-r from-white/5 to-transparent p-4 rounded-lg border-l-4 border-blue-400">
                             <p className="text-base text-white/90 font-serif leading-relaxed italic">"{event.description}"</p>
                           </div>
                           <div className="absolute -right-3 -bottom-3 opacity-10">
                              <Sparkles size={50} className="text-blue-400" />
                           </div>
                        </div>
                     ) : event.type === 'letter' ? (
                        <div className="relative">
                           <div className="flex items-center gap-2 mb-3">
                              <Mail size={16} className="text-amber-300" />
                              <span className="text-sm font-medium text-amber-200">{event.title}</span>
                           </div>
                           <div className="bg-gradient-to-r from-white/5 to-transparent p-4 rounded-lg border-l-4 border-amber-400">
                             <p className="text-base text-white/90 font-serif leading-relaxed italic">"{event.description}"</p>
                           </div>
                           <div className="absolute -right-3 -bottom-3 opacity-10">
                              <Mail size={50} className="text-amber-400" />
                           </div>
                        </div>
                     ) : (
                        <div>
                           {event.image && (
                              <div className="mb-3 rounded-xl overflow-hidden relative aspect-video shadow-lg">
                                 <ImageWithFallback src={event.image} alt="Memory" className="w-full h-full object-cover" />
                              </div>
                           )}
                           <div className="flex items-center gap-2 mb-2">
                              {event.avatar ? (
                                <ImageWithFallback src={event.avatar} alt={event.title} className="w-6 h-6 rounded-full border border-white/20" />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-medium border border-white/20">{event.title?.[0]}</div>
                              )}
                              <span className="text-sm font-medium text-white/90">{event.title}</span>
                           </div>
                           <p className="text-sm text-white/70 leading-relaxed pl-8">{event.description}</p>
                        </div>
                     )}
                  </div>
               </motion.div>
            ))}
            
            <div className="pl-12 pb-8 pt-4">
               <div className="flex items-center gap-3">
                 <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500/20 to-blue-500/20 border-2 border-white/20 flex items-center justify-center">
                   <Star size={20} className="text-amber-300" />
                 </div>
                 <div>
                   <div className="text-sm text-white/50 font-medium">Início da Jornada</div>
                   <div className="text-xs text-white/30">{formatDate(memorial.birthDate, { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                 </div>
               </div>
            </div>
         </div>
      </div>

      {/* Bottom Ambience (Candles) */}
      <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-black via-[#0F172A] to-transparent pointer-events-none z-20 flex items-end justify-center pb-8 gap-8">
         {/* Decorative Candles/Lights */}
         <div className="relative opacity-70">
            <div className={`w-4 h-12 rounded-sm blur-[1px] ${isPet ? 'bg-blue-900/50' : 'bg-amber-900/50'}`}></div>
            <div className={`absolute -top-4 left-1/2 -translate-x-1/2 w-2 h-6 rounded-full blur-[2px] animate-pulse ${isPet ? 'bg-blue-400' : 'bg-orange-400'}`}></div>
            <div className={`absolute -top-8 left-1/2 -translate-x-1/2 w-8 h-12 rounded-full blur-[15px] opacity-60 ${isPet ? 'bg-blue-500' : 'bg-orange-500'}`}></div>
         </div>
         <div className="relative scale-125 opacity-100 mb-4">
            <div className={`w-6 h-16 rounded-sm blur-[1px] ${isPet ? 'bg-blue-900/60' : 'bg-amber-900/60'}`}></div>
            <div className={`absolute -top-5 left-1/2 -translate-x-1/2 w-3 h-8 rounded-full blur-[2px] animate-pulse ${isPet ? 'bg-blue-300' : 'bg-orange-300'}`}></div>
            <div className={`absolute -top-10 left-1/2 -translate-x-1/2 w-10 h-16 rounded-full blur-[20px] opacity-70 ${isPet ? 'bg-blue-400' : 'bg-orange-400'}`}></div>
         </div>
         <div className="relative opacity-60">
            <div className={`w-4 h-10 rounded-sm blur-[1px] ${isPet ? 'bg-blue-900/50' : 'bg-amber-900/50'}`}></div>
            <div className={`absolute -top-4 left-1/2 -translate-x-1/2 w-2 h-5 rounded-full blur-[2px] animate-pulse ${isPet ? 'bg-blue-400' : 'bg-orange-400'}`}></div>
            <div className={`absolute -top-8 left-1/2 -translate-x-1/2 w-8 h-12 rounded-full blur-[15px] opacity-60 ${isPet ? 'bg-blue-500' : 'bg-orange-500'}`}></div>
         </div>
      </div>

      {/* Add Message Modal */}
      <AnimatePresence>
        {showAddMessageModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-6"
            onClick={() => setShowAddMessageModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gradient-to-br from-[#1E293B] to-[#0F172A] border border-white/20 rounded-2xl p-6 max-w-md w-full shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-serif text-white mb-1">Mensagem Automática</h2>
                  <p className="text-xs text-white/50">Configure mensagens periódicas de {memorial.name}</p>
                </div>
                <button 
                  onClick={() => setShowAddMessageModal(false)}
                  className="p-2 text-white/40 hover:text-white/80 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">Mensagem</label>
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={`"Lembre-se sempre de sorrir..."`}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white placeholder-white/30 focus:outline-none focus:border-blue-400/50 focus:bg-white/10 transition-colors resize-none h-28 font-light"
                  />
                  <p className="text-xs text-white/40 mt-1 italic">Escreva como se fosse {memorial.name} falando com os entes queridos</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">Frequência</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={frequency}
                      onChange={(e) => setFrequency(Number(e.target.value))}
                      min="1"
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-blue-400/50 focus:bg-white/10 transition-colors"
                    />
                    <span className="text-white/60 text-sm">dias</span>
                  </div>
                  <p className="text-xs text-white/40 mt-1">A mensagem aparecerá na timeline a cada {frequency} dias</p>
                </div>

                {/* Preview of next scheduled messages */}
                {scheduledMessages.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-white/10">
                    <h3 className="text-sm font-medium text-white/70 mb-3">Mensagens Agendadas ({scheduledMessages.length})</h3>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {scheduledMessages.map(msg => (
                        <div key={msg.id} className="bg-white/5 border border-white/10 rounded-lg p-3 flex items-start gap-2">
                          <Clock size={14} className="text-blue-300 mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-white/80 truncate">{msg.message}</p>
                            <p className="text-[10px] text-white/40 mt-1">A cada {msg.frequency} dias</p>
                          </div>
                          <button 
                            onClick={() => handleDeleteScheduledMessage(msg.id)}
                            className="p-1 text-white/40 hover:text-red-400 transition-colors shrink-0"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button 
                  onClick={() => setShowAddMessageModal(false)}
                  className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl text-white/70 hover:bg-white/10 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleAddScheduledMessage}
                  disabled={!newMessage.trim()}
                  className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl text-white font-medium hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
                >
                  Agendar Mensagem
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
