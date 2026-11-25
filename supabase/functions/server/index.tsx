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
app.post("/make-server-86fee667/signup", async (c) => {
  try {
    const { email, password, displayName, username, birthDate } = await c.req.json();

    if (!email || !password) {
      return c.json({ error: "Email e senha são obrigatórios" }, 400);
    }

    if (password.length < 6) {
      return c.json({ error: "A senha deve ter pelo menos 6 caracteres" }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Verificar se o usuário já existe
    const { data: existingUsers, error: searchError } = await supabase.auth.admin.listUsers();
    
    if (existingUsers) {
      const existingUser = existingUsers.users.find(u => u.email === email);
      
      if (existingUser) {
        console.log('Usuário já existe:', email, 'Confirmado:', existingUser.email_confirmed_at);
        
        // Se o usuário existe mas o email não foi confirmado, confirmar agora
        if (!existingUser.email_confirmed_at) {
          console.log('Confirmando email do usuário existente:', email);
          const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
            existingUser.id,
            { 
              email_confirm: true,
              user_metadata: {
                display_name: displayName || existingUser.user_metadata?.display_name,
                username: username || existingUser.user_metadata?.username,
                birth_date: birthDate || existingUser.user_metadata?.birth_date,
              }
            }
          );
          
          if (updateError) {
            console.error('Erro ao confirmar email:', updateError);
            return c.json({ error: 'Este email já está cadastrado mas houve um erro. Tente fazer login.' }, 400);
          }
          
          console.log('Email confirmado com sucesso para:', email);
          return c.json({ 
            user: updatedUser.user, 
            message: 'Conta já existia e foi ativada com sucesso!' 
          });
        }
        
        return c.json({ error: 'Este email já está cadastrado. Faça login ou recupere sua senha.' }, 400);
      }
    }

    // Criar metadados do usuário
    const userMetadata: any = {};
    if (displayName) userMetadata.display_name = displayName;
    if (username) userMetadata.username = username;
    if (birthDate) userMetadata.birth_date = birthDate;

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Automatically confirm the user's email since an email server hasn't been configured.
      user_metadata: userMetadata,
    });

    if (error) {
      console.error('Erro ao criar usuário:', error);
      
      // Tratamento específico de erros
      if (error.message.includes('already been registered')) {
        return c.json({ error: 'Este email já está cadastrado. Faça login ou recupere sua senha.' }, 400);
      }
      
      return c.json({ error: error.message || 'Erro ao criar conta' }, 400);
    }

    console.log('Usuário criado com sucesso:', data.user.email, 'confirmado:', data.user.email_confirmed_at);
    return c.json({ user: data.user });
  } catch (err) {
    console.error('Erro inesperado ao criar conta:', err);
    return c.json({ error: 'Erro interno do servidor' }, 500);
  }
});

// Endpoint para confirmar email manualmente
app.post("/make-server-86fee667/confirm-email", async (c) => {
  try {
    const { email } = await c.req.json();

    if (!email) {
      return c.json({ error: "Email é obrigatório" }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Buscar usuário por email
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const user = existingUsers?.users.find(u => u.email === email);
    
    if (!user) {
      return c.json({ error: 'Usuário não encontrado' }, 404);
    }

    // Confirmar email
    const { data, error } = await supabase.auth.admin.updateUserById(
      user.id,
      { email_confirm: true }
    );

    if (error) {
      console.error('Erro ao confirmar email:', error);
      return c.json({ error: 'Erro ao confirmar email' }, 400);
    }

    console.log('Email confirmado com sucesso:', email);
    return c.json({ success: true, message: 'Email confirmado com sucesso!' });
  } catch (err) {
    console.error('Erro inesperado ao confirmar email:', err);
    return c.json({ error: 'Erro interno do servidor' }, 500);
  }
});

Deno.serve(app.fetch);