import React, { useState, useEffect } from 'react';
import { Loader2, Check, X, Mail } from 'lucide-react';
import * as api from '../data/api';

interface Props {
  code: string;
  isLoggedIn: boolean;
  onGoToLogin: () => void;
  onDone: () => void;
}

export function AcceptInvite({ code, isLoggedIn, onGoToLogin, onDone }: Props) {
  const [status, setStatus] = useState<'checking' | 'ready' | 'accepting' | 'done' | 'error'>('checking');
  const [error, setError] = useState('');
  const [inviterName, setInviterName] = useState('');

  useEffect(() => {
    let cancelled = false;
    api
      .getInvitePreview(code)
      .then((preview) => {
        if (cancelled) return;
        if (preview.status !== 'pending') {
          setError('Este convite já foi utilizado.');
          setStatus('error');
          return;
        }
        setInviterName(preview.inviterName);
        setStatus('ready');
      })
      .catch((err: any) => {
        if (!cancelled) {
          setError(err?.message || 'Convite não encontrado. Confira se o link ou código está certo.');
          setStatus('error');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  const handleAccept = async () => {
    setStatus('accepting');
    setError('');
    try {
      await api.acceptInvite(code);
      setStatus('done');
    } catch (err: any) {
      setError(err?.message || 'Não foi possível aceitar o convite.');
      setStatus('error');
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center bg-gradient-to-b from-[#0F172A] to-[#1E1B4B] text-white p-8 text-center">
      <div className="w-16 h-16 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center mb-6">
        <Mail size={28} className="text-blue-300" />
      </div>

      {status === 'checking' && <Loader2 size={24} className="animate-spin text-white/40" />}

      {status === 'ready' && (
        <>
          <h1 className="text-xl font-serif text-white mb-2">Você foi convidado</h1>
          <p className="text-sm text-white/60 mb-8">
            <span className="text-blue-300 font-medium">{inviterName}</span> quer se conectar com você
            no Eternum.
          </p>

          {!isLoggedIn ? (
            <button
              onClick={onGoToLogin}
              className="w-full max-w-xs py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-colors"
            >
              Entrar para aceitar
            </button>
          ) : (
            <button
              onClick={handleAccept}
              className="w-full max-w-xs py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-colors"
            >
              Aceitar convite
            </button>
          )}
        </>
      )}

      {status === 'accepting' && (
        <div className="flex items-center gap-2 text-white/60">
          <Loader2 size={20} className="animate-spin" /> Aceitando convite...
        </div>
      )}

      {status === 'done' && (
        <>
          <div className="w-14 h-14 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center mb-4">
            <Check size={24} className="text-green-400" />
          </div>
          <h1 className="text-xl font-serif text-white mb-2">Convite aceito!</h1>
          <p className="text-sm text-white/60 mb-8">
            Você e <span className="text-blue-300 font-medium">{inviterName}</span> agora se seguem no Eternum.
          </p>
          <button
            onClick={onDone}
            className="w-full max-w-xs py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-colors"
          >
            Ir para o feed
          </button>
        </>
      )}

      {status === 'error' && (
        <>
          <div className="w-14 h-14 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center mb-4">
            <X size={24} className="text-red-400" />
          </div>
          <p className="text-sm text-red-300 mb-8">{error}</p>
          <button
            onClick={onDone}
            className="w-full max-w-xs py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-colors"
          >
            Voltar
          </button>
        </>
      )}
    </div>
  );
}
