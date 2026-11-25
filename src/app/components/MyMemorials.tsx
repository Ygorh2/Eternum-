import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Edit2, Trash2, MapPin, Search, Plus, Menu } from 'lucide-react';

interface Props {
  memorials: any[];
  onBack: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onLocate: (id: string) => void;
  onCreate: () => void;
  onOpenMenu: () => void;
}

export function MyMemorials({ memorials, onBack, onEdit, onDelete, onLocate, onCreate, onOpenMenu }: Props) {
  // Já vem filtrado (apenas os memoriais do usuário logado) pelo ConnectedMyMemorials
  const myMemorials = memorials;

  return (
    <div className="h-full flex flex-col bg-transparent text-white">
      {/* Header */}
      <div className="bg-[#0F172A]/80 backdrop-blur-md px-6 py-4 sticky top-0 z-10 shadow-lg border-b border-white/10 flex items-center justify-between">
         <div className="flex items-center gap-4">
             <button onClick={onOpenMenu} className="p-2 -ml-2 text-white/70 hover:text-white transition-colors">
               <Menu size={24} />
             </button>
             <h1 className="text-xl font-serif text-blue-100">Meus Memoriais</h1>
          </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 pb-24">
        {myMemorials.map((memorial, index) => (
          <motion.div
            key={memorial.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-[#1E293B]/40 backdrop-blur-md rounded-2xl border border-white/5 overflow-hidden flex flex-col shadow-lg"
          >
            {/* Map Preview (Mocked) */}
            <div className="h-24 w-full relative bg-[#0B1021] overflow-hidden">
               {/* Abstract stars */}
               <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-white rounded-full opacity-50"></div>
               <div className="absolute top-1/2 left-3/4 w-1 h-1 bg-white rounded-full opacity-30"></div>
               <div className="absolute inset-0 bg-gradient-to-t from-[#1E293B]/40 to-transparent"></div>
               
               {/* Pin Marker */}
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                 <div className={`w-3 h-3 rounded-full ${memorial.type === 'pet' ? 'bg-amber-400' : 'bg-blue-400'} shadow-[0_0_10px_currentColor]`}></div>
               </div>
               
               <button 
                 onClick={() => onLocate(memorial.id)}
                 className="absolute bottom-2 right-2 bg-black/40 backdrop-blur-md px-2 py-1 rounded text-[10px] text-white/70 border border-white/10 flex items-center gap-1 hover:bg-black/60 transition-colors"
               >
                 <MapPin size={10} /> Ver no Céu
               </button>
            </div>

            <div className="p-4">
               <div className="flex items-center gap-3 mb-3">
                 <img src={memorial.photo} className="w-10 h-10 rounded-full object-cover border border-white/10" />
                 <div>
                   <h3 className="font-serif font-medium text-white">{memorial.name}</h3>
                   <p className="text-xs text-white/40 capitalize">{memorial.type === 'pet' ? 'Pet' : 'Ente Querido'}</p>
                 </div>
               </div>

               <div className="flex gap-2">
                 <button 
                   onClick={() => onEdit(memorial.id)}
                   className="flex-1 py-2 bg-white/5 border border-white/10 rounded-lg text-xs font-medium text-white/70 flex items-center justify-center gap-2 hover:bg-white/10 transition-colors"
                 >
                   <Edit2 size={14} /> Editar
                 </button>
                 <button 
                   onClick={() => onDelete(memorial.id)}
                   className="flex-1 py-2 bg-red-500/5 border border-red-500/10 rounded-lg text-xs font-medium text-red-300 flex items-center justify-center gap-2 hover:bg-red-500/10 transition-colors"
                 >
                   <Trash2 size={14} /> Excluir
                 </button>
               </div>
            </div>
          </motion.div>
        ))}

        {myMemorials.length === 0 && (
          <div className="text-center py-10">
            <p className="text-white/30 text-sm">Você ainda não criou nenhum memorial.</p>
            <button onClick={onCreate} className="mt-4 text-blue-300 text-sm font-medium hover:underline">
              Criar o primeiro
            </button>
          </div>
        )}
      </div>
    </div>
  );
}