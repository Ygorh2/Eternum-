import React from 'react';
import { ArrowLeft, Flag, Loader2, ShieldAlert } from 'lucide-react';
import type { AdminReport, ReportStatus } from '../data/api';
import { REPORT_TARGET_LABELS, reportReasonLabel } from '../utils/reports';

export type ReportsFilter = ReportStatus | 'all';

interface Props {
  /** null = ainda conferindo se é administrador. */
  isAdmin: boolean | null;
  reports: AdminReport[];
  loading: boolean;
  error?: string | null;
  filter: ReportsFilter;
  onFilterChange: (filter: ReportsFilter) => void;
  /** Id da denúncia sendo atualizada agora. */
  updatingId?: string | null;
  onSetStatus: (reportId: string, status: ReportStatus) => void;
  onOpenMemorial: (memorialId: string) => void;
  onOpenProfile: (userId: string) => void;
  onBack: () => void;
}

const FILTERS: { value: ReportsFilter; label: string }[] = [
  { value: 'pending', label: 'Pendentes' },
  { value: 'reviewed', label: 'Analisadas' },
  { value: 'dismissed', label: 'Descartadas' },
  { value: 'all', label: 'Todas' },
];

const STATUS_LABEL: Record<ReportStatus, string> = {
  pending: 'Pendente',
  reviewed: 'Analisada',
  dismissed: 'Descartada',
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/** Tela do administrador: denúncias recebidas (a RLS só entrega para administradores). */
export function AdminReports({
  isAdmin,
  reports,
  loading,
  error,
  filter,
  onFilterChange,
  updatingId,
  onSetStatus,
  onOpenMemorial,
  onOpenProfile,
  onBack,
}: Props) {
  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-[#0F172A] to-[#1E1B4B] text-white">
      <div className="p-4 flex items-center gap-4 bg-[#0F172A]/80 backdrop-blur-md border-b border-white/10 sticky top-0 z-10">
        <button
          onClick={onBack}
          aria-label="Voltar"
          className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/70"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-medium text-blue-100">Denúncias recebidas</h1>
      </div>

      {isAdmin === null ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={24} className="animate-spin text-white/40" />
        </div>
      ) : !isAdmin ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-white/50">
          <ShieldAlert size={32} className="mb-3" />
          <p className="text-sm">Esta página é só para administradores do Eternum.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 pb-24">
          <div role="tablist" aria-label="Filtrar denúncias" className="flex gap-2 mb-4 overflow-x-auto">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                role="tab"
                aria-selected={filter === f.value}
                onClick={() => onFilterChange(f.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  filter === f.value ? 'bg-blue-500/30 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {error && (
            <p role="alert" className="mb-4 text-xs text-red-300">
              {error}
            </p>
          )}

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 size={24} className="animate-spin text-white/40" />
            </div>
          ) : reports.length === 0 ? (
            <div className="flex flex-col items-center text-center py-12 text-white/40">
              <Flag size={32} className="mb-3" />
              <p className="text-sm">Nenhuma denúncia aqui.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {reports.map((r) => (
                <li key={r.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 text-sm">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="font-medium text-white">
                        {REPORT_TARGET_LABELS[r.targetType] || 'Conteúdo'} · {reportReasonLabel(r.reason)}
                      </p>
                      <p className="text-xs text-white/40">{formatDateTime(r.createdAt)}</p>
                    </div>
                    <span
                      className={`shrink-0 text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full ${
                        r.status === 'pending' ? 'bg-amber-500/20 text-amber-200' : 'bg-white/10 text-white/50'
                      }`}
                    >
                      {STATUS_LABEL[r.status]}
                    </span>
                  </div>

                  {r.contentSnapshot && (
                    <blockquote className="my-2 pl-3 border-l-2 border-white/20 text-white/70 text-xs whitespace-pre-wrap break-words">
                      {r.contentSnapshot}
                    </blockquote>
                  )}
                  {r.details && (
                    <p className="text-xs text-white/60 mb-2 whitespace-pre-wrap break-words">
                      <span className="text-white/40">Relato: </span>
                      {r.details}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/50 mb-3">
                    {r.reportedUserId && (
                      <button
                        type="button"
                        onClick={() => onOpenProfile(r.reportedUserId!)}
                        className="underline hover:text-white/80"
                      >
                        Denunciado: {r.reportedUserName}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onOpenProfile(r.reporterId)}
                      className="underline hover:text-white/80"
                    >
                      Quem denunciou: {r.reporterName}
                    </button>
                    {r.memorialId && (
                      <button
                        type="button"
                        onClick={() => onOpenMemorial(r.memorialId!)}
                        className="underline hover:text-white/80"
                      >
                        Abrir memorial
                      </button>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {r.status !== 'reviewed' && (
                      <button
                        type="button"
                        onClick={() => onSetStatus(r.id, 'reviewed')}
                        disabled={!!updatingId}
                        className="flex-1 py-2 rounded-lg bg-blue-600/80 hover:bg-blue-600 text-xs font-medium transition-colors disabled:opacity-50"
                      >
                        Marcar como analisada
                      </button>
                    )}
                    {r.status !== 'dismissed' && (
                      <button
                        type="button"
                        onClick={() => onSetStatus(r.id, 'dismissed')}
                        disabled={!!updatingId}
                        className="flex-1 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-medium transition-colors disabled:opacity-50"
                      >
                        Descartar
                      </button>
                    )}
                    {r.status !== 'pending' && (
                      <button
                        type="button"
                        onClick={() => onSetStatus(r.id, 'pending')}
                        disabled={!!updatingId}
                        className="py-2 px-3 rounded-lg text-white/50 hover:text-white/80 text-xs transition-colors disabled:opacity-50"
                      >
                        Reabrir
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
