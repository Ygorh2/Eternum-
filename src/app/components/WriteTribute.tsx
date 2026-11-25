import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Image as ImageIcon, X, Send } from 'lucide-react';

interface Props {
  memorialName: string;
  memorialId: string;
  currentUser: any;
  onCancel: () => void;
  onFinish: (tribute: any) => void;
}

export function WriteTribute({ memorialName, memorialId, currentUser, onCancel, onFinish }: Props) {
  const [text, setText] = useState('');
  const [type, setType] = useState('Saudade');

  const types = ['Saudade', 'Agradecimento', 'Lembrança', 'Carinho'];

  const handleSubmit = () => {
    if (!text.trim()) return;

    const newTribute = {
      id: Date.now().toString(),
      memorialId,
      author: currentUser,
      content: text,
      date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
      type,
      image: null // For MVP, no real image upload
    };

    onFinish(newTribute);
  };

  return (
    <div className="h-full bg-gradient-to-b from-[#0F172A] to-[#1E1B4B] flex flex-col text-white">
      <div className="p-4 flex items-center justify-between bg-[#0F172A]/80 backdrop-blur-md border-b border-white/10 sticky top-0 z-10">
        <button onClick={onCancel} className="p-2 hover:bg-white/10 rounded-full text-white/70">
          <X size={24} />
        </button>
        <h1 className="text-lg font-medium text-blue-100">Nova Homenagem</h1>
        <button 
          onClick={handleSubmit}
          disabled={!text.trim()}
          className="p-2 text-blue-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/5 rounded-lg transition-colors"
        >
          Publicar
        </button>
      </div>

      <div className="flex-1 p-6 overflow-y-auto">
        <div className="mb-6">
          <p className="text-white/50 text-sm mb-2">Homenageando</p>
          <p className="text-lg font-serif text-white font-medium">{memorialName}</p>
        </div>

        <div className="mb-6">
          <label className="text-xs font-medium text-white/50 uppercase tracking-wide mb-3 block">Sentimento</label>
          <div className="flex flex-wrap gap-2">
            {types.map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                  type === t 
                    ? 'bg-blue-600/30 text-blue-100 border-blue-500/50' 
                    : 'bg-white/5 text-white/60 border-white/10 hover:border-white/20'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
           <textarea
             value={text}
             onChange={(e) => setText(e.target.value)}
             placeholder="Escreva sua mensagem de carinho..."
             className="w-full h-40 bg-transparent text-lg text-white placeholder-white/30 focus:outline-none resize-none"
             autoFocus
           ></textarea>
        </div>

        <div>
           <button className="flex items-center gap-3 text-white/60 hover:text-white transition-colors p-3 hover:bg-white/5 rounded-xl w-full border border-dashed border-white/20">
             <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center">
               <ImageIcon size={20} />
             </div>
             <span className="font-medium">Adicionar foto</span>
           </button>
        </div>
      </div>
    </div>
  );
}
