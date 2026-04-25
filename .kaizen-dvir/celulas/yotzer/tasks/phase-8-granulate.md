---
task_id: phase-8-granulate
agent: task-granulator
phase: 8
elicit: true
critical_invariant: false
pre_condition:
  - phase_7_pass: true
  - mvp_backlog_present: mvp-backlog.yaml
hierarchy:
  - role
  - workflow
  - task
  - action
granularity_max_actions: 7
emit_action_md: false
actions_inline_contract: true
post_condition:
  - tasks_dir_populated: tasks/
  - tasks_have_inline_actions: true
  - no_action_md_emitted: true
  - ost_tasks_linked_to_solutions: OST.md
  - quality_gate_f8_pass: true
api:
  ost_writer: [appendChangeLog]
  handoff_engine: [generate, persist, readLatest]
  quality_gate: [evaluate]
checklists:
  - action-observability.md
templates:
  - task-tmpl.yaml
  - action-conceptual-reference-tmpl.yaml
  - agent-tmpl.yaml
---

# F8 — Granulate (RC-21, Tasks atomicas, Actions inline, OST fechado)

<!--
Machine frontmatter EN. Corpo pt-BR para o expert.
Task-granulator executa; chief julga; expert aprova ambiguidade
estrutural via elicit.
Nao-critico: Quality Gate auto-aprova em modo automatico quando PASS.
F8 e a UNICA fase de granularizacao (consolidacao v1.2).
Actions sao INLINE no markdown da Task (AC-119, D-v1.3-04).
NENHUM arquivo action-*.md sai de F8.
-->

## O que esta fase faz

F8 granulariza. Task-granulator le `mvp-backlog.yaml` de F7 e
decompoe cada PU do MVP em Tasks atomicas com Actions inline. Aplica
RC-21 (Role > Workflow > Task > Action). Aplica regra de granularidade
(mais de 5 a 7 Actions vira split ou skill). Liga cada Task a uma
Solution no `OST.md` — fecha a cadeia Task → Solution → Opportunity →
Outcome (AC-117). NUNCA emite arquivo `action-*.md` em runtime
(AC-119, D-v1.3-04).

## Pre-condicao

- F7 em PASS.
- `mvp-backlog.yaml` presente na celula gerada.
- `OST.md` com Solutions marcadas mvp.

## Contrato Actions-inline (AC-119, D-v1.3-04)

Actions sao instrucoes markdown inline DENTRO do arquivo da Task.
Cada Task tem uma secao `## Actions` com lista numerada de Actions.

NENHUM arquivo `action-*.md` pode ser emitido em runtime (AC-119,
D-v1.3-04). Esta regra e load-bearing. F8 nao escreve arquivo separado
de Action. F10 publisher revalida na publicacao.

A violacao dispara FAIL com pt-BR:

`Actions inline na Task. nenhum arquivo action-*.md sai. AC-119,
D-v1.3-04. remova o arquivo e mova as Actions para o corpo da Task.`

## Comportamento observavel — fronteira de PASS/FAIL (AC-108B)

Cada Action descreve comportamento observavel. Adjetivo inferencial
dispara FAIL. Exemplos:

| Forma | Verdict |
|-------|---------|
| `levante o tom de voz` | PASS |
| `aumente 20% a velocidade ao descrever o beneficio chave` | PASS |
| `seja carismatico` | FAIL — adjetivo inferencial |
| `mostre confianca` | FAIL — adjetivo inferencial |
| `pause 2 segundos antes de revelar o preco` | PASS |

Quality Gate F8 invoca o checklist `action-observability.md` antes
de fechar o veredito.

## Regra de granularidade

Task com mais de 5 a 7 Actions dispara split em duas Tasks OU
extracao de skill reusavel. Task com 8 ou mais Actions sem split nem
extracao dispara FAIL.

A skill extraida fica registrada como prosa em pt-BR. Skill fica fora
do escopo de Yotzer; a forma fica registrada para reuso futuro.

## Passos da fase

1. Task-granulator le `mvp-backlog.yaml` via
   `handoff-engine.readLatest('task-granulator')`. O handoff carrega
   ponteiros para `mvp-backlog.yaml` e a revisao corrente do `OST.md`.
2. Para cada PU do MVP, task-granulator decompoe em uma ou mais
   Tasks. Cada Task fica em arquivo `tasks/<task-id>.md` com
   frontmatter EN e corpo pt-BR. Cada Task carrega `id`, `pu_pai`,
   `solution_id` (Solution ligada no OST), `executor_hint`,
   `estimated_effort`, e secao `## Actions` com Actions inline.
3. Task-granulator garante: nenhum arquivo `action-*.md` e criado.
   Actions ficam exclusivamente como markdown na Task.
4. Task-granulator valida cada Action por comportamento observavel.
   Adjetivo inferencial dispara FAIL com mensagem em pt-BR.
5. Task-granulator aplica regra de granularidade. Task com mais de 5
   a 7 Actions vira split ou skill. Task com 8 ou mais sem
   tratamento dispara FAIL.
6. Task-granulator liga cada Task a uma Solution no `OST.md` via
   `ost-writer.appendChangeLog()`. A linha registra:
   ```
   - <iso-timestamp> — @task-granulator — ligou TASK-XXX a SOL-YYY (PU-ZZZ).
   ```
7. Task-granulator gera handoff F8→F9 via
   `handoff-engine.generate()` + `persist()`. O payload carrega
   ponteiros para `tasks/` da celula gerada e a revisao corrente do
   `OST.md` com Tasks ligadas. Fica abaixo de 500 tokens.
8. Chief apresenta Quality Gate F8. F8 nao e critico: auto-aprova em
   modo automatico quando o gate retorna PASS. Quality Gate F8 invoca
   o checklist `action-observability.md`. CONCERNS surge ao expert em
   qualquer modo. FAIL pausa em qualquer modo.

## Post-condicao

- `tasks/` da celula gerada populado com arquivos `<task-id>.md`.
- toda Task carrega Actions inline na secao `## Actions`.
- nenhum arquivo `action-*.md` foi emitido em runtime (AC-119,
  D-v1.3-04).
- `OST.md` com cada Task ligada a exatamente uma Solution (AC-117).
- toda Action descreve comportamento observavel (AC-108B).
- toda Task respeita regra de granularidade (5 a 7 Actions OU split
  OU skill extraida).
- Quality Gate F8 em PASS.

## Test hook explicito

Nenhum arquivo `action-*.md` pode ser emitido em runtime (AC-119,
D-v1.3-04). O teste `test-task-granulator-actions-inline.js` afirma
`fs.existsSync` falso para qualquer padrao `action-*.md` sob o
diretorio `tasks/` da celula gerada apos rodada de F8.

## Quality Gate F8 — criterios

| Id | Severidade | Verifica |
|----|------------|----------|
| F8-ACTIONS-INLINE | critical | nenhum arquivo `action-*.md` emitido (AC-119) |
| F8-OBSERVABLE-ACTIONS | critical | toda Action descreve comportamento observavel (AC-108B) |
| F8-GRANULARITY-RULE | critical | mais de 7 Actions vira split ou skill |
| F8-OST-LINK | critical | toda Task ligada a uma Solution no OST (AC-117) |
| F8-PU-PAI | critical | toda Task carrega `pu_pai` |
| F8-RC21 | high | hierarquia respeitada — Role > Workflow > Task > Action |

Quality Gate F8 invoca o checklist `action-observability.md` antes
de fechar o veredito.

## Veto conditions

Task-granulator nao emite `action-*.md`. Task-granulator nao registra
Action inferencial. Task-granulator nao deixa Task sem `pu_pai`.
Task-granulator nao deixa Task sem Solution ligada no OST.
Task-granulator nao deixa Task com mais de 5 a 7 Actions sem split
nem skill extraida.

## pt-BR — mensagens padrao

- bloqueio de pre-condicao: `F8 precisa de F7 PASS. execute F7 antes.`
- arquivo action-*.md detectado: `Actions inline na Task. nenhum arquivo action-*.md sai. AC-119, D-v1.3-04. remova o arquivo e mova as Actions para o corpo da Task.`
- Action inferencial: `Action <id> usa adjetivo inferencial. descreva comportamento observavel (exemplo: levante o tom de voz).`
- Task sem Solution ligada: `Task <id> sem Solution ligada no OST. ligue antes de fechar F8.`
- Task com mais de 7 Actions: `Task <id> com <n> Actions. quebre em duas Tasks ou extraia skill reusavel.`
- Task sem pu_pai: `Task <id> sem pu_pai. registre a PU de origem do MVP backlog.`

## Referencia de escrita

Toda saida ao expert segue
`arquivos-relevantes/01-contexto-danilo/diretrizes-escrita.md`. Frases
curtas. Presente. Voz ativa. Sem adverbios.
