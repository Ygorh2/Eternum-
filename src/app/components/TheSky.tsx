import React, { useState, useEffect } from 'react';
import { todayLocalISO } from '../utils/dateUtils';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, Star, X, Check, User, Trash2, Edit2, MapPin, Filter, Dog, Cat, Bird, Fish, Rabbit, PawPrint } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default Leaflet icons in some environments
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

interface Props {
  onOpenMenu: () => void;
  onAddMemorial: (memorial: any) => void;
  onSelectMemorial?: (id: string) => void;
  onDeleteMemorial?: (id: string) => void;
  memorials: any[];
  targetMemorialId?: string | null;
  currentUserId?: string | null;
}

// Animal type definitions
type AnimalType = 'dog' | 'cat' | 'bird' | 'rabbit' | 'fish' | 'other';

// Get SVG for animal type
const getAnimalSVG = (animalType?: AnimalType) => {
  const svgs: Record<AnimalType, string> = {
    dog: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 5.172C10 3.782 8.423 2.679 6.5 3c-2.823.47-4.113 6.006-4 7 .08.703 1.725 1.722 3.656 1 1.261-.472 1.96-1.45 2.344-2.5"/><path d="M14.267 5.172c0-1.39 1.577-2.493 3.5-2.172 2.823.47 4.113 6.006 4 7-.08.703-1.725 1.722-3.656 1-1.261-.472-1.855-1.45-2.239-2.5"/><path d="M8 14v.5"/><path d="M16 14v.5"/><path d="M11.25 16.25h1.5L12 17l-.75-.75Z"/><path d="M4.42 11.247A13.152 13.152 0 0 0 4 14.556C4 18.728 7.582 21 12 21s8-2.272 8-6.444c0-1.061-.162-2.2-.493-3.309m-9.243-6.082A8.801 8.801 0 0 1 12 5c.78 0 1.5.108 2.161.306"/></svg>',
    cat: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5c.67 0 1.35.09 2 .26 1.78-2 5.03-2.84 6.42-2.26 1.4.58-.42 7-.42 7 .57 1.07 1 2.24 1 3.44C21 17.9 16.97 21 12 21s-9-3-9-7.56c0-1.25.5-2.4 1-3.44 0 0-1.89-6.42-.5-7 1.39-.58 4.72.23 6.5 2.23A9.04 9.04 0 0 1 12 5Z"/><path d="M8 14v.5"/><path d="M16 14v.5"/><path d="M11.25 16.25h1.5L12 17l-.75-.75Z"/></svg>',
    bird: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 7h.01"/><path d="M3.4 18H12a8 8 0 0 0 8-8V7a4 4 0 0 0-7.28-2.3L2 20"/><path d="m20 7 2 .5-2 .5"/><path d="M10 18v3"/><path d="M14 17.75V21"/><path d="M7 18a6 6 0 0 0 3.84-10.61"/></svg>',
    rabbit: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 16a3 3 0 0 1 2.24 5"/><path d="M18 12h.01"/><path d="M18 21h-8a4 4 0 0 1-4-4 7 7 0 0 1 7-7h.2L9.6 6.4a1 1 0 1 1 2.8-2.8L15.8 7h.2c3.3 0 6 2.7 6 6v1a2 2 0 0 1-2 2h-1a3 3 0 0 0-3 3"/><path d="M20 8.54V4a2 2 0 1 0-4 0v3"/><path d="M7.612 12.524a3 3 0 1 0-1.6 4.3"/></svg>',
    fish: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 12c.94-3.46 4.94-6 8.5-6 3.56 0 6.06 2.54 7 6-.94 3.47-3.44 6-7 6s-7.56-2.53-8.5-6Z"/><path d="M18 12v.5"/><path d="M16 17.93a9.77 9.77 0 0 1 0-11.86"/><path d="M7 10.67C7 8 5.58 5.97 2.73 5.5c-1 1.5-1 5 .23 6.5-1.24 1.5-1.24 5-.23 6.5C5.58 18.03 7 16 7 13.33"/><path d="M10.46 7.26C10.2 5.88 9.17 4.24 8 3h5.8a2 2 0 0 1 1.98 1.67l.23 1.4"/><path d="m16.01 17.93-.23 1.4A2 2 0 0 1 13.8 21H9.5a5.96 5.96 0 0 0 1.49-3.98"/></svg>',
    other: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="20" cy="16" r="2"/><circle cx="9" cy="10" r="2"/><circle cx="15" cy="14" r="2"/><circle cx="5" cy="16" r="2"/></svg>'
  };
  return svgs[animalType || 'other'];
};

// Custom Icons - Updated to use animal icons for pets
const createCustomIcon = (type: 'person' | 'pet', size: number = 1, animalType?: AnimalType) => {
  const isPet = type === 'pet';
  
  return L.divIcon({
    className: 'custom-marker-icon', 
    html: `
      <div style="
        position: relative;
        width: ${30 * size}px;
        height: ${30 * size}px;
        display: flex;
        align-items: center;
        justify-content: center;
        transform: translate(-50%, -50%);
      ">
        <div style="
          position: absolute;
          inset: 0;
          border-radius: 9999px;
          background-color: ${isPet ? 'rgba(245, 158, 11, 0.2)' : 'rgba(59, 130, 246, 0.2)'};
          border: 1px solid ${isPet ? 'rgba(245, 158, 11, 0.5)' : 'rgba(59, 130, 246, 0.5)'};
          box-shadow: 0 0 10px ${isPet ? 'rgba(245, 158, 11, 0.4)' : 'rgba(59, 130, 246, 0.4)'};
          animation: pulse 3s infinite;
        "></div>
        <div style="color: ${isPet ? '#fde68a' : '#bfdbfe'}; z-index: 10;">
          ${isPet 
            ? getAnimalSVG(animalType)
            : '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>'
          }
        </div>
      </div>
    `,
    iconSize: [30 * size, 30 * size],
    iconAnchor: [15 * size, 15 * size]
  });
};

// Component to handle map clicks and flyTo animations
function MapController({ targetId, memorials, onMapClick }: { targetId?: string | null, memorials: any[], onMapClick: (latlng: L.LatLng) => void }) {
  const map = useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    },
  });

  useEffect(() => {
    if (targetId) {
      const target = memorials.find(m => m.id === targetId);
      if (target && target.lat && target.lng) {
        map.flyTo([target.lat, target.lng], 6, {
          duration: 2.5,
          easeLinearity: 0.25
        });
      }
    }
  }, [targetId, memorials, map]);

  return null;
}

export function TheSky({ onOpenMenu, onAddMemorial, onSelectMemorial, onDeleteMemorial, memorials, targetMemorialId, currentUserId }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [addExistingModalOpen, setAddExistingModalOpen] = useState(false);
  const [selectedPos, setSelectedPos] = useState<L.LatLng | null>(null);
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<'person' | 'pet'>('person');
  const [formAnimalType, setFormAnimalType] = useState<AnimalType>('dog');
  const [privacyChecked, setPrivacyChecked] = useState(false);
  const [filter, setFilter] = useState<'all' | 'person' | 'pet'>('all');
  
  const [selectedStar, setSelectedStar] = useState<any | null>(null);
  const [selectedMemorialToAdd, setSelectedMemorialToAdd] = useState<string | null>(null);

  // Get memorials that can be added to the sky
  // Filter: Already created, administered by user, not already in the sky
  const availableMemorialsForSky = memorials.filter(m => {
    // Must not already be in the sky (no lat/lng)
    const notInSky = m.lat === undefined || m.lng === undefined;
    // Must ser administrado pelo usuário atual (dono real do memorial)
    const administeredByUser = !!currentUserId && m.createdBy === currentUserId;

    return notInSky && administeredByUser;
  });

  // Effect to select the target memorial if provided
  useEffect(() => {
    if (targetMemorialId) {
      const target = memorials.find(m => m.id === targetMemorialId);
      if (target) {
        // Delay selection slightly to allow flyTo to start
        const timer = setTimeout(() => {
          setSelectedStar(target);
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [targetMemorialId, memorials]);

  const handleMapClick = (latlng: L.LatLng) => {
    setSelectedStar(null);
    setSelectedPos(latlng);
    setFormName('');
    setFormType('person');
    setFormAnimalType('dog');
    setPrivacyChecked(false);
    setModalOpen(true);
  };

  const handleCreate = () => {
    if (!formName || !privacyChecked || !selectedPos) return;

    const newMemorial = {
      id: Date.now().toString(),
      name: formName,
      photo: 'https://images.unsplash.com/photo-1444703686981-a3abbc4d4fe3', 
      birthDate: '2000-01-01', 
      deathDate: todayLocalISO(),
      quote: 'Uma nova estrela no céu.',
      bio: 'Memorial criado no Céu.',
      type: formType,
      lat: selectedPos.lat,
      lng: selectedPos.lng,
      size: 1.5,
      createdAt: new Date().toISOString(),
      createdBy: currentUserId,
      animalType: formType === 'pet' ? formAnimalType : undefined,
    };

    onAddMemorial(newMemorial);
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
     onDeleteMemorial && onDeleteMemorial(id);
     setSelectedStar(null);
  };

  const filteredMemorials = memorials.filter(m => {
    if (m.lat === undefined || m.lng === undefined) return false;
    if (filter === 'all') return true;
    return m.type === filter;
  });

  return (
    <div className="h-full w-full relative overflow-hidden bg-[#050816] text-white select-none flex flex-col">
      <style>{`
        .custom-marker-icon {
          background: transparent;
          border: none;
        }
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      {/* Header overlay */}
      <div className="absolute top-0 left-0 w-full p-6 z-[1000] flex justify-between items-start pointer-events-none">
        <button 
          onClick={onOpenMenu}
          className="p-3 bg-black/40 backdrop-blur-md rounded-full text-white pointer-events-auto hover:bg-black/60 transition-colors border border-white/10"
        >
          <Menu size={24} />
        </button>
        <div className="pointer-events-none bg-black/20 backdrop-blur-sm px-4 py-2 rounded-full border border-white/5 flex items-center gap-3">
          <h1 className="text-lg font-serif text-blue-200 drop-shadow-[0_0_10px_rgba(191,219,254,0.5)]">O Céu</h1>
          <div className="w-1 h-1 rounded-full bg-white/20"></div>
          <p className="text-[10px] text-blue-300/60 uppercase tracking-widest whitespace-nowrap">Selecione um local</p>
        </div>
      </div>

      {/* Filters */}
      <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[1000] flex gap-1 bg-black/40 backdrop-blur-md p-1 rounded-full border border-white/10 shadow-lg">
        <button 
          onClick={() => setFilter('all')} 
          className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${filter === 'all' ? 'bg-white text-black shadow-lg scale-105' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
        >
          Todos
        </button>
        <button 
          onClick={() => setFilter('person')} 
          className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1 ${filter === 'person' ? 'bg-blue-500 text-white shadow-lg scale-105' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
        >
          <User size={12} /> Pessoas
        </button>
        <button 
          onClick={() => setFilter('pet')} 
          className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1 ${filter === 'pet' ? 'bg-amber-500 text-black shadow-lg scale-105' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
        >
          <PawPrint size={12} /> Pets
        </button>
      </div>

      {/* Map Container */}
      <MapContainer 
        center={[-14.2350, -51.9253]} 
        zoom={3} 
        scrollWheelZoom={true}
        zoomControl={false}
        attributionControl={false}
        className="z-0"
        style={{ width: '100%', height: '100%', background: '#050816' }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        
        <MapController targetId={targetMemorialId} memorials={memorials} onMapClick={handleMapClick} />

        {filteredMemorials.map((star) => (
          <Marker 
            key={star.id} 
            position={[star.lat, star.lng]} 
            icon={createCustomIcon(star.type, star.size, star.animalType)}
            eventHandlers={{
              click: (e) => {
                L.DomEvent.stopPropagation(e);
                setSelectedStar(star);
              }
            }}
          />
        ))}
      </MapContainer>

      {/* View Memorial Bottom Sheet */}
      <AnimatePresence>
        {selectedStar && (
          <>
            <motion.div 
               initial={{ opacity: 0 }} 
               animate={{ opacity: 1 }} 
               exit={{ opacity: 0 }}
               className="absolute inset-0 z-[1001] bg-black/20 backdrop-blur-[1px]"
               onClick={() => setSelectedStar(null)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute bottom-0 left-0 w-full z-[1002] bg-[#0F172A] border-t border-white/10 rounded-t-3xl p-6 shadow-2xl shadow-black"
            >
              <div className="w-12 h-1 bg-white/10 rounded-full mx-auto mb-6"></div>
              
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl shadow-lg border ${selectedStar.type === 'pet' ? 'bg-amber-500/20 text-amber-200 border-amber-500/30' : 'bg-blue-500/20 text-blue-200 border-blue-500/30'}`}>
                    {selectedStar.type === 'pet' ? <PawPrint /> : <User />}
                  </div>
                  <div>
                    <h3 className="text-xl font-serif text-white">{selectedStar.name}</h3>
                    <div className="flex items-center gap-2 text-xs text-white/50 mt-1">
                      <span className="capitalize">{selectedStar.type === 'pet' ? 'Pet' : 'Ente Querido'}</span>
                      <span>•</span>
                      <span>{selectedStar.lat.toFixed(2)}, {selectedStar.lng.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                
                <button onClick={() => setSelectedStar(null)} className="p-2 bg-white/5 rounded-full text-white/50 hover:bg-white/10 hover:text-white">
                  <X size={20} />
                </button>
              </div>

              <div className="bg-white/5 rounded-xl p-4 border border-white/5 mb-6">
                 <p className="text-white/80 italic font-light">"{selectedStar.quote || 'Uma estrela que brilha para sempre.'}"</p>
              </div>

              {selectedStar.createdBy === currentUserId ? (
                 <div className="flex gap-3">
                   <button 
                     onClick={() => onSelectMemorial && onSelectMemorial(selectedStar.id)}
                     className="flex-1 py-3 bg-blue-600/20 text-blue-200 rounded-xl font-medium border border-blue-500/30 flex items-center justify-center gap-2 hover:bg-blue-600/30 transition-colors"
                   >
                     <User size={16} /> Ver Memorial
                   </button>
                   <button className="flex-1 py-3 bg-white/5 text-white/80 rounded-xl font-medium border border-white/10 flex items-center justify-center gap-2 hover:bg-white/10 transition-colors">
                     <Edit2 size={16} /> Editar
                   </button>
                   <button 
                     onClick={() => handleDelete(selectedStar.id)}
                     className="flex-1 py-3 bg-red-500/10 text-red-200 rounded-xl font-medium border border-red-500/20 flex items-center justify-center gap-2 hover:bg-red-500/20 transition-colors"
                   >
                     <Trash2 size={16} /> Excluir
                   </button>
                 </div>
              ) : (
                <button 
                  onClick={() => onSelectMemorial && onSelectMemorial(selectedStar.id)}
                  className="w-full py-3 bg-blue-600/20 text-blue-200 rounded-xl font-medium border border-blue-500/30 flex items-center justify-center gap-2 hover:bg-blue-600/30 transition-colors"
                >
                  <User size={16} /> Ver Memorial
                </button>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Create Modal */}
      <AnimatePresence>
        {modalOpen && (
          <>
            <motion.div 
               initial={{ opacity: 0 }} 
               animate={{ opacity: 1 }} 
               exit={{ opacity: 0 }}
               className="absolute inset-0 z-[1001] bg-black/60 backdrop-blur-sm"
               onClick={() => setModalOpen(false)}
            />
            <motion.div
               initial={{ opacity: 0, scale: 0.9, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.9, y: 20 }}
               className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm bg-[#0F172A] border border-blue-500/20 rounded-2xl p-6 z-[1002] shadow-2xl shadow-blue-900/20"
            >
              <h3 className="text-xl font-serif text-white mb-4 flex items-center gap-2">
                <MapPin className="text-blue-300" size={20} />
                Marcar Local
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="text-xs text-blue-200/60 uppercase font-medium ml-1">Nome</label>
                  <input 
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white placeholder-white/20 focus:outline-none focus:border-blue-500/50 transition-colors"
                    placeholder="Quem você quer homenagear?"
                    autoFocus
                  />
                </div>

                <div>
                   <label className="text-xs text-blue-200/60 uppercase font-medium ml-1">Tipo</label>
                   <div className="flex gap-2 mt-1">
                     <button 
                       onClick={() => setFormType('person')}
                       className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors border ${formType === 'person' ? 'bg-blue-600/20 border-blue-500 text-blue-200' : 'bg-white/5 border-transparent text-white/40 hover:bg-white/10'}`}
                     >
                       <User size={16} /> Pessoa
                     </button>
                     <button 
                       onClick={() => setFormType('pet')}
                       className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors border ${formType === 'pet' ? 'bg-amber-600/20 border-amber-500 text-amber-200' : 'bg-white/5 border-transparent text-white/40 hover:bg-white/10'}`}
                     >
                       <PawPrint size={16} /> Pet
                     </button>
                   </div>
                </div>
                
                {/* Animal Type Selector - Only for pets */}
                {formType === 'pet' && (
                  <div>
                    <label className="text-xs text-blue-200/60 uppercase font-medium ml-1">Tipo de Animal</label>
                    <div className="grid grid-cols-3 gap-2 mt-1">
                      {(['dog', 'cat', 'bird', 'rabbit', 'fish', 'other'] as AnimalType[]).map((animal) => (
                        <button
                          key={animal}
                          onClick={() => setFormAnimalType(animal)}
                          className={`py-2 px-3 rounded-lg flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors border ${
                            formAnimalType === animal 
                              ? 'bg-amber-600/20 border-amber-500 text-amber-200' 
                              : 'bg-white/5 border-transparent text-white/40 hover:bg-white/10'
                          }`}
                        >
                          <div className="text-base">
                            {animal === 'dog' && <Dog size={18} />}
                            {animal === 'cat' && <Cat size={18} />}
                            {animal === 'bird' && <Bird size={18} />}
                            {animal === 'rabbit' && <Rabbit size={18} />}
                            {animal === 'fish' && <Fish size={18} />}
                            {animal === 'other' && <PawPrint size={18} />}
                          </div>
                          <span className="capitalize">
                            {animal === 'dog' && 'Cão'}
                            {animal === 'cat' && 'Gato'}
                            {animal === 'bird' && 'Ave'}
                            {animal === 'rabbit' && 'Coelho'}
                            {animal === 'fish' && 'Peixe'}
                            {animal === 'other' && 'Outro'}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="p-3 bg-white/5 rounded-lg border border-white/5 text-xs text-white/50">
                   Este memorial será fixado neste local do mapa.
                </div>

                <div className="pt-2">
                   <label className="flex items-start gap-3 p-3 bg-red-500/10 rounded-lg border border-red-500/20 cursor-pointer hover:bg-red-500/20 transition-colors">
                     <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors ${privacyChecked ? 'bg-blue-500 border-blue-500' : 'border-white/20'}`}>
                        {privacyChecked && <Check size={12} className="text-white" />}
                        <input type="checkbox" className="hidden" checked={privacyChecked} onChange={(e) => setPrivacyChecked(e.target.checked)} />
                     </div>
                     <span className="text-xs text-white/60 leading-tight">
                       Confirmo que esta é uma homenagem respeitosa.
                     </span>
                   </label>
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => setModalOpen(false)}
                    className="flex-1 py-3 text-sm font-medium text-white/60 hover:text-white transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleCreate}
                    disabled={!formName || !privacyChecked}
                    className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl text-white text-sm font-medium shadow-lg shadow-blue-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Criar Homenagem
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}