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

// Signup endpoint (desativado)
// Antes, este endpoint criava contas com `email_confirm: true`, ou seja, já
// confirmadas: qualquer pessoa podia se cadastrar com o e-mail de outra.
// Agora o app cria a conta direto pelo Supabase Auth (supabase.auth.signUp),
// que manda o e-mail de confirmação. Respondemos 410 (Gone) para que nenhuma
// versão antiga do app consiga mais criar contas sem confirmar o e-mail.
app.post("/make-server-86fee667/signup", (c) => {
  return c.json(
    { error: "Cadastro por este endereço foi desativado. Atualize a página e crie a conta novamente." },
    410,
  );
});

// O antigo endpoint /confirm-email foi removido: ele não exigia login e
// permitia que qualquer pessoa confirmasse o e-mail de outra conta.
// O app não o usava.

Deno.serve(app.fetch);