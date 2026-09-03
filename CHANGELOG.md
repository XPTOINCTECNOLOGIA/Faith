# Changelog — FAITH · Portal de Oportunidades XPTO + SERPRO

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
