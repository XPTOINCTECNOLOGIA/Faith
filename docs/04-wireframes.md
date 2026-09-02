# 04 — Wireframes das Telas

Convenções: Material UI, layout com `AppBar` superior + `Drawer` lateral; densidade confortável;
tema claro/escuro. Toda tela respeita permissões — itens sem permissão não são renderizados
(e a API nega de qualquer forma).

## 0. Shell da aplicação

```
┌────────────────────────────────────────────────────────────────────────────┐
│ ☰  Portal de Oportunidades XPTO+SERPRO      🔍 busca    🔔(3)   👤 José ▾ │ AppBar
├──────────┬─────────────────────────────────────────────────────────────────┤
│ Pipeline │                                                                 │
│ Oportuni-│                     <conteúdo da rota>                          │
│  dades   │                                                                 │
│ Dashboard│                                                                 │
│ Clientes │                                                                 │
│ Parceiros│                                                                 │
│ ──────── │                                                                 │
│ Config.* │  * visível apenas com opp.config                                │
│ Auditoria│  * visível apenas com opp.audit.view                            │
└──────────┴─────────────────────────────────────────────────────────────────┘
```

## 1. Login (SSO)

```
┌──────────────────────────────────────────────┐
│              [logo XPTO + SERPRO]            │
│        Portal de Oportunidades               │
│                                              │
│   ┌──────────────────────────────────────┐   │
│   │  Entrar com a conta corporativa  →   │   │  (redireciona ao IdP; sem
│   └──────────────────────────────────────┘   │   formulário de senha local)
│   Sessão única com o Tetelestai (SSO).       │
└──────────────────────────────────────────────┘
```

## 2. Pipeline (Kanban) — tela principal

```
┌ Filtros: [Origem ▾][Gestor ▾][Parceiro ▾][UF ▾][valor min–max]  [+ Nova oportunidade] ┐
│                                                                                        │
│ Lead (8)      Qualif. (5)   Interesse (4)  Demanda (3) ...    Encerrada (12)           │
│ R$ 2,4M       R$ 1,1M       R$ 3,8M        R$ 900K           R$ 8,2M                   │
│ ┌──────────┐  ┌──────────┐  ┌──────────┐                                               │
│ │ OPP-0042 │  │ OPP-0038 │  │ OPP-0031 │   ← card:                                     │
│ │ Min.Saúde│  │ TJ-SP    │  │ Dataprev │     código + cliente                          │
│ │ R$ 450K  │  │ R$ 220K  │  │ R$ 1,2M  │     valor, probabilidade                      │
│ │ 70% ▓▓▓░ │  │ 40% ▓▓░░ │  │ 90% ▓▓▓▓ │     barra: % avanço checklist                 │
│ │ 📎 3/4 ⚠ │  │ 📎 2/2 ✔ │  │ 📎 1/3 ⚠ │     docs aprovados/obrigatórios               │
│ │ 🏢 XPTO  │  │ 🤝 Parc. │  │ 🏛 SERPRO│     chip de origem                            │
│ └──────────┘  └──────────┘  └──────────┘                                               │
│  (drag & drop só para a próxima coluna; solto com pendências → dialog de bloqueio      │
│   listando documentos faltantes, com link direto para a aba Documentos)                │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

Cabeçalho de cada coluna: quantidade, soma de `valor_estimado`, ícone de alerta se houver
oportunidade vencida (prazo de fechamento passado).

## 3. Detalhe da oportunidade (tabs)

```
┌ OPP-2026-0042 · Ministério da Saúde · [chip etapa: Proposta Comercial] [chip: Aberta] ─┐
│ R$ 450.000 estimado · 70% prob. · fecha em 15/10/2026 · Gestores: J.Filho / M.Costa    │
│ [Avançar etapa →]  [Encerrar ✕]                        (botões conforme permissão)     │
├─ Dados ─ Checklist ─ Documentos ─ Histórico ─ Comentários ──────────────────────────────┤
│                                                                                         │
│ ▸ Tab Dados: formulário em 2 colunas (campos da seção 2.6 do modelo de dados),          │
│   edição inline com salvar/cancelar; campos auditados.                                  │
│                                                                                         │
│ ▸ Tab Checklist (da etapa atual + etapas anteriores em acordeão):                       │
│   ┌───────────────────────────────────────────────────────────────┐                     │
│   │ ✔ Proposta emitida             Aprovado por M.Costa 02/09     │                     │
│   │ ⏳ Planilha de precificação     Em análise (v2)  [ver]         │                     │
│   │ ✖ Aprovação interna            Pendente  [enviar documento]   │                     │
│   └───────────────────────────────────────────────────────────────┘                     │
│   Barra "2 de 3 obrigatórios aprovados — avanço bloqueado".                             │
│                                                                                         │
│ ▸ Tab Documentos: tabela nome/categoria/tipo/versão/status/responsável/data +           │
│   [⬆ Upload] [⬇ Download] [Histórico de versões] [Aprovar/Rejeitar]*                    │
│   * exige opp.doc.approve; rejeição abre dialog com justificativa obrigatória.          │
│                                                                                         │
│ ▸ Tab Histórico: timeline (transições, uploads, aprovações, alterações de campo)        │
│   com autor, data/hora — leitura da trilha de auditoria.                                │
│                                                                                         │
│ ▸ Tab Comentários: thread simples com @menções (roadmap M2).                            │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

Dialog **Avançar etapa**: mostra etapa destino, resultado da validação do checklist
(lista verde/vermelha) e confirma. Dialog **Encerrar**: motivo (ganha/perdida/cancelada) +
justificativa obrigatória.

## 4. Nova oportunidade (stepper)

```
[1. Origem e cliente] → [2. Objeto e solução] → [3. Valores e prazos] → [4. Responsáveis] → Revisão
```
- Passo 1: origem (radio XPTO/Parceiro/SERPRO — parceiro obrigatório se origem parceira),
  cliente (autocomplete + "cadastrar novo" em dialog com CNPJ, órgão, município/UF, contato).
- Passo 3: valor estimado, receita prevista, probabilidade (slider %), complexidade,
  data prevista de fechamento.
- Ao concluir: oportunidade criada na etapa **Leads Recebidos**, checklist instanciado,
  notificação aos gestores.

## 5. Dashboard executivo

```
┌ KPI cards ──────────────────────────────────────────────────────────────────┐
│ [Pipeline total R$ 16,4M] [Oportunidades 47] [Conversão 23%] [Vencidas 5 ⚠] │
│ [Previsão de receita ponderada R$ 6,1M]                                     │
├──────────────────────────────┬──────────────────────────────────────────────┤
│ Funil de vendas (12 etapas,  │ Valor por etapa (barras)                     │
│ valor + qtde por etapa)      │                                              │
├──────────────────────────────┼──────────────────────────────────────────────┤
│ Valor por origem (donut:     │ Tempo médio por etapa (barras horizontais,   │
│ XPTO/Parceiro/SERPRO)        │ em dias — via opp_stage_transitions)         │
├──────────────────────────────┼──────────────────────────────────────────────┤
│ Ranking de parceiros (tabela │ Ranking de gestores (tabela: pipeline,       │
│ valor ganho, nº oportun.)    │ ganhas, taxa de conversão)                   │
└──────────────────────────────┴──────────────────────────────────────────────┘
Filtro global: período, origem, UF. Visível com opp.dashboard.view (Diretor+).
```

## 6. Configuração (Administrador)

- **Etapas**: lista ordenável (drag), ativar/desativar, cor; não permite excluir etapa com
  oportunidades.
- **Checklist por etapa**: tabela de templates (nome, categoria, obrigatório, ordem, ativo)
  com CRUD.
- **Perfis × permissões `opp.*`**: matriz somente leitura (a gestão é feita na Governança do
  Tetelestai — link direto), preparada para edição futura (RBAC pleno).

## 7. Notificações

Menu 🔔 com lista (título, oportunidade, tempo relativo, marcar como lida / todas).
Página completa com filtros por tipo. Preferências de e-mail por tipo (roadmap M2).

## 8. Auditoria (admin/diretoria)

Tabela filtrável: período, usuário, entidade, ação, oportunidade; colunas quem/quando/o quê
(campo, valor anterior → novo). Exportação CSV.
