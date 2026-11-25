import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate, useParams, Navigate, useSearchParams } from 'react-router';
import { useApp } from './Layout';
import * as api from './data/api';
import { Feed } from './components/Feed';
import { MemorialDetail } from './components/MemorialDetail';
import { CreateMemorial } from './components/CreateMemorial';
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

export function ConnectedFeed() {
  const { memorials, tributes, user, setIsMenuOpen } = useApp();
  const navigate = useNavigate();
  const isGuest = !user || user.isGuest;

  // Quem o usuário segue (null = ainda carregando)
  const [followingIds, setFollowingIds] = useState<Set<string> | null>(null);
  const [creatorNames, setCreatorNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isGuest) {
      setFollowingIds(new Set());
      return;
    }
    let cancelled = false;
    api
      .fetchFollowingIds(user.id)
      .then((ids) => {
        if (!cancelled) setFollowingIds(ids);
      })
      .catch((err) => {
        console.error('Erro ao carregar quem você segue:', err);
        if (!cancelled) setFollowingIds(new Set());
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, isGuest]);

  // Feed estilo Instagram: só os memoriais que eu criei ou de quem eu sigo.
  // (Visitante, que não tem conta, vê todos para poder explorar.)
  const feedMemorials = useMemo(() => {
    if (isGuest) return memorials;
    if (!followingIds) return [];
    return memorials.filter((m: any) => m.createdBy === user.id || followingIds.has(m.createdBy));
  }, [memorials, followingIds, isGuest, user?.id]);

  // Nomes reais dos autores dos memoriais exibidos
  const creatorIdsKey = useMemo(
    () => Array.from(new Set(feedMemorials.map((m: any) => m.createdBy).filter(Boolean))).sort().join(','),
    [feedMemorials]
  );
  useEffect(() => {
    if (!creatorIdsKey) return;
    let cancelled = false;
    api
      .fetchProfilesByIds(creatorIdsKey.split(','))
      .then((names) => {
        if (!cancelled) setCreatorNames(names);
      })
      .catch((err) => console.error('Erro ao carregar nomes dos autores:', err));
    return () => {
      cancelled = true;
    };
  }, [creatorIdsKey]);

  return (
    <Feed
      memorials={feedMemorials}
      creatorNames={creatorNames}
      tributes={tributes}
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
      onEdit={(id) => navigate(`/memorial/${id}`)} 
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
  const { setIsMenuOpen } = useApp();
  return <Pets onOpenMenu={() => setIsMenuOpen(true)} />;
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

export function ConnectedMemorialDetail() {
  const { id } = useParams();
  const { memorials, tributes } = useApp();
  const navigate = useNavigate();
  
  const memorial = useMemo(() => 
    memorials.find(m => m.id === id) || memorials[0], 
  [memorials, id]);

  const memorialTributes = useMemo(() => 
    tributes.filter(t => t.memorialId === memorial?.id),
  [tributes, memorial]);

  if (!memorial) return <div>Memorial not found</div>;

  return (
    <MemorialDetail 
      memorial={memorial}
      tributes={memorialTributes}
      onBack={() => navigate('/feed')}
      onViewLivingMemory={() => navigate(`/living-memory/${memorial.id}`)}
      onWriteTribute={() => navigate(`/write-tribute/${memorial.id}`)}
      onViewProfile={(userId) => navigate(`/user/${userId}`)}
    />
  );
}

export function ConnectedLivingMemory() {
  const { id } = useParams();
  const { memorials, tributes, user } = useApp();
  const navigate = useNavigate();

  const memorial = useMemo(() => memorials.find(m => m.id === id), [memorials, id]);
  const memorialTributes = useMemo(() => tributes.filter(t => t.memorialId === id), [tributes, id]);

  const isAdmin = memorial?.createdBy === user?.id;

  if (!memorial) return <div>Memorial not found</div>;

  return (
    <LivingMemory 
      memorial={memorial}
      tributes={memorialTributes}
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

export function ConnectedWriteTribute() {
  const { id } = useParams();
  const { memorials, handleAddTribute, user } = useApp();
  const navigate = useNavigate();
  
  const memorial = useMemo(() => memorials.find(m => m.id === id), [memorials, id]);

  if (!memorial) return <div>Memorial not found</div>;

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