# 06 — Histórias de Usuário

Priorização MoSCoW; épicos alinhados ao roadmap (`10-roadmap.md`).
Critérios de aceite em Gherkin resumido.

## Épico A — Acesso e identidade (SSO)

**US-01 (Must)** — Como colaborador XPTO, quero entrar no portal com minha conta corporativa
(mesma do Tetelestai), para não gerenciar outra senha.
- *Dado* que possuo sessão corporativa ativa, *quando* acesso o portal, *então* entro sem novo login.
- *Dado* que não estou na base de usuários, *então* vejo "acesso não provisionado" e nada é criado.

**US-02 (Must)** — Como administrador, quero que as permissões do portal usem os perfis já
cadastrados, para governança única. — Aceite: permissões `opp.*` atribuíveis a perfis existentes;
usuário sem `opp.view` recebe 403 em qualquer rota.

## Épico B — Gestão de oportunidades

**US-03 (Must)** — Como comercial, quero cadastrar uma oportunidade informando origem, cliente,
objeto, solução, valores, probabilidade e responsáveis, para iniciar o acompanhamento.
- Criada sempre em *Leads Recebidos*, com código `OPP-AAAA-NNNN` e checklist instanciado.
- Origem "parceiro" exige parceiro vinculado.

**US-04 (Must)** — Como comercial, quero editar os dados da oportunidade com registro de quem
alterou o quê e quando. — Aceite: cada campo alterado gera linha de auditoria com valor
anterior/novo.

**US-05 (Must)** — Como gerente, quero encerrar uma oportunidade como ganha/perdida/cancelada com
justificativa, para manter o funil fiel. — Aceite: sem justificativa → bloqueado.

**US-06 (Should)** — Como administrador, quero reabrir uma oportunidade encerrada por engano,
com justificativa auditada.

## Épico C — Esteira de governança (checklist)

**US-07 (Must)** — Como gestor de governança, quero que a oportunidade **não avance de etapa**
enquanto houver documento obrigatório não aprovado, para garantir compliance.
- *Dado* item obrigatório pendente/rejeitado/em análise, *quando* tento avançar, *então* recebo a
  lista de pendências e nada muda (comportamento idêntico via API direta).

**US-08 (Must)** — Como comercial, quero ver na oportunidade o checklist da etapa com o status de
cada item e o percentual de avanço, para saber o que falta.

**US-09 (Must)** — Como administrador, quero parametrizar o checklist de cada etapa (incluir,
remover, marcar obrigatório, ordenar), sem afetar oportunidades já em andamento.

**US-10 (Should)** — Como gerente, quero dispensar um item de checklist com justificativa
(ex.: documento não se aplica), mantendo rastreabilidade.

**US-11 (Could)** — Como administrador, quero configurar as próprias etapas da esteira
(nomes, ordem, cores, ativação), para evoluir o processo sem código.

## Épico D — Documentos

**US-12 (Must)** — Como comercial, quero anexar documentos (nome, categoria, tipo, observações)
a um item do checklist, com upload seguro. — Aceite: tipo/tamanho validados; documento nasce
*em análise*.

**US-13 (Must)** — Como gerente, quero aprovar ou rejeitar documentos, com justificativa
obrigatória na rejeição; não posso aprovar documento que eu mesmo enviei.

**US-14 (Must)** — Como usuário, quero versionar documentos (nova versão preserva as anteriores)
e consultar o histórico completo (quem enviou, quando, observações).

**US-15 (Must)** — Como usuário autorizado, quero baixar qualquer versão por link temporário
assinado, com o download registrado em auditoria.

## Épico E — Pipeline e dashboards

**US-16 (Must)** — Como comercial, quero um Kanban com as 12 etapas mostrando por coluna o valor
total, a quantidade e, em cada card, o status documental e o % de avanço, para gerir visualmente.

**US-17 (Must)** — Como comercial, quero arrastar o card para a próxima etapa e, havendo
pendências, ver o bloqueio com a lista do que falta.

**US-18 (Must)** — Como diretor, quero dashboard com valor em pipeline, valor por etapa e por
origem, quantidade, taxa de conversão, tempo médio por etapa, vencidas, previsão ponderada de
receita e funil. — Aceite: valores conferem com o banco; filtros por período/origem/UF.

**US-19 (Should)** — Como diretor, quero rankings de parceiros e de gestores por valor e conversão.

## Épico F — Notificações

**US-20 (Must)** — Como envolvido na oportunidade, quero ser notificado (interno + e-mail) sobre
nova oportunidade, mudança de etapa, documento pendente/rejeitado e aprovação necessária.

**US-21 (Should)** — Como gestor, quero alertas de prazo vencido (fechamento previsto ultrapassado)
e de contratação próxima, gerados diariamente pelo sistema.

## Épico G — Auditoria e acesso

**US-22 (Must)** — Como auditor/diretor, quero consultar a trilha completa (quem criou, quem
alterou, campo, data/hora, documento anexado), com filtros e exportação.

**US-23 (Must)** — Como parceiro, quero ver apenas as oportunidades vinculadas à minha empresa,
podendo anexar documentos, sem acesso a valores de outras oportunidades.

**US-24 (Must)** — Como perfil Consulta, quero acesso somente leitura a pipeline e oportunidades,
sem qualquer botão de mutação.
