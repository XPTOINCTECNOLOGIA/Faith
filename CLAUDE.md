
<!-- xpto-azure-infra: gerado na migração para Azure. Não remover. -->
# ⚙️ Infra XPTO no Azure — LEIA ANTES DE MEXER

Este app foi migrado do **Supabase.com + Vercel** para o **Microsoft Azure** (set/2026).

## Infraestrutura (NÃO reverter)
- **Hospedagem:** Azure **Static Web App** `swa-faith`
- **Backend de dados (Supabase self-hosted no Azure):** `https://api.xptoinc.com.br`
  - ⚠️ **NUNCA** aponte de volta para `*.supabase.co` (projeto antigo `svnfifxiqvztcwegayos`, em desligamento).
  - `VITE_SUPABASE_ANON_KEY` é a chave anônima compartilhada do ecossistema (pública, protegida por RLS).

## Deploy (AUTOMÁTICO — não faça deploy manual)
- `git push` na branch **`main`** → **GitHub Actions** builda e publica no Azure sozinho.
  - Workflow: `.github/workflows/azure-swa-deploy.yml`
  - O workflow injeta `VITE_SUPABASE_URL=https://api.xptoinc.com.br` no build (não dependa de `.env` local p/ produção).
  - Requer o secret de organização `AZURE_CREDENTIALS` (já configurado na org XPTOINCTECNOLOGIA).
- O frontend fica na pasta **`frontend/`** (pnpm). Build `pnpm build` → `frontend/dist/`. O NestJS/"portal" no repo é caminho documentado e **nunca ativado** — produção é só a SPA + Supabase.

## Observações
- Dados do Faith vivem no MESMO Supabase corporativo: tabelas `public.opp_*` + bucket `opp-documents`.
- `faith.xptoinc.com.br` (Cloudflare proxy, HSTS). Deploy antigo na Vercel (faith-xpto-serpro) em desligamento.
