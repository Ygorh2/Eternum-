import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Menu, Search, User, Loader2, UserPlus, UserMinus } from 'lucide-react';
import * as api from '../data/api';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  onOpenMenu: () => void;
  onViewProfile: (userId: string) => void;
}

export function People({ onOpenMenu, onViewProfile }: Props) {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [people, setPeople] = useState<any[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError('');

    const timeout = setTimeout(() => {
      api
        .searchProfiles(query)
        .then((results) => {
          if (cancelled) return;
          setPeople(results);
        })
        .catch((err) => {
          console.error('Erro ao buscar pessoas:', err);
          if (!cancelled) setError('Não foi possível buscar pessoas.');
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });
    }, 300); // pequeno debounce pra não buscar a cada tecla

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [query]);

  // Carrega quem o usuário já segue (uma vez, na entrada da tela)
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    api
      .fetchFollowingIds(user.id)
      .then((ids) => {
        if (!cancelled) setFollowingIds(ids);
      })
      .catch((err) => console.error('Erro ao carregar quem você já segue:', err));
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const handleToggleFollow = async (userId: string) => {
    setTogglingId(userId);
    try {
      if (followingIds.has(userId)) {
        await api.unfollowUser(userId);
        setFollowingIds((prev) => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
      } else {
        await api.followUser(userId);
        setFollowingIds((prev) => new Set(prev).add(userId));
      }
    } catch (err) {
      console.error('Erro ao seguir/deixar de seguir:', err);
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="h-full flex flex-col bg-transparent text-white">
      {/* Header */}
      <div className="bg-[#0F172A]/80 backdrop-blur-md px-6 py-4 sticky top-0 z-10 shadow-lg border-b border-white/10 flex items-center gap-4">
        <button onClick={onOpenMenu} className="p-2 -ml-2 text-white/70 hover:text-white transition-colors">
          <Menu size={24} />
        </button>
        <h1 className="text-xl font-serif text-blue-100">Buscar Pessoas</h1>
      </div>

      <div className="p-6 pb-2">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome ou @usuário"
            className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/50"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 pt-2 space-y-3 pb-24">
        {error && <p className="text-sm text-red-300 text-center py-4">{error}</p>}

        {isLoading ? (
          <div className="flex items-center justify-center py-10 text-white/40">
            <Loader2 size={24} className="animate-spin" />
          </div>
        ) : people.length === 0 ? (
          <p className="text-center text-white/30 text-sm py-10">
            {query ? 'Ninguém encontrado com esse nome.' : 'Nenhuma outra pessoa cadastrada ainda.'}
          </p>
        ) : (
          people.map((person, index) => {
            const isFollowing = followingIds.has(person.id);
            return (
              <motion.div
                key={person.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-3"
              >
                <button
                  onClick={() => onViewProfile(person.id)}
                  className="flex items-center gap-3 flex-1 text-left min-w-0"
                >
                  <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                    <User size={18} className="text-white/40" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-white truncate">{person.displayName}</p>
                    {person.username && <p className="text-xs text-white/40 truncate">@{person.username}</p>}
                  </div>
                </button>

                <button
                  onClick={() => handleToggleFollow(person.id)}
                  disabled={togglingId === person.id}
                  className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 flex-shrink-0 transition-colors disabled:opacity-60 ${
                    isFollowing
                      ? 'bg-white/10 text-white border border-white/20 hover:bg-red-500/10 hover:text-red-300'
                      : 'bg-blue-600 hover:bg-blue-500 text-white'
                  }`}
                >
                  {togglingId === person.id ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : isFollowing ? (
                    <>
                      <UserMinus size={14} /> Seguindo
                    </>
                  ) : (
                    <>
                      <UserPlus size={14} /> Seguir
                    </>
                  )}
                </button>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
