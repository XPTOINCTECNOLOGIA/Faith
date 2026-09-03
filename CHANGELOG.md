# Changelog — FAITH · Portal de Oportunidades XPTO + SERPRO

## 2.2.0 — 2026-09-03

- **Ficha Técnica Viva** (nova aba no projeto): descrição técnica da solução
  (escopo/arquitetura/premissas, com autor e data) + composição estruturada
  em itens — categoria (equipamentos, software, integrações, serviços,
  infraestrutura), quantidade/unidade, detalhe e status de ciclo de vida
  (previsto → homologado → contratado → implantado). Todos com `opp.view`
  veem a mesma realidade; `opp.update` edita. Exportação CSV (vira BOM de
  proposta). Migration 0081 (tabelas `opp_tech_specs`/`opp_tech_spec_items`
  com RLS e auditoria por trigger).
- **Linha do tempo do projeto** (aba Histórico repaginada): marcos manuais
  registrados pela equipe (reunião, envio, decisão, demanda, entrega, marco
  — com data retroativa) mesclados cronologicamente com os eventos
  automáticos do sistema, em timeline visual. Quem assume o projeto entende
  a história sem perguntar. Registrar marco pede só `opp.comment`; editar/
  remover é do autor ou de quem mantém a oportunidade (`opp_milestones`,
  auditada por trigger).

## 2.1.0 — 2026-09-03

- **Tela de "sem acesso"**: conta autenticada sem nenhuma permissão `opp.*`
  (perfil de outra aplicação do ecossistema ou externo ainda não liberado)
  passa a ver uma tela educada — quem é, por que não entrou e o que fazer —
  em vez de uma plataforma vazia.
- **Trilha de auditoria redesenhada**: nome real de quem fez (em vez de
  `#id`), ações humanizadas em pt-BR (incluindo `regress` — retorno de etapa
  RN-025 — e `promote`), badges por tom semântico, filtros por seleção
  (entidade/ação), tempo relativo ("há 3 h"), diff compacto com tooltip,
  link direto para a oportunidade e paginação real (25 por página).
- **Exportar CSV no radar**: botão "Exportar" nas Oportunidades gera CSV com
  os 17 campos oficiais + status no Pipeline, respeitando filtros e ordenação
  da tela (BOM + `;` — abre correto no Excel pt-BR).
- **Rótulos de auditoria unificados** (`lib/labels.ts`): Dashboard e
  Auditoria compartilham a mesma fonte; ações novas ganham nome em um só
  lugar.

## 2.0.1 — 2026-09-03

- **Mapa sem marca d'água**: o basemap anônimo do CARTO passou a carimbar
  "API key required" nos tiles; o mapa (Mapa Global e Dashboard) migrou para
  o Esri World Light Gray Canvas — gratuito com atribuição, sem chave e com a
  mesma estética clara da marca.

## 2.0.0 — 2026-09-03

- **Rebrand oficial "FAITH by XPTO"** (kit de marca derivado do Brand Book
  XPTO Inc. v3.0): paleta master (navy #101828, ciano #60CFE2 = ação, aço
  #638CAD = apoio, ardósia #2B4469 = dados, offwhite, grafite), tipografia
  Manrope (título 800), raios do kit (chip 9 / card 12), foco visível ciano.
- **Assets oficiais**: lockups (compacto no header navy, vertical no login com
  grafismo constelação), símbolo, favicon/ícones/apple-touch, manifest PWA e
  imagem OG do kit — nada de marca redesenhado no código.
- **Aplicação da marca**: appbar navy com busca em campo escuro e avatar-chip
  ciano; botões primários ciano com texto navy; pins do mapa no chip da marca
  (ciano/glifo navy; 100% no Pipeline = ardósia); KPI hero navy com dado em
  ciano; barras de dados em ardósia; badges em ciano-suave/ciano-escuro.
  Paletas de dados validadas (origem e esferas) permanecem.

## 1.3.0 — 2026-09-03

- **Voltar etapa (RN-025)**: quem possui `opp.admin` (ex.: SUPER ADMIN) pode
  retornar uma oportunidade aberta a qualquer etapa anterior não-terminal —
  botão "Voltar etapa" no detalhe, com escolha da etapa e justificativa
  obrigatória; o banco valida a permissão (migration 0078) e a auditoria
  registra a ação própria `regress`. Avanço segue RN-001/RN-002 para todos.
- **Internacional como esfera nas visões**: o donut "Prospecção por esfera"
  do Dashboard e a lista/filtro de Oportunidades passam a separar as
  propostas internacionais da esfera Federal nacional (Federal ·
  Internacional · Estadual · Municipal, paleta do anel revalidada nas 6
  checagens, incluindo o par de fechamento).

## 1.2.0 — 2026-09-03

- **Dashboard no padrão visual do mapa**: KPI hero com o gradiente da marca
  (valor total pipeline + radar), painel "Presença geográfica" com o próprio
  mapa interativo embutido (clique leva ao Mapa Global), donut "Prospecção
  por esfera" com paleta categórica validada (Federal/Estadual/Municipal),
  gap entre fatias, tooltip por fatia, total no centro e legenda com valores;
  barras por hunter e por estágio do pipeline; atividades recentes em faixa
  de largura total com marcador da marca. Mapa compartilhado como componente
  (GeoMap) e carregado sob demanda.

## 1.1.0 — 2026-09-03

- **Mapa Global** (novo item do menu): mapa-múndi interativo (Leaflet + CARTO)
  com pins agrupados por localidade — capital da UF, município conhecido ou
  capital do país — mostrando a contagem de oportunidades; pin verde quando
  100% da localidade já está no Pipeline. Clique no pin abre painel com as
  oportunidades do local (órgão em destaque, valores, status/etapa e atalhos
  Abrir/Detalhes); filtros Todas/Brasil/Internacional, legenda e ajuste
  automático de enquadramento. Carregado sob demanda (code-splitting).
- **Menu recolhível**: sidebar desliza entre completa (240px) e compacta de
  ícones (72px) com animação, tooltips no modo compacto e preferência
  lembrada; no mobile vira menu hambúrguer com drawer temporário.

## 1.0.0 — 2026-09-03

- **Redesign completo (FAITH Design System v1 — "Executivo claro")**: tema
  claro premium (canvas neutro, superfícies brancas, bordas sutis, Inter,
  escala tipográfica fixa, azul corporativo #1a56db, status semânticos),
  foco visível para navegação por teclado.
- **Nova navegação**: sidebar enterprise em seções (Visão geral / Cadastros /
  Governança) e header com busca global de oportunidades; rotas novas
  (/ → Dashboard, /oportunidades, /pipeline, /orgaos) com redirects legados.
- **Dashboard executivo em 3 linhas**: KPIs (total, valor pipeline+radar,
  previsão de receita, conversão), distribuições (por estágio, esfera,
  UF/país, hunter/origem) e listas operacionais (top oportunidades,
  próximos vencimentos, atividades recentes).
- **Oportunidades**: visões Lista agrupada e Tabela enterprise (sticky
  header, ordenação, health score de completude, próxima ação) com drawer
  executivo de detalhe (promover/editar/remover).
- **Pipeline**: colunas em trilha neutra com indicador de cor da etapa e
  cards com faixa da origem, cliente em destaque e progresso do checklist.
- Login com painel de marca em navy e formulário claro.

## 0.4.0 — 2026-09-03

- **Radar redesenhado**: lista enxuta agrupada por esfera (Federal/Estadual/
  Municipal), cada linha mostra só o essencial — bandeira, oportunidade e
  local/órgão; os demais dados abrem ao clicar (painel expansível) com as
  ações Editar/Remover.
- **Radar integrado à aplicação**: botão "Promover ao Pipeline" cria a
  oportunidade na esteira de governança reaproveitando/criando o Cliente
  (órgão) e o Parceiro automaticamente, com origem derivada do hunter
  (SERPRO/parceiro/XPTO), valor estimado, prazo e observações preenchidos;
  o registro do radar fica vinculado (chip com o código OPP e a etapa,
  clicável) e não promove duas vezes (migration 0077, promoção auditada).
- **Dashboard**: nova faixa "Radar de prospecção" com totais, contagem por
  esfera e promovidas, linkando para o radar.

## 0.3.0 — 2026-09-03

- **Radar de Oportunidades** (menu "Radar"): base padronizada de prospecção
  comercial com os campos oficiais do negócio. Regras de modelagem aplicadas
  automaticamente pelo banco (migration 0076 do TETELESTAI): valor mensal
  sempre calculado (R5), hunter SERPRO força parceiro N/A (R6), bandeira
  automática por país/estado/município (R7), moeda pt-BR (R8), "Não informado"
  para dados ausentes (R9), N/A por esfera (R3) e Nacional = Brasil (R4).
- KPIs do radar (quantidade, valor total, receita mensal estimada), filtros
  por esfera/UF/busca, criação/edição com pré-visualização do valor mensal e
  remoção auditada. Carga inicial: 14 oportunidades da base oficial.

## 0.2.0 — 2026-09-03

- **Pontos Focais SERPRO**: nova área de cadastro (menu "Pontos Focais") com papel
  (Responsável de Departamento / Divisão Pública da Região), região e cobertura por
  UF e município; edição, desativação/reativação, filtros por UF e nome.
- **Responsáveis SERPRO na oportunidade** (aba Dados): vínculo de múltiplos
  responsáveis, marcação de principal (⭐), remoção e chip "automático".
- **RN-023**: auto-vínculo dos pontos focais que cobrem a UF/município do cliente
  na criação da oportunidade (trigger no banco — migration 0075 do TETELESTAI).
- **RN-024**: auditoria de vínculo, remoção e troca de principal.
- Carga inicial: base oficial SERPRO (4 regiões, 27 UFs, 8 pontos focais).

## 0.1.1 — 2026-09-03

- Migração para o repositório próprio `xptoinc/Faith` (histórico preservado),
  seguindo a convenção do ecossistema: um repositório por aplicação, banco único.
- Projeto Vercel conectado a este repositório com deploy automático na `main`.

## 0.1.0 — 2026-09-03

- Versão inicial em produção: pipeline Kanban de 12 etapas com checklist
  documental obrigatório (RN-001/002/007), módulo de documentos com versionamento
  e aprovação, dashboard executivo, clientes/parceiros, auditoria e notificações.
- Modo ecossistema: SPA React + MUI direto no Supabase corporativo (mesma base de
  usuários do Tetelestai, SSO GoTrue); governança por triggers + RLS
  (migrations 0073/0074 do TETELESTAI).
