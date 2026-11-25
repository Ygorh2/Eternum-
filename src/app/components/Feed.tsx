import React, { useState, useMemo, useEffect, useRef } from 'react';
import { getYear } from '../utils/dateUtils';
import { motion } from 'motion/react';
import { Plus, Search, Menu, User, Bell, Heart, MessageCircle, Send, Star, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import type { PostComment, PostInteractions, ReactionType } from '../data/api';
import type { FeedPost, FeedScope, FeedTypeFilter } from '../utils/feed';
import { canDeleteComment, getReactions } from '../utils/postInteractions';
import { PostComments } from './PostComments';
import { PostMediaCarousel } from './PostMediaCarousel';
import { PostOptionsMenu } from './PostOptionsMenu';
import { reportTargetFromPostKey, type ReportTarget } from '../utils/reports';

interface Props {
  /** Todos os memoriais visíveis (usado só na aba "Buscar Memoriais"). */
  memorials: any[];
  /** Posts já carregados do feed, na ordem certa (mais novos primeiro). */
  posts: FeedPost[];
  scope: FeedScope;
  onScopeChange: (scope: FeedScope) => void;
  /** Visitante não tem aba "Seguindo". */
  canUseFollowing?: boolean;
  typeFilter: FeedTypeFilter;
  onTypeFilterChange: (type: FeedTypeFilter) => void;
  loading?: boolean;
  loadingMore?: boolean;
  hasMore?: boolean;
  feedError?: string | null;
  onLoadMore: () => void;
  onRetry?: () => void;
  onSelectMemorial: (id: string) => void;
  onCreate: (type?: 'person' | 'pet') => void;
  onProfile: () => void;
  onOpenMenu: () => void;
  interactions?: PostInteractions;
  canInteract?: boolean;
  interactionError?: string | null;
  onToggleReaction?: (memorialId: string, postKey: string, reaction: ReactionType) => void;
  onAddComment?: (memorialId: string, postKey: string, text: string) => Promise<void>;
  onDeleteComment?: (comment: PostComment) => Promise<void>;
  /** Usuário logado (para saber quais comentários ele pode apagar). */
  currentUserId?: string;
  onDismissError?: () => void;
  /** Sininho: só aparece quando há onOpenNotifications (visitante não tem). */
  unreadNotifications?: number;
  onOpenNotifications?: () => void;
  /** Abre a janela de denúncia (post ou comentário). Sem ela, não há opção de denunciar. */
  onReport?: (target: ReportTarget) => void;
}

type Post = FeedPost;

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

const NO_INTERACTIONS: PostInteractions = { reactions: {}, comments: {} };
const NO_POSTS: MemorialPost[] = [];

export function Feed({
  memorials,
  posts,
  scope,
  onScopeChange,
  canUseFollowing = true,
  typeFilter,
  onTypeFilterChange,
  loading = false,
  loadingMore = false,
  hasMore = false,
  feedError,
  onLoadMore,
  onRetry,
  onSelectMemorial,
  onCreate,
  onProfile,
  onOpenMenu,
  interactions = NO_INTERACTIONS,
  canInteract = false,
  interactionError,
  onToggleReaction,
  onAddComment,
  onDeleteComment,
  onReport,
  currentUserId,
  onDismissError,
  unreadNotifications = 0,
  onOpenNotifications,
}: Props) {
  const { user, userMetadata } = useAuth();
  const [searchMode, setSearchMode] = useState<'memorials' | 'users'>('memorials');
  const [searchTerm, setSearchTerm] = useState('');
  const [openCommentsPost, setOpenCommentsPost] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const handleReaction = (post: Post, type: ReactionType) => {
    onToggleReaction?.(post.memorial.id, post.postKey, type);
  };

  // Busca por nome entre os posts já carregados
  const filteredPosts = useMemo(() => {
    if (!searchTerm || searchMode !== 'memorials') return posts;
    const term = searchTerm.toLowerCase();
    return posts.filter((p) => p.memorial.name.toLowerCase().includes(term));
  }, [posts, searchTerm, searchMode]);

  // Rolagem infinita: quando o fim da lista aparece, pede a próxima página
  const loadMoreRef = useRef(onLoadMore);
  loadMoreRef.current = onLoadMore;
  const showFeed = searchMode === 'memorials';
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!showFeed || !hasMore || !sentinel || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) loadMoreRef.current();
      },
      { root: scrollRef.current, rootMargin: '600px 0px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [showFeed, hasMore, loadingMore, posts.length]);

  const changeScope = (next: FeedScope) => {
    setSearchMode('memorials');
    if (next !== scope) {
      onScopeChange(next);
      setOpenCommentsPost(null);
      scrollRef.current?.scrollTo?.({ top: 0 });
    }
  };

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
          <div className="flex items-center gap-1">
          {onOpenNotifications && (
            <button
              onClick={onOpenNotifications}
              aria-label={
                unreadNotifications > 0
                  ? `Notificações: ${unreadNotifications} não lida${unreadNotifications === 1 ? '' : 's'}`
                  : 'Notificações'
              }
              className="relative p-2 text-white/70 hover:text-white transition-colors"
            >
              <Bell size={22} />
              {unreadNotifications > 0 && (
                <span className="absolute top-1 right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-semibold leading-[18px] text-center shadow-sm">
                  {unreadNotifications > 99 ? '99+' : unreadNotifications}
                </span>
              )}
            </button>
          )}
          <button onClick={onProfile} aria-label="Meu perfil" className="p-1.5 text-blue-200/60 hover:text-blue-100 transition-colors">
            <div className="w-8 h-8 rounded-full bg-white/10 overflow-hidden border border-white/20 shadow-sm flex items-center justify-center">
              {user?.user_metadata?.avatar_url ? (
                <img src={user.user_metadata.avatar_url} alt={userMetadata?.display_name || 'Perfil'} className="w-full h-full object-cover" />
              ) : (
                <User size={16} className="text-white/50" />
              )}
            </div>
          </button>
          </div>
        </div>

        {/* Abas: Seguindo / Explorar / Buscar */}
        <div role="tablist" aria-label="Feed" className="flex gap-4 text-sm font-medium mb-2">
          {canUseFollowing && (
            <button
              role="tab"
              aria-selected={searchMode === 'memorials' && scope === 'following'}
              onClick={() => changeScope('following')}
              className={`transition-colors ${searchMode === 'memorials' && scope === 'following' ? 'text-blue-300' : 'text-white/50 hover:text-white'}`}
            >
              Seguindo
            </button>
          )}
          <button
            role="tab"
            aria-selected={searchMode === 'memorials' && scope === 'explore'}
            onClick={() => changeScope('explore')}
            className={`transition-colors ${searchMode === 'memorials' && scope === 'explore' ? 'text-blue-300' : 'text-white/50 hover:text-white'}`}
          >
            Explorar
          </button>
          <button
            role="tab"
            aria-selected={searchMode === 'users'}
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
              onClick={() => onTypeFilterChange('all')}
              aria-pressed={typeFilter === 'all'}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors border ${typeFilter === 'all' ? 'bg-white/10 border-white/20 text-white' : 'border-transparent text-white/40 hover:bg-white/5'}`}
            >
              Todos
            </button>
            <button 
              onClick={() => onTypeFilterChange('person')}
              aria-pressed={typeFilter === 'person'}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors border ${typeFilter === 'person' ? 'bg-white/10 border-white/20 text-white' : 'border-transparent text-white/40 hover:bg-white/5'}`}
            >
              Pessoas
            </button>
            <button 
              onClick={() => onTypeFilterChange('pet')}
              aria-pressed={typeFilter === 'pet'}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors border ${typeFilter === 'pet' ? 'bg-white/10 border-white/20 text-white' : 'border-transparent text-white/40 hover:bg-white/5'}`}
            >
              Pets
            </button>
          </div>
        )}
      </div>

      {interactionError && (
        <div role="alert" className="mx-4 mt-3 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-400/30 text-amber-100 text-xs flex items-center justify-between gap-2">
          <span>{interactionError}</span>
          {onDismissError && (
            <button onClick={onDismissError} className="text-amber-200/80 hover:text-amber-100" aria-label="Fechar aviso">
              ✕
            </button>
          )}
        </div>
      )}

      {/* Content Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
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

            {/* Carregando a primeira página */}
            {loading && (
              <div role="status" className="flex items-center justify-center gap-2 py-16 text-white/50 text-sm">
                <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                Carregando o feed…
              </div>
            )}

            {/* Empty State */}
            {!loading && !feedError && filteredPosts.length === 0 && (
              <div className="text-center px-8 py-16">
                <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-5">
                  <Star size={36} className="text-white/20" />
                </div>
                {searchTerm ? (
                  <>
                    <h3 className="text-white/60 font-medium mb-2">Nada encontrado</h3>
                    <p className="text-white/30 text-sm leading-relaxed">
                      Nenhum post carregado com “{searchTerm}”. Use “Buscar Memoriais” para procurar em todos.
                    </p>
                  </>
                ) : scope === 'following' ? (
                  <>
                    <h3 className="text-white/60 font-medium mb-2">Nenhum post ainda</h3>
                    <p className="text-white/30 text-sm leading-relaxed">
                      Aqui aparecem os seus memoriais e homenagens, e os das pessoas e memoriais que você segue.
                    </p>
                    <button
                      onClick={() => changeScope('explore')}
                      className="mt-5 px-5 py-2.5 rounded-xl bg-white/10 border border-white/10 text-sm text-white/80 hover:bg-white/15 transition-colors"
                    >
                      Explorar memoriais
                    </button>
                  </>
                ) : (
                  <>
                    <h3 className="text-white/60 font-medium mb-2">Nenhum post ainda</h3>
                    <p className="text-white/30 text-sm leading-relaxed">
                      Ainda não há memoriais públicos por aqui. Que tal criar o primeiro?
                    </p>
                  </>
                )}
              </div>
            )}

            {filteredPosts.map((post, index) => {
              const reactions = getReactions(interactions, post.postKey);
              const amenCount = reactions.amen;
              const loveCount = reactions.love;
              const hasAmen = reactions.mine.amen;
              const hasLove = reactions.mine.love;
              const comments = interactions.comments[post.postKey] || [];
              const commentsOpen = openCommentsPost === post.id;

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
                    {(() => {
                      const target = reportTargetFromPostKey(post.postKey, post.memorial.id);
                      const isMine = !!currentUserId && post.author.id === currentUserId;
                      return (
                        <PostOptionsMenu
                          onReport={onReport && target && !isMine ? () => onReport(target) : undefined}
                          reportLabel={target?.type === 'memorial' ? 'Denunciar memorial' : 'Denunciar publicação'}
                        />
                      );
                    })()}
                  </div>

                  {/* Publicação com uma ou várias fotos/vídeos */}
                  {post.content.media && (
                    <PostMediaCarousel
                      media={post.content.media}
                      alt={post.content.message ? post.content.message.slice(0, 120) : `Publicação em memória de ${post.memorial.name}`}
                    />
                  )}

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
                        onClick={() => handleReaction(post, 'amen')}
                        aria-label="Amém"
                        aria-pressed={hasAmen}
                        className={`flex items-center gap-1.5 transition-all ${hasAmen ? 'text-blue-300' : 'text-white/60 hover:text-white'}`}
                      >
                        <div className={`flex items-center justify-center w-7 h-7 rounded-full text-base ${hasAmen ? 'bg-blue-500/20' : ''}`}>
                          🙏
                        </div>
                      </button>

                      <button
                        onClick={() => handleReaction(post, 'love')}
                        aria-label="Amor"
                        aria-pressed={hasLove}
                        className={`transition-all ${hasLove ? 'text-pink-300' : 'text-white/60 hover:text-white'}`}
                      >
                        <Heart size={22} className={hasLove ? 'fill-pink-300' : ''} />
                      </button>

                      <button
                        onClick={() => setOpenCommentsPost(commentsOpen ? null : post.id)}
                        aria-label="Comentar"
                        aria-expanded={commentsOpen}
                        className={`flex items-center gap-1 transition-colors ${commentsOpen ? 'text-blue-300' : 'text-white/60 hover:text-white'}`}
                      >
                        <MessageCircle size={22} />
                        {comments.length > 0 && <span className="text-xs">{comments.length}</span>}
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

                    {/* Comentários */}
                    {!commentsOpen && comments.length > 0 && (
                      <button
                        onClick={() => setOpenCommentsPost(post.id)}
                        className="text-xs text-white/50 hover:text-white/70 transition-colors"
                      >
                        {comments.length === 1 ? 'Ver 1 comentário' : `Ver os ${comments.length} comentários`}
                      </button>
                    )}
                    {commentsOpen && (
                      <PostComments
                        comments={comments}
                        showInput
                        canComment={canInteract && !!onAddComment}
                        onSubmit={(text) => onAddComment!(post.memorial.id, post.postKey, text)}
                        onDelete={onDeleteComment}
                        canDelete={(c) => canDeleteComment(c, currentUserId, post.memorial.createdBy)}
                        onReport={onReport ? (c) => onReport({ type: 'comment', id: c.id }) : undefined}
                        canReport={(c) => !!currentUserId && c.userId !== currentUserId}
                      />
                    )}
                  </div>
                </motion.div>
              );
            })}

            {/* Fim da lista: rolagem infinita + botão de reserva */}
            <div ref={sentinelRef} aria-hidden="true" className="h-px" />
            {feedError && (
              <div role="alert" className="mx-4 my-4 px-3 py-3 rounded-lg bg-white/5 border border-white/10 text-center">
                <p className="text-sm text-white/70">{feedError}</p>
                {onRetry && (
                  <button
                    onClick={onRetry}
                    className="mt-2 text-xs font-medium text-blue-300 hover:text-blue-200 transition-colors"
                  >
                    Tentar de novo
                  </button>
                )}
              </div>
            )}
            {loadingMore && (
              <div role="status" className="flex items-center justify-center gap-2 py-6 text-white/50 text-xs">
                <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                Carregando mais…
              </div>
            )}
            {!loading && !loadingMore && !feedError && hasMore && (
              <div className="flex justify-center py-4">
                <button
                  onClick={onLoadMore}
                  className="px-4 py-2 rounded-xl text-xs text-white/60 border border-white/10 hover:bg-white/5 hover:text-white transition-colors"
                >
                  Carregar mais
                </button>
              </div>
            )}
            {!loading && !feedError && !hasMore && filteredPosts.length > 0 && (
              <p className="text-center text-xs text-white/30 py-6">Você chegou ao fim do feed 🕊️</p>
            )}
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