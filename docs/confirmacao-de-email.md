# Passo a passo: ativar a confirmação de e-mail no Eternum

Depois deste passo a passo, quem criar conta com e-mail e senha precisa clicar num link enviado por e-mail antes de entrar. Assim ninguém consegue se cadastrar com o e-mail de outra pessoa. O login com Google continua igual.

Faça na ordem. Nenhuma chave ou senha vai para o código: a chave do Resend fica só no painel do Supabase.

## 1. Atualizar o código no seu computador

1. Faça o merge do PR "Exigir confirmação de e-mail no cadastro" no GitHub.
2. No Claude Code do seu computador, peça: **"faça git pull da main"**.

## 2. Criar a conta no Resend (envio de e-mails, plano grátis)

O plano grátis do Resend manda até 100 e-mails por dia (3.000 por mês).

1. Acesse **resend.com** e crie uma conta.
2. Escolha o remetente:
   - **Se você tem um domínio** (ex.: `eternum.com.br`): vá em **Domains → Add Domain**, digite o domínio e copie os registros DNS (SPF e DKIM) que ele mostrar para o painel onde você comprou o domínio (Registro.br, Hostinger, GoDaddy…). Espere o status ficar **Verified** (pode levar de minutos a algumas horas).
   - **Se ainda não tem domínio**: dá para testar com o remetente `onboarding@resend.dev`, mas ele **só entrega para o seu próprio e-mail** (o da conta do Resend). Serve para testar, não para usuários de verdade.
3. Vá em **API Keys → Create API Key**, dê um nome (ex.: `supabase-eternum`), permissão **Sending access**, e clique em criar.
4. Copie a chave (começa com `re_`). Ela só aparece uma vez. **Não cole em código, chat ou arquivo**: você vai colá-la direto no Supabase no próximo passo.

## 3. Ligar o SMTP do Resend no Supabase

No painel do Supabase (supabase.com/dashboard), abra o projeto do Eternum:

1. Vá em **Authentication → Emails → SMTP Settings** e ligue **Enable custom SMTP**.
2. Preencha:
   - **Sender email**: `nao-responda@SEU-DOMINIO` (ou `onboarding@resend.dev` só para teste)
   - **Sender name**: `Eternum`
   - **Host**: `smtp.resend.com`
   - **Port**: `465`
   - **Username**: `resend`
   - **Password**: a chave `re_...` que você copiou
3. Clique em **Save**.
4. Em **Authentication → Rate Limits**, confira o limite **"Rate limit for sending emails"**. Com SMTP próprio ele começa em 30 por hora; aumente se precisar (sem passar dos 100 por dia do plano grátis).

## 4. Ligar "Confirm email"

1. Vá em **Authentication → Sign In / Providers → Email**.
2. Ligue **Confirm email** e clique em **Save**.

## 5. Configurar os endereços de retorno (Site URL e Redirect URLs)

O link do e-mail leva a pessoa de volta para a tela `/login` do app, que entra sozinha e abre o feed.

1. Vá em **Authentication → URL Configuration**.
2. **Site URL**: o endereço do app publicado (ex.: `https://seu-app.vercel.app`). Se ainda não publicou, use `http://localhost:5173`.
3. Em **Redirect URLs**, adicione (clique em **Add URL** para cada um):
   - `http://localhost:5173/login`
   - `http://localhost:5173` (usado pelo login com Google)
   - `https://SEU-APP/login` e `https://SEU-APP` quando o app estiver publicado
4. Clique em **Save**.

## 6. (Opcional) E-mail de confirmação em português

Em **Authentication → Emails → Templates → Confirm signup**:

- **Subject**: `Confirme seu e-mail no Eternum`
- **Body** (cole no lugar do texto atual):

```html
<h2>Bem-vindo(a) ao Eternum</h2>
<p>Toque no botão abaixo para confirmar seu e-mail e ativar sua conta.</p>
<p><a href="{{ .ConfirmationURL }}">Confirmar meu e-mail</a></p>
<p>Se você não criou uma conta no Eternum, pode ignorar esta mensagem.</p>
```

Não apague o `{{ .ConfirmationURL }}`: é o link de confirmação.

## 7. Publicar de novo a Edge Function

A função antiga ainda aceita cadastros já confirmados enquanto não for publicada de novo. No Claude Code do seu computador, depois do `git pull`, peça:

> **"faça o deploy da edge function make-server-86fee667"**

Agora o endereço `/signup` dela só responde "desativado" (código 410).

## 8. Testar

1. No Claude Code, peça **"rode o app com npm run dev"** e abra `http://localhost:5173/login`.
2. Clique em **Criar conta Eternum**, use um e-mail seu e crie a conta. Deve aparecer a tela **"Confira seu e-mail"**.
3. Tente entrar com esse e-mail e senha antes de confirmar: deve aparecer o aviso de e-mail não confirmado e o botão **Reenviar e-mail de confirmação**.
4. Abra o e-mail e clique no link: o app abre e vai direto para o feed.
5. Confira que **Entrar com Google** continua funcionando.

### Se algo der errado

- **E-mail não chega**: confira o spam; veja em **Resend → Emails** se ele foi enviado; confira se o domínio está **Verified**.
- **"Muitos e-mails enviados"**: é o limite por hora do passo 3.4. Espere ou aumente o limite.
- **O link abre uma página de erro ou volta para o localhost errado**: falta o endereço em **Redirect URLs** (passo 5).
- **"O link de confirmação expirou ou já foi usado"**: peça um novo link pelo botão **Reenviar e-mail**.

Contas criadas antes desta mudança continuam funcionando normalmente.
