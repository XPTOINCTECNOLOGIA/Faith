# 10 — Roadmap

## Roadmap MVP (M1) — ~6 a 8 semanas, 1 squad full stack

Objetivo: esteira de governança funcionando ponta a ponta com SSO, sem atalhos de segurança.

| Sprint | Entrega | Conteúdo |
|---|---|---|
| S1 | Fundação | Migration 0073 aplicada; backend NestJS com SSO (validação JWT GoTrue), `/me`, guards de permissão; shell do frontend (MUI, rotas, sessão); CI com lint/test/build; Docker Compose |
| S2 | Cadastros | Clientes, parceiros, CRUD de oportunidades (stepper), listagem com filtros; auditoria de mutações (interceptor) |
| S3 | Governança | Checklist instanciado por etapa; upload/versionamento de documentos (bucket privado, URL assinada); aprovação/rejeição com segregação (RN-013) |
| S4 | Esteira | Transição de etapa com bloqueio RN-001 (API + trigger DB); Kanban com drag & drop, totais por coluna, % de avanço e status documental; encerramento com justificativa |
| S5 | Visibilidade | Dashboard executivo (KPIs, funil, por etapa/origem, previsão ponderada, vencidas); timeline/histórico da oportunidade; notificações internas |
| S6 | Endurecimento | Notificações por e-mail + scheduler (prazo vencido, contratação próxima); tela de auditoria com exportação; RLS nas tabelas `opp_*`; testes e2e das RN-001/002/008/013; manifests K8s; homologação |

Critérios de saída do MVP: RN-001 intransponível por qualquer caminho (API, PostgREST, SQL de
aplicação); SSO validado com a base real; dashboards conferindo com o banco; trilha de auditoria
completa; deploy reproduzível via imagem Docker.

## Roadmap evolutivo (M2+)

| Horizonte | Tema | Itens |
|---|---|---|
| M2 (3 meses) | Produtividade | Etapas 100% configuráveis via UI (hoje: seed + admin básico); dispensa de checklist com workflow de aprovação; @menções em comentários; preferências de notificação por tipo/canal; exportações (XLSX) de pipeline; anexos com verificação antivírus |
| M2 | RBAC pleno | Edição da matriz permissão × perfil dentro do portal (hoje somente leitura, gestão na Governança do Tetelestai); escopos por vertical/território reaproveitando `visible_vertical_ids()` |
| M3 (6 meses) | Integrações | SSO Entra ID no provedor corporativo (herdado por todas as micro-apps); integração com SPHRAGIS para assinatura de aceites/contratos; webhook/eventos para o Tetelestai (criar tarefas a partir de pendências de checklist); API pública parceiros (escopo restrito) |
| M3 | Inteligência | Score automático de probabilidade (histórico de conversão por origem/órgão/faixa de valor); alertas de estagnação (oportunidade parada > N dias na etapa); metas por gestor e forecast por trimestre |
| M4 (12 meses) | Escala | Multi-parceria (outros convênios além do SERPRO) com esteiras independentes; relatórios agendados por e-mail para diretoria; BI dedicado (extração para data warehouse); observabilidade completa (métricas Prometheus + tracing) |

## Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Regra de bloqueio contornada por acesso direto ao banco | Trigger RN-001 no Postgres + RLS (defesa em profundidade desde o MVP) |
| Divergência de identidade entre apps | Nenhuma cópia local de usuário; resolução `auth_user_id → users` a cada requisição, cache curto |
| Checklist virar burocracia (dispensas em massa) | Dispensa auditada com justificativa + relatório de dispensas no dashboard (M2) |
| Crescimento do storage de documentos | Política de retenção/arquivamento definida com jurídico (M3); versões imutáveis em storage frio |
