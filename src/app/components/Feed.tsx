import React, { useState, useMemo } from 'react';
import { getYear } from '../utils/dateUtils';
import { motion } from 'motion/react';
import { Plus, Search, Menu, User, Heart, MessageCircle, Send, MoreVertical, Star } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  memorials: any[];
  tributes: any[];
  onSelectMemorial: (id: string) => void;
  onCreate: (type?: 'person' | 'pet') => void;
  onProfile: () => void;
  onOpenMenu: () => void;
  creatorNames?: Record<string, string>;
}

interface Post {
  id: string;
  sourceType: 'memorial_created' | 'gallery_image' | 'tribute';
  memorial: {
    id: string;
    name: string;
    photo: string;
    type: 'person' | 'pet';
  };
  content: {
    image?: string;
    video?: string;
    videoType?: string;
    message?: string;
  };
  author: {
    name: string;
    relationship?: string;
  };
  createdAt: string;
  reactions: { amen: number; love: number };
  comments: number;
  hasReactedAmen: boolean;
  hasReactedLove: boolean;
}

function formatRelativeDate(isoDate: string): string {
  if (!isoDate) return '';
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora mesmo';
  if (mins < 60) return `Há ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Há 1 dia';
  if (days < 7) return `Há ${days} dias`;
  return new Date(isoDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export function Feed({ memorials, tributes, onSelectMemorial, onCreate, onProfile, onOpenMenu, creatorNames }: Props) {
  const { user, userMetadata } = useAuth();
  const [activeTab, setActiveTab] = useState<'all' | 'people' | 'pets'>('all');
  const [searchMode, setSearchMode] = useState<'memorials' | 'users'>('memorials');
  const [searchTerm, setSearchTerm] = useState('');
  const [reactionOverrides, setReactionOverrides] = useState<Record<string, { amen: number; love: number; hasAmen: boolean; hasLove: boolean }>>({});

  // Gerar posts reais a partir de memoriais e homenagens
  const allPosts = useMemo<Post[]>(() => {
    const posts: Post[] = [];
    const creatorName = (m: any): string =>
      creatorNames?.[m.createdBy] ||
      (m.createdBy === user?.id ? userMetadata?.display_name || user?.email?.split('@')[0] : undefined) ||
      'Administrador';

    // 1. Cada memorial gera um post de criação
    for (const memorial of memorials) {
      posts.push({
        id: `memorial-created-${memorial.id}`,
        sourceType: 'memorial_created',
        memorial: {
          id: memorial.id,
          name: memorial.name,
          photo: memorial.photo || '',
          type: memorial.type || 'person',
        },
        content: {
          image: memorial.photo || undefined,
          message: memorial.bio ? memorial.bio.slice(0, 200) : undefined,
        },
        author: {
          name: creatorName(memorial),
        },
        createdAt: memorial.createdAt || new Date().toISOString(),
        reactions: { amen: 0, love: 0 },
        comments: 0,
        hasReactedAmen: false,
        hasReactedLove: false,
      });

      // 2. Cada imagem/vídeo da galeria do memorial gera um post separado
      if (memorial.gallery && memorial.gallery.length > 0) {
        for (let i = 0; i < memorial.gallery.length; i++) {
          const item = memorial.gallery[i];
          const isVideo = item.type === 'video';
          posts.push({
            id: `gallery-${memorial.id}-${i}`,
            sourceType: 'gallery_image',
            memorial: {
              id: memorial.id,
              name: memorial.name,
              photo: memorial.photo || '',
              type: memorial.type || 'person',
            },
            content: isVideo
              ? { video: item.url, videoType: item.mimeType }
              : { image: item.url },
            author: {
              name: creatorName(memorial),
            },
            createdAt: memorial.createdAt || new Date().toISOString(),
            reactions: { amen: 0, love: 0 },
            comments: 0,
            hasReactedAmen: false,
            hasReactedLove: false,
          });
        }
      }
    }

    // 3. Cada homenagem (tribute) gera um post
    for (const tribute of tributes) {
      const memorial = memorials.find((m: any) => m.id === tribute.memorialId);
      if (!memorial) continue;
      posts.push({
        id: `tribute-${tribute.id}`,
        sourceType: 'tribute',
        memorial: {
          id: memorial.id,
          name: memorial.name,
          photo: memorial.photo || '',
          type: memorial.type || 'person',
        },
        content: {
          image: tribute.image || undefined,
          message: tribute.content,
        },
        author: {
          name: tribute.author?.name || 'Usuário',
          relationship: tribute.type,
        },
        createdAt: tribute.createdAt || tribute.date || new Date().toISOString(),
        reactions: { amen: 0, love: 0 },
        comments: 0,
        hasReactedAmen: false,
        hasReactedLove: false,
      });
    }

    // Ordenar do mais recente para o mais antigo
    return posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [memorials, tributes, user, userMetadata, creatorNames]);

  const handleReaction = (postId: string, type: 'amen' | 'love') => {
    setReactionOverrides(prev => {
      const base = prev[postId] || { amen: 0, love: 0, hasAmen: false, hasLove: false };
      const toggling = type === 'amen' ? 'hasAmen' : 'hasLove';
      const wasOn = base[toggling];
      return {
        ...prev,
        [postId]: {
          ...base,
          [type]: wasOn ? base[type] - 1 : base[type] + 1,
          [toggling]: !wasOn,
        },
      };
    });
  };

  // Filtrar posts por tipo de memorial
  const filteredPosts = useMemo(() => {
    let result = allPosts;
    if (activeTab === 'people') result = result.filter(p => p.memorial.type === 'person');
    if (activeTab === 'pets') result = result.filter(p => p.memorial.type === 'pet');
    if (searchTerm && searchMode === 'memorials') {
      result = result.filter(p => p.memorial.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    return result;
  }, [allPosts, activeTab, searchTerm, searchMode]);

  // Filtrar memoriais por busca
  const filteredMemorials = useMemo(() => {
    if (!searchTerm) return memorials;
    return memorials.filter((m: any) =>
      m.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [memorials, searchTerm]);

  return (
    <div className="h-full flex flex-col bg-transparent text-white">
      {/* Header */}
      <div className="bg-[#0F172A]/80 backdrop-blur-md px-4 py-3 sticky top-0 z-20 shadow-lg border-b border-white/10">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-3">
            <button onClick={onOpenMenu} className="p-2 -ml-2 text-white/70 hover:text-white transition-colors">
              <Menu size={22} />
            </button>
            <h1 className="text-xl font-serif text-blue-100">Feed</h1>
          </div>
          <button onClick={onProfile} className="p-1.5 text-blue-200/60 hover:text-blue-100 transition-colors">
            <div className="w-8 h-8 rounded-full bg-white/10 overflow-hidden border border-white/20 shadow-sm flex items-center justify-center">
              {user?.user_metadata?.avatar_url ? (
                <img src={user.user_metadata.avatar_url} alt={userMetadata?.display_name || 'Perfil'} className="w-full h-full object-cover" />
              ) : (
                <User size={16} className="text-white/50" />
              )}
            </div>
          </button>
        </div>

        {/* Search Tabs */}
        <div className="flex gap-4 text-sm font-medium mb-2">
          <button
            onClick={() => setSearchMode('memorials')}
            className={`transition-colors ${searchMode === 'memorials' ? 'text-blue-300' : 'text-white/50 hover:text-white'}`}
          >
            Feed
          </button>
          <button
            onClick={() => setSearchMode('users')}
            className={`transition-colors ${searchMode === 'users' ? 'text-blue-300' : 'text-white/50 hover:text-white'}`}
          >
            Buscar Memoriais
          </button>
        </div>

        {/* Search Input */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={16} />
          <input 
            type="text" 
            placeholder={searchMode === 'memorials' ? 'Buscar homenagem...' : 'Encontrar amigos...'} 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 transition-colors"
          />
        </div>

        {/* Filter Tabs - Apenas quando em modo memorial */}
        {searchMode === 'memorials' && (
          <div className="flex gap-2">
            <button 
              onClick={() => setActiveTab('all')}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors border ${activeTab === 'all' ? 'bg-white/10 border-white/20 text-white' : 'border-transparent text-white/40 hover:bg-white/5'}`}
            >
              Todos
            </button>
            <button 
              onClick={() => setActiveTab('people')}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors border ${activeTab === 'people' ? 'bg-white/10 border-white/20 text-white' : 'border-transparent text-white/40 hover:bg-white/5'}`}
            >
              Pessoas
            </button>
            <button 
              onClick={() => setActiveTab('pets')}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors border ${activeTab === 'pets' ? 'bg-white/10 border-white/20 text-white' : 'border-transparent text-white/40 hover:bg-white/5'}`}
            >
              Pets
            </button>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        {searchMode === 'users' ? (
          /* Busca de Memoriais por nome */
          <div className="p-4 space-y-3 pb-24">
            <p className="text-xs text-white/40 uppercase font-medium mb-2">
              {searchTerm ? `Memoriais com "${searchTerm}"` : 'Todos os memoriais'}
            </p>
            {filteredMemorials.length === 0 ? (
              <div className="text-center py-16">
                <Star size={48} className="mx-auto text-white/20 mb-3" />
                <p className="text-white/40 text-sm">Nenhum memorial encontrado</p>
                <p className="text-white/30 text-xs mt-1">Tente buscar por outro nome</p>
              </div>
            ) : (
              filteredMemorials.map((m: any, index: number) => (
                <motion.button
                  key={m.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => onSelectMemorial(m.id)}
                  className="w-full bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-4 flex items-center gap-4 hover:bg-white/10 transition-colors text-left"
                >
                  <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white/20 flex-shrink-0 bg-white/5 flex items-center justify-center">
                    {m.photo ? (
                      <img src={m.photo} alt={m.name} className="w-full h-full object-cover" />
                    ) : (
                      <User size={24} className="text-white/30" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate">{m.name}</h3>
                    <p className="text-xs text-white/50 mt-0.5">
                      {m.type === 'pet' ? '🐾 Pet' : '🕊️ Pessoa'}
                      {m.birthDate && m.deathDate && ` · ${getYear(m.birthDate)} – ${getYear(m.deathDate)}`}
                    </p>
                    {m.quote && <p className="text-xs text-white/40 mt-1 truncate italic">"{m.quote}"</p>}
                  </div>
                </motion.button>
              ))
            )}
          </div>
        ) : (
          /* Feed de Posts Reais */
          <div className="pb-24">
            {/* Create Memorial Button */}
            <motion.button
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => onCreate()}
              className="mx-4 mt-4 mb-6 w-[calc(100%-2rem)] bg-gradient-to-r from-blue-600/20 to-purple-600/20 backdrop-blur-sm p-4 rounded-2xl border border-blue-500/30 flex items-center gap-4 hover:bg-white/5 transition-colors group"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                <Plus size={24} strokeWidth={2.5} />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-semibold text-white text-base">Criar Memorial</h3>
                <p className="text-xs text-white/60 mt-0.5">Adicione uma nova estrela ao céu</p>
              </div>
            </motion.button>

            {/* Empty State */}
            {filteredPosts.length === 0 && (
              <div className="text-center px-8 py-16">
                <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-5">
                  <Star size={36} className="text-white/20" />
                </div>
                <h3 className="text-white/60 font-medium mb-2">Nenhum post ainda</h3>
                <p className="text-white/30 text-sm leading-relaxed">
                  Seu feed mostra os memoriais que você criou e os de quem você segue. Crie um memorial ou use “Buscar Pessoas” no menu para seguir alguém.
                </p>
              </div>
            )}

            {filteredPosts.map((post, index) => {
              const overrides = reactionOverrides[post.id];
              const amenCount = (overrides?.amen ?? post.reactions.amen);
              const loveCount = (overrides?.love ?? post.reactions.love);
              const hasAmen = overrides?.hasAmen ?? post.hasReactedAmen;
              const hasLove = overrides?.hasLove ?? post.hasReactedLove;

              return (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.08, 0.4) }}
                  className="mb-6 bg-white/5 backdrop-blur-sm border-b border-white/10"
                >
                  {/* Post Header */}
                  <div className="p-3 flex items-center justify-between">
                    <button
                      onClick={() => onSelectMemorial(post.memorial.id)}
                      className="flex items-center gap-3 flex-1 hover:opacity-80 transition-opacity"
                    >
                      <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/20 bg-white/5 flex items-center justify-center flex-shrink-0">
                        {post.memorial.photo ? (
                          <img src={post.memorial.photo} alt={post.memorial.name} className="w-full h-full object-cover" />
                        ) : (
                          <User size={20} className="text-white/30" />
                        )}
                      </div>
                      <div className="text-left min-w-0 flex-1">
                        <h3 className="font-medium text-white text-sm truncate">{post.memorial.name}</h3>
                        <p className="text-xs text-white/50">
                          {formatRelativeDate(post.createdAt)}
                          {post.author.relationship && ` · ${post.author.relationship}`}
                        </p>
                      </div>
                    </button>
                    <button className="p-2 text-white/40 hover:text-white transition-colors flex-shrink-0">
                      <MoreVertical size={18} />
                    </button>
                  </div>

                  {/* Post Image */}
                  {post.content.image && (
                    <div className="relative w-full aspect-square bg-black/20">
                      <img src={post.content.image} alt="Post" className="w-full h-full object-cover" />
                    </div>
                  )}

                  {/* Post Video */}
                  {post.content.video && (
                    <div className="relative w-full aspect-square bg-black/40">
                      <video
                        src={post.content.video}
                        controls
                        className="w-full h-full object-contain"
                        playsInline
                      />
                    </div>
                  )}

                  {/* Post Actions & Content */}
                  <div className="p-3 space-y-3">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => handleReaction(post.id, 'amen')}
                        className={`flex items-center gap-1.5 transition-all ${hasAmen ? 'text-blue-300' : 'text-white/60 hover:text-white'}`}
                      >
                        <div className={`flex items-center justify-center w-7 h-7 rounded-full text-base ${hasAmen ? 'bg-blue-500/20' : ''}`}>
                          🙏
                        </div>
                      </button>

                      <button
                        onClick={() => handleReaction(post.id, 'love')}
                        className={`transition-all ${hasLove ? 'text-pink-300' : 'text-white/60 hover:text-white'}`}
                      >
                        <Heart size={22} className={hasLove ? 'fill-pink-300' : ''} />
                      </button>

                      <button className="text-white/60 hover:text-white transition-colors">
                        <MessageCircle size={22} />
                      </button>

                      <button className="text-white/60 hover:text-white transition-colors ml-auto">
                        <Send size={20} />
                      </button>
                    </div>

                    {/* Reactions Count */}
                    {(amenCount > 0 || loveCount > 0) && (
                      <div className="flex items-center gap-3 text-xs text-white/60">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center -space-x-1">
                            {amenCount > 0 && (
                              <div className="w-5 h-5 rounded-full bg-blue-500/20 border border-[#0F172A] flex items-center justify-center text-[10px]">🙏</div>
                            )}
                            {loveCount > 0 && (
                              <div className="w-5 h-5 rounded-full bg-pink-500/20 border border-[#0F172A] flex items-center justify-center">
                                <Heart size={10} className="fill-pink-300 text-pink-300" />
                              </div>
                            )}
                          </div>
                          <span>{amenCount + loveCount} reações</span>
                        </div>
                      </div>
                    )}

                    {/* Post Message */}
                    {post.content.message && (
                      <div className="pt-1">
                        <p className="text-white/90 text-sm leading-relaxed">
                          <span className="font-medium text-white">{post.author.name}</span>{' '}
                          {post.content.message}
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5, type: 'spring' }}
        onClick={() => onCreate()}
        className="fixed bottom-20 right-4 w-14 h-14 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-full shadow-xl shadow-blue-900/50 flex items-center justify-center text-white hover:scale-110 transition-transform z-10"
      >
        <Plus size={26} strokeWidth={2.5} />
      </motion.button>

      {/* FAB Label */}
      <div className="fixed bottom-11 right-4 z-10 pointer-events-none">
        <div className="bg-[#0F172A]/90 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-white/10 shadow-lg">
          <p className="text-[10px] font-medium text-white whitespace-nowrap">Criar Memorial</p>
        </div>
      </div>
    </div>
  );
}