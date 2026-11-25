import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, User, Loader2, Star, UserPlus, UserMinus, MoreVertical, Flag, Ban, Grid3x3 } from 'lucide-react';
import * as api from '../data/api';
import type { ReportTarget } from '../utils/reports';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { PostGrid, gridItemsFromPosts } from './PostGrid';

interface Props {
  userId: string;
  currentUserId?: string | null;
  memorials: any[]; // todos os memoriais já carregados no app — filtramos os desse usuário
  onBack: () => void;
  onSelectMemorial: (id: string) => void;
  /** Abre a janela de denúncia do perfil. */
  onReport?: (target: ReportTarget) => void;
  /** Avisado depois de bloquear/desbloquear (para recarregar o que aparece no app). */
  onBlockedChange?: () => void;
  // Grade de fotos: publicações feitas por esta pessoa
  posts?: api.MemorialPost[];
  postsLoading?: boolean;
  postsHasMore?: boolean;
  postsError?: string | null;
  onLoadMorePosts?: () => void;
  onOpenPost?: (postId: string) => void;
}

export function PublicProfile({
  userId,
  currentUserId,
  memorials,
  onBack,
  onSelectMemorial,
  onReport,
  onBlockedChange,
  posts = [],
  postsLoading,
  postsHasMore,
  postsError,
  onLoadMorePosts,
  onOpenPost,
}: Props) {
  const [profile, setProfile] = useState<{ displayName?: string; username?: string } | null>(null);
  const [stats, setStats] = useState({ tributesCount: 0, candlesCount: 0, followersCount: 0, followingCount: 0 });
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [isBlocked, setIsBlocked] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);

  const isOwnProfile = currentUserId === userId;
  const canModerate = !!currentUserId && currentUserId !== 'guest' && !isOwnProfile;
  const userMemorials = isBlocked ? [] : memorials.filter((m) => m.createdBy === userId);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    Promise.all([
      api.fetchProfile(userId),
      api.fetchProfileStats(userId),
      canModerate ? api.isFollowingUser(userId) : Promise.resolve(false),
      canModerate ? api.isUserBlocked(userId).catch(() => false) : Promise.resolve(false),
    ])
      .then(([profileData, statsData, following, blocked]) => {
        if (cancelled) return;
        setProfile(profileData);
        setStats(statsData);
        setIsFollowing(following);
        setIsBlocked(blocked);
      })
      .catch((err) => {
        console.error('Erro ao carregar perfil público:', err);
        if (!cancelled) setError('Não foi possível carregar este perfil.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, currentUserId]);

  const handleToggleFollow = async () => {
    if (!currentUserId) return;
    setIsToggling(true);
    try {
      if (isFollowing) {
        await api.unfollowUser(userId);
        setIsFollowing(false);
        setStats((s) => ({ ...s, followersCount: Math.max(0, s.followersCount - 1) }));
      } else {
        await api.followUser(userId);
        setIsFollowing(true);
        setStats((s) => ({ ...s, followersCount: s.followersCount + 1 }));
      }
    } catch (err: any) {
      console.error('Erro ao seguir/deixar de seguir:', err);
      setActionError(err?.message || 'Não foi possível concluir. Tente de novo.');
    } finally {
      setIsToggling(false);
    }
  };

  const handleBlock = async (block: boolean) => {
    setIsBlocking(true);
    setActionError('');
    try {
      if (block) {
        await api.blockUser(userId);
        // o bloqueio desfaz o "seguir" nos dois sentidos
        if (isFollowing) setStats((s) => ({ ...s, followersCount: Math.max(0, s.followersCount - 1) }));
        setIsFollowing(false);
      } else {
        await api.unblockUser(userId);
      }
      setIsBlocked(block);
      onBlockedChange?.();
    } catch (err: any) {
      console.error('Erro ao bloquear/desbloquear:', err);
      setActionError(err?.message || 'Não foi possível concluir. Tente de novo.');
    } finally {
      setIsBlocking(false);
      setConfirmBlock(false);
    }
  };

  const displayName = profile?.displayName || 'Usuário';

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-[#0F172A] to-[#1E1B4B] text-white">
      <div className="p-4 flex items-center gap-4 bg-[#0F172A]/80 backdrop-blur-md border-b border-white/10 sticky top-0 z-10">
        <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/70">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-medium text-blue-100 flex-1">Perfil</h1>
        {canModerate && !isLoading && !error && (
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Mais opções do perfil"
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/70"
              >
                <MoreVertical size={20} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[#1E293B] border-white/10 text-white">
              {onReport && (
                <DropdownMenuItem
                  onSelect={() => onReport({ type: 'user', id: userId })}
                  className="cursor-pointer focus:bg-white/10 focus:text-white"
                >
                  <Flag size={14} className="text-red-300" />
                  Denunciar perfil
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onSelect={() => (isBlocked ? handleBlock(false) : setConfirmBlock(true))}
                disabled={isBlocking}
                className="cursor-pointer text-red-300 focus:bg-red-500/10 focus:text-red-200"
              >
                <Ban size={14} className="text-red-300" />
                {isBlocked ? 'Desbloquear' : 'Bloquear'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={28} className="animate-spin text-white/40" />
        </div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <p className="text-red-300 text-sm text-center">{error}</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center pb-24">
          <div className="w-28 h-28 rounded-full p-1 bg-gradient-to-tr from-blue-500 to-purple-500 shadow-[0_0_30px_rgba(59,130,246,0.3)] mt-6 mb-4">
            <div className="w-full h-full rounded-full border-4 border-[#0F172A] overflow-hidden bg-[#1E293B] flex items-center justify-center">
              <User size={40} className="text-white/30" />
            </div>
          </div>

          <h2 className="text-2xl font-serif font-medium text-white mb-1">
            {profile?.displayName || 'Usuário'}
          </h2>
          {profile?.username && <p className="text-blue-200/60 text-sm mb-4">@{profile.username}</p>}

          {actionError && (
            <p role="alert" className="mb-4 text-xs text-red-300 text-center">
              {actionError}
            </p>
          )}

          {isBlocked && (
            <div className="w-full mb-6 p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
              <p className="text-sm text-white/80 mb-1">Você bloqueou esta pessoa.</p>
              <p className="text-xs text-white/50 mb-3">
                Você não vê o que ela publica, e ela não vê seus memoriais nem interage com você.
              </p>
              <button
                type="button"
                onClick={() => handleBlock(false)}
                disabled={isBlocking}
                className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-sm font-medium transition-colors disabled:opacity-60"
              >
                {isBlocking ? 'Desbloqueando...' : 'Desbloquear'}
              </button>
            </div>
          )}

          {canModerate && !isBlocked && (
            <button
              onClick={handleToggleFollow}
              disabled={isToggling}
              className={`mb-6 px-6 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-colors disabled:opacity-60 ${
                isFollowing
                  ? 'bg-white/10 text-white border border-white/20 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/30'
                  : 'bg-blue-600 hover:bg-blue-500 text-white'
              }`}
            >
              {isToggling ? (
                <Loader2 size={16} className="animate-spin" />
              ) : isFollowing ? (
                <>
                  <UserMinus size={16} /> Deixar de seguir
                </>
              ) : (
                <>
                  <UserPlus size={16} /> Seguir
                </>
              )}
            </button>
          )}

          <div className="w-full bg-gradient-to-r from-blue-600/10 to-purple-600/10 backdrop-blur-sm border border-blue-500/20 rounded-2xl p-5 shadow-lg mb-8">
            <div className="flex items-center justify-around">
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{userMemorials.length}</p>
                <p className="text-xs text-blue-200/60 font-medium">Memoriais</p>
              </div>
              <div className="w-px h-12 bg-white/10" />
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{stats.followersCount}</p>
                <p className="text-xs text-purple-200/60 font-medium">Seguidores</p>
              </div>
              <div className="w-px h-12 bg-white/10" />
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{stats.followingCount}</p>
                <p className="text-xs text-pink-200/60 font-medium">Seguindo</p>
              </div>
            </div>
          </div>

          {onOpenPost && !isBlocked && (
            <section className="w-full mb-8" aria-labelledby="public-profile-posts-title">
              <h3
                id="public-profile-posts-title"
                className="flex items-center justify-center gap-2 text-xs font-medium text-white/60 uppercase tracking-widest pb-3 mb-0.5 border-b border-white/10"
              >
                <Grid3x3 size={14} aria-hidden="true" />
                Publicações
              </h3>
              <div className="-mx-6">
                <PostGrid
                  items={gridItemsFromPosts(posts)}
                  onSelect={onOpenPost}
                  loading={postsLoading}
                  hasMore={postsHasMore}
                  onLoadMore={onLoadMorePosts}
                  error={postsError}
                  emptyText={isOwnProfile ? 'Você ainda não publicou fotos.' : 'Nenhuma publicação ainda.'}
                />
              </div>
            </section>
          )}

          {userMemorials.length > 0 && (
            <div className="w-full">
              <h3 className="text-sm font-medium text-white/40 uppercase tracking-widest mb-4">Memoriais criados</h3>
              <div className="space-y-3">
                {userMemorials.map((memorial, index) => (
                  <motion.button
                    key={memorial.id}
                    onClick={() => onSelectMemorial(memorial.id)}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-3 hover:bg-white/10 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <Star size={16} className="text-blue-300" />
                    </div>
                    <div>
                      <p className="font-serif text-white">{memorial.name}</p>
                      <p className="text-xs text-white/40 capitalize">{memorial.type === 'pet' ? 'Pet' : 'Ente Querido'}</p>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <AlertDialog open={confirmBlock} onOpenChange={(open) => !open && !isBlocking && setConfirmBlock(false)}>
        <AlertDialogContent className="bg-[#1E293B] text-white border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle>Bloquear {displayName}?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              Vocês deixam de se seguir. Você não verá o que essa pessoa publica, e ela não verá seus memoriais, não
              poderá comentar, reagir, homenagear nem seguir você. Ela não será avisada. Você pode desbloquear quando
              quiser em Configurações.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-white/20 text-white hover:bg-white/10 hover:text-white">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleBlock(true);
              }}
              disabled={isBlocking}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isBlocking ? 'Bloqueando...' : 'Bloquear'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
