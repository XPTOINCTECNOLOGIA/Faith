import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

import { registerApplication, type Veredicto } from "./lib/shaar-guard.js";

// Fronteira do SHAAR — MODO DE OBSERVACAO.
//
// Verifica o bilhete emitido pelo SHAAR e diz o que teria feito, mas nao
// barra ninguem. Nada muda para quem usa esta aplicacao hoje.
//
// Passar a valer e trocar "observar" por "exigir", nesta linha, depois de a
// observacao mostrar que so entra quem devia. Ligar sem essa etapa seria
// descobrir os casos que faltam atraves de gente sem conseguir trabalhar.
registerApplication({
  app: "FAITH",
  modo: "observar",
  aoObservar: (v: Veredicto) => {
    if (!v.ok) console.warn("[shaar-guard] seria barrado:", v.motivo);
  },
}).catch((e: unknown) => console.warn("[shaar-guard] indisponivel:", e));


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
