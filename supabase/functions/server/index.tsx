import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";
const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-86fee667/health", (c) => {
  return c.json({ status: "ok" });
});

// Signup endpoint
// Segurança: este endpoint é público (só exige a chave anon), então ele NUNCA
// altera contas que já existem. Antes, um e-mail ainda não confirmado era
// "ativado" aqui e tinha nome/username sobrescritos por quem chamasse.
app.post("/make-server-86fee667/signup", async (c) => {
  try {
    const body = await c.req.json().catch(() => null);
    const { email, password, displayName, username, birthDate } = body ?? {};

    if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password) {
      return c.json({ error: "Email e senha são obrigatórios" }, 400);
    }

    if (password.length < 6) {
      return c.json({ error: "A senha deve ter pelo menos 6 caracteres" }, 400);
    }

    const optionalText = (value: unknown, max: number) =>
      typeof value === "string" && value.trim() ? value.trim().slice(0, max) : undefined;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Criar metadados do usuário
    const userMetadata: Record<string, string> = {};
    const cleanDisplayName = optionalText(displayName, 100);
    const cleanUsername = optionalText(username, 50);
    const cleanBirthDate = optionalText(birthDate, 10);
    if (cleanDisplayName) userMetadata.display_name = cleanDisplayName;
    if (cleanUsername) userMetadata.username = cleanUsername;
    if (cleanBirthDate && /^\d{4}-\d{2}-\d{2}$/.test(cleanBirthDate)) userMetadata.birth_date = cleanBirthDate;

    // Não listamos usuários para checar duplicidade (listUsers só traz a 1ª página);
    // o próprio createUser recusa e-mails já cadastrados.
    const { data, error } = await supabase.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true, // Automatically confirm the user's email since an email server hasn't been configured.
      user_metadata: userMetadata,
    });

    if (error) {
      const alreadyExists =
        (error as { code?: string }).code === 'email_exists' ||
        /already (been )?registered|already exists/i.test(error.message);
      if (alreadyExists) {
        return c.json({ error: 'Este email já está cadastrado. Faça login ou recupere sua senha.' }, 400);
      }
      console.error('Erro ao criar usuário:', error.message);
      return c.json({ error: 'Não foi possível criar a conta. Tente novamente.' }, 400);
    }

    return c.json({ user: { id: data.user.id, email: data.user.email } });
  } catch (err) {
    console.error('Erro inesperado ao criar conta:', err);
    return c.json({ error: 'Erro interno do servidor' }, 500);
  }
});

// O antigo endpoint /confirm-email foi removido: ele não exigia login e
// permitia que qualquer pessoa confirmasse o e-mail de outra conta.
// O app não o usava.

Deno.serve(app.fetch);