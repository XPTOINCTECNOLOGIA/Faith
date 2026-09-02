# 13 — Estratégia de Auditoria e Compliance

## 1. Objetivo

Rastreabilidade total do processo comercial: para qualquer oportunidade deve ser possível
reconstituir **quem criou, quem alterou, o quê, quando, com qual documento e sob qual decisão**
(RN-015). A trilha suporta auditoria interna, compliance da parceria XPTO+SERPRO e eventuais
órgãos de controle (contratações com entes públicos).

## 2. O que é registrado

| Evento | Registro |
|---|---|
| Criação/edição de oportunidade, cliente, parceiro | `opp_audit_log` com uma linha **por campo alterado** (`field`, `old_value`, `new_value`) |
| Transição de etapa | `opp_stage_transitions` (negócio) + `opp_audit_log` (trilha); inclui tentativas **bloqueadas** por RN-001 (action `transition_blocked`) |
| Upload de documento/versão | linha em `opp_document_versions` (imutável) + auditoria `upload` |
| Aprovação/rejeição | `opp_document_reviews` (com versão revisada e justificativa) + auditoria |
| Dispensa de item de checklist | campos `waived_by/waived_reason` + auditoria `waive` |
| Download de documento | auditoria `download` (quem acessou qual versão, quando, de qual IP) |
| Encerramento/reabertura | auditoria com justificativa |
| Acessos negados relevantes | log estruturado da API (403 com usuário/rota) — não polui a trilha de negócio |

Cada linha carrega `actor_id` (FK `users`), `occurred_at` (timestamptz), `metadata` jsonb
(`request_id`, IP, user-agent) — permitindo correlacionar com os logs da API.

## 3. Imutabilidade e integridade

- `opp_audit_log` é **append-only**: UPDATE/DELETE revogados da role da API e bloqueados por
  trigger (`opp_audit_protect`) — nem erro de aplicação nem SQL da role de serviço reescrevem
  história.
- Versões de documento são imutáveis: correção = nova versão; o binário fica em bucket privado
  com nome interno (`storage_path`) desacoplado do nome exibido.
- Auditoria gravada **na mesma transação** da mutação (interceptor + serviços transacionais):
  ou a operação e sua trilha existem juntas, ou nenhuma existe.
- Relógio único: `now()` do Postgres, UTC; exibição no fuso do usuário.

## 4. Implementação na API

- `AuditInterceptor` global captura contexto (usuário, request_id, IP) e delega ao `AuditService`.
- Serviços de mutação calculam o diff campo a campo (whitelist de campos auditáveis por entidade)
  e gravam via `AuditService.log()` dentro da transação corrente.
- Consulta: `GET /audit` (filtros por período, ator, entidade, ação, oportunidade) e
  `GET /audit/export` (CSV), restritos a `opp.audit.view`.
- Timeline da oportunidade (`GET /opportunities/:id/history`) é uma projeção amigável da mesma
  trilha — não existe segunda fonte.

## 5. Compliance e privacidade (LGPD)

- **Minimização**: o portal armazena dados pessoais apenas de contatos comerciais (nome, e-mail,
  telefone) e referências a usuários corporativos; base legal: execução de contrato/legítimo
  interesse comercial.
- **Acesso**: dados de contato visíveis somente a perfis internos com `opp.view`; Parceiro vê
  apenas suas oportunidades (RN-017, reforçado por RLS).
- **Retenção**: trilha de auditoria e documentos contratuais retidos por prazo definido com o
  jurídico (mínimo: vigência contratual + prescrição legal); expurgo somente por processo
  aprovado e ele próprio auditado.
- **Direitos do titular**: contatos comerciais podem ser retificados (auditado); anonimização
  em expurgo preserva agregados estatísticos.
- **Segregação de funções**: quem envia documento não aprova o próprio documento (RN-013);
  dispensa de checklist exige permissão distinta e justificativa (RN-009).

## 6. Relatórios de compliance (roadmap M2)

- Dispensas de checklist por período/gestor (detector de "bypass cultural").
- Oportunidades que avançaram no mesmo dia do upload+aprovação (aprovações relâmpago).
- Documentos rejeitados reiteradamente por parceiro.
- Exportação assinada (hash SHA-256 do CSV registrado na própria trilha).
