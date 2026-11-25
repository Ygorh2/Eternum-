import React, { useState } from 'react';
import { formatDate, parseLocalDate } from '../utils/dateUtils';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Share2, Flame, Heart, BookOpen, Send, Sparkles, MessageSquare, User, MoreVertical, Play, UserPlus } from 'lucide-react';
import type { PostInteractions, ReactionType } from '../data/api';
import { getReactions } from '../utils/postInteractions';
import { galleryPostKey, tributePostKey } from '../utils/postKeys';
import { PostComments } from './PostComments';

interface Props {
  memorial: any;
  tributes: any[];
  onBack: () => void;
  onViewLivingMemory: () => void;
  onWriteTribute: () => void;
  onViewProfile?: (userId: string) => void;
  // Reações e comentários (salvos no Supabase)
  interactions?: PostInteractions;
  canInteract?: boolean;
  interactionError?: string | null;
  onToggleReaction?: (memorialId: string, postKey: string, reaction: ReactionType) => void;
  onAddComment?: (memorialId: string, postKey: string, text: string) => Promise<void>;
  onDismissError?: () => void;
  // Velas
  candles?: { count: number; litByMe: boolean };
  candleError?: string | null;
  onLightCandle?: () => void;
  // Seguir memorial
  follow?: { count: number; isFollowing: boolean };
  followError?: string | null;
  onToggleFollow?: () => void;
}

// Tribute Post interface for Instagram-style posts
interface TributePost {
  id: string;
  postKey: string;
  author: {
    id?: string;
    name: string;
    photo?: string;
  };
  content: string;
  date: string;
  media?: {
    type: 'photo' | 'video';
    url: string;
  };
}

const NO_INTERACTIONS: PostInteractions = { reactions: {}, comments: {} };

export function MemorialDetail({
  memorial,
  tributes,
  onBack,
  onViewLivingMemory,
  onWriteTribute,
  onViewProfile,
  interactions = NO_INTERACTIONS,
  canInteract = false,
  interactionError,
  onToggleReaction,
  onAddComment,
  onDismissError,
  candles = { count: 0, litByMe: false },
  candleError,
  onLightCandle,
  follow = { count: 0, isFollowing: false },
  followError,
  onToggleFollow,
}: Props) {
  const [activeTab, setActiveTab] = useState<'tributes' | 'living-memory' | 'about'>('tributes');
  const isFollowing = follow.isFollowing;
  const followersCount = follow.count;
  const notice = interactionError || candleError || followError;

  // Transform tributes into Instagram-style posts
  const tributePosts: TributePost[] = tributes.map((tribute, index) => ({
    id: tribute.id,
    postKey: tributePostKey(tribute.id),
    author: typeof tribute.author === 'object' 
      ? tribute.author 
      : { name: tribute.author, photo: undefined },
    content: tribute.content || tribute.text,
    date: tribute.date,
    media: tribute.media || (tribute.image ? { type: 'photo' as const, url: tribute.image } : undefined),
  }));

  // Fotos e vídeos da galeria do memorial viram posts, como no Instagram
  const galleryPosts: TributePost[] = (memorial.gallery || []).map((item: any, i: number) => ({
    id: `gallery-${memorial.id}-${i}`,
    postKey: galleryPostKey(item.url),
    author: { name: 'Administrador' },
    content: '',
    date: memorial.createdAt || '',
    media: { type: item.type === 'video' ? ('video' as const) : ('photo' as const), url: item.url },
  }));

  // Posts da galeria + homenagens, do mais recente para o mais antigo
  const allPosts: TributePost[] = [...galleryPosts, ...tributePosts].sort(
    (a, b) => (parseLocalDate(b.date)?.getTime() ?? 0) - (parseLocalDate(a.date)?.getTime() ?? 0)
  );

  const [activeCommentPost, setActiveCommentPost] = useState<string | null>(null);

  const handlePostReaction = (post: TributePost, reaction: ReactionType) => {
    onToggleReaction?.(memorial.id, post.postKey, reaction);
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-[#0F172A] to-[#1E1B4B] text-white overflow-hidden relative">
      {/* Header with Cover Photo */}
      <div className="relative w-full shrink-0">
        {/* Cover Photo */}
        <motion.div 
          layoutId={`memorial-cover-${memorial.id}`}
          className="h-56 relative w-full"
        >
          {memorial.cover ? (
            <img src={memorial.cover} className="w-full h-full object-cover" alt="Cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-900/50 to-purple-900/50 flex items-center justify-center">
              <div className="text-white/20 text-6xl">✨</div>
            </div>
          )}
          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-[#0F172A]"></div>
          
          {/* Back and Share buttons */}
          <div className="absolute top-4 left-0 w-full px-4 z-20 flex justify-between items-center">
            <button onClick={onBack} className="p-2.5 bg-black/30 backdrop-blur-md rounded-full text-white hover:bg-black/50 transition-colors shadow-lg">
              <ArrowLeft size={22} />
            </button>
            <button className="p-2.5 bg-black/30 backdrop-blur-md rounded-full text-white hover:bg-black/50 transition-colors shadow-lg">
              <Share2 size={22} />
            </button>
          </div>
        </motion.div>

        {/* Profile Photo - Overlapping Cover */}
        <div className="px-6 -mt-16 relative z-30">
          <motion.div 
            layoutId={`memorial-photo-${memorial.id}`}
            className="w-32 h-32 rounded-full border-4 border-[#0F172A] overflow-hidden bg-[#1E293B] shadow-2xl flex items-center justify-center"
          >
            {memorial.photo ? (
              <img src={memorial.photo} className="w-full h-full object-cover" alt={memorial.name} />
            ) : (
              <User size={64} className="text-white/30" />
            )}
          </motion.div>
        </div>
      </div>

      {/* Profile Info Section */}
      <div className="px-6 pt-4 pb-3">
        {/* Name and Dates */}
        <div className="mb-4">
          <motion.h1 
            layoutId={`memorial-name-${memorial.id}`} 
            className="text-3xl font-serif text-white font-medium mb-1"
          >
            {memorial.name}
          </motion.h1>
          <p className="text-white/60 text-sm font-light flex items-center gap-2">
            <span className="text-amber-300">✨</span>
            {formatDate(memorial.birthDate, { day: 'numeric', month: 'long', year: 'numeric' })}
            {' — '}
            {formatDate(memorial.deathDate, { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Statistics */}
        <div className="flex items-center gap-6 mb-4">
          <div className="flex flex-col">
            <span className="text-xl font-semibold text-white">{tributes.length}</span>
            <span className="text-xs text-white/50 font-light">Homenagens</span>
          </div>
          <div className="w-px h-8 bg-white/10"></div>
          <div className="flex flex-col">
            <span className="text-xl font-semibold text-white">{followersCount}</span>
            <span className="text-xs text-white/50 font-light">Seguidores</span>
          </div>
          <div className="w-px h-8 bg-white/10"></div>
          <div className="flex flex-col">
            <span className="text-xl font-semibold text-white">{candles.count}</span>
            <span className="text-xs text-white/50 font-light">Velas</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button 
            onClick={onToggleFollow}
            aria-pressed={isFollowing}
            className={`flex-1 py-2.5 rounded-xl font-medium text-sm transition-all shadow-lg flex items-center justify-center gap-2 ${
              isFollowing 
                ? 'bg-white/10 border border-white/20 text-white/80 hover:bg-white/15' 
                : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600'
            }`}
          >
            <UserPlus size={16} />
            {isFollowing ? 'Seguindo' : 'Seguir'}
          </button>
          <button
            onClick={onLightCandle}
            disabled={candles.litByMe}
            aria-label={candles.litByMe ? 'Você já acendeu uma vela' : 'Acender vela'}
            title={candles.litByMe ? 'Você já acendeu uma vela' : 'Acender vela'}
            className={`px-3.5 py-2.5 rounded-xl border backdrop-blur-md flex items-center justify-center transition-colors shadow-lg ${
              candles.litByMe
                ? 'bg-amber-500/25 border-amber-400/40 text-amber-200 cursor-default'
                : 'bg-white/5 border-white/15 text-white/70 hover:bg-amber-500/15 hover:text-amber-200'
            }`}
          >
            <Flame size={18} className={candles.litByMe ? 'fill-amber-300/60' : ''} />
          </button>
          <button 
            onClick={onViewLivingMemory}
            className="px-5 py-2.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-200 rounded-xl text-sm font-medium backdrop-blur-md flex items-center gap-2 hover:bg-amber-500/30 transition-colors shadow-lg"
          >
            <Sparkles size={16} />
            Memória Viva
          </button>
        </div>
      </div>

      {notice && (
        <div role="alert" className="mx-6 mb-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-400/30 text-amber-100 text-xs flex items-center justify-between gap-2">
          <span>{notice}</span>
          {interactionError && onDismissError && (
            <button onClick={onDismissError} className="text-amber-200/80 hover:text-amber-100" aria-label="Fechar aviso">
              ✕
            </button>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-white/10 px-6 mt-2">
        {[
          { id: 'tributes', label: 'Homenagens' },
          { id: 'living-memory', label: 'Memória Viva' },
          { id: 'about', label: 'Sobre' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`py-4 px-4 text-sm font-medium relative transition-colors ${
              activeTab === tab.id ? 'text-white' : 'text-white/40 hover:text-white/60'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <motion.div 
                layoutId="memorialActiveTab" 
                className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-blue-400 to-purple-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]" 
              />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6 bg-black/20">
        <AnimatePresence mode="wait">
          {activeTab === 'tributes' && (
            <motion.div 
              key="tributes"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-5"
            >
               <button 
                 onClick={onWriteTribute}
                 className="w-full py-4 border-2 border-dashed border-white/20 rounded-2xl text-white/50 flex items-center justify-center gap-2 hover:bg-white/5 hover:border-white/30 transition-all"
               >
                 <BookOpen size={18} />
                 Escrever uma homenagem
               </button>

               {allPosts.map((post) => {
                 const reactions = getReactions(interactions, post.postKey);
                 const comments = interactions.comments[post.postKey] || [];
                 return (
                 <div key={post.id} className="bg-[#1E293B]/60 border border-white/10 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
                   {/* Post Header - Instagram Style */}
                   <div className="flex items-center justify-between p-4 border-b border-white/5">
                     <div className="flex items-center gap-3">
                       {/* Memorial Photo */}
                       <div className="w-10 h-10 rounded-full overflow-hidden bg-white/10 border-2 border-white/20 flex items-center justify-center">
                         {memorial.photo ? (
                           <img src={memorial.photo} className="w-full h-full object-cover" alt={memorial.name} />
                         ) : (
                           <User size={20} className="text-white/40" />
                         )}
                       </div>
                       <div>
                         <h4 className="text-sm font-medium text-white">{memorial.name}</h4>
                         <p className="text-xs text-white/50">{formatDate(post.date)}</p>
                       </div>
                     </div>
                     <button className="p-2 text-white/40 hover:text-white/60 transition-colors">
                       <MoreVertical size={18} />
                     </button>
                   </div>

                   {/* Post Media (if exists) */}
                   {post.media && (
                     <div className="relative aspect-square bg-black/30">
                       {post.media.type === 'photo' ? (
                         <img src={post.media.url} className="w-full h-full object-cover" alt="Post media" />
                       ) : (
                         <video src={post.media.url} className="w-full h-full object-cover" controls playsInline />
                       )}
                     </div>
                   )}

                   {/* Post Content */}
                   <div className="p-4">
                     {/* Reactions Bar */}
                     <div className="flex items-center gap-4 mb-3 pb-3 border-b border-white/5">
                       <button
                         onClick={() => handlePostReaction(post, 'love')}
                         aria-pressed={reactions.mine.love}
                         className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                          reactions.mine.love 
                            ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30' 
                            : 'bg-white/5 text-white/60 hover:bg-white/10 border border-transparent'
                        }`}
                       >
                         <Heart size={18} className={reactions.mine.love ? 'fill-pink-300' : ''} />
                         <span className="text-xs font-medium">{reactions.love}</span>
                         <span className="text-xs">Amor</span>
                       </button>
                       
                       <button
                         onClick={() => handlePostReaction(post, 'amen')}
                         aria-pressed={reactions.mine.amen}
                         className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                          reactions.mine.amen 
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' 
                            : 'bg-white/5 text-white/60 hover:bg-white/10 border border-transparent'
                        }`}
                       >
                         <span className="text-base">🙏</span>
                         <span className="text-xs font-medium">{reactions.amen}</span>
                         <span className="text-xs">Amém</span>
                       </button>

                       <button
                         onClick={() => setActiveCommentPost(activeCommentPost === post.id ? null : post.id)}
                         aria-label="Comentar"
                         aria-expanded={activeCommentPost === post.id}
                         className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 transition-colors"
                       >
                         <MessageSquare size={18} />
                         <span className="text-xs">{comments.length}</span>
                       </button>

                       <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 transition-colors ml-auto">
                         <Send size={18} />
                         <span className="text-xs">Oração</span>
                       </button>
                     </div>

                     {/* Tribute Text */}
                     {post.content && (
                     <p className="text-white/90 font-light leading-relaxed mb-3">
                       {post.author.id && onViewProfile ? (
                         <button
                           onClick={() => onViewProfile(post.author.id!)}
                           className="font-medium text-white hover:underline"
                         >
                           {post.author.name}
                         </button>
                       ) : (
                         <span className="font-medium text-white">{post.author.name}</span>
                       )}{' '}
                       <span className="italic">"{post.content}"</span>
                     </p>
                     )}

                     {/* Comentários */}
                     <PostComments
                       comments={comments}
                       showInput={activeCommentPost === post.id}
                       canComment={canInteract && !!onAddComment}
                       onSubmit={(text) => onAddComment!(memorial.id, post.postKey, text)}
                     />
                   </div>
                 </div>
                 );
               })}
            </motion.div>
          )}

          {activeTab === 'living-memory' && (
            <motion.div
              key="living-memory"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center justify-center py-12 text-center"
            >
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-2 border-amber-500/30 flex items-center justify-center mb-6">
                <Sparkles size={40} className="text-amber-300" />
              </div>
              <h3 className="text-xl font-serif text-white mb-3">Memória Viva</h3>
              <p className="text-white/60 text-sm max-w-xs mb-6 leading-relaxed">
                Uma jornada emocional através do tempo e das lembranças compartilhadas
              </p>
              <button 
                onClick={onViewLivingMemory}
                className="px-6 py-3 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-200 rounded-xl font-medium hover:bg-amber-500/30 transition-colors shadow-lg flex items-center gap-2"
              >
                <Sparkles size={18} />
                Explorar Timeline
              </button>
            </motion.div>
          )}
          
          {activeTab === 'about' && (
            <motion.div
               key="about"
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: -10 }}
               className="space-y-6"
            >
              {/* Biography Section */}
              <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                <h3 className="text-lg font-serif text-white mb-4 flex items-center gap-2">
                  <Heart size={18} className="text-pink-300" />
                  História
                </h3>
                <p className="text-white/80 leading-relaxed font-light">
                  {memorial.bio || "Uma alma especial que tocou a vida de muitas pessoas. Sua memória vive em nossos corações para sempre."}
                </p>
              </div>

              {/* Additional Info */}
              <div className="bg-white/5 p-6 rounded-2xl border border-white/10 space-y-4">
                <h3 className="text-lg font-serif text-white mb-4">Informações</h3>
                
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 border border-blue-400/30 flex items-center justify-center shrink-0">
                    <span className="text-lg">🎂</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-white/50 mb-0.5">Nascimento</p>
                    <p className="text-white/90 text-sm">
                      {formatDate(memorial.birthDate, { 
                        day: 'numeric', 
                        month: 'long', 
                        year: 'numeric' 
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-500/20 border border-purple-400/30 flex items-center justify-center shrink-0">
                    <span className="text-lg">🕊️</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-white/50 mb-0.5">Passagem</p>
                    <p className="text-white/90 text-sm">
                      {formatDate(memorial.deathDate, { 
                        day: 'numeric', 
                        month: 'long', 
                        year: 'numeric' 
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-400/30 flex items-center justify-center shrink-0">
                    <Flame size={18} className="text-amber-300" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-white/50 mb-0.5">Velas Acesas</p>
                    <p className="text-white/90 text-sm">{candles.count} {candles.count === 1 ? 'vela' : 'velas'}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
