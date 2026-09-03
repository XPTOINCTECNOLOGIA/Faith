# 09 — Estrutura do Banco de Dados

O DDL oficial e completo do portal está versionado no padrão de migrations do ecossistema:

**`supabase/migrations/0073_portal_oportunidades.sql`** (idempotente, aplicada no SQL Editor
do projeto Supabase, como as 0001–0072).

## Conteúdo da migration

| Seção | Entrega |
|---|---|
| 1–2 | `opp_stages` (12 etapas configuráveis) e `opp_checklist_templates` (checklist parametrizável por etapa) |
| 3 | `opp_clients` (clientes/órgãos, CNPJ único) e `opp_partners` |
| 4 | `opp_opportunities` com CHECKs das RN-004/005/008 e índices de Kanban/dashboard |
| 5 | `opp_documents`, `opp_document_versions` (imutáveis), `opp_document_reviews` (CHECK RN-012) |
| 6 | `opp_checklist_items` (instância congelada — RN-010; CHECK RN-009) |
| 7 | `opp_stage_transitions`, `opp_comments`, `opp_notifications` |
| 8 | `opp_audit_log` append-only + trigger `opp_audit_protect` (RN-015) |
| 9 | Trigger de `updated_at` |
| 10 | **Trigger `opp_guard_stage_transition`** — RN-001/RN-002 no banco (defesa em profundidade) |
| 11 | Trigger `opp_instantiate_checklist` — RN-007 |
| 12–13 | Seeds: 12 etapas + checklist documental obrigatório do enunciado |
| 14 | Seeds: permissões `opp.*` + associação aos perfis corporativos existentes |
| 15 | RLS em todas as tabelas `opp_*` (leitura por `has_permission('opp.view')`; notificações do próprio usuário; auditoria por `opp.audit.view`; política de serviço para a role da API) |
| 16 | Role `portal_oportunidades_api` (NOLOGIN) com GRANT mínimo — a credencial de login por ambiente herda dela |
| 17 | Bucket privado `opp-documents` no Storage |
| 18 | Bloco de verificação (`raise notice` / falha se seeds incompletos) |

O modelo lógico, o DER e o dicionário de dados estão em `03-modelo-dados.md`.

## Ambiente local

O `docker-compose.yml` do portal sobe um PostgreSQL vazio e aplica `db/local-init.sql`, que
recria o mínimo da base compartilhada (`users`, `profiles`, `permissions`,
`profile_permissions`, helpers) antes de aplicar a 0073 — permitindo desenvolver sem acesso ao
projeto Supabase corporativo.
