import { createClient } from '@supabase/supabase-js';

/**
 * SSO: mesmo projeto Supabase (GoTrue) das demais micro-apps corporativas.
 * O portal nunca autentica por conta própria — só consome a sessão.
 */
// Projeto corporativo (o mesmo do Tetelestai); a anon key é pública por
// design (RLS decide tudo) — mesma prática do vercel.json do Tetelestai.
const DEFAULT_URL = 'https://svnfifxiqvztcwegayos.supabase.co';
const DEFAULT_ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2bmZpZnhpcXZ6dGN3ZWdheW9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3ODg0MjEsImV4cCI6MjEwMjM2NDQyMX0.1RQNgYjj9Zhg4YOm9m0kKTQ7Sk3MYemJ_bXOFoXVE1U';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL ?? DEFAULT_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? DEFAULT_ANON,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true, // necessário para provedores OIDC (Entra ID futuro)
    },
  },
);
