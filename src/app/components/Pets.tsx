import React from 'react';
import { motion } from 'motion/react';
import { Menu, Plus, PawPrint, Edit2 } from 'lucide-react';
import { getYear } from '../utils/dateUtils';

export interface PetMemorial {
  id: string;
  name: string;
  photo?: string;
  birthDate?: string | null;
  deathDate?: string | null;
}

interface Props {
  pets: PetMemorial[];
  loading?: boolean;
  onOpenMenu: () => void;
  onCreate: () => void;
  onOpen: (id: string) => void;
  onEdit: (id: string) => void;
}

function lifeSpan(pet: PetMemorial) {
  const born = getYear(pet.birthDate);
  const died = getYear(pet.deathDate);
  if (born && died) return `${born} – ${died}`;
  if (died) return `Partiu em ${died}`;
  if (born) return `Nasceu em ${born}`;
  return '';
}

export function Pets({ pets, loading = false, onOpenMenu, onCreate, onOpen, onEdit }: Props) {
  return (
    <div className="h-full flex flex-col bg-transparent text-white">
      {/* Header */}
      <div className="bg-[#0F172A]/80 backdrop-blur-md px-6 py-4 sticky top-0 z-10 shadow-lg border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onOpenMenu}
            aria-label="Abrir menu"
            className="p-2 -ml-2 text-white/70 hover:text-white transition-colors"
          >
            <Menu size={24} />
          </button>
          <h1 className="text-xl font-serif text-blue-100">Meus Pets</h1>
        </div>
        <button
          onClick={onCreate}
          aria-label="Criar memorial de pet"
          className="p-2 text-white/60 hover:text-white transition-colors"
        >
          <Plus size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 pb-24">
        {loading ? (
          <p className="text-center text-sm text-white/50 mt-10">Carregando seus pets...</p>
        ) : pets.length === 0 ? (
          <div className="flex flex-col items-center text-center mt-10 gap-3">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-300">
              <PawPrint size={28} />
            </div>
            <h2 className="font-serif text-lg text-white">Nenhum pet por aqui ainda</h2>
            <p className="text-sm text-white/50 max-w-xs">
              Crie um memorial para guardar as lembranças do seu companheiro de quatro patas.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {pets.map((pet, index) => (
              <motion.div
                key={pet.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="bg-[#1E293B]/40 backdrop-blur-md rounded-2xl border border-white/5 flex flex-col items-center p-4 shadow-lg"
              >
                <button
                  onClick={() => onOpen(pet.id)}
                  aria-label={`Abrir memorial de ${pet.name}`}
                  className="flex flex-col items-center w-full"
                >
                  <div className="w-20 h-20 rounded-full bg-white/5 mb-3 p-1 border-2 border-amber-500/30 flex items-center justify-center overflow-hidden">
                    {pet.photo ? (
                      <img src={pet.photo} alt={`Foto de ${pet.name}`} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <PawPrint size={28} className="text-amber-300/70" />
                    )}
                  </div>
                  <h3 className="font-serif font-medium text-white text-center break-words">{pet.name}</h3>
                  {lifeSpan(pet) && <p className="text-xs text-white/50 mt-1">{lifeSpan(pet)}</p>}
                </button>
                <button
                  onClick={() => onEdit(pet.id)}
                  aria-label={`Editar memorial de ${pet.name}`}
                  className="mt-3 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white/70 flex items-center gap-1.5 hover:bg-white/10 transition-colors"
                >
                  <Edit2 size={12} /> Editar
                </button>
              </motion.div>
            ))}
          </div>
        )}

        <motion.button
          onClick={onCreate}
          whileTap={{ scale: 0.98 }}
          className="mt-4 w-full bg-white/5 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center p-4 min-h-[120px] text-white/50 hover:bg-white/10 hover:border-white/20 transition-all"
        >
          <Plus size={28} />
          <span className="text-sm mt-2 font-medium">Adicionar pet</span>
        </motion.button>
      </div>
    </div>
  );
}
