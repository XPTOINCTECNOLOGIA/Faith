# 08 — Especificação das APIs REST

- Base URL: `/api/v1` · Autenticação: `Authorization: Bearer <JWT GoTrue>` em todas as rotas
  (exceto `/health`). · Content-Type: `application/json` (uploads: `multipart/form-data`).
- Documentação viva: Swagger UI em `/api/docs`, spec OpenAPI 3 em `/api/docs-json`
  (gerada por `@nestjs/swagger` a partir dos DTOs — fonte única de verdade).
- Erros no formato problem+json: `{ statusCode, error, message, details? }`.
  Convenções: `400` validação, `401` token ausente/inválido, `403` sem permissão,
  `404` não encontrado, `409` conflito de negócio (ex.: RN-001), `422` regra violada.
- Paginação: `?page=1&pageSize=20` → `{ items, total, page, pageSize }`.

## Identidade

| Método | Rota | Permissão | Descrição |
|---|---|---|---|
| GET | `/me` | autenticado | Usuário corrente: id, nome, e-mail, perfil, permissões `opp.*` |
| GET | `/users?search=` | `opp.view` | Busca usuários da base compartilhada (para selects de gestor) |

## Etapas e checklist (configuração)

| Método | Rota | Permissão | Descrição |
|---|---|---|---|
| GET | `/stages` | `opp.view` | Etapas ativas ordenadas (+ `?all=true` p/ admin) |
| POST | `/stages` | `opp.config` | Cria etapa |
| PATCH | `/stages/:id` | `opp.config` | Renomeia, reordena, cor, ativa/desativa (RN-019) |
| GET | `/stages/:id/checklist-templates` | `opp.view` | Templates da etapa |
| POST | `/stages/:id/checklist-templates` | `opp.config` | Cria template |
| PATCH | `/checklist-templates/:id` | `opp.config` | Altera template (não retroage, RN-010) |

## Clientes e parceiros

CRUD padrão em `/clients` e `/partners` (GET lista/paginada com `?search=`, GET `/:id`, POST,
PATCH `/:id`, DELETE lógico `/:id`) — permissões `opp.client.manage` / `opp.partner.manage`
para mutação, `opp.view` para leitura. Validação de CNPJ (RN-006).

## Oportunidades

| Método | Rota | Permissão | Descrição |
|---|---|---|---|
| GET | `/opportunities` | `opp.view` | Lista paginada; filtros: `stageId, status, leadSource, gestorId, partnerId, clientId, uf, minValue, maxValue, overdue, search` |
| GET | `/opportunities/kanban` | `opp.view` | Agregado por etapa: `{ stage, count, totalValue, cards[] }` (cards com % checklist e status documental) |
| POST | `/opportunities` | `opp.create` | Cria (RN-003..006); body: `OpportunityCreateDto` |
| GET | `/opportunities/:id` | `opp.view` | Detalhe completo (com cliente, parceiro, gestores, etapa) |
| PATCH | `/opportunities/:id` | `opp.update` | Edição parcial; cada campo auditado (RN-015) |
| POST | `/opportunities/:id/transition` | `opp.move_stage` | `{ toStageId, justification? }` → valida RN-001/002; `409` com `{ pendingItems[] }` quando bloqueado |
| POST | `/opportunities/:id/close` | `opp.close` | `{ outcome: 'ganha'\|'perdida'\|'cancelada', justification }` (RN-008) |
| POST | `/opportunities/:id/reopen` | `opp.admin` | `{ justification }` (RN-016) |
| GET | `/opportunities/:id/checklist` | `opp.view` | Itens da etapa atual + anteriores, status, % avanço |
| POST | `/checklist-items/:id/waive` | `opp.checklist.waive` | `{ justification }` (RN-009) |
| GET | `/opportunities/:id/history` | `opp.view` | Timeline: transições + auditoria da oportunidade |
| GET | `/opportunities/:id/comments` | `opp.view` | Comentários |
| POST | `/opportunities/:id/comments` | `opp.comment` | `{ body }` |

## Documentos

| Método | Rota | Permissão | Descrição |
|---|---|---|---|
| GET | `/opportunities/:id/documents` | `opp.view` | Documentos da oportunidade (status, versão atual, responsável) |
| POST | `/opportunities/:id/documents` | `opp.doc.upload` | multipart: `file` + `{ name, category, docType, checklistItemId?, observacoes? }` → cria doc v1 *em análise* (RN-011) |
| POST | `/documents/:id/versions` | `opp.doc.upload` | multipart: nova versão (RN-014) |
| GET | `/documents/:id/versions` | `opp.view` | Histórico de versões |
| GET | `/documents/:id/versions/:v/download` | `opp.view` | `{ url }` assinada e expirável; download auditado |
| POST | `/documents/:id/approve` | `opp.doc.approve` | Aprova versão corrente (RN-013) |
| POST | `/documents/:id/reject` | `opp.doc.approve` | `{ justification }` (RN-012) |
| GET | `/documents/:id/reviews` | `opp.view` | Histórico de aprovações/rejeições |

## Dashboard executivo

| Método | Rota | Permissão | Descrição |
|---|---|---|---|
| GET | `/dashboard/summary` | `opp.dashboard.view` | Pipeline total, qtde, conversão, vencidas, previsão ponderada (RN-020) |
| GET | `/dashboard/by-stage` | idem | Valor + quantidade por etapa (funil) |
| GET | `/dashboard/by-source` | idem | Valor + quantidade por origem |
| GET | `/dashboard/stage-durations` | idem | Tempo médio (dias) por etapa |
| GET | `/dashboard/rankings/partners` | idem | Ranking parceiros (pipeline, ganhas, conversão) |
| GET | `/dashboard/rankings/managers` | idem | Ranking gestores |

Todos aceitam `?from=&to=&leadSource=&uf=`.

## Notificações

| Método | Rota | Descrição |
|---|---|---|
| GET | `/notifications?unread=true` | Notificações do usuário corrente |
| PATCH | `/notifications/:id/read` | Marca lida |
| PATCH | `/notifications/read-all` | Marca todas |

## Auditoria

| Método | Rota | Permissão | Descrição |
|---|---|---|---|
| GET | `/audit` | `opp.audit.view` | Filtros: `from, to, actorId, entity, action, opportunityId`; paginada |
| GET | `/audit/export` | `opp.audit.view` | CSV com os mesmos filtros |

## Saúde

`GET /health` (liveness) e `GET /health/ready` (readiness — ping ao Postgres), sem autenticação.

## Exemplo — transição bloqueada (RN-001)

```http
POST /api/v1/opportunities/42/transition
{ "toStageId": 6 }

HTTP/1.1 409 Conflict
{
  "statusCode": 409,
  "error": "StageBlocked",
  "message": "Avanço bloqueado: 2 documentos obrigatórios pendentes na etapa Proposta Comercial.",
  "details": {
    "pendingItems": [
      { "checklistItemId": 310, "name": "Planilha de precificação", "status": "em_analise" },
      { "checklistItemId": 311, "name": "Aprovação interna", "status": "pendente" }
    ]
  }
}
```
