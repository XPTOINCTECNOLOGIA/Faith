# 05 — Casos de Uso

Atores: **Comercial** (XPTO ou SERPRO), **Gerente Comercial**, **Diretor**, **Administrador**,
**Parceiro**, **Consulta**, **Sistema** (scheduler). Todos os casos exigem sessão SSO válida
(UC-01) e permissão correspondente; toda mutação gera auditoria (UC-14, implícito).

## UC-01 — Autenticar via SSO
- **Ator**: todos.
- **Fluxo principal**: usuário acessa o portal → SPA detecta ausência de sessão → redireciona ao
  IdP corporativo → retorno com token → API resolve `users` + permissões → sessão ativa.
- **Alternativos**: A1 usuário sem cadastro na base corporativa → tela "acesso não provisionado";
  A2 usuário bloqueado/inativo → 403 com orientação; A3 sessão já existente (vinda do Tetelestai)
  → entra direto, sem novo login.
- **Pós-condição**: identidade e permissões em contexto; nenhum credencial armazenado no portal.

## UC-02 — Cadastrar oportunidade
- **Ator**: Comercial, Gerente, Administrador (`opp.create`).
- **Pré**: cliente cadastrado ou dados para cadastrá-lo.
- **Fluxo**: preencher stepper (origem, cliente, objeto/solução, valores, responsáveis) → validação
  (RN-004..RN-006) → criação na etapa *Leads Recebidos* → checklist da etapa instanciado →
  notificação `nova_oportunidade` aos gestores designados.
- **Alternativos**: A1 origem = parceiro sem parceiro informado → erro RN-005; A2 CNPJ inválido →
  erro de validação.

## UC-03 — Editar oportunidade
- **Ator**: Comercial responsável, Gerente, Administrador (`opp.update`).
- **Fluxo**: alterar campos → gravação → auditoria campo a campo (valor anterior/novo).
- **Alternativos**: A1 oportunidade encerrada → somente Administrador reabre (UC-13) antes de editar.

## UC-04 — Avançar etapa
- **Ator**: Comercial responsável, Gerente, Administrador (`opp.move_stage`).
- **Pré**: todos os itens obrigatórios do checklist da etapa atual com documento **aprovado**
  (ou dispensados por quem pode, RN-009).
- **Fluxo**: solicitar avanço → API valida sequência (RN-002) e checklist (RN-001) → transação:
  atualiza etapa, grava transição, instancia checklist da nova etapa, audita, notifica
  (`mudanca_etapa`).
- **Alternativos**: A1 pendências → 409 com lista de documentos faltantes (nada é alterado);
  A2 etapa fora de sequência → 422.

## UC-05 — Encerrar oportunidade
- **Ator**: Gerente, Diretor, Administrador (`opp.close`).
- **Fluxo**: informar resultado (ganha/perdida/cancelada) + justificativa → move para *Encerrada*,
  status atualizado, transição e auditoria gravadas.
- **Alternativos**: A1 sem justificativa → 422 (RN-008).

## UC-06 — Enviar documento (upload)
- **Ator**: Comercial, Gerente, Administrador, Parceiro* (`opp.doc.upload`; *apenas em
  oportunidades do próprio parceiro).
- **Fluxo**: escolher item do checklist (ou documento avulso) → upload (tipo/tamanho validados,
  RN-011) → cria/atualiza `opp_documents` + nova `opp_document_versions` (v = atual + 1) →
  status do documento e do item = *em análise* → notificação `aprovacao_necessaria` aos aprovadores.
- **Alternativos**: A1 arquivo fora da política → 422; A2 nova versão sobre documento aprovado →
  reabre análise (RN-014).

## UC-07 — Aprovar ou rejeitar documento
- **Ator**: Gerente, Diretor, Administrador (`opp.doc.approve`).
- **Pré**: documento em análise; aprovador ≠ autor do upload (RN-013).
- **Fluxo**: revisar → aprovar (item do checklist vira *aprovado*) ou rejeitar com justificativa
  obrigatória (RN-012; item vira *rejeitado*, notificação `documento_rejeitado` ao remetente).
- **Pós**: `opp_document_reviews` gravado; % de avanço da etapa recalculado.

## UC-08 — Baixar documento / consultar histórico de versões
- **Ator**: qualquer perfil com acesso à oportunidade (`opp.view`).
- **Fluxo**: solicitar download → API gera URL assinada expirável → auditoria de acesso (download
  é registrado).

## UC-09 — Visualizar pipeline (Kanban)
- **Ator**: todos com `opp.view` (Parceiro vê só as próprias; Consulta vê tudo somente leitura).
- **Fluxo**: colunas por etapa com totais; filtros; drag & drop chama UC-04.

## UC-10 — Consultar dashboard executivo
- **Ator**: Diretor, Gerente, Administrador (`opp.dashboard.view`).
- **Fluxo**: KPIs, funil, valores por etapa/origem, conversão, tempo médio por etapa, vencidas,
  previsão ponderada (Σ valor × probabilidade), rankings de parceiros e gestores; filtros por
  período/origem/UF.

## UC-11 — Configurar etapas e checklists
- **Ator**: Administrador (`opp.config`).
- **Fluxo**: CRUD de etapas (reordenar, cor, ativar) e de templates de checklist por etapa.
- **Alternativos**: A1 excluir etapa com oportunidades → negado (desativar apenas);
  A2 alterar template não afeta checklists já instanciados (congelamento, RN-010).

## UC-12 — Gerenciar notificações
- **Ator**: todos. Marcar lida/todas; **Sistema**: gera `prazo_vencido` (diário) e
  `contratacao_proxima` (7 dias antes da data prevista com etapa ≥ Aceite) e envia e-mails.

## UC-13 — Reabrir oportunidade encerrada
- **Ator**: Administrador (`opp.admin`).
- **Fluxo**: justificativa obrigatória → volta à etapa anterior ao encerramento → auditoria.

## UC-14 — Consultar trilha de auditoria
- **Ator**: Administrador, Diretor (`opp.audit.view`).
- **Fluxo**: filtros (período, usuário, entidade, oportunidade) → visualização/exportação CSV.

## UC-15 — Gerenciar clientes e parceiros
- **Ator**: Comercial+, Administrador (`opp.client.manage` / `opp.partner.manage`).
- **Fluxo**: CRUD com validação de CNPJ; exclusão apenas lógica quando referenciado.
