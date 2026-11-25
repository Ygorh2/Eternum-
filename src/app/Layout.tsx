import React, { useState, useEffect, useMemo } from 'react';
import { Outlet, useLocation, useNavigate, useOutletContext } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { SideMenu } from './components/SideMenu';
import { useAuth } from './contexts/AuthContext';
import * as api from './data/api';

export type AppContextType = {
  user: any;
  authLoading: boolean;
  memorials: any[];
  setMemorials: React.Dispatch<React.SetStateAction<any[]>>;
  memorialsLoading: boolean;
  memorialsError: string | null;
  tributes: any[];
  setTributes: React.Dispatch<React.SetStateAction<any[]>>;
  isMenuOpen: boolean;
  setIsMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  skyTargetId: string | null;
  setSkyTargetId: React.Dispatch<React.SetStateAction<string | null>>;
  handleLogin: (method: 'email' | 'google' | 'guest') => void;
  handleLogout: () => void;
  handleAddMemorial: (m: any) => void;
  handleDeleteMemorial: (id: string) => void;
  handleUpdateMemorial: (id: string, changes: any) => Promise<any>;
  handleAddTribute: (t: any) => void;
  /** Notificações não lidas (sininho). */
  unreadNotifications: number;
  setUnreadNotifications: React.Dispatch<React.SetStateAction<number>>;
  refreshUnreadNotifications: () => void;
  /** Muda sempre que chega uma notificação nova (Realtime), para a tela recarregar. */
  notificationsVersion: number;
  /** Recarrega memoriais e homenagens (ex.: depois de bloquear/desbloquear alguém). */
  reloadData: () => void;
};

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Auth real (Supabase) — fonte única de verdade sobre quem está logado
  const { user: authUser, userMetadata, loading: authLoading, signOut } = useAuth();
  const [isGuest, setIsGuest] = useState(false);

  // Normaliza o usuário do Supabase (ou o modo convidado) para o formato usado pelas telas
  const user = useMemo(() => {
    if (isGuest) return { id: 'guest', name: 'Visitante', isGuest: true };
    if (!authUser) return null;
    return {
      id: authUser.id,
      name: userMetadata?.display_name || authUser.email?.split('@')[0] || 'Usuário',
      username: userMetadata?.username,
      email: authUser.email,
      avatar: '',
      isGuest: false,
    };
  }, [authUser, userMetadata, isGuest]);

  // State
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [skyTargetId, setSkyTargetId] = useState<string | null>(null);

  // Lifted State — agora vem do Supabase, não mais do localStorage
  const [memorials, setMemorials] = useState<any[]>([]);
  const [tributes, setTributes] = useState<any[]>([]);
  const [memorialsLoading, setMemorialsLoading] = useState(true);
  const [memorialsError, setMemorialsError] = useState<string | null>(null);
  const [dataVersion, setDataVersion] = useState(0);
  const reloadData = React.useCallback(() => setDataVersion((v) => v + 1), []);

  // Carrega memoriais e tributos do banco. A RLS decide o que cada pessoa vê:
  // visitante só recebe memoriais públicos; logado recebe também os privados
  // a que tem acesso. Por isso recarrega quando a sessão muda (login/logout).
  const authUserId = authUser?.id ?? null;
  useEffect(() => {
    if (authLoading) return; // espera saber quem está logado
    let cancelled = false;

    async function loadData() {
      setMemorialsLoading(true);
      setMemorialsError(null);
      try {
        const [dbMemorials, dbTributes] = await Promise.all([
          api.fetchMemorials(),
          api.fetchTributes(),
        ]);
        if (!cancelled) {
          setMemorials(dbMemorials);
          setTributes(dbTributes);
        }
      } catch (err: any) {
        console.error('Erro ao carregar dados do Supabase:', err);
        if (!cancelled) {
          setMemorialsError(err?.message || 'Não foi possível carregar os memoriais.');
        }
      } finally {
        if (!cancelled) setMemorialsLoading(false);
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, [authLoading, authUserId, dataVersion]);

  // Notificações: contador do sininho + aviso em tempo real (Supabase Realtime)
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [notificationsVersion, setNotificationsVersion] = useState(0);
  const unreadRequest = React.useRef(0);
  const refreshUnreadNotifications = React.useCallback(() => {
    if (!authUserId) {
      setUnreadNotifications(0);
      return;
    }
    const requestId = ++unreadRequest.current;
    api
      .countUnreadNotifications()
      .then((count) => {
        if (requestId === unreadRequest.current) setUnreadNotifications(count);
      })
      .catch((err) => console.error('Erro ao contar notificações:', err));
  }, [authUserId]);

  useEffect(() => {
    if (authLoading) return;
    refreshUnreadNotifications();
    if (!authUserId) return;
    const unsubscribe = api.subscribeToNotifications(authUserId, () => {
      refreshUnreadNotifications();
      setNotificationsVersion((v) => v + 1);
    });
    // Ao voltar para a aba, confere de novo (caso o Realtime tenha caído)
    const onFocus = () => refreshUnreadNotifications();
    window.addEventListener('focus', onFocus);
    return () => {
      unsubscribe();
      window.removeEventListener('focus', onFocus);
    };
  }, [authLoading, authUserId, refreshUnreadNotifications]);

  // Handlers
  const handleLogin = (method: 'email' | 'google' | 'guest') => {
    if (method === 'guest') {
      setIsGuest(true);
      navigate('/feed');
      return;
    }
    // Para 'email', a sessão já foi criada pelo Auth.tsx via supabase.auth;
    // o listener do AuthContext atualiza authUser sozinho. 'google' faz um
    // redirect externo, então o efeito abaixo cuida da navegação na volta.
    navigate('/feed');
  };

  const handleLogout = async () => {
    setIsGuest(false);
    await signOut();
    navigate('/login');
  };

  // Se já existe uma sessão válida (ex: voltando do redirect do Google, ou
  // reabrindo o app com sessão salva) e o usuário está em uma tela pública,
  // manda direto para o feed.
  useEffect(() => {
    if (!authLoading && authUser && (location.pathname === '/' || location.pathname === '/login')) {
      navigate('/feed', { replace: true });
    }
  }, [authLoading, authUser, location.pathname]);

  const handleAddMemorial = async (newMemorial: any) => {
    if (!user || user.isGuest) {
      setMemorialsError('Você precisa estar logado (não como Visitante) para criar um memorial.');
      return;
    }
    try {
      const saved = await api.createMemorial(newMemorial);
      setMemorials((prev: any[]) => [saved, ...prev]);
      navigate('/feed');
    } catch (err: any) {
      console.error('Erro ao criar memorial:', err);
      setMemorialsError(err?.message || 'Não foi possível salvar o memorial.');
    }
  };

  const handleDeleteMemorial = async (id: string) => {
    const previous = memorials;
    // Otimista: remove da tela na hora, desfaz se der erro
    setMemorials(memorials.filter((m: any) => m.id !== id));
    try {
      await api.deleteMemorial(id);
    } catch (err: any) {
      console.error('Erro ao apagar memorial:', err);
      setMemorials(previous);
      setMemorialsError(err?.message || 'Não foi possível apagar o memorial.');
    }
  };

  /** Salva a edição no banco e atualiza a lista local. Rejeita em caso de erro. */
  const handleUpdateMemorial = async (id: string, changes: any) => {
    if (!user || user.isGuest) {
      throw new Error('Você precisa estar logado para editar um memorial.');
    }
    const saved = await api.updateMemorial(id, changes);
    // Mantém campos que só existem na tela (ex.: galeria) e aplica os do banco
    setMemorials((prev: any[]) => prev.map((m) => (m.id === id ? { ...m, ...saved } : m)));
    return saved;
  };

  const handleAddTribute = async (newTribute: any) => {
    if (!user || user.isGuest) {
      setMemorialsError('Você precisa estar logado (não como Visitante) para deixar um tributo.');
      return;
    }
    try {
      const saved = await api.createTribute(newTribute);
      setTributes((prev: any[]) => [saved, ...prev]);
    } catch (err: any) {
      console.error('Erro ao salvar tributo:', err);
      setMemorialsError(err?.message || 'Não foi possível salvar o tributo.');
    }
  };

  const isAuthView = location.pathname === '/login' || location.pathname === '/';

  const contextValue: AppContextType = {
    user,
    authLoading,
    memorials,
    setMemorials,
    memorialsLoading,
    memorialsError,
    tributes,
    setTributes,
    isMenuOpen,
    setIsMenuOpen,
    skyTargetId,
    setSkyTargetId,
    handleLogin,
    handleLogout,
    handleAddMemorial,
    handleDeleteMemorial,
    handleUpdateMemorial,
    handleAddTribute,
    unreadNotifications,
    setUnreadNotifications,
    refreshUnreadNotifications,
    notificationsVersion,
    reloadData,
  };

  // Convert pathname to view ID for SideMenu highlighting
  const getCurrentView = () => {
    const path = location.pathname.substring(1); // remove leading slash
    if (path === '') return 'onboarding';
    if (path === 'login') return 'auth';
    if (path.startsWith('memorial/')) return 'memorial';
    if (path === 'create-memorial') return 'create-memorial';
    if (path.startsWith('living-memory')) return 'living-memory';
    if (path.startsWith('write-tribute')) return 'write-tribute';
    if (path === 'the-sky') return 'sky';
    if (path === 'my-memorials') return 'my-memorials';
    return path as any;
  };

  return (
    <div className="min-h-screen w-full bg-stone-900 flex items-center justify-center p-4 md:p-8 font-sans selection:bg-blue-500 selection:text-white">
      <div className="relative w-full max-w-[400px] h-[850px] bg-black rounded-[3rem] shadow-2xl border-8 border-stone-900 overflow-hidden ring-4 ring-stone-900/50">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-black rounded-b-2xl z-50 pointer-events-none"></div>
        <div className="absolute top-2 left-6 text-white text-xs font-medium z-50 mix-blend-difference pointer-events-none">9:41</div>
        <div className="absolute top-2 right-6 flex gap-1 z-50 mix-blend-difference pointer-events-none">
           <div className="w-4 h-2.5 border border-white rounded-[2px]"></div>
           <div className="w-0.5 h-1 bg-white rounded-[1px]"></div>
        </div>

        <div className={`w-full h-full overflow-hidden relative ${isAuthView ? 'bg-gradient-to-b from-[#0F172A] to-[#1E1B4B]' : 'bg-gradient-to-b from-[#0F172A] to-[#1E1B4B]'}`}>
          <AnimatePresence mode="wait">
            <motion.div 
              key={location.pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="h-full w-full overflow-hidden"
            >
              <Outlet context={contextValue} />
            </motion.div>
          </AnimatePresence>

          {/* Only show side menu if not on auth pages */}
          {!isAuthView && (
            <SideMenu 
              isOpen={isMenuOpen} 
              onClose={() => setIsMenuOpen(false)} 
              currentView={getCurrentView()}
              onNavigate={(view) => {
                if (view === 'sky') navigate('/the-sky');
                else navigate(`/${view}`);
              }}
            />
          )}
        </div>
        
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/20 rounded-full z-50 pointer-events-none backdrop-blur-sm mix-blend-difference"></div>
      </div>
    </div>
  );
}

export function useApp() {
  return useOutletContext<AppContextType>();
}
