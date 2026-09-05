

<!-- xpto-azure-infra: gerado na migração para Azure. Não remover. -->
# ⚙️ Infra XPTO no Azure — LEIA ANTES DE MEXER

Migração do **Supabase.com + Vercel** para o **Microsoft Azure** — **CONCLUÍDA** (set/2026).
O **Azure é a produção ÚNICA**. Dados reconciliados; a Vercel/banco antigo estão congelados (rollback) e serão desligados.

## Infraestrutura (NÃO reverter)
- **Backend de dados (Supabase self-hosted no Azure):** `https://api.xptoinc.com.br`
  - ⚠️ **NUNCA** aponte o app para `*.supabase.co` (projeto antigo `svnfifxiqvztcwegayos`, congelado / em desligamento).
  - `VITE_SUPABASE_ANON_KEY` é a chave anônima compartilhada do ecossistema (pública, protegida por RLS).
- **Hospedagem:** Static Web App / Container App no Azure (detalhe por app abaixo, se houver).

## Deploy (AUTOMÁTICO — não faça deploy manual)
- Um **push/merge na branch padrão** do repo dispara o **GitHub Actions**, que builda e publica no Azure.
  - Workflow em `.github/workflows/`. O build injeta `VITE_SUPABASE_URL=https://api.xptoinc.com.br` (não dependa de `.env` local p/ produção).
  - Secret de organização `AZURE_CREDENTIALS` já configurado (org XPTOINCTECNOLOGIA).
  - Use a **disciplina de PR + squash** do repositório (o merge do PR já dispara o deploy). Rode os testes/checagens antes de commitar.

## Observações
- O ecossistema todo (8 apps) roda no Azure com deploy automático, backups (banco + VM), HSTS, WAF (Cloudflare) e permissão mínima de e-mail.
- Segurança de banco: o papel `anon` está alinhado à produção (SELECT/EXECUTE mínimos) — não afrouxe grants sem necessidade.
