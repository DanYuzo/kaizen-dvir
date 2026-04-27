---
task_id: phase-6-to-be
agent: archaeologist
phase: 6
elicit: true
critical_invariant: false
pre_condition:
  - phase_4_pass: true
  - phase_5_pass: true
  - handoff_f4_present: true
  - handoff_f5_present: true
post_condition:
  - process_map_to_be_written: process-map-to-be.yaml
  - mermaid_to_be_present: true
  - ost_solutions_populated: OST.md
  - ost_links_populated: OST.md
  - playback_gate_f6_pass: true
api:
  ost_writer: [appendSolution, linkSolutionToOpportunity, appendChangeLog]
  handoff_engine: [generate, persist, readLatest]
  playback_gate: [present]
templates:
  - pu-tmpl.yaml
  - process-map-tmpl.yaml
---

# F6 — To-be (desenho do processo alvo pos-filtro)

<!--
Machine frontmatter EN. Corpo pt-BR para o expert.
Archaeologist conduz; chief apresenta Playback; expert julga.
Nao-critico: Playback auto-aprova em modo automatico quando PASS.
-->

## O que esta fase faz

F6 desenha o processo alvo. Archaeologist combina o filtro de F4
(PUs sobreviventes depois do corte Musk) e as mitigacoes de F5 (PUs
ajustadas por risco). O resultado e um process map To-be com Solutions
definitivas no OST ligadas a Opportunities.

## Pre-condicao (bloqueante)

F6 exige que F4 e F5 ja estejam fechadas. Archaeologist verifica via
`handoff-engine.readLatest()` os artefatos produzidos por F4 e F5 em
M4.3. Se qualquer um falta, archaeologist pausa F6 e emite em pt-BR:

`a fase 6 precisa que as fases 4 e 5 ja estejam fechadas. execute a
M4.3 antes.`

A pre-condicao nao aceita bypass. Chief nao pode forcar F6 sem os
dois handoffs.

## Passos

1. Archaeologist le os handoffs F4 e F5 via
   `handoff-engine.readLatest('archaeologist')` e
   `handoff-engine.readLatest('to-be')`. Se qualquer um falta,
   bloqueia com a mensagem acima.
2. Archaeologist lista as PUs sobreviventes apos o corte de F4.
3. Archaeologist incorpora as mitigacoes de F5 em cada PU. PUs
   ajustadas por risco ganham nota de mitigacao.
4. Archaeologist desenha o grafo de dependencias do To-be em mermaid
   com rotulos em pt-BR.
5. Archaeologist escreve `process-map-to-be.yaml` usando
   `templates/process-map-tmpl.yaml`.
6. Archaeologist produz sugestoes de melhoria ancoradas no gap
   As-is para To-be. Cada sugestao vira uma Solution definitiva.
7. Para cada Solution, archaeologist chama
   `ost-writer.appendSolution(celulaPath, solution)`. Em seguida,
   chama `ost-writer.linkSolutionToOpportunity(celulaPath, solutionId, opportunityId)`
   para cada Opportunity que a Solution resolve. Toda Solution liga a
   pelo menos uma Opportunity.
8. Archaeologist registra rodada no Change Log via
   `ost-writer.appendChangeLog()`.
9. Archaeologist gera handoff F6 para F7 via `handoff-engine.generate()`
   + `persist()`. O handoff lista Solutions por id, Links, caminho do
   process map To-be. Fica abaixo de 500 tokens.
10. Chief apresenta a revisao de fechamento da fase 6 em pt-BR. F6 nao
    e critica: fecha sozinha em modo automatico quando o checklist
    `playback-completeness.md` confere e nao ha pendencia.

## Post-condicao

- `process-map-to-be.yaml` presente na celula gerada.
- Diagrama mermaid To-be com rotulos em pt-BR.
- OST.md com Solutions definitivas populadas.
- OST.md com Links Solution-Opportunity escritos.
- Revisao de fechamento da fase 6 fechada sem pendencia.

## Veto conditions

F6 nao roda sem as fases 4 e 5 fechadas. Archaeologist nao cria
Solution sem Opportunity ligada. Archaeologist nao reescreve Solution:
toda correcao entra como nova linha no Change Log.

## pt-BR — mensagens padrao

- bloqueio de pre-condicao: `a fase 6 precisa que as fases 4 e 5 ja estejam fechadas. execute a M4.3 antes.`
- bloqueio de Solution orfa: `a Solution esta sem Opportunity ligada. ligue antes da revisao de fechamento.`

## Referencia de escrita

Toda saida ao expert segue `diretrizes-escrita.md`. Frases curtas.
Presente. Voz ativa. Sem adverbios.
