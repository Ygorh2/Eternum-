import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, Plus, Dog, Cat, Fish, Bird, Rabbit, X, Bone, Edit2, Trash2 } from 'lucide-react';

interface Props {
  onOpenMenu: () => void;
  onCreate: (type: string) => void;
}

// Mock Pets Data
const INITIAL_PETS = [
  { id: '1', name: 'Thor', type: 'dog', photo: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b' },
  { id: '2', name: 'Luna', type: 'cat', photo: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba' }
];

export function Pets({ onOpenMenu, onCreate }: Props) {
  const [pets, setPets] = useState(INITIAL_PETS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPetName, setNewPetName] = useState('');
  const [newPetType, setNewPetType] = useState('dog');

  const handleAddPet = () => {
    if (!newPetName) return;
    const newPet = {
      id: Date.now().toString(),
      name: newPetName,
      type: newPetType,
      photo: `https://source.unsplash.com/random/200x200/?${newPetType}` // Dynamic mock
    };
    setPets([...pets, newPet]);
    setIsModalOpen(false);
    setNewPetName('');
  };

  const getIcon = (type: string) => {
    switch(type) {
      case 'dog': return <Dog size={20} />;
      case 'cat': return <Cat size={20} />;
      case 'bird': return <Bird size={20} />;
      case 'rabbit': return <Rabbit size={20} />;
      case 'fish': return <Fish size={20} />;
      default: return <Bone size={20} />;
    }
  };

  return (
    <div className="h-full flex flex-col bg-transparent text-white">
      {/* Header */}
      <div className="bg-[#0F172A]/80 backdrop-blur-md px-6 py-4 sticky top-0 z-10 shadow-lg border-b border-white/10 flex items-center justify-between">
         <div className="flex items-center gap-4">
             <button onClick={onOpenMenu} className="p-2 -ml-2 text-white/70 hover:text-white transition-colors">
               <Menu size={24} />
             </button>
             <h1 className="text-xl font-serif text-blue-100">Pets</h1>
          </div>
          <button onClick={() => onCreate('pet')} className="p-2 text-white/40 hover:text-white transition-colors">
            <Plus size={20} />
          </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 pb-24">
        {pets.map((pet, index) => (
          <motion.div
            key={pet.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="bg-[#1E293B]/40 backdrop-blur-md rounded-2xl border border-white/5 overflow-hidden flex flex-col items-center p-4 shadow-lg group relative"
          >
            <div className="w-20 h-20 rounded-full bg-white/5 mb-3 p-1 border-2 border-white/10 group-hover:border-amber-500/50 transition-colors">
               <img src={pet.photo} alt={pet.name} className="w-full h-full rounded-full object-cover" />
            </div>
            
            <h3 className="font-serif font-medium text-white">{pet.name}</h3>
            <div className="flex items-center gap-1 text-xs text-white/40 mt-1 capitalize">
              {getIcon(pet.type)}
              <span>{pet.type}</span>
            </div>

            {/* Hover Actions */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
               <button className="p-1.5 bg-black/40 rounded-full text-white/70 hover:text-white mb-1">
                 <Edit2 size={12} />
               </button>
            </div>
          </motion.div>
        ))}

        <motion.button
          onClick={() => setIsModalOpen(true)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="bg-white/5 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center p-4 min-h-[160px] text-white/30 hover:bg-white/10 hover:border-white/20 transition-all"
        >
          <Plus size={32} />
          <span className="text-sm mt-2 font-medium">Adicionar Pet</span>
        </motion.button>
      </div>

      {/* Add Pet Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div 
               initial={{ opacity: 0 }} 
               animate={{ opacity: 1 }} 
               exit={{ opacity: 0 }}
               className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm"
               onClick={() => setIsModalOpen(false)}
            />
            <motion.div
               initial={{ opacity: 0, scale: 0.9, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.9, y: 20 }}
               className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm bg-[#0F172A] border border-amber-500/20 rounded-2xl p-6 z-50 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-4">
                 <h3 className="text-xl font-serif text-white flex items-center gap-2">
                   <Bone className="text-amber-300" size={20} />
                   Novo Pet
                 </h3>
                 <button onClick={() => setIsModalOpen(false)}><X className="text-white/50" /></button>
              </div>

              <div className="space-y-4">
                <div>
                   <label className="text-xs text-white/60 uppercase font-medium ml-1">Nome do Pet</label>
                   <input 
                     value={newPetName}
                     onChange={(e) => setNewPetName(e.target.value)}
                     className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white placeholder-white/20 focus:outline-none focus:border-amber-500/50"
                     placeholder="Ex: Rex"
                     autoFocus
                   />
                </div>

                <div>
                   <label className="text-xs text-white/60 uppercase font-medium ml-1">Tipo</label>
                   <div className="grid grid-cols-3 gap-2 mt-1">
                      {['dog', 'cat', 'bird', 'rabbit', 'fish', 'other'].map(type => (
                        <button
                          key={type}
                          onClick={() => setNewPetType(type)}
                          className={`py-2 rounded-lg text-xs font-medium capitalize border transition-all ${newPetType === type ? 'bg-amber-500/20 border-amber-500 text-amber-200' : 'bg-white/5 border-transparent text-white/40'}`}
                        >
                          {type}
                        </button>
                      ))}
                   </div>
                </div>

                <button 
                  onClick={handleAddPet}
                  disabled={!newPetName}
                  className="w-full py-3 bg-gradient-to-r from-amber-600 to-orange-600 rounded-xl text-white font-medium shadow-lg mt-2 disabled:opacity-50"
                >
                  Salvar Pet
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}