# 12 — Estratégia de Integração com o Tetelestai (SSO e base de usuários)

## 1. Como o ecossistema funciona hoje (levantado no repositório Tetelestai)

- Sete micro-apps (TETELESTAI, MANNA, TIKKUN, BNEI, MERKAVAH, JIREH, SPHRAGIS) compartilham
  **um único projeto Supabase**: um Postgres (`public`), uma tabela de identidade
  (`public.users`, chaveada a `auth.users` por `auth_user_id`) e o **Supabase Auth (GoTrue)**
  como emissor de sessão.
- O SSO entre as apps é a **sessão GoTrue**: um login vale para todas as aplicações do
  ecossistema; o JWT (HS256, segredo do projeto) é o único credencial aceito pelas políticas RLS.
- A autorização é centralizada em `profiles`, `permissions` e `profile_permissions`,
  consultadas via `has_permission(code)`; a direção adotada pelo ecossistema (migrations
  0061/0065) é permissão nomeada por módulo — exatamente o modelo que o portal adota
  (`opp.*`).
- Não há hoje IdP externo: o botão "SSO Microsoft Entra ID" do Tetelestai está reservado
  (`login_method='entra_id'` já previsto no schema). Quando o Entra ID for ligado como provider
  OIDC do GoTrue, **todas** as micro-apps — o portal incluído — herdam o SSO federado sem
  alteração de código.

## 2. O contrato de integração do portal

O portal cumpre os quatro requisitos (SSO, usuários da base existente, perfis/permissões
existentes, nenhuma autenticação própria) da seguinte forma:

| Requisito | Implementação |
|---|---|
| SSO | A SPA usa `supabase-js` apontando para o **mesmo projeto** GoTrue; sessão existente (criada pelo Tetelestai ou por qualquer micro-app) é reaproveitada; sem sessão, o usuário se autentica uma única vez no provedor corporativo |
| Base de usuários | A API resolve `auth.uid()` (claim `sub` do JWT) → `public.users.auth_user_id` a cada requisição; usuário inexistente, `active=false` ou `blocked=true` → 403. O portal não possui tabela própria de usuários |
| Perfis e permissões | Leitura de `profiles` + `profile_permissions` + `permissions`; o portal apenas **adiciona** permissões `opp.*` (seed da migration 0073) e as associa aos perfis existentes — a administração continua na Governança do Tetelestai |
| Sem autenticação própria | O backend NestJS **valida** JWTs (assinatura HS256 com `SUPABASE_JWT_SECRET`, `exp`, `aud='authenticated'`), nunca emite tokens nem armazena senha |

### Fluxo detalhado

```mermaid
sequenceDiagram
    participant U as Usuário
    participant P as Portal (SPA)
    participant G as GoTrue (Supabase Auth)
    participant A as API NestJS
    participant DB as Postgres corporativo

    U->>P: acessa portal
    P->>G: getSession() (sessão compartilhada do ecossistema)
    alt sem sessão
        P->>G: signIn (login corporativo / futuro Entra ID)
        G-->>P: access_token + refresh_token
    end
    P->>A: GET /api/v1/me (Bearer access_token)
    A->>A: valida assinatura/exp/aud do JWT
    A->>DB: select users + profile + permissions where auth_user_id = sub
    DB-->>A: identidade + permissões opp.*
    A-->>P: { user, permissions }
    Note over P,A: demais chamadas repetem a validação;<br/>cache de permissões 60s por usuário
```

## 3. Mapeamento dos perfis de acesso do portal

Os sete perfis funcionais pedidos mapeiam para o RBAC corporativo por **permissões**, não por
perfis novos obrigatórios — um perfil existente recebe o conjunto correspondente:

| Perfil funcional | Permissões `opp.*` |
|---|---|
| Administrador | todas (`opp.admin`, `opp.config`, ...) |
| Diretor | `opp.view, opp.dashboard.view, opp.audit.view, opp.doc.approve, opp.close` |
| Gerente Comercial | `opp.view, opp.create, opp.update, opp.move_stage, opp.close, opp.doc.upload, opp.doc.approve, opp.checklist.waive, opp.comment, opp.client.manage, opp.partner.manage, opp.dashboard.view` |
| Comercial XPTO / Comercial SERPRO | `opp.view, opp.create, opp.update, opp.move_stage, opp.doc.upload, opp.comment, opp.client.manage` |
| Parceiro | `opp.view` (escopo restrito às próprias oportunidades — RN-017), `opp.doc.upload, opp.comment` |
| Consulta | `opp.view` |

A migration 0073 faz o seed das permissões e associa aos perfis corporativos existentes
(SUPER ADMIN, BOARD/CEO → Diretor, GESTOR → Gerente, COLABORADOR → Comercial); ajustes finos
são feitos na Governança do Tetelestai. Expansão futura para RBAC pleno: ver roadmap M2.

## 4. Decisões e salvaguardas

- **Banco compartilhado, papel dedicado**: a API conecta com a role `portal_oportunidades_api`
  (criada na 0073) com GRANT mínimo — leitura em `users/profiles/permissions/profile_permissions`,
  leitura/escrita apenas nas `opp_*`. Sem `service_role` para SQL.
- **RLS nas tabelas `opp_*`**: mesmo padrão das demais micro-apps (helpers
  `current_app_user_id()`, `has_permission()`), garantindo que um eventual acesso via PostgREST
  respeite as mesmas regras da API — incluindo o escopo de Parceiro.
- **Notificações**: o portal usa a própria `opp_notifications` (a `notifications` corporativa
  possui política de escrita aberta documentada como risco — não construir confiança sobre ela).
- **Interoperabilidade futura com o Tetelestai** (roadmap M3): pendências de checklist podem
  gerar tarefas no TO DO do Tetelestai diretamente via banco (mesmo padrão cross-app já usado
  por TIKKUN/BNEI: função `SECURITY DEFINER` + `pg_cron`), sem HTTP entre apps.
- **Entra ID**: ponto único de mudança = habilitar o provider OIDC no GoTrue; o portal já trata
  `login_method` como opaco.

## 5. O que o portal explicitamente não faz

- Não cria/edita usuários, perfis, permissões ou senhas.
- Não emite tokens; não mantém sessão no servidor (API stateless).
- Não escreve nas tabelas de outras micro-apps.
- Não expõe o `SUPABASE_SERVICE_ROLE_KEY` ao navegador (uso restrito ao backend, apenas para
  URLs assinadas de Storage).
