# 07 — Regras de Negócio

Enforcement: **API** = validada no NestJS; **DB** = também garantida por constraint/trigger no
PostgreSQL (defesa em profundidade); **UI** = apenas conveniência visual, nunca única barreira.

| Código | Regra | Enforcement |
|---|---|---|
| **RN-001** | Uma oportunidade só avança para a próxima etapa quando **todos** os itens obrigatórios (`required=true`) do checklist da etapa atual estiverem com status `aprovado` ou `dispensado`. A violação retorna a lista de pendências e não altera nada. | API + DB (trigger `opp_guard_stage_transition`) + UI |
| **RN-002** | Transições válidas: etapa atual → etapa de `position` imediatamente seguinte, ou → *Encerrada* (qualquer ponto). Não há retrocesso de etapa, exceto reabertura administrativa (RN-016). | API + DB |
| **RN-003** | Toda oportunidade nasce na primeira etapa ativa (*Leads Recebidos*) com status `aberta` e código único `OPP-AAAA-NNNN` gerado pelo sistema. | API + DB (unique) |
| **RN-004** | Campos mínimos obrigatórios na criação: origem, cliente, objeto, solução, gestor XPTO. Probabilidade ∈ [0,100]; valores monetários ≥ 0; UF válida. | API + DB (checks) |
| **RN-005** | `lead_source = 'parceiro'` exige `partner_id` preenchido. | API + DB (check) |
| **RN-006** | CNPJ, quando informado, deve ser válido (dígitos verificadores) e único por cadastro (cliente/parceiro). | API + DB (unique) |
| **RN-007** | Ao entrar em uma etapa, o sistema instancia automaticamente os itens de checklist a partir dos templates **ativos** daquela etapa, sem duplicar itens já existentes. | API + DB (trigger) |
| **RN-008** | Encerramento exige resultado (`ganha`/`perdida`/`cancelada`) e justificativa. Oportunidade encerrada é imutável para perfis não administradores. | API + DB |
| **RN-009** | Dispensa de item de checklist exige permissão `opp.checklist.waive` e justificativa; fica registrada (quem/quando/por quê). | API |
| **RN-010** | Alterações em templates de checklist não afetam itens já instanciados (nome e obrigatoriedade são congelados na instância). | API (cópia na instância) |
| **RN-011** | Upload: extensões permitidas (pdf, docx, xlsx, pptx, png, jpg, zip — configurável), tamanho máximo 25 MB (configurável). Arquivos ficam em bucket privado; download somente por URL assinada expirável. | API |
| **RN-012** | Rejeição de documento exige justificativa. Aprovação/rejeição sempre referencia a versão revisada. | API + DB (check) |
| **RN-013** | O aprovador de um documento não pode ser o autor do upload da versão em análise (segregação de funções). | API |
| **RN-014** | Novo upload sobre documento `aprovado` cria nova versão e **reabre a análise** (documento e item voltam a `em_analise`). Versões anteriores são imutáveis e permanecem acessíveis. | API + DB |
| **RN-015** | Toda mutação (criar, alterar campo, transicionar, upload, aprovar, rejeitar, dispensar, download) gera registro de auditoria com ator, data/hora, entidade, campo e valores anterior/novo. A trilha é append-only. | API (interceptor) + DB (trigger de proteção) |
| **RN-016** | Reabertura de oportunidade encerrada: apenas `opp.admin`, com justificativa; retorna à etapa em que estava antes do encerramento. | API |
| **RN-017** | Escopo de visibilidade: perfis internos veem todas as oportunidades; **Parceiro** vê apenas oportunidades com `partner_id` da sua empresa; **Consulta** vê tudo somente leitura. | API (filtro por perfil) + DB (RLS) |
| **RN-018** | Dashboards e rankings exigem `opp.dashboard.view`; a API não retorna agregados a quem não os possui. | API |
| **RN-019** | Etapas não podem ser excluídas quando referenciadas por oportunidades ou histórico — apenas desativadas. A ordem (`position`) é única. | API + DB (FK/unique) |
| **RN-020** | Previsão de receita ponderada = Σ (`valor_estimado` × `probabilidade`/100) das oportunidades `aberta`. Taxa de conversão = ganhas ÷ encerradas do período. Tempo médio por etapa calculado de `opp_stage_transitions`. | API (dashboard) |
| **RN-021** | Notificações automáticas: `nova_oportunidade` (gestores), `mudanca_etapa` (envolvidos), `aprovacao_necessaria` (aprovadores, no upload), `documento_rejeitado` (autor do upload), `documento_pendente` (lembrete diário de itens pendentes há mais de N dias), `prazo_vencido` (fechamento previsto ultrapassado), `contratacao_proxima` (7 dias antes, etapa ≥ Aceite). Canais: interno sempre; e-mail conforme preferência (padrão ligado). | API + scheduler |
| **RN-022** | O portal não cria, altera nem remove usuários, perfis ou permissões — administração continua na Governança do Tetelestai. Usuário inativo/bloqueado na base corporativa perde acesso imediato (verificação a cada requisição). | API |
| **RN-023** | Pontos focais SERPRO: ao criar uma oportunidade, os pontos focais ativos cuja cobertura inclui a UF (e município, quando cadastrado) do cliente são vinculados automaticamente como responsáveis (`auto_assigned`). O time pode incluir, remover ou trocar responsáveis depois; pode haver **mais de um** responsável SERPRO por oportunidade, com no máximo um marcado como principal. | DB (trigger) |
| **RN-024** | Todo vínculo, remoção e marcação de principal de ponto focal em uma oportunidade gera registro na trilha de auditoria (`focal.vinculado`, `focal.removido`, `focal.principal`). | DB (trigger) |
