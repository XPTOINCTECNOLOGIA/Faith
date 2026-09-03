# FAITH — Portal de Oportunidades XPTO + SERPRO

**FAITH** é o nome oficial da micro aplicação (seguindo a convenção do ecossistema corporativo:
TETELESTAI, MANNA, TIKKUN, BNEI, MERKAVAH, JIREH, SPHRAGIS — e agora FAITH).

Micro aplicação corporativa da **XPTO INC TECNOLOGIA** para centralizar, controlar e acompanhar
todo o ciclo de vida das oportunidades de negócio da parceria **XPTO + SERPRO**, funcionando como
uma esteira de governança comercial e contratual: **nenhuma oportunidade avança de etapa sem que os
documentos obrigatórios da etapa estejam cadastrados e aprovados**.

O portal integra-se ao ecossistema corporativo existente (aplicação principal **Tetelestai** e demais
micro-apps), consumindo a mesma base de usuários, perfis e permissões via SSO — sem manter
autenticação própria.

Seguindo a convenção do ecossistema (TIKKUN, MANNA, JIREH etc.: **um repositório por aplicação,
banco de dados único**), o código do FAITH vive neste repositório próprio (`xptoinc/FAITH`),
enquanto as **migrations** do banco compartilhado permanecem centralizadas no repositório
`xptoinc/TETELESTAI` (`supabase/migrations/0073_portal_oportunidades.sql` e
`0074_faith_modo_ecossistema.sql`), como as das demais micro-apps.

## Estrutura deste diretório

| Caminho | Conteúdo |
|---|---|
| `docs/01-arquitetura.md` | Arquitetura completa da solução (C4, decisões, componentes) |
| `docs/02-fluxo-bpmn.md` | Fluxograma BPMN do processo comercial |
| `docs/03-modelo-dados.md` | Modelo de dados: DER completo + dicionário de dados |
| `docs/04-wireframes.md` | Wireframes das telas |
| `docs/05-casos-de-uso.md` | Casos de uso |
| `docs/06-historias-usuario.md` | Histórias de usuário com critérios de aceite |
| `docs/07-regras-negocio.md` | Regras de negócio (RN-xxx) |
| `docs/08-api-rest.md` | Especificação das APIs REST (OpenAPI) |
| `docs/09-banco-de-dados.md` | Estrutura do banco de dados (aponta para o DDL versionado) |
| `docs/10-roadmap.md` | Roadmap MVP + roadmap evolutivo |
| `docs/11-implantacao.md` | Estratégia de implantação (Docker / Kubernetes) |
| `docs/12-integracao-tetelestai.md` | Estratégia de integração e SSO com o Tetelestai |
| `docs/13-auditoria-compliance.md` | Estratégia de auditoria e compliance |
| `backend/` | Código inicial da API — Node.js + NestJS + TypeORM + Swagger |
| `frontend/` | Código inicial da interface — React + TypeScript + Material UI |
| `k8s/` | Manifests Kubernetes (deployment, service, ingress, configmap) |
| `docker-compose.yml` | Ambiente local completo (API + front + Postgres) |
| `TETELESTAI/supabase/migrations/0073*.sql` e `0074*.sql` | DDL oficial (repositório TETELESTAI, padrão do ecossistema) |

## Sumário executivo da solução

- **Frontend**: React 18 + TypeScript + Material UI (Vite), SPA servida por Nginx.
- **Backend**: Node.js + NestJS, API REST versionada (`/api/v1`) documentada com OpenAPI/Swagger.
- **Banco**: PostgreSQL — o mesmo Postgres corporativo (Supabase) compartilhado pelas micro-apps,
  com tabelas do portal sob o prefixo `opp_` e FKs para a base compartilhada `public.users`.
- **Autenticação**: SSO via OAuth2/OIDC — o portal **valida** tokens emitidos pelo provedor de
  identidade corporativo (Supabase Auth/GoTrue, o mesmo do Tetelestai) e **não emite credenciais**.
- **Autorização**: perfis e permissões da base compartilhada (`profiles`, `permissions`,
  `profile_permissions`) + permissões novas do módulo (`opp.*`), preparadas para RBAC pleno.
- **Governança**: checklist documental parametrizável por etapa; a transição de etapa é bloqueada
  no servidor enquanto houver item obrigatório sem documento aprovado.
- **Auditoria**: trilha imutável (`opp_audit_log`) de criação, alteração campo a campo, anexos,
  aprovações e transições, com autor e data/hora.
- **Infra**: Docker + manifests Kubernetes-ready.

## Ambiente publicado (produção)

- **App**: https://faith-oportunidades.vercel.app (projeto Vercel `faith-oportunidades`, time XPTO),
  acesso público (a autenticação é a do próprio portal, via SSO corporativo).
- **Banco/SSO**: projeto Supabase corporativo (o mesmo do Tetelestai). Migrations 0073 e 0074
  aplicadas; login com a conta corporativa (GoTrue) — sem cadastro próprio.
- **Modo de operação**: "modo ecossistema" — a SPA fala direto com PostgREST/Storage/GoTrue,
  como as demais micro-apps; toda a governança (RN-001/002/007/013, notificações, auditoria de
  transição) é imposta por triggers e RLS no banco (0073/0074). A API NestJS deste repositório
  permanece como caminho oficial para o deploy Kubernetes (docs/11) — o front alterna de modo
  trocando apenas `src/lib/api.ts`.
- CI/CD: o projeto Vercel deve ficar conectado a **este repositório** (`xptoinc/FAITH`,
  Root Directory `frontend`) para deploy automático por push na `main`.

## Desenvolvimento local

```bash
# subir tudo (Postgres + API + front)
docker compose up --build

# ou individualmente
cd backend  && pnpm install && pnpm start:dev   # API em http://localhost:3001 (Swagger em /api/docs)
cd frontend && pnpm install && pnpm dev          # SPA em http://localhost:5173
```

Variáveis de ambiente estão documentadas em `backend/.env.example` e `frontend/.env.example`.
