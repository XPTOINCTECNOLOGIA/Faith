

<!-- xpto-azure-infra: gerado na migração para Azure. Não remover. -->
# ⚙️ Infra XPTO no Azure — ESTADO REAL (LEIA ANTES DE MEXER)

Migração do **Supabase.com + Vercel** para o **Microsoft Azure** — **EM ANDAMENTO** (set/2026).
A INFRAESTRUTURA está pronta, mas a **migração de DADOS ainda NÃO foi finalizada**.

## ⚠️ Estado atual (NÃO trate como concluído)
- A **produção viva ainda é o banco ANTIGO** (`svnfifxiqvztcwegayos.supabase.co`). Foi confirmada
  divergência: o antigo tem escritas mais novas que o Azure. O Azure é uma **cópia defasada**.
- **NÃO** divulgue o endereço `*.xptoinc.com.br` (Azure) para usuários como produção até o
  **corte final de dados** ser confirmado — quem entrar lá pode ver dados desatualizados.

## Regras enquanto a migração de dados não fecha
- **NÃO troque** o fallback do cliente `svnfifxiqvztcwegayos.supabase.co` para `api.xptoinc.com.br`.
  Só troque no corte final, coordenado, com todos os apps juntos.
- **NÃO desligue** o deploy antigo (Vercel/old) — ele serve os dados atuais até o corte.
- Use a **disciplina de PR + squash** do repositório. Um merge de PR na branch padrão já dispara
  o deploy no Azure (não é preciso push direto na main).

## Infra já pronta (para referência)
- Backend novo (Supabase self-hosted no Azure): `https://api.xptoinc.com.br` (ainda com dados defasados).
- Deploy automático: GitHub Actions (`.github/workflows/`) publica no Azure a cada merge na branch padrão.
  Secret de organização `AZURE_CREDENTIALS` já configurado.
- Hospedagem: Static Web App / Container App no Azure (detalhes por app abaixo, se houver).

## Pendências conhecidas (coordenar com o responsável pela migração)
1. **Corte final de dados** antigo→novo (sincronizar tabelas divergentes + storage) e validar.
2. Depois: trocar fallback p/ Azure, desconectar/pausar Vercel, direcionar usuários ao Azure.
3. Segurança: alinhar grants do papel `anon` no stack novo aos do projeto antigo.
