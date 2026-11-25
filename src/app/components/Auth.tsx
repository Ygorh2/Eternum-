import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Lock, Eye, EyeOff, User, AtSign, Calendar } from 'lucide-react';
import { supabase } from '/utils/supabase/client';
import { projectId, publicAnonKey } from '/utils/supabase/info';

interface Props {
  onLogin: (method: 'email' | 'google' | 'guest') => void;
}

export function Auth({ onLogin }: Props) {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) {
        console.error('Erro ao fazer login com Google:', error);
        setError('Erro ao conectar com Google. Verifique se o login com Google está ativado no painel do Supabase (Authentication → Providers → Google).');
        setLoading(false);
      }
      // Se não houver erro, o browser será redirecionado — não chamar onLogin aqui
    } catch (err) {
      console.error('Erro inesperado:', err);
      setError('Erro inesperado ao conectar com Google. Tente novamente.');
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Erro ao fazer login:', error);
        if (error.message.includes('Email not confirmed')) {
          setError('Seu email ainda não foi confirmado. Verifique sua caixa de entrada ou tente criar a conta novamente.');
        } else if (error.message.includes('Invalid login credentials')) {
          setError('Email ou senha incorretos. Verifique seus dados e tente novamente.');
        } else if (error.message.includes('Failed to fetch') || error.message.includes('fetch')) {
          setError('Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.');
        } else {
          setError(error.message || 'Erro ao fazer login. Tente novamente.');
        }
        setLoading(false);
      } else if (data.session) {
        onLogin('email');
      }
    } catch (err: any) {
      console.error('Erro inesperado ao fazer login:', err);
      if (err?.message?.includes('fetch') || err?.name === 'TypeError') {
        setError('Não foi possível conectar ao servidor Supabase. Verifique sua conexão.');
      } else {
        setError('Erro inesperado. Tente novamente.');
      }
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !confirmPassword || !displayName || !username || !birthDate) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    setError('');

    const signupViaSDK = async () => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
            username,
            birth_date: birthDate,
          },
        },
      });

      if (error) {
        if (error.message.includes('already registered') || error.message.includes('already been registered')) {
          setError('Este email já está cadastrado. Faça login ou recupere sua senha.');
        } else {
          setError(error.message || 'Erro ao criar conta. Tente novamente.');
        }
        setLoading(false);
        return;
      }

      if (data.session) {
        onLogin('email');
      } else {
        // Email de confirmação enviado
        setError('');
        setMode('login');
        alert('Conta criada! Verifique seu email para confirmar o cadastro, depois faça login.');
        setLoading(false);
      }
    };

    try {
      // Tentar via Edge Function (permite criar conta com email já confirmado)
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      let edgeFunctionFailed = false;

      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-86fee667/signup`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${publicAnonKey}`,
            },
            body: JSON.stringify({ email, password, displayName, username, birthDate }),
            signal: controller.signal,
          }
        );
        clearTimeout(timeout);

        const result = await response.json();

        if (!response.ok) {
          if (result.error?.includes('já está cadastrado')) {
            setError(result.error);
            setLoading(false);
            return;
          }
          // Outros erros da edge function — tentar SDK
          edgeFunctionFailed = true;
        } else {
          // Sucesso via edge function — fazer login
          const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
          if (loginError) {
            setError('Conta criada! Faça login para continuar.');
            setMode('login');
            setLoading(false);
          } else {
            onLogin('email');
          }
          return;
        }
      } catch (fetchErr: any) {
        clearTimeout(timeout);
        console.warn('Edge Function indisponível, usando fallback SDK:', fetchErr?.message);
        edgeFunctionFailed = true;
      }

      if (edgeFunctionFailed) {
        await signupViaSDK();
      }
    } catch (err) {
      console.error('Erro inesperado ao criar conta:', err);
      setError('Erro inesperado. Por favor, tente novamente.');
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Por favor, digite seu email.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      
      if (error) {
        console.error('Erro ao enviar email de recuperação:', error);
        setError('Erro ao enviar email. Por favor, tente novamente.');
        setLoading(false);
      } else {
        setError('');
        alert('Email de recuperação enviado! Verifique sua caixa de entrada.');
        setMode('login');
        setLoading(false);
      }
    } catch (err) {
      console.error('Erro inesperado ao recuperar senha:', err);
      setError('Erro inesperado. Por favor, tente novamente.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-[#0F172A] to-[#1E1B4B]">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo e Título */}
        <div className="text-center mb-8">
          <motion.h1 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-4xl font-serif text-white mb-2"
          >
            Eternum
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-lg text-blue-200/70 font-light"
          >
            Memórias que vivem para sempre
          </motion.p>
        </div>

        {/* Card Principal */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-white/5 backdrop-blur-md rounded-2xl shadow-xl p-8 border border-white/10"
        >
          {/* Botão Google - Primário */}
          <button 
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-4 bg-white/10 border border-white/20 rounded-xl flex items-center justify-center gap-3 text-white font-medium shadow-sm hover:bg-white/15 transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-6"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {loading ? 'Conectando...' : 'Entrar com Google'}
          </button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white/5 text-white/50">ou</span>
            </div>
          </div>

          {/* Formulário de Email */}
          <form onSubmit={mode === 'login' ? handleEmailLogin : mode === 'signup' ? handleSignup : handleForgotPassword} className="space-y-4">
            {mode === 'forgot' && (
              <p className="text-sm text-blue-200/70 mb-4">
                Digite seu email para receber um link de recuperação de senha.
              </p>
            )}

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300/60" size={20} />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {mode !== 'forgot' && (
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300/60" size={20} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="w-full pl-12 pr-12 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-300/60 hover:text-blue-300"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            )}

            {mode === 'signup' && (
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300/60" size={20} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Confirmar Senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  className="w-full pl-12 pr-12 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-300/60 hover:text-blue-300"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            )}

            {mode === 'signup' && (
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300/60" size={20} />
                <input
                  type="text"
                  placeholder="Nome Completo"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={loading}
                  className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            )}

            {mode === 'signup' && (
              <div className="relative">
                <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300/60" size={20} />
                <input
                  type="text"
                  placeholder="Nome de Usuário"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                  className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            )}

            {mode === 'signup' && (
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300/60" size={20} />
                <input
                  type="date"
                  placeholder="Data de Nascimento"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  disabled={loading}
                  className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed [color-scheme:dark]"
                />
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-200">
                {error}
              </div>
            )}

            {mode === 'login' && (
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-white/20 bg-white/5 text-blue-500 focus:ring-blue-500/50"
                  />
                  <span className="text-sm text-blue-200/70">Manter conectado</span>
                </label>
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="text-sm text-blue-300 hover:text-blue-200"
                >
                  Esqueceu a senha?
                </button>
              </div>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600/30 border border-blue-500/40 text-blue-100 rounded-xl font-medium shadow-xl shadow-blue-900/30 hover:bg-blue-600/40 hover:shadow-blue-900/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Carregando...' : 
               mode === 'login' ? 'Entrar com conta Eternum' : 
               mode === 'signup' ? 'Criar conta Eternum' :
               'Enviar link de recuperação'}
            </button>
          </form>

          {/* Links de navegação */}
          <div className="mt-6 text-center space-y-2">
            {mode === 'login' && (
              <p className="text-sm text-blue-200/60">
                Não tem uma conta?{' '}
                <button
                  onClick={() => {
                    setMode('signup');
                    setError('');
                  }}
                  className="text-blue-300 hover:text-blue-200 font-medium"
                >
                  Criar conta Eternum
                </button>
              </p>
            )}
            {(mode === 'signup' || mode === 'forgot') && (
              <button
                onClick={() => {
                  setMode('login');
                  setError('');
                }}
                className="text-sm text-blue-200/60 hover:text-blue-200"
              >
                ← Voltar para login
              </button>
            )}
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center text-xs text-blue-200/40 mt-6 px-4"
        >
          Ao continuar, você concorda com nossos{' '}
          <a href="#" className="text-blue-300 hover:underline">Termos de Serviço</a>
          {' '}e{' '}
          <a href="#" className="text-blue-300 hover:underline">Política de Privacidade</a>
        </motion.div>
      </motion.div>
    </div>
  );
}