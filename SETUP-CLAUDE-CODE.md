# Configuração do Claude Code no seu computador

Este projeto já traz a configuração do Claude Code dentro dele:

- `CLAUDE.md`: regras do projeto (lidas automaticamente em toda sessão)
- `.claude/settings.json`: plugins do projeto + permissões (o que o Claude pode fazer sozinho, o que pergunta e o que é bloqueado)

## 1. Instalar dependências e o navegador de testes

```bash
npm install
npx playwright install chromium
npm test
npm run test:e2e
```

## 2. Abrir no Claude Code e aceitar os plugins

Na pasta do projeto, rode `claude`. Ao confiar na pasta, o Claude Code oferece instalar o marketplace
`claude-plugins-official` e os plugins listados em `.claude/settings.json`. Aceite.
Se não aparecer o aviso, instale manualmente:

```
/plugin marketplace add anthropics/claude-plugins-official
/plugin install frontend-design@claude-plugins-official
/plugin install code-review@claude-plugins-official
/plugin install security-guidance@claude-plugins-official
/plugin install context7@claude-plugins-official
/plugin install superpowers@claude-plugins-official
/plugin install supabase@claude-plugins-official
/plugin install github@claude-plugins-official
```

Depois reinicie o Claude Code e confira com `/plugin` e `/mcp`.

## 3. Autenticações (só você pode fazer)

| Integração | O que fazer |
|---|---|
| Supabase MCP | No `/mcp`, selecione `supabase` → Authenticate. O navegador abre para login no Supabase; autorize a organização do projeto. |
| Context7 | Funciona sem login. Opcional: crie uma chave grátis em context7.com para limites maiores. |
| GitHub MCP | Crie um token em github.com → Settings → Developer settings → Fine-grained tokens (acesso só ao repositório do app) e exporte como variável de ambiente **no seu sistema**, nunca em arquivo do projeto: macOS/Linux `export GITHUB_PERSONAL_ACCESS_TOKEN=...` no `~/.zshrc`; Windows `setx GITHUB_PERSONAL_ACCESS_TOKEN "..."`. Reinicie o terminal. Alternativa sem token: instale o `gh` e rode `gh auth login`. |
| Security Guidance | Precisa de Python 3 instalado no computador (os hooks são scripts Python). |

## 4. Proteções já configuradas

- Leitura de `.env*` bloqueada.
- `supabase db reset`, `supabase db push`, `migration repair`, `git push --force`, `rm -rf` bloqueados.
- Ferramentas do Supabase MCP que escrevem (`execute_sql`, `apply_migration`, `deploy_edge_function`…) sempre pedem sua confirmação.
- Criar/pausar/restaurar projeto e apagar/resetar branch do Supabase: bloqueados.
- `npm install`, `git push`: pedem confirmação.

Para ajustes só seus (que não vão para o Git), use `.claude/settings.local.json`.
