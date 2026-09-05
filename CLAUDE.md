<!-- xpto-azure-infra: gerado na migração para Azure. Não remover. -->
# ⚙️ Infra XPTO no Azure — LEIA ANTES DE MEXER

Migração do **Supabase.com + Vercel** para o **Microsoft Azure** — **CONCLUÍDA** (set/2026).
O **Azure é a produção ÚNICA**. Dados reconciliados; a Vercel/banco antigo estão congelados (rollback) e serão desligados.

## Infraestrutura (NÃO reverter)
- **Backend de dados (Supabase self-hosted no Azure):** `https://api.xptoinc.com.br`
  - ⚠️ **NUNCA** aponte o app para `*.supabase.co` (projeto antigo `svnfifxiqvztcwegayos`, congelado / em desligamento).
  - `VITE_SUPABASE_ANON_KEY` é a chave anônima compartilhada do ecossistema (pública, protegida por RLS).
- **Hospedagem:** Static Web App / Container App no Azure.

## Deploy do app (AUTOMÁTICO — não faça deploy manual)
- Um **push/merge na branch padrão** dispara o **GitHub Actions**, que builda e publica no Azure.
  - O build injeta `VITE_SUPABASE_URL=https://api.xptoinc.com.br`. Secret de org `AZURE_CREDENTIALS` já configurado.
  - Use a **disciplina de PR + squash** do repositório. Rode os testes/checagens antes de commitar.

## Migrations de banco (mudanças de ESTRUTURA) — IMPORTANTE
- ⚠️ As ferramentas Supabase (MCP) e o sistema de migrations antigo (drizzle/supabase/CLI) apontam para
  o **projeto ANTIGO CONGELADO** — **NÃO** os use para alterar o banco do Azure.
- Para mudança de estrutura (nova tabela, coluna, função, política RLS, grant): crie um arquivo `.sql`
  numerado em **`db/azure-migrations/`** (ex.: `001_nova_tabela.sql`). Ao dar merge na branch padrão, o
  workflow **"DB migrations -> Azure"** aplica os arquivos novos no backend Azure automaticamente
  (transacional e idempotente, rastreado em `public._xpto_migrations`). Mantenha cada arquivo < ~150 KB.

## Observações
- Segurança de banco: o papel `anon` está alinhado à produção (SELECT/EXECUTE mínimos) — não afrouxe grants sem necessidade.
