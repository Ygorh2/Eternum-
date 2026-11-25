import React, { useEffect, useState } from 'react';
import { Flag, Loader2, HeartHandshake } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import {
  MAX_REPORT_DETAILS,
  REPORT_REASONS,
  REPORT_TARGET_LABELS,
  type ReportReason,
  type ReportTarget,
} from '../utils/reports';

interface Props {
  /** O que está sendo denunciado; null = fechado. */
  target: ReportTarget | null;
  onClose: () => void;
  /** Envia a denúncia. Deve rejeitar (throw) com uma mensagem em caso de erro. */
  onSubmit: (target: ReportTarget, reason: ReportReason, details: string) => Promise<void>;
}

const TARGET_TEXT: Record<ReportTarget['type'], string> = {
  memorial: 'este memorial',
  tribute: 'esta homenagem',
  post: 'esta publicação',
  comment: 'este comentário',
  user: 'este perfil',
};

/** Janela para denunciar um conteúdo: motivo + texto opcional. */
export function ReportDialog({ target, onClose, onSubmit }: Props) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  // Começa limpo a cada nova denúncia
  useEffect(() => {
    if (!target) return;
    setReason(null);
    setDetails('');
    setError(null);
    setSent(false);
  }, [target?.type, target?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target || !reason || sending) return;
    setSending(true);
    setError(null);
    try {
      await onSubmit(target, reason, details.trim());
      setSent(true);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível enviar a denúncia. Tente de novo.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={!!target} onOpenChange={(open) => !open && !sending && onClose()}>
      <DialogContent className="bg-[#1E293B] text-white border-white/10 max-h-[90vh] overflow-y-auto">
        {target && sent ? (
          <div className="flex flex-col items-center text-center gap-3 py-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/15 text-emerald-300 flex items-center justify-center">
              <HeartHandshake size={24} />
            </div>
            <DialogTitle className="text-lg font-serif">Obrigado por avisar</DialogTitle>
            <DialogDescription className="text-white/60 text-sm">
              Sua denúncia foi enviada e será analisada com cuidado. A pessoa denunciada não sabe quem denunciou.
            </DialogDescription>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-sm font-medium transition-colors"
            >
              Fechar
            </button>
          </div>
        ) : target ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <DialogHeader className="text-left">
              <DialogTitle className="flex items-center gap-2 text-lg font-serif">
                <Flag size={18} className="text-red-300" />
                Denunciar {REPORT_TARGET_LABELS[target.type].toLowerCase()}
              </DialogTitle>
              <DialogDescription className="text-white/60 text-sm">
                Por que você está denunciando {TARGET_TEXT[target.type]}? Sua denúncia é anônima para a pessoa denunciada.
              </DialogDescription>
            </DialogHeader>

            <fieldset className="flex flex-col gap-2">
              <legend className="sr-only">Motivo</legend>
              {REPORT_REASONS.map((r) => (
                <label
                  key={r.value}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm cursor-pointer transition-colors ${
                    reason === r.value
                      ? 'bg-blue-500/15 border-blue-400/40 text-white'
                      : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
                  }`}
                >
                  <input
                    type="radio"
                    name="report-reason"
                    value={r.value}
                    checked={reason === r.value}
                    onChange={() => setReason(r.value)}
                    className="accent-blue-400"
                  />
                  {r.label}
                </label>
              ))}
            </fieldset>

            {reason === 'self_harm' && (
              <p className="text-xs text-amber-100 bg-amber-500/10 border border-amber-400/30 rounded-lg px-3 py-2">
                Se alguém corre risco agora, ligue para o CVV no 188 (24 horas, gratuito) ou para o SAMU no 192.
              </p>
            )}

            <div>
              <label htmlFor="report-details" className="text-xs text-white/60 block mb-1">
                Quer contar mais? (opcional)
              </label>
              <textarea
                id="report-details"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                maxLength={MAX_REPORT_DETAILS}
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-400/50 resize-none"
                placeholder="Descreva o que aconteceu"
              />
              <p className="text-[10px] text-white/30 text-right">
                {details.length}/{MAX_REPORT_DETAILS}
              </p>
            </div>

            {error && (
              <p role="alert" className="text-xs text-red-300">
                {error}
              </p>
            )}

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={sending}
                className="px-4 py-2.5 rounded-xl text-sm text-white/70 hover:bg-white/10 transition-colors disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!reason || sending}
                className="px-5 py-2.5 rounded-xl bg-red-500/80 hover:bg-red-500 text-white text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-40"
              >
                {sending && <Loader2 size={14} className="animate-spin" />}
                Enviar denúncia
              </button>
            </div>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
