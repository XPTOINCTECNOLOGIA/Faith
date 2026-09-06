import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

import { supabase } from "./lib/supabase";
import { registerApplication } from "./lib/shaar-guard.js";

// Fronteira do SHAAR — EM VIGOR.
//
// O bilhete AUTORIZA; a sessão é o que dispensa novo login. Cada aplicação
// vive num subdomínio próprio, com armazenamento próprio: sem adoptar a
// sessão que o SHAAR entrega, esta aplicação pediria credenciais outra vez.
//
// A ordem importa. Renderizar antes de a sessão estar posta faz a aplicação
// desenhar o seu próprio ecrã de login e só depois descobrir que já havia
// sessão — que é precisamente o defeito que isto corrige.
async function iniciar() {
  const eu = await registerApplication({ app: "FAITH", modo: "exigir" });
  if (eu?.sessao?.access_token) {
    try {
      await supabase.auth.setSession({
        access_token: eu.sessao.access_token,
        refresh_token: eu.sessao.refresh_token,
      });
    } catch (e) {
      console.warn("[shaar-guard] não consegui adoptar a sessão:", e);
    }
  }





  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void iniciar();
