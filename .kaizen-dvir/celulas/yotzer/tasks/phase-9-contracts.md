---
task_id: phase-9-contracts
agent: contract-builder
phase: 9
elicit: false
critical_invariant: false
pre_condition:
  - phase_8_pass: true
  - tasks_dir_present: tasks/
schema_gate_target: celula-schema.json
schema_gate_extension: task-contract-schema.json
schema_gate_perf_budget_ms: 500
yaml_to_json_intermediate: false
post_condition:
  - contracts_dir_populated: contracts/
  - all_contracts_pass_schema_gate: true
  - per_field_pt_br_error_on_violation: true
  - quality_gate_f9_pass: true
api:
  schema_gate: [validate]
  handoff_engine: [generate, persist, readLatest]
  quality_gate: [evaluate]
templates:
  - contracts-tmpl.yaml
---

# F9 — Contracts (per-Task YAML contracts via Schema Gate direto)

<!--
Machine frontmatter EN. Corpo pt-BR para o expert.
Contract-builder executa; chief julga; expert decide ambiguidade de
tipo via elicit.
Nao-critico: Quality Gate auto-aprova em modo automatico quando PASS.
Schema Gate valida YAML diretamente — sem conversao YAML para JSON
intermediaria (FR-020, D-v1.1-06).
Schema Gate sob 500ms por contrato (NFR-003).
Erro por campo em pt-BR (AC-104, NFR-101, NFR-102).
-->

## O que esta fase faz

F9 fecha contratos. Contract-builder le as Tasks de F8 e escreve um
contrato YAML por Task com inputs tipados, outputs esperados e gates
aplicaveis. M3.4 Schema Gate valida o YAML diretamente contra
`celula-schema.json` e `task-contract-schema.json` em
`.kaizen-dvir/dvir/schemas/`. Sem conversao YAML para JSON
intermediaria (FR-020, D-v1.1-06). Sob 500ms por contrato (NFR-003).
Quando o schema identifica problema, Schema Gate emite erro por campo
em pt-BR (AC-104).

## Pre-condicao

- F8 fechada sem pendencia.
- `tasks/` da celula gerada populado com Tasks atomicas e Actions
  inline.

## YAML primeiro — sem conversao intermediaria (FR-020, D-v1.1-06)

Schema Gate consome YAML direto. Recebe path do contrato e path do
schema. Devolve verdict, errors, durationMs. Nao existe arquivo JSON
intermediario gerado em runtime. Esta regra e load-bearing.

A violacao surge ao expert em pt-BR:

`detectei conversao do YAML para JSON intermediario. o convenio do
framework exige validacao direta no YAML (FR-020, D-v1.1-06).`

## Erro por campo em pt-BR (AC-104, NFR-101, NFR-102)

Quando o Schema Gate identifica problema, ele devolve lista de erros.
Cada erro nomeia o campo ofensor, descreve o problema e sugere a
correcao em pt-BR. NFR-101 exige que a mensagem oriente. NFR-102 exige
pt-BR.

Exemplos:

- `path: inputs[0].type` — `tipo invalido em inputs[0]. use string, number, boolean, object ou array.`
- `path: outputs` — `lista vazia em outputs. declare ao menos uma saida esperada.`
- `path: gates` — `lista vazia em gates. declare ao menos um gate aplicavel.`

## Passos da fase

1. Contract-builder le `tasks/` via
   `handoff-engine.readLatest('contract-builder')`. O handoff carrega
   ponteiros para `tasks/` e revisao corrente do `OST.md`.
2. Para cada Task em `tasks/`, contract-builder escreve
   `contracts/<task-id>.yaml` seguindo `contracts-tmpl.yaml`. O
   contrato declara:
   ```yaml
   task_id: <task-id>
   description: <descricao curta em pt-BR>
   inputs:
     - name: <nome>
       type: <string|number|boolean|object|array>
       description: <pt-BR>
       required: true
   outputs:
     - name: <nome>
       type: <string|number|boolean|object|array>
       description: <pt-BR>
   gates:
     - <gate-id>
   schema_reference: ".kaizen-dvir/dvir/schemas/task-contract-schema.json"
   ```
3. Contract-builder invoca M3.4 Schema Gate sobre cada contrato
   diretamente. Sem conversao YAML para JSON intermediaria
   (FR-020, D-v1.1-06). Schema Gate retorna `verdict`, `errors`,
   `durationMs`.
4. Quando o schema confere e `durationMs < 500`, contract-builder
   fecha o contrato.
5. Quando o schema confere mas `durationMs >= 500`, contract-builder
   surge ao expert pedindo revisao do tamanho do contrato (NFR-003).
6. Quando o schema identifica problema, Schema Gate emite erro por
   campo em pt-BR (AC-104). Contract-builder bloqueia avanco. Task
   volta para task-granulator para ajuste estrutural OU para
   archaeologist se o passo do processo de origem estiver incompleto.
7. Task vazia ou incompleta dispara bloqueio em F10. F10 nao roda sem
   Schema Gate PASS em todo contrato. Mensagem em pt-BR:
   `a Task <id> ainda nao tem contrato valido. F10 espera Schema Gate
   PASS em todo contrato. revise inputs, outputs e gates.`
8. Contract-builder gera handoff F9→F10 via
   `handoff-engine.generate()` + `persist()`. O payload carrega
   ponteiros para `contracts/` da celula gerada. Fica abaixo de 500
   tokens.
8a. Contract-builder roda
   `post-condition-checker.checkArtefacts(celulaPath,
   ['contracts/'], { phase: 9 })` antes da apresentacao do gate. O
   verificador pausa a etapa quando `contracts/` nao existe ou esta
   vazio. A validacao de schema continua sendo feita pelo Schema
   Gate sobre cada arquivo do diretorio. Mesma checagem roda em modo
   interativo e em modo automatico.
9. Chief apresenta a checagem da fase 9. F9 nao e critica: fecha
   sozinha em modo automatico quando todos os contratos passam no
   Schema Gate sem pendencia. Orcamento estourado surge ao expert com
   escolha. Problema que exige ajuste pausa em qualquer modo.

## Post-condicao

- `contracts/` da celula gerada populado com `<task-id>.yaml` por
  Task.
- todo contrato confere no Schema Gate sem pendencia.
- toda validacao com problema emite erro por campo em pt-BR (AC-104).
- nenhuma Task vazia ou incompleta avanca para F10.
- Checagem da fase 9 fechada sem pendencia.

## Schemas consumidos

| Schema | Uso |
|--------|-----|
| `.kaizen-dvir/dvir/schemas/celula-schema.json` | manifesto da celula gerada (consumido por F10) |
| `.kaizen-dvir/dvir/schemas/task-contract-schema.json` | contrato YAML por Task em F9 |

## Quality Gate F9 — criterios

| Id | Severidade | Verifica |
|----|------------|----------|
| F9-SCHEMA-GATE-PASS | critical | todo contrato passa Schema Gate |
| F9-NO-JSON-INTERMEDIATE | critical | sem conversao YAML para JSON intermediaria |
| F9-PER-FIELD-ERROR | critical | FAIL emite erro por campo em pt-BR |
| F9-NO-EMPTY-TASK | critical | nenhuma Task vazia avanca |
| F9-PERF-500MS | high | toda validacao sob 500ms |

## Veto conditions

Contract-builder nao deixa Task sem contrato. Contract-builder nao
emite erro generico. Contract-builder nao converte YAML para JSON
intermediario. Contract-builder nao reimplementa schema.

## pt-BR — mensagens padrao

- bloqueio de pre-condicao: `a fase 9 precisa que a fase 8 esteja fechada antes. execute a fase 8 primeiro.`
- contrato invalido: `a Task <id> ainda nao tem contrato valido. a publicacao espera contrato limpo antes de seguir. revise inputs, outputs e gates.`
- erro de campo: `o campo <campo> esta invalido. <razao em pt-BR>. <sugestao em pt-BR>.`
- orcamento estourado: `a validacao do contrato <id> levou <ms>ms (acima do orcamento de 500ms). quer revisar o tamanho do contrato ou seguir mesmo assim?`
- conversao detectada: `detectei conversao do YAML para JSON intermediario. o convenio do framework exige validacao direta no YAML (FR-020, D-v1.1-06).`

## Referencia de escrita

Toda saida ao expert segue
`arquivos-relevantes/01-contexto-danilo/diretrizes-escrita.md`. Frases
curtas. Presente. Voz ativa. Sem adverbios.
