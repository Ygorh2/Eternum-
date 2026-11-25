import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '/utils/supabase/client';
import type { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  userMetadata: {
    display_name?: string;
    username?: string;
    birth_date?: string;
  } | null;
  loading: boolean;
  signOut: () => Promise<void>;
  updateEmail: (newEmail: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userMetadata: null,
  loading: true,
  signOut: async () => {},
  updateEmail: async () => {},
  updatePassword: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userMetadata, setUserMetadata] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar sessão atual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setUserMetadata(session?.user?.user_metadata ?? null);
      setLoading(false);
    });

    // Ouvir mudanças de autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setUserMetadata(session?.user?.user_metadata ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUserMetadata(null);
  };

  const updateEmail = async (newEmail: string) => {
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) throw error;
    // O Supabase envia um email de confirmação para o endereço novo;
    // o email só muda de fato depois que o usuário confirmar o link.
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, userMetadata, loading, signOut, updateEmail, updatePassword }}>
      {children}
    </AuthContext.Provider>
  );
}
