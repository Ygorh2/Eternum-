-- Etapa 5: convites reais
-- A tela de Convites (Invites.tsx) gera um convite geral do usuário, não
-- vinculado a um memorial específico — então memorial_id precisa ser opcional.

alter table public.invites alter column memorial_id drop not null;
