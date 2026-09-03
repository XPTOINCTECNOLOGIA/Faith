# Changelog — FAITH · Portal de Oportunidades XPTO + SERPRO

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
