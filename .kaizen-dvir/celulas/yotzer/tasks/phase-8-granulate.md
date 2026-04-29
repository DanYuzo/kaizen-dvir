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
# fallback — usado apenas se expert nao escolher entre detalhado/sintetico no Step 1
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

- F7 fechada sem pendencia.
- `mvp-backlog.yaml` presente na celula gerada.
- `OST.md` com Solutions marcadas mvp.

## Contrato Actions-inline (AC-119, D-v1.3-04)

Actions sao instrucoes markdown inline DENTRO do arquivo da Task.
Cada Task tem uma secao `## Actions` com lista numerada de Actions.

NENHUM arquivo `action-*.md` pode ser emitido em runtime (AC-119,
D-v1.3-04). Esta regra e load-bearing. F8 nao escreve arquivo separado
de Action. F10 publisher revalida na publicacao.

A violacao pausa a fase com mensagem em pt-BR:

`as Actions devem ficar inline no corpo da Task — nenhum arquivo
action-*.md sai daqui. quer que eu remova o arquivo e mova as Actions
para dentro da Task? (AC-119, D-v1.3-04)`

## Comportamento observavel — fronteira de aceitacao (AC-108B)

Cada Action descreve comportamento observavel. Adjetivo inferencial
dispara Quality Gate FAIL e pausa a fase com pedido de reescrita.
Exemplos:

| Forma | Aceito? |
|-------|---------|
| `levante o tom de voz` | sim |
| `aumente 20% a velocidade ao descrever o beneficio chave` | sim |
| `seja carismatico` | nao — adjetivo inferencial |
| `mostre confianca` | nao — adjetivo inferencial |
| `pause 2 segundos antes de revelar o preco` | sim |

A checagem da fase 8 invoca o checklist `action-observability.md`
antes de fechar a fase.

## Regra de granularidade

A regra varia conforme o nivel escolhido pelo expert no Step 1:

- **detalhado** (4 a 7 acoes por Tarefa): Task com mais de 7 Actions
  dispara split em duas Tasks OU extracao de skill reusavel. Task com
  8 ou mais Actions sem split nem extracao pausa a fase com pedido
  das duas escolhas.
- **sintetico** (1 a 3 acoes por Tarefa): Task com mais de 3 Actions
  dispara split em duas Tasks OU extracao de skill reusavel. Task com
  4 ou mais Actions sem split nem extracao pausa a fase com pedido
  das duas escolhas.

A skill extraida fica registrada como prosa em pt-BR. Skill fica fora
do escopo de Yotzer; a forma fica registrada para reuso futuro.

## Passos da fase

## Step 1 — Bloco de descoberta — preferencia de granularidade

Antes de o task-granulator decompor as Tarefas, voce escolhe o nivel de detalhe. Duas opcoes em pt-BR:

- **detalhado** — 4 a 7 acoes por Tarefa. Maximo controle. Cada passo registrado.
- **sintetico** — 1 a 3 acoes por Tarefa. Maxima autonomia. Cada Tarefa concentra mais decisao em quem executa.

Pergunta ao expert: `voce prefere granularidade detalhada ou sintetica?`

Aplique o nivel escolhido. Se o expert nao responder, use o limite frontmatter `granularity_max_actions: 7` como fallback — declarando em pt-BR: "estou supondo detalhado por padrao — confirma?" e registre via `ost-writer.appendChangeLog(celulaPath, '@task-granulator', '[SUPOSICAO] descoberta F8: detalhado por fallback')`.

2. Task-granulator le `mvp-backlog.yaml` via
   `handoff-engine.readLatest('task-granulator')`. O handoff carrega
   ponteiros para `mvp-backlog.yaml` e a revisao corrente do `OST.md`.
3. Para cada PU do MVP, task-granulator decompoe em uma ou mais
   Tasks. Cada Task fica em arquivo `tasks/<task-id>.md` com
   frontmatter EN e corpo pt-BR. Cada Task carrega `id`, `pu_pai`,
   `solution_id` (Solution ligada no OST), `executor_hint`,
   `estimated_effort`, e secao `## Actions` com Actions inline.
4. Task-granulator garante: nenhum arquivo `action-*.md` e criado.
   Actions ficam exclusivamente como markdown na Task.
5. Task-granulator valida cada Action por comportamento observavel.
   Adjetivo inferencial pausa a fase com pedido de reescrita em pt-BR.
6. Task-granulator aplica regra de granularidade conforme nivel
   escolhido no Step 1. Sintetico: Task com mais de 3 Actions vira
   split ou skill. Detalhado: Task com mais de 7 Actions vira split
   ou skill. Task acima do limite escolhido sem tratamento pausa a
   fase com pedido das duas escolhas.
7. Task-granulator liga cada Task a uma Solution no `OST.md` via
   `ost-writer.appendChangeLog()`. A linha registra:
   ```
   - <iso-timestamp> — @task-granulator — ligou TASK-XXX a SOL-YYY (PU-ZZZ).
   ```
8. Task-granulator gera handoff F8→F9 via
   `handoff-engine.generate()` + `persist()`. O payload carrega
   ponteiros para `tasks/` da celula gerada e a revisao corrente do
   `OST.md` com Tasks ligadas. Fica abaixo de 500 tokens.
8a. Task-granulator roda
   `post-condition-checker.checkArtefacts(celulaPath,
   ['tasks/', 'OST.md'], { phase: 8 })` antes da apresentacao do
   gate. O verificador pausa a etapa quando `tasks/` nao existe ou
   esta vazio. Mesma checagem roda em modo interativo e em modo
   automatico.
9. Chief apresenta a checagem da fase 8. F8 nao e critica: fecha
   sozinha em modo automatico quando nao ha pendencia. A checagem
   invoca o checklist `action-observability.md`. Situacoes nao ideais
   surgem ao expert em qualquer modo, sempre com escolha clara.
   Problema que exige ajuste pausa em qualquer modo.

## Post-condicao

- `tasks/` da celula gerada populado com arquivos `<task-id>.md`.
- toda Task carrega Actions inline na secao `## Actions`.
- nenhum arquivo `action-*.md` foi emitido em runtime (AC-119,
  D-v1.3-04).
- `OST.md` com cada Task ligada a exatamente uma Solution (AC-117).
- toda Action descreve comportamento observavel (AC-108B).
- toda Task respeita regra de granularidade (5 a 7 Actions OU split
  OU skill extraida).
- Checagem da fase 8 fechada sem pendencia.

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
| F8-GRANULARITY-RULE | critical | respeita o limite por nivel — sintetico: mais de 3 Actions vira split ou skill; detalhado: mais de 7 Actions vira split ou skill |
| F8-OST-LINK | critical | toda Task ligada a uma Solution no OST (AC-117) |
| F8-PU-PAI | critical | toda Task carrega `pu_pai` |
| F8-RC21 | high | hierarquia respeitada — Role > Workflow > Task > Action |

A checagem da fase 8 invoca o checklist `action-observability.md` antes
de fechar a fase.

## Veto conditions

Task-granulator nao emite `action-*.md`. Task-granulator nao registra
Action inferencial. Task-granulator nao deixa Task sem `pu_pai`.
Task-granulator nao deixa Task sem Solution ligada no OST.
Task-granulator nao deixa Task com mais de 5 a 7 Actions sem split
nem skill extraida.
Task-granulator nao comeca a decompor Tarefas antes da preferencia de
granularidade ser confirmada pelo expert (ou fallback auto-mode declarado).

## pt-BR — mensagens padrao

- bloqueio de pre-condicao: `a fase 8 precisa que a fase 7 esteja fechada antes. execute a fase 7 primeiro.`
- arquivo action-*.md detectado: `as Actions devem ficar inline no corpo da Task — nenhum arquivo action-*.md sai daqui. quer que eu remova o arquivo e mova as Actions para dentro da Task? (AC-119, D-v1.3-04)`
- Action inferencial: `a Action <id> usa adjetivo inferencial — um observador externo nao consegue julgar pela forma escrita. reescreva descrevendo o comportamento concreto (exemplo: "levante o tom de voz" no lugar de "seja carismatico").`
- Task sem Solution ligada: `a Task <id> ainda nao foi ligada a uma Solution no OST. ligue antes de fechar a fase para a cadeia ficar auditavel.`
- Task com mais de 7 Actions: `a Task <id> tem <n> Actions — esta acima do limite saudavel de 5 a 7. quer quebrar em duas Tasks ou extrair uma skill reusavel?`
- Task sem pu_pai: `a Task <id> esta sem pu_pai. registre o passo do processo de origem (vem do MVP backlog).`

## Referencia de escrita

Toda saida ao expert segue
`arquivos-relevantes/01-contexto-danilo/diretrizes-escrita.md`. Frases
curtas. Presente. Voz ativa. Sem adverbios.
