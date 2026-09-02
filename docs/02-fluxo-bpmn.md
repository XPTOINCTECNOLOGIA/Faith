# 02 — Fluxograma BPMN do Processo Comercial

## 1. Processo macro (pool única, 12 etapas)

O processo é uma esteira sequencial com **gateways de governança documental** entre as etapas:
a transição N → N+1 só ocorre quando todos os itens obrigatórios do checklist da etapa N estão
com documento **aprovado** (RN-001). Qualquer etapa pode desviar para **Encerrada** com motivo
(perdida, cancelada, sem interesse — RN-008).

```mermaid
flowchart TD
    START((Início)) --> ORIG{Origem do lead}
    ORIG -->|Captado XPTO| E1
    ORIG -->|Empresa parceira| E1
    ORIG -->|Orgânico SERPRO| E1

    E1[1. Leads Recebidos] --> G1{Qualificado?}
    G1 -->|Não| ENC
    G1 -->|Sim| E2[2. Qualificação]

    E2 --> C2{Checklist da etapa\naprovado?}
    C2 -->|Não - bloqueia| E2
    C2 -->|Sim| E3[3. Manifestação de Interesse]

    E3 --> C3{E-mail formal, órgão,\nresponsável, necessidade\naprovados?}
    C3 -->|Não - bloqueia| E3
    C3 -->|Sim| E4[4. Entendimento da Demanda]

    E4 --> C4{Ata, levantamento técnico,\nescopo preliminar aprovados?}
    C4 -->|Não - bloqueia| E4
    C4 -->|Sim| E5[5. Apresentação da Solução]

    E5 --> C5{Apresentação comercial e\narquitetura proposta aprovadas?}
    C5 -->|Não - bloqueia| E5
    C5 -->|Sim| E6[6. Proposta Comercial]

    E6 --> C6{Proposta, precificação e\naprovação interna aprovadas?}
    C6 -->|Não - bloqueia| E6
    C6 -->|Sim| E7[7. Aceite da Proposta]

    E7 --> C7{Documento de aceite e\naprovação formal do cliente?}
    C7 -->|Não - bloqueia| E7
    C7 -->|Sim| E8[8. Contratação]

    E8 --> C8{Minuta, parecer jurídico e\ndocumentação legal aprovados?}
    C8 -->|Não - bloqueia| E8
    C8 -->|Sim| E9[9. Implantação]

    E9 --> C9{Plano, checklist de instalação\ne aceite técnico aprovados?}
    C9 -->|Não - bloqueia| E9
    C9 -->|Sim| E10[10. Operação e Suporte]

    E10 --> C10{SLA, plano de suporte e\nregistro de operação aprovados?}
    C10 -->|Não - bloqueia| E10
    C10 -->|Sim| E11[11. Expansão e Evolução]

    E11 --> E12[12. Encerrada - ciclo concluído]
    E1 & E2 & E3 & E4 & E5 & E6 & E7 & E8 & E9 & E10 & E11 -.->|perda / cancelamento\ncom justificativa| ENC[12. Encerrada]
    E12 --> FIM((Fim))
    ENC --> FIM
```

## 2. Subprocesso: transição de etapa (executado pela API a cada tentativa)

```mermaid
flowchart TD
    A[Usuário solicita mover\noportunidade para etapa alvo] --> P1{Possui permissão\nopp.move_stage?}
    P1 -->|Não| R1[403 - negado + auditoria]
    P1 -->|Sim| P2{Etapa alvo é a próxima\nda esteira ou Encerrada?}
    P2 -->|Não| R2[422 - transição inválida RN-002]
    P2 -->|Sim, Encerrada| J{Justificativa e motivo\ninformados?}
    J -->|Não| R3[422 - motivo obrigatório RN-008]
    J -->|Sim| OK
    P2 -->|Sim, próxima| P3{Todos os itens obrigatórios do\nchecklist da etapa atual têm\ndocumento APROVADO?}
    P3 -->|Não| R4[409 - lista de pendências\nRN-001 - avanço bloqueado]
    P3 -->|Sim| OK[Transação:\n1. atualiza etapa\n2. grava opp_stage_transitions\n3. grava opp_audit_log\n4. instancia checklist da nova etapa\n5. dispara notificações]
    OK --> FIM((200 OK))
```

## 3. Subprocesso: ciclo de vida de um documento

```mermaid
stateDiagram-v2
    [*] --> Pendente: item de checklist instanciado
    Pendente --> EmAnalise: upload de versão (v1)
    EmAnalise --> Aprovado: aprovação (com registro do aprovador)
    EmAnalise --> Rejeitado: rejeição (justificativa obrigatória)
    Rejeitado --> EmAnalise: nova versão (v2, v3, ...)
    Aprovado --> EmAnalise: nova versão substitui - reabre análise (RN-014)
    Aprovado --> [*]
```

## 4. Raias (responsabilidades por etapa — visão BPMN de lanes)

| Etapa | Lane principal | Apoio |
|---|---|---|
| Leads Recebidos, Qualificação | Comercial XPTO / SERPRO | Parceiro (quando origem parceira) |
| Manifestação de Interesse, Entendimento da Demanda | Comercial responsável | Cliente/órgão (documentos de entrada) |
| Apresentação da Solução, Proposta Comercial | Comercial + Gerente Comercial | Pré-vendas/técnico |
| Aceite, Contratação | Gerente Comercial | Jurídico (parecer), Diretoria (aprovação interna) |
| Implantação | Gestor técnico | Comercial (acompanhamento) |
| Operação/Suporte, Expansão | Gestor de operação | Comercial (upsell) |

A aprovação de documentos exige `opp.doc.approve` (por padrão Gerente Comercial, Diretor e
Administrador) — quem faz upload não aprova o próprio documento (RN-013).
