# 11 — Estratégia de Implantação

## 1. Artefatos

| Artefato | Build | Imagem |
|---|---|---|
| API | `backend/Dockerfile` multi-stage (pnpm install → build → runtime `node:20-alpine`, usuário não-root) | `registry.xpto/portal-oportunidades-api:<tag>` |
| Frontend | `frontend/Dockerfile` multi-stage (Vite build → `nginx:alpine` servindo estáticos + proxy `/api`) | `registry.xpto/portal-oportunidades-web:<tag>` |

Versionamento de imagem = SHA do commit + tag semântica em release. Configuração 100% por
variáveis de ambiente (12-factor) — a mesma imagem promove dev → homolog → prod.

## 2. Ambientes

| Ambiente | Banco | Identidade | Deploy |
|---|---|---|---|
| Local | Postgres do `docker-compose` (com seed) **ou** projeto Supabase de dev | GoTrue de dev | `docker compose up` |
| Homologação | Schema compartilhado (projeto Supabase de homolog) | GoTrue homolog | K8s namespace `portal-oportunidades-hml` |
| Produção | Postgres corporativo (Supabase prod) | GoTrue prod | K8s namespace `portal-oportunidades` |

## 3. Kubernetes (manifests em `k8s/`)

- `deployment-api.yaml` — 2+ réplicas, stateless; probes `GET /health` (liveness) e
  `GET /health/ready` (readiness); `resources` requests/limits; `securityContext`
  (runAsNonRoot, readOnlyRootFilesystem); segredos via `Secret` (`DATABASE_URL`,
  `SUPABASE_JWT_SECRET`, `STORAGE_*`, `SMTP_*`).
- `deployment-web.yaml` — Nginx com estáticos; config de proxy via `ConfigMap`.
- `service-api.yaml` / `service-web.yaml` — ClusterIP.
- `ingress.yaml` — TLS (cert-manager), host `oportunidades.xpto.com.br`; rotas `/` → web,
  `/api` → api.
- `configmap.yaml` — variáveis não sensíveis (nível de log, CORS, limites de upload).
- HPA-ready: API sem estado e sem sessão local; escala horizontal por CPU/RPS.
- O scheduler de notificações roda no próprio pod da API (`@nestjs/schedule`) com **leader
  election por advisory lock do Postgres** para não duplicar envios com múltiplas réplicas.

## 4. Migrations de banco

Seguem o processo do ecossistema: arquivo numerado e **idempotente**
(`supabase/migrations/0073_portal_oportunidades.sql`), aplicado no SQL Editor do projeto
Supabase pelo responsável de banco, antes do deploy da API. A API valida no arranque
(readiness) a presença das tabelas `opp_*` e aborta com mensagem clara se ausentes.
Rollback: migrations aditivas; remoção apenas por migration explícita e aprovada.

## 5. Pipeline CI/CD (referência)

1. PR: lint + typecheck + testes unitários (backend e frontend) + build das duas imagens.
2. Merge em `main`: push das imagens com tag do SHA; deploy automático em homolog.
3. Release (tag): deploy em produção via `kubectl apply -k k8s/overlays/prod` (kustomize),
   com aprovação manual; smoke test pós-deploy (`/health/ready`, login SSO, GET `/stages`).

## 6. Configuração (`backend/.env.example`)

| Variável | Uso |
|---|---|
| `PORT` | porta da API (padrão 3001) |
| `DATABASE_URL` | Postgres corporativo (role `portal_oportunidades_api`) |
| `SUPABASE_URL` | base do projeto (GoTrue + Storage) |
| `SUPABASE_JWT_SECRET` | segredo HS256 para validar tokens GoTrue |
| `SUPABASE_SERVICE_ROLE_KEY` | somente para URLs assinadas do Storage (nunca vai ao front) |
| `STORAGE_BUCKET` | `opp-documents` |
| `CORS_ORIGINS` | domínios permitidos |
| `UPLOAD_MAX_MB`, `UPLOAD_ALLOWED_EXT` | política de upload (RN-011) |
| `SMTP_HOST/PORT/USER/PASS/FROM` | notificações por e-mail |
