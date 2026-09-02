import { createClient } from '@supabase/supabase-js';

/**
 * SSO: mesmo projeto Supabase (GoTrue) das demais micro-apps corporativas.
 * O portal nunca autentica por conta própria — só consome a sessão.
 */
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL ?? 'http://localhost:54321',
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'anon-key-dev',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true, // necessário para provedores OIDC (Entra ID futuro)
    },
  },
);
