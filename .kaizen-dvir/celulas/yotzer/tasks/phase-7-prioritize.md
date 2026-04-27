---
task_id: phase-7-prioritize
agent: prioritizer
phase: 7
elicit: true
critical_invariant: false
pre_condition:
  - phase_6_pass: true
  - to_be_present: to-be.yaml
  - ost_solutions_consolidated: true
ice_dimensions:
  - impact
  - confidence
  - ease
output_blocks:
  - mvp-backlog.yaml
  - roadmap.yaml
post_condition:
  - mvp_backlog_written: mvp-backlog.yaml
  - roadmap_written: roadmap.yaml
  - ost_solutions_marked: OST.md
  - ice_rationale_per_item: true
  - quality_gate_f7_pass: true
api:
  ost_writer: [appendChangeLog]
  handoff_engine: [generate, persist, readLatest]
  quality_gate: [evaluate]
checklists:
  - mvp-vs-roadmap-separation.md
templates:
  - pu-tmpl.yaml
---

# F7 — Prioritize (ICE simplificado, MVP essencial e roadmap de enriquecimento)

<!--
Machine frontmatter EN. Corpo pt-BR para o expert.
Prioritizer executa; chief julga; expert aprova disputas via elicit.
Nao-critico: Quality Gate auto-aprova em modo automatico quando PASS.
F7 NAO granulariza — granularizacao e F8 (D-v1.2-03, AC-108).
-->

## O que esta fase faz

F7 prioriza. Prioritizer le o To-be consolidado de F6 e aplica ICE
simplificado em cada PU sobrevivente. Produz dois blocos explicitos:
MVP essencial (`mvp-backlog.yaml`) e roadmap de enriquecimento
(`roadmap.yaml`). Cada item carrega rationale ICE em pt-BR.
Prioritizer marca cada Solution no `OST.md` como `mvp` ou `roadmap`.
Identifica o desbloqueio de maior alavancagem do MVP.

## Pre-condicao

- F6 fechada sem pendencia.
- `to-be.yaml` presente na celula gerada.
- `OST.md` com Solutions consolidadas em F6.

## Fronteira critica — F7 NAO granulariza

F7 nao granulariza PUs. Granularizacao e F8 (task-granulator, M4.4). A
regra entra aqui de proposito repetido. Em disputa entre PUs proximas,
a tentacao e quebrar uma das duas em sub-Tasks. Prioritizer resiste.
PU continua inteira em F7.

A violacao pausa a fase com mensagem em pt-BR citando `D-v1.2-03`:

`quebrar passo do processo em sub-tarefas nao acontece nesta fase — isso
e o trabalho da fase 8 (task-granulator). reabra a priorizacao sem
dividir o passo. (D-v1.2-03)`

## Passos da fase

1. Prioritizer le o To-be consolidado via
   `handoff-engine.readLatest('prioritizer')`. O handoff carrega
   ponteiros para `to-be.yaml` e a revisao corrente do `OST.md` com
   Solutions consolidadas.
2. Para cada PU sobrevivente, prioritizer aplica ICE simplificado:
   - **Impact** — quanto move o Outcome. Nota baixa, media ou alta com
     razao curta em pt-BR.
   - **Confidence** — quao certo move. Nota baixa, media ou alta com
     razao curta em pt-BR.
   - **Ease** — quao barato e enviar. Nota baixa, media ou alta com
     razao curta em pt-BR.
3. Prioritizer separa em dois blocos. Cada PU vai para um bloco so.
4. Prioritizer escreve `mvp-backlog.yaml`:
   ```yaml
   sequence_starts_with: PU-XXX  # desbloqueio de maior alavancagem
   items:
     - pu_id: PU-XXX
       solution_id: SOL-XXX
       ice:
         impact: alto
         confidence: alto
         ease: medio
       rationale: <prosa pt-BR explicando a separacao>
       sequence_order: 1
   ```
5. Prioritizer escreve `roadmap.yaml`:
   ```yaml
   items:
     - pu_id: PU-YYY
       solution_id: SOL-YYY
       ice:
         impact: medio
         confidence: alto
         ease: alto
       rationale: <prosa pt-BR>
       suggested_order: 1
   ```
6. Prioritizer marca cada Solution no `OST.md` via
   `ost-writer.appendChangeLog()`. A marcacao e linha auditavel:
   ```
   - <iso-timestamp> — @prioritizer — marcou SOL-XXX como mvp. rationale: <pt-BR>.
   - <iso-timestamp> — @prioritizer — marcou SOL-YYY como roadmap. rationale: <pt-BR>.
   ```
7. Prioritizer identifica a PU de maior alavancagem. PU cuja ausencia
   bloqueia mais PUs do MVP fica como `sequence_starts_with` no
   `mvp-backlog.yaml`. F8 respeita esta ordem.
8. Em disputa de prioridade entre PUs proximas, prioritizer surge para
   o expert via elicit. Expert decide. Prioritizer registra a decisao.
9. Prioritizer gera handoff F7→F8 via `handoff-engine.generate()` +
   `persist()`. O payload carrega ponteiros para `mvp-backlog.yaml`,
   `roadmap.yaml` e a revisao corrente do `OST.md` com marcacoes. Fica
   abaixo de 500 tokens.
10. Chief apresenta a checagem da fase 7. F7 nao e critica: fecha
    sozinha em modo automatico quando nao ha pendencia. Situacoes nao
    ideais surgem ao expert em qualquer modo, sempre com escolha
    clara. Problema que exige ajuste pausa em qualquer modo.

## Post-condicao

- `mvp-backlog.yaml` presente com itens carregando rationale ICE em
  pt-BR.
- `roadmap.yaml` presente com itens carregando rationale ICE em pt-BR.
- `OST.md` com cada Solution marcada `mvp` ou `roadmap` via Change
  Log.
- desbloqueio de maior alavancagem identificado em
  `mvp-backlog.yaml`.
- Checagem da fase 7 fechada sem pendencia.

## Quality Gate F7 — criterios

| Id | Severidade | Verifica |
|----|------------|----------|
| F7-ICE-PER-PU | critical | toda PU sobrevivente tem rationale ICE em pt-BR |
| F7-TWO-BLOCKS | critical | mvp-backlog.yaml e roadmap.yaml presentes |
| F7-NO-OVERLAP | critical | nenhuma PU aparece nos dois blocos |
| F7-OST-MARKED | high | toda Solution recebe marca mvp ou roadmap |
| F7-UNBLOCKER | high | sequence_starts_with apontando para PU concreta |
| F7-NO-GRANULARIZATION | critical | nenhuma tentativa de quebrar PU em Tasks |

`F7-NO-GRANULARIZATION` pausa a fase com mensagem em pt-BR citando
`D-v1.2-03`.

Quality Gate F7 invoca o checklist `mvp-vs-roadmap-separation.md`
antes de fechar o veredito.

## Veto conditions

Prioritizer nao granulariza PU. Prioritizer nao deixa item sem
rationale ICE. Prioritizer nao mistura blocos. Prioritizer nao deixa
Solution sem marca.

## pt-BR — mensagens padrao

- bloqueio de pre-condicao: `a fase 7 precisa que a fase 6 esteja fechada antes. execute a fase 6 primeiro.`
- granularizacao nesta fase: `quebrar passo do processo em sub-tarefas nao acontece nesta fase — isso e o trabalho da fase 8 (task-granulator). reabra a priorizacao sem dividir o passo. (D-v1.2-03)`
- item sem rationale: `o item <id> ainda nao tem rationale ICE. registre Impact, Confidence e Ease em pt-BR.`
- bloco misturado: `o item <id> aparece em mvp e em roadmap. escolha um bloco so.`
- Solution sem marca: `a Solution <id> ainda nao foi marcada. escolha mvp (entra agora) ou roadmap (entra depois) antes de fechar a fase 7.`

## Referencia de escrita

Toda saida ao expert segue
`arquivos-relevantes/01-contexto-danilo/diretrizes-escrita.md`. Frases
curtas. Presente. Voz ativa. Sem adverbios.
