import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Lock, Eye, EyeOff, User, ArrowLeft } from 'lucide-react';
import { supabase } from '/utils/supabase/client';
import { projectId, publicAnonKey } from '/utils/supabase/info';

interface Props {
  onSignup: () => void;
  onBackToLogin: () => void;
}

export function Signup({ onSignup, onBackToLogin }: Props) {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !email || !password || !confirmPassword) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Criar usuário através do servidor
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-86fee667/signup`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ email, password }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        console.error('Erro ao criar conta:', result);
        setError(result.error || 'Erro ao criar conta. Por favor, tente novamente.');
        setLoading(false);
      } else {
        console.log('Conta criada com sucesso:', result.user.email);
        // Fazer login automaticamente
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) {
          console.error('Erro ao fazer login após criação:', error);
          setError('Conta criada! Por favor, faça login.');
          setLoading(false);
        } else {
          onSignup();
        }
      }
    } catch (err) {
      console.error('Erro inesperado ao criar conta:', err);
      setError('Erro inesperado. Por favor, tente novamente.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-purple-50 to-white">
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
            className="text-4xl font-serif text-gray-800 mb-2"
          >
            Eternum
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-lg text-gray-600 font-light"
          >
            Crie sua conta
          </motion.p>
        </div>

        {/* Card Principal */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-gray-100"
        >
          <button
            onClick={onBackToLogin}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6 transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Voltar para login</span>
          </button>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Nome completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Senha (mínimo 6 caracteres)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full pl-12 pr-12 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                disabled={loading}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Confirmar senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {error}
              </div>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-medium shadow-lg hover:shadow-xl hover:from-blue-600 hover:to-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Criando conta...' : 'Criar conta Eternum'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Já tem uma conta?{' '}
              <button
                onClick={onBackToLogin}
                className="text-blue-500 hover:text-blue-600 font-medium"
              >
                Fazer login
              </button>
            </p>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center text-xs text-gray-500 mt-6 px-4"
        >
          Ao criar uma conta, você concorda com nossos{' '}
          <a href="#" className="text-blue-500 hover:underline">Termos de Serviço</a>
          {' '}e{' '}
          <a href="#" className="text-blue-500 hover:underline">Política de Privacidade</a>
        </motion.div>
      </motion.div>
    </div>
  );
}