import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Navigate, useSearchParams } from 'react-router';
import { useApp } from './Layout';
import * as api from './data/api';
import { Feed } from './components/Feed';
import { MemorialDetail } from './components/MemorialDetail';
import { CreateMemorial } from './components/CreateMemorial';
import { EditMemorial, type EditMemorialChanges } from './components/EditMemorial';
import { LivingMemory } from './components/LivingMemory';
import { Profile } from './components/Profile';
import { WriteTribute } from './components/WriteTribute';
import { TheSky } from './components/TheSky';
import { MyMemorials } from './components/MyMemorials';
import { Pets } from './components/Pets';
import { Invites } from './components/Invites';
import { Settings } from './components/Settings';
import { Auth } from './components/Auth';
import { Onboarding } from './components/Onboarding';
import { PublicProfile } from './components/PublicProfile';
import { AcceptInvite } from './components/AcceptInvite';
import { People } from './components/People';
import { CreatePost } from './components/CreatePost';
import { getReactions, withComment, withReaction } from './utils/postInteractions';
import { tributeIdFromPostKey } from './utils/postKeys';
import {
  appendRows,
  memorialIdsOf,
  type FeedQuery,
  type FeedRow,
  type FeedScope,
  type FeedTypeFilter,
  type FollowingScope,
} from './utils/feed';
import { authorIdsOf, fetchFeedPage, rowsToPosts } from './data/feedSources';

// ------------------------------------------------------------------
// Hooks de interação (velas, seguir memorial, reações e comentários).
// Ficam aqui para que as telas continuem só de apresentação.
// ------------------------------------------------------------------

const EMPTY_INTERACTIONS: api.PostInteractions = { reactions: {}, comments: {} };

/** Reações e comentários dos posts desses memoriais, com atualização otimista. */
function usePostInteractions(memorialIds: string[], user: any) {
  const isGuest = !user || user.isGuest;
  const userId = isGuest ? undefined : user.id;
  const idsKey = useMemo(() => Array.from(new Set(memorialIds)).sort().join(','), [memorialIds]);
  const [interactions, setInteractions] = useState<api.PostInteractions>(EMPTY_INTERACTIONS);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(new Set<string>());

  // Memoriais cujas interações já foram carregadas (para este usuário). No feed
  // paginado a lista só cresce, então buscamos apenas os memoriais novos.
  const loaded = useRef<{ userId?: string; ids: Set<string> }>({ userId, ids: new Set() });

  useEffect(() => {
    const ids = idsKey ? idsKey.split(',') : [];
    const sameUser = loaded.current.userId === userId;
    const isGrowing = sameUser && Array.from(loaded.current.ids).every((id) => ids.includes(id));
    if (!isGrowing) {
      loaded.current = { userId, ids: new Set() };
      setInteractions(EMPTY_INTERACTIONS);
    }
    const missing = ids.filter((id) => !loaded.current.ids.has(id));
    if (missing.length === 0) return;
    missing.forEach((id) => loaded.current.ids.add(id));
    const requestedFor = loaded.current;
    api
      .fetchPostInteractions(missing, userId)
      .then((data) => {
        if (loaded.current !== requestedFor) return; // usuário/lista mudou no meio
        setInteractions((prev) => ({
          reactions: { ...prev.reactions, ...data.reactions },
          comments: { ...prev.comments, ...data.comments },
        }));
      })
      .catch((err) => {
        console.error('Erro ao carregar reações e comentários:', err);
        missing.forEach((id) => requestedFor.ids.delete(id));
        if (loaded.current === requestedFor) setError('Não foi possível carregar reações e comentários.');
      });
  }, [idsKey, userId]);

  const toggleReaction = async (memorialId: string, postKey: string, reaction: api.ReactionType) => {
    if (!userId) {
      setError('Entre com sua conta para reagir.');
      return;
    }
    const lockKey = `${postKey}|${reaction}`;
    if (pending.current.has(lockKey)) return;
    pending.current.add(lockKey);
    const on = !getReactions(interactions, postKey).mine[reaction];
    setError(null);
    setInteractions((prev) => withReaction(prev, postKey, reaction, on));
    try {
      if (on) await api.addReaction(memorialId, postKey, reaction, tributeIdFromPostKey(postKey));
      else await api.removeReaction(postKey, reaction);
    } catch (err: any) {
      console.error('Erro ao salvar reação:', err);
      setInteractions((prev) => withReaction(prev, postKey, reaction, !on));
      setError('Não foi possível salvar sua reação. Tente de novo.');
    } finally {
      pending.current.delete(lockKey);
    }
  };

  const addComment = async (memorialId: string, postKey: string, text: string) => {
    if (!userId) throw new Error('Entre com sua conta para comentar.');
    const saved = await api.addComment(memorialId, postKey, text, user.name, tributeIdFromPostKey(postKey));
    setInteractions((prev) => withComment(prev, saved));
  };

  return {
    interactions,
    canInteract: !!userId,
    interactionError: error,
    onToggleReaction: toggleReaction,
    onAddComment: addComment,
    onDismissError: () => setError(null),
  };
}

/** Velas do memorial: total e se o usuário já acendeu a dele (1 por pessoa). */
function useCandle(memorialId: string | undefined, user: any) {
  const userId = !user || user.isGuest ? undefined : user.id;
  const [info, setInfo] = useState({ count: 0, litByMe: false });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!memorialId) return;
    let cancelled = false;
    api
      .fetchCandleInfo(memorialId, userId)
      .then((data) => {
        if (!cancelled) setInfo(data);
      })
      .catch((err) => console.error('Erro ao carregar velas:', err));
    return () => {
      cancelled = true;
    };
  }, [memorialId, userId]);

  const light = async () => {
    if (!memorialId) return;
    if (!userId) {
      setError('Entre com sua conta para acender uma vela.');
      return;
    }
    if (info.litByMe) return;
    setError(null);
    setInfo((prev) => ({ count: prev.count + 1, litByMe: true }));
    try {
      await api.lightCandle(memorialId);
    } catch (err: any) {
      console.error('Erro ao acender vela:', err);
      setInfo((prev) => ({ count: Math.max(0, prev.count - 1), litByMe: false }));
      setError('Não foi possível acender a vela. Tente de novo.');
    }
  };

  return { candles: info, candleError: error, onLightCandle: light };
}

/** Botão "Seguir" do memorial e contador de seguidores. */
function useMemorialFollow(memorialId: string | undefined, user: any) {
  const userId = !user || user.isGuest ? undefined : user.id;
  const [info, setInfo] = useState({ count: 0, isFollowing: false });
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);

  useEffect(() => {
    if (!memorialId) return;
    let cancelled = false;
    api
      .fetchMemorialFollowInfo(memorialId, userId)
      .then((data) => {
        if (!cancelled) setInfo(data);
      })
      .catch((err) => console.error('Erro ao carregar seguidores do memorial:', err));
    return () => {
      cancelled = true;
    };
  }, [memorialId, userId]);

  const toggle = async () => {
    if (!memorialId || busy.current) return;
    if (!userId) {
      setError('Entre com sua conta para seguir este memorial.');
      return;
    }
    busy.current = true;
    const follow = !info.isFollowing;
    const apply = (on: boolean) =>
      setInfo((prev) => ({ count: Math.max(0, prev.count + (on ? 1 : -1)), isFollowing: on }));
    setError(null);
    apply(follow);
    try {
      if (follow) await api.followMemorial(memorialId);
      else await api.unfollowMemorial(memorialId);
    } catch (err: any) {
      console.error('Erro ao seguir memorial:', err);
      apply(!follow);
      setError('Não foi possível atualizar. Tente de novo.');
    } finally {
      busy.current = false;
    }
  };

  return { follow: info, followError: error, onToggleFollow: toggle };
}

/** Publicações com foto/vídeo e legenda desses memoriais (tabela memorial_posts). */
function useMemorialPosts(memorialIds: string[]) {
  const idsKey = useMemo(() => Array.from(new Set(memorialIds)).sort().join(','), [memorialIds]);
  const [posts, setPosts] = useState<api.MemorialPost[]>([]);
  const [postsError, setPostsError] = useState<string | null>(null);

  useEffect(() => {
    if (!idsKey) {
      setPosts([]);
      return;
    }
    let cancelled = false;
    api
      .fetchMemorialPosts(idsKey.split(','))
      .then((data) => {
        if (!cancelled) {
          setPosts(data);
          setPostsError(null);
        }
      })
      .catch((err) => {
        console.error('Erro ao carregar publicações:', err);
        if (!cancelled) setPostsError('Não foi possível carregar as publicações.');
      });
    return () => {
      cancelled = true;
    };
  }, [idsKey]);

  const deletePost = async (postId: string) => {
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    setPostsError(null);
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    try {
      await api.deleteMemorialPost(post);
    } catch (err: any) {
      console.error('Erro ao apagar publicação:', err);
      setPosts((prev) =>
        [...prev, post].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      );
      setPostsError('Não foi possível apagar a publicação. Tente de novo.');
    }
  };

  return { posts, postsError, onDeletePost: deletePost };
}

// Public Routes

export function ConnectedOnboarding() {
  const navigate = useNavigate();
  return <Onboarding onFinish={() => navigate('/login')} />;
}

export function ConnectedAuth() {
  const { handleLogin } = useApp();
  return <Auth onLogin={handleLogin} />;
}

// Protected Routes

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, authLoading } = useApp();
  if (authLoading) {
    // Ainda verificando se existe uma sessão válida do Supabase — evita
    // redirecionar para /login antes de saber a resposta real.
    return null;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

const FEED_PAGE_SIZE = 10;

/**
 * Feed paginado (estilo Instagram): carrega 10 itens por vez e mais quando a
 * pessoa chega ao fim da lista. Duas abas:
 *  - "Seguindo": o que eu criei/escrevi + pessoas e memoriais que eu sigo;
 *  - "Explorar": tudo que a RLS me deixa ver (visitante só vê públicos).
 */
function useFeed(user: any) {
  const isGuest = !user || user.isGuest;
  const userId = isGuest ? undefined : (user.id as string);

  const [scope, setScope] = useState<FeedScope>(isGuest ? 'explore' : 'following');
  const [type, setType] = useState<FeedTypeFilter>('all');
  const [rows, setRows] = useState<FeedRow[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authorNames, setAuthorNames] = useState<Record<string, string>>({});
  const [reloadKey, setReloadKey] = useState(0);

  const effectiveScope: FeedScope = isGuest ? 'explore' : scope;
  // Cada nova consulta (aba/filtro/usuário) ganha um número; respostas de
  // consultas antigas são ignoradas.
  const requestId = useRef(0);
  const followingRef = useRef<{ userId?: string; scope: FollowingScope } | null>(null);

  const buildQuery = async (before?: string): Promise<FeedQuery> => {
    const q: FeedQuery = { scope: effectiveScope, type, before, limit: FEED_PAGE_SIZE };
    if (effectiveScope === 'following' && userId) {
      if (followingRef.current?.userId !== userId) {
        followingRef.current = { userId, scope: await api.fetchFollowingScope(userId) };
      }
      q.following = followingRef.current.scope;
    }
    return q;
  };

  // Primeira página (e recarregar ao trocar aba, filtro ou usuário)
  useEffect(() => {
    const id = ++requestId.current;
    // Ao voltar para a aba, recalcula quem eu sigo (posso ter seguido alguém)
    followingRef.current = null;
    setRows([]);
    setCursor(null);
    setHasMore(false);
    setError(null);
    setLoading(true);
    (async () => {
      try {
        const page = await fetchFeedPage(await buildQuery());
        if (requestId.current !== id) return;
        setRows(page.rows);
        setCursor(page.nextCursor);
        setHasMore(!!page.nextCursor);
      } catch (err: any) {
        console.error('Erro ao carregar o feed:', err);
        if (requestId.current === id) setError('Não foi possível carregar o feed.');
      } finally {
        if (requestId.current === id) setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveScope, type, userId, reloadKey]);

  const loadMore = async () => {
    if (loading || loadingMore || !hasMore || !cursor) return;
    const id = requestId.current;
    setLoadingMore(true);
    setError(null);
    try {
      const page = await fetchFeedPage(await buildQuery(cursor));
      if (requestId.current !== id) return;
      setRows((prev) => appendRows(prev, page.rows));
      setCursor(page.nextCursor);
      setHasMore(!!page.nextCursor);
    } catch (err: any) {
      console.error('Erro ao carregar mais posts:', err);
      if (requestId.current === id) setError('Não foi possível carregar mais posts.');
    } finally {
      if (requestId.current === id) setLoadingMore(false);
    }
  };

  // Nomes reais dos autores dos memoriais (busca só os que ainda não temos)
  const missingAuthorsKey = useMemo(
    () => authorIdsOf(rows).filter((id) => !(id in authorNames)).sort().join(','),
    [rows, authorNames]
  );
  useEffect(() => {
    if (!missingAuthorsKey) return;
    let cancelled = false;
    const ids = missingAuthorsKey.split(',');
    api
      .fetchProfilesByIds(ids)
      .then((names) => {
        if (cancelled) return;
        // ids sem perfil ficam com '' para não buscar de novo
        const filled = Object.fromEntries(ids.map((id) => [id, names[id] || '']));
        setAuthorNames((prev) => ({ ...prev, ...filled }));
      })
      .catch((err) => console.error('Erro ao carregar nomes dos autores:', err));
    return () => {
      cancelled = true;
    };
  }, [missingAuthorsKey]);

  const posts = useMemo(
    () =>
      rowsToPosts(rows, {
        authorName: (id) =>
          (id && authorNames[id]) || (id && id === userId ? user?.name : undefined) || undefined,
      }),
    [rows, authorNames, userId, user?.name]
  );

  return {
    posts,
    scope: effectiveScope,
    onScopeChange: setScope,
    canUseFollowing: !isGuest,
    typeFilter: type,
    onTypeFilterChange: setType,
    loading,
    loadingMore,
    hasMore,
    feedError: error,
    onLoadMore: loadMore,
    onRetry: () => (rows.length > 0 ? loadMore() : setReloadKey((k) => k + 1)),
  };
}

export function ConnectedFeed() {
  const { memorials, user, setIsMenuOpen } = useApp();
  const navigate = useNavigate();

  const feed = useFeed(user);
  const feedMemorialIds = useMemo(() => memorialIdsOf(feed.posts), [feed.posts]);
  const postInteractions = usePostInteractions(feedMemorialIds, user);

  return (
    <Feed
      memorials={memorials}
      {...feed}
      {...postInteractions}
      onSelectMemorial={(id) => navigate(`/memorial/${id}`)}
      onCreate={(type) => navigate(`/create-memorial?type=${type || 'person'}`)}
      onProfile={() => navigate('/profile')}
      onOpenMenu={() => setIsMenuOpen(true)}
    />
  );
}

export function ConnectedTheSky() {
  const { memorials, skyTargetId, setIsMenuOpen, handleAddMemorial, handleDeleteMemorial } = useApp();
  const { user } = useApp();
  const navigate = useNavigate();

  return (
    <TheSky 
      memorials={memorials}
      targetMemorialId={skyTargetId}
      currentUserId={user?.id}
      onOpenMenu={() => setIsMenuOpen(true)}
      onSelectMemorial={(id) => navigate(`/memorial/${id}`)}
      onDeleteMemorial={handleDeleteMemorial}
      onAddMemorial={(m) => {
        if (!user) {
          navigate('/login');
          return;
        }
        handleAddMemorial(m);
      }}
    />
  );
}

export function ConnectedMyMemorials() {
  const { memorials, user, setIsMenuOpen, handleDeleteMemorial, setSkyTargetId } = useApp();
  const navigate = useNavigate();

  // Só os memoriais criados pelo próprio usuário (antes mostrava os de todo mundo)
  const myMemorials = memorials.filter((m) => m.createdBy === user?.id);

  return (
    <MyMemorials 
      memorials={myMemorials} 
      onBack={() => navigate('/feed')}
      onEdit={(id) => navigate(`/memorial/${id}/edit`)}
      onDelete={handleDeleteMemorial}
      onLocate={(id) => {
        setSkyTargetId(id);
        navigate('/the-sky');
      }}
      onCreate={() => navigate('/create-memorial?type=person')}
      onOpenMenu={() => setIsMenuOpen(true)}
    />
  );
}

export function ConnectedPets() {
  const { memorials, user, memorialsLoading, setIsMenuOpen } = useApp();
  const navigate = useNavigate();

  // Só os memoriais de pet criados pelo próprio usuário
  const myPets = memorials.filter((m) => m.type === 'pet' && m.createdBy === user?.id);

  return (
    <Pets
      pets={myPets}
      loading={memorialsLoading}
      onOpenMenu={() => setIsMenuOpen(true)}
      onCreate={() => navigate('/create-memorial?type=pet')}
      onOpen={(id) => navigate(`/memorial/${id}`)}
      onEdit={(id) => navigate(`/memorial/${id}/edit`)}
    />
  );
}

export function ConnectedInvites() {
  const { setIsMenuOpen } = useApp();
  return <Invites onOpenMenu={() => setIsMenuOpen(true)} />;
}

export function ConnectedSettings() {
  const { handleLogout } = useApp();
  const navigate = useNavigate();
  return <Settings onBack={() => navigate('/profile')} onLogout={handleLogout} />;
}

export function ConnectedProfile() {
  const { handleLogout, memorials } = useApp();
  const { setIsMenuOpen } = useApp();
  const navigate = useNavigate();
  return (
    <Profile 
      onLogout={handleLogout} 
      onOpenMenu={() => setIsMenuOpen(true)}
      onSettings={() => navigate('/settings')}
      memorials={memorials}
    />
  );
}

/**
 * Mostrado quando o memorial da URL não existe ou o usuário não tem acesso a
 * ele (memoriais privados não chegam do banco por causa da RLS). De propósito
 * não diferencia os dois casos, para não revelar que um memorial privado existe.
 */
function MemorialUnavailable({ loading }: { loading: boolean }) {
  const navigate = useNavigate();
  if (loading) {
    return (
      <div role="status" className="h-full flex items-center justify-center text-white/60 text-sm">
        Carregando memorial…
      </div>
    );
  }
  return (
    <div className="h-full flex flex-col items-center justify-center gap-4 px-8 text-center">
      <h1 className="text-lg font-medium text-white">Memorial não encontrado</h1>
      <p className="text-sm text-white/60 leading-relaxed">
        Este memorial não existe ou é privado. Se você foi convidado, peça um novo convite à família.
      </p>
      <button
        type="button"
        onClick={() => navigate('/feed')}
        className="px-5 py-2.5 rounded-xl bg-white/10 border border-white/10 text-sm text-white/80 hover:bg-white/15 transition-colors"
      >
        Voltar ao feed
      </button>
    </div>
  );
}

export function ConnectedMemorialDetail() {
  const { id } = useParams();
  const { memorials, tributes, user, memorialsLoading } = useApp();
  const navigate = useNavigate();
  
  const memorial = useMemo(() => 
    memorials.find(m => m.id === id),
  [memorials, id]);

  const memorialTributes = useMemo(() => 
    tributes.filter(t => t.memorialId === memorial?.id),
  [tributes, memorial]);

  const memorialIds = useMemo(() => (memorial ? [memorial.id] : []), [memorial?.id]);
  const postInteractions = usePostInteractions(memorialIds, user);
  const candle = useCandle(memorial?.id, user);
  const follow = useMemorialFollow(memorial?.id, user);
  const { posts, postsError, onDeletePost } = useMemorialPosts(memorialIds);
  const canPost = !!user && !user.isGuest;

  if (!memorial) return <MemorialUnavailable loading={memorialsLoading} />;

  return (
    <MemorialDetail 
      memorial={memorial}
      tributes={memorialTributes}
      posts={posts}
      postsError={postsError}
      currentUserId={canPost ? user.id : undefined}
      onCreatePost={canPost ? () => navigate(`/memorial/${memorial.id}/nova-publicacao`) : undefined}
      onDeletePost={onDeletePost}
      {...postInteractions}
      {...candle}
      {...follow}
      onBack={() => navigate('/feed')}
      onViewLivingMemory={() => navigate(`/living-memory/${memorial.id}`)}
      onWriteTribute={() => navigate(`/write-tribute/${memorial.id}`)}
      onViewProfile={(userId) => navigate(`/user/${userId}`)}
    />
  );
}

export function ConnectedLivingMemory() {
  const { id } = useParams();
  const { memorials, tributes, user, memorialsLoading } = useApp();
  const navigate = useNavigate();

  const memorial = useMemo(() => memorials.find(m => m.id === id), [memorials, id]);
  const memorialTributes = useMemo(() => tributes.filter(t => t.memorialId === id), [tributes, id]);

  const isAdmin = memorial?.createdBy === user?.id;
  const candle = useCandle(memorial?.id, user);

  if (!memorial) return <MemorialUnavailable loading={memorialsLoading} />;

  return (
    <LivingMemory 
      memorial={memorial}
      tributes={memorialTributes}
      {...candle}
      onBack={() => navigate(`/memorial/${id}`)} 
      isAdmin={isAdmin}
    />
  );
}

export function ConnectedCreateMemorial() {
  const { handleAddMemorial } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialType = (searchParams.get('type') as 'person' | 'pet') || 'person';

  return (
    <CreateMemorial 
      onCancel={() => navigate('/feed')} 
      onFinish={(m) => {
        handleAddMemorial(m);
      }} 
      initialType={initialType} 
    />
  );
}

export function ConnectedEditMemorial() {
  const { id } = useParams();
  const { memorials, user, memorialsLoading, handleUpdateMemorial } = useApp();
  const navigate = useNavigate();

  const memorial = useMemo(() => memorials.find((m) => m.id === id), [memorials, id]);

  if (!memorial) return <MemorialUnavailable loading={memorialsLoading} />;

  // A RLS já impede que outra pessoa salve; aqui só evitamos mostrar o formulário
  if (!user || user.isGuest || memorial.createdBy !== user.id) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 px-8 text-center">
        <h1 className="text-lg font-medium text-white">Sem permissão</h1>
        <p className="text-sm text-white/60 leading-relaxed">
          Apenas quem criou este memorial pode editá-lo.
        </p>
        <button
          onClick={() => navigate(`/memorial/${memorial.id}`)}
          className="px-5 py-2.5 rounded-full bg-white/10 text-white text-sm hover:bg-white/20 transition-colors"
        >
          Ver memorial
        </button>
      </div>
    );
  }

  const save = async ({ photoFile, coverFile, ...values }: EditMemorialChanges) => {
    // Envia só as imagens trocadas; as outras continuam com a URL atual
    const [photo, cover] = await Promise.all([
      photoFile ? api.uploadMedia(photoFile, 'profile') : Promise.resolve(undefined),
      coverFile ? api.uploadMedia(coverFile, 'cover') : Promise.resolve(undefined),
    ]);
    await handleUpdateMemorial(memorial.id, {
      ...values,
      ...(photo ? { photo } : {}),
      ...(cover ? { cover } : {}),
    });
    navigate(`/memorial/${memorial.id}`);
  };

  return (
    <EditMemorial
      memorial={memorial}
      onCancel={() => navigate(-1)}
      onSave={save}
    />
  );
}

export function ConnectedWriteTribute() {
  const { id } = useParams();
  const { memorials, handleAddTribute, user, memorialsLoading } = useApp();
  const navigate = useNavigate();
  
  const memorial = useMemo(() => memorials.find(m => m.id === id), [memorials, id]);

  if (!memorial) return <MemorialUnavailable loading={memorialsLoading} />;

  return (
    <WriteTribute 
       memorialName={memorial.name}
       memorialId={memorial.id}
       currentUser={user} 
       onCancel={() => navigate(`/memorial/${id}`)}
       onFinish={(t) => {
         handleAddTribute(t);
         navigate(`/memorial/${id}`);
       }}
    />
  );
}

export function ConnectedCreatePost() {
  const { id } = useParams();
  const { memorials, user, memorialsLoading } = useApp();
  const navigate = useNavigate();

  const memorial = useMemo(() => memorials.find((m) => m.id === id), [memorials, id]);

  if (!memorial) return <MemorialUnavailable loading={memorialsLoading} />;
  if (!user || user.isGuest) return <Navigate to={`/memorial/${memorial.id}`} replace />;

  return (
    <CreatePost
      memorialName={memorial.name}
      memorialPhoto={memorial.photo}
      onCancel={() => navigate(`/memorial/${memorial.id}`)}
      onPublish={async (caption, files) => {
        await api.createMemorialPost({ memorialId: memorial.id, caption, files, authorName: user.name });
        navigate(`/memorial/${memorial.id}`);
      }}
    />
  );
}

export function ConnectedPublicProfile() {
  const { id } = useParams();
  const { memorials, user } = useApp();
  const navigate = useNavigate();

  if (!id) return <div>Usuário não encontrado</div>;

  return (
    <PublicProfile
      userId={id}
      currentUserId={user?.id}
      memorials={memorials}
      onBack={() => navigate(-1)}
      onSelectMemorial={(memorialId) => navigate(`/memorial/${memorialId}`)}
    />
  );
}

export function ConnectedAcceptInvite() {
  const { code } = useParams();
  const { user } = useApp();
  const navigate = useNavigate();

  if (!code) return <div>Convite não encontrado</div>;

  return (
    <AcceptInvite
      code={code}
      isLoggedIn={!!user && !user.isGuest}
      onGoToLogin={() => navigate('/login')}
      onDone={() => navigate('/feed')}
    />
  );
}

export function ConnectedPeople() {
  const { setIsMenuOpen } = useApp();
  const navigate = useNavigate();

  return (
    <People
      onOpenMenu={() => setIsMenuOpen(true)}
      onViewProfile={(userId) => navigate(`/user/${userId}`)}
    />
  );
}