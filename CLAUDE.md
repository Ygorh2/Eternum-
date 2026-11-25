# CLAUDE.md — Eternum (Memorial App)

Guia para o Claude Code neste projeto. Responda ao usuário **em português**.

## Visão geral

Eternum é um app de memoriais on-line para pessoas e pets (feed, memoriais, galeria, homenagens, velas, convites, "O Céu", Memória Viva).
É um **web app mobile-first** (exportado do Figma Make). **Não** é Expo nem React Native: não sugira ferramentas de RN (Expo, EAS, NativeWind, Maestro, React Native Testing Library) a menos que o usuário decida migrar.

## Stack

- React 18 + TypeScript (TSX) + Vite 6 (`vite.config.ts`, alias `@` → `src/`)
- Tailwind CSS 4 (`@tailwindcss/vite`) + componentes shadcn/ui sobre Radix (`src/app/components/ui/`)
- React Router 7 (`createBrowserRouter` em `src/router.tsx`)
- `motion` (animações), `lucide-react` (ícones), `sonner` (toasts), `date-fns`, `leaflet`
- Supabase: Auth, Postgres com RLS, Storage (bucket `memorial-media`) e uma Edge Function Hono (`make-server-86fee667`)
- Testes: Vitest + Testing Library (unitários/componentes) e Playwright (E2E)
- MUI (`@mui/*`) está no package.json mas não é usado em `src/`. Não remova sem autorização; não introduza novos usos.

## Organização dos arquivos

```
src/
  main.tsx, router.tsx           entrada e rotas
  app/App.tsx                    providers (AuthProvider + RouterProvider)
  app/Layout.tsx                 estado global (memoriais, tributos, usuário) via Outlet context
  app/ConnectedComponents.tsx    "containers": ligam o contexto/API às telas + ProtectedRoute
  app/components/*.tsx           telas e componentes de apresentação
  app/components/ui/*            shadcn/ui (gerado; evite editar sem necessidade)
  app/contexts/AuthContext.tsx   sessão do Supabase
  app/data/api.ts                TODA chamada ao Supabase (tabelas e storage) fica aqui
  app/data/mockData.ts           dados de exemplo ainda usados em partes não migradas
  app/utils/                     utilitários puros (dateUtils, featureFlags)
  styles/                        tema e Tailwind
  test/setup.ts                  setup do Vitest
utils/supabase/                  cliente Supabase (info.tsx é AUTOGERADO pelo Figma Make)
supabase/migrations/             SQL 0001..0004 (aplicados manualmente no SQL Editor)
supabase/functions/server/       Edge Function (Deno + Hono)
e2e/                             testes Playwright
```

## Padrões de desenvolvimento

- Mudanças pequenas e focadas. Não altere a arquitetura (Layout + Connected* + api.ts) sem autorização.
- Novas chamadas ao banco: crie uma função em `src/app/data/api.ts` e consuma a partir de `ConnectedComponents.tsx`/`Layout.tsx`. Componentes de tela não importam `supabase` diretamente.
- Datas "só dia" (`YYYY-MM-DD`): use sempre `parseLocalDate`/`formatDate` de `src/app/utils/dateUtils.ts` (evita o bug de mostrar um dia antes no fuso do Brasil).
- Textos da interface em português do Brasil.
- Antes de adicionar dependência, peça autorização ao usuário e explique o motivo.
- Não exclua arquivos nem dependências sem autorização.
- Para documentação atualizada de bibliotecas (React Router 7, Tailwind 4, Supabase, Vite), use o MCP **Context7**.

## Diretrizes de interface

- Mobile-first: projete para ~390px de largura e verifique em desktop.
- Reaproveite os componentes de `components/ui` (Button, Dialog, Sheet, Tabs…) e os tokens de `styles/theme.css` antes de criar estilos novos.
- Estilize com classes Tailwind; evite CSS inline e posicionamento absoluto quando flex/grid resolvem.
- Tom visual sereno e respeitoso (tema de luto): animações suaves com `motion`, nada chamativo.
- Acessibilidade: elementos clicáveis devem ser `<button>`/`<a>` ou ter `role` e `aria-label`; contraste adequado; textos alternativos em imagens.
- Use o skill **frontend-design** para telas novas ou redesenhos.

## Supabase — boas práticas

- Cliente único em `utils/supabase/client.tsx` com a chave **anon/publishable** (pública por natureza; a segurança vem do RLS).
- **Nunca** use a `service_role` key no frontend. Ela só existe como secret da Edge Function (`Deno.env`).
- **Nunca altere o banco (schema, dados, policies, storage, edge functions) sem autorização explícita do usuário.** Ferramentas MCP que escrevem (`execute_sql`, `apply_migration`, `deploy_edge_function`) estão configuradas para pedir confirmação; operações de projeto destrutivas estão bloqueadas.
- Mudanças de schema: escreva um novo arquivo `supabase/migrations/000N_descricao.sql` (idempotente: `if not exists`, `drop policy if exists`), mostre ao usuário e espere ele aplicar/autorizar. Nunca edite migrations já aplicadas.
- Toda tabela nova: `enable row level security` + policies explícitas. Nunca desative RLS nem crie policy `using (true)` para escrita para "facilitar".
- Use `get_advisors` (security/performance) do MCP do Supabase depois de mudanças de schema.
- Policies atuais: leitura pública em memorials/tributes/candles/profiles/follows; escrita só do dono (`auth.uid()`); invites só do dono.

## Segurança

- Não leia nem exiba arquivos `.env*`. Não escreva tokens, senhas ou chaves em código, commits, logs ou mensagens.
- Valide entradas do usuário; não use `dangerouslySetInnerHTML` com conteúdo do usuário.
- Uploads: valide tipo e tamanho no cliente e confie nas policies do Storage.
- Edge Functions: valide JWT/autorização antes de operar com service_role.
- O plugin **security-guidance** avisa sobre padrões inseguros; leve os avisos a sério.

## Testes

```bash
npm test               # Vitest (unitários e componentes), uma execução
npm run test:watch     # Vitest em modo watch
npm run test:e2e       # Playwright (sobe o Vite sozinho em :5173)
npm run test:all       # ambos
npm run build          # build de produção (checagem rápida de que nada quebrou)
```

- Testes unitários ficam ao lado do arquivo: `Foo.tsx` → `Foo.test.tsx`. O Vitest roda no fuso `America/Sao_Paulo`.
- Ao corrigir um bug, primeiro escreva um teste que falha e reproduz o bug (TDD), depois corrija.
- Em testes de componente, mocke `src/app/data/api.ts` (`vi.mock`) — testes **não** podem chamar o Supabase real.
- E2E não pode criar/alterar dados no Supabase de produção. Use apenas fluxos de leitura, ou um projeto/branch de teste autorizado.
- Primeira vez no computador: `npx playwright install chromium`.

## Revisão de código

Antes de considerar uma tarefa concluída:
1. `npm test` e `npm run build` passam.
2. Rode `/code-review` (plugin code-review) no diff ou PR; para mudanças em auth, RLS, storage ou edge functions, rode também `/security-review`.
3. Confira: sem segredos no diff, sem RLS enfraquecido, sem dependência nova não autorizada, textos em pt-BR, layout ok em mobile.
4. Descreva ao usuário o que mudou e como testar.

## Fluxo de trabalho

- Bugs: investigue a causa antes de corrigir (skill systematic-debugging do Superpowers) e confirme com teste.
- Features maiores: apresente um plano curto e espere aprovação antes de implementar.
- Ainda não há repositório Git remoto; o código chega por .zip. Quando houver, trabalhe em branches e abra PRs.
