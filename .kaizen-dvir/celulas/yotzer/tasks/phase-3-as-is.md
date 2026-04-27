---
task_id: phase-3-as-is
agent: archaeologist
phase: 3
elicit: true
critical_invariant: false
pre_condition:
  - phase_2_pass: true
  - derived_criteria_present: derived-criteria.yaml
post_condition:
  - process_map_as_is_written: process-map-as-is.yaml
  - mermaid_as_is_present: true
  - ost_opportunities_populated: OST.md
  - playback_gate_f3_pass: true
api:
  ost_writer: [appendOpportunity, appendChangeLog]
  handoff_engine: [generate, persist]
  playback_gate: [present]
templates:
  - pu-tmpl.yaml
  - process-map-tmpl.yaml
---

# F3 — As-is (desenho do processo atual)

<!--
Machine frontmatter EN. Corpo pt-BR para o expert.
Archaeologist conduz; chief apresenta Playback; expert julga.
Nao-critico: Playback auto-aprova em modo automatico quando PASS.
-->

## O que esta fase faz

F3 desenha o processo atual do expert. Archaeologist conduz entrevistas
baseadas em historia (story-based) e, quando possivel, observacao
in situ (Gemba). F3 produz PUs (Unidades de Processo), um grafo de
dependencias em mermaid com rotulos em pt-BR, e as primeiras
Opportunities no OST.

## Pre-condicao

- F2 fechada sem pendencia.
- `derived-criteria.yaml` presente.

## Passos

1. Archaeologist abre entrevista baseada em historia. Pergunta em
   pt-BR: `me conta como voce faz hoje, do inicio ao fim.`
2. Expert narra. Archaeologist escuta e grava. Pergunta detalhes
   quando a historia salta passo. Exemplos de pergunta:
   - `o que acontece antes disso?`
   - `quem recebe esse artefato?`
   - `o que trava esse passo?`
3. Quando possivel, archaeologist observa o processo em execucao
   (Gemba). Fora do alcance Gemba, archaeologist valida com segunda
   passada de entrevista.
4. Archaeologist extrai PUs usando `templates/pu-tmpl.yaml`. Cada PU
   carrega id, name, phase, description, inputs, outputs,
   dependencies, executor_hint, estimated_effort, status.
5. Archaeologist monta o grafo de dependencias. Escreve em mermaid
   com rotulos em pt-BR. Exemplo:
   ```mermaid
   graph TD
     PU-001[coleta de briefing] --> PU-002[definicao de escopo]
     PU-002 --> PU-003[producao]
   ```
6. Archaeologist escreve `process-map-as-is.yaml` usando
   `templates/process-map-tmpl.yaml`. O arquivo lista PUs + pares de
   dependencia + destino da renderizacao mermaid.
7. Archaeologist identifica dores, gargalos e gaps. Para cada ponto,
   chama `ost-writer.appendOpportunity(celulaPath, opportunity)`. Cada
   Opportunity referencia pelo menos uma PU.
8. Archaeologist registra rodada no Change Log via
   `ost-writer.appendChangeLog()`.
9. Archaeologist gera handoff F3 para F4 via `handoff-engine.generate()`
   + `persist()`. O handoff lista PUs por id, pontos de dor, caminho
   do process map. Fica abaixo de 500 tokens.
10. Chief apresenta a revisao de fechamento da fase 3 em pt-BR. F3 nao
    e critica: fecha sozinha em modo automatico quando o checklist
    `playback-completeness.md` confere e nao ha pendencia.

## Post-condicao

- `process-map-as-is.yaml` presente na celula gerada.
- Diagrama mermaid com rotulos em pt-BR embutido no artefato.
- OST.md com primeiras Opportunities populadas.
- Revisao de fechamento da fase 3 fechada sem pendencia.

## Veto conditions

Archaeologist nao inventa PU. Toda PU sai do relato do expert.
Archaeologist nao marca Opportunity sem referencia a PU.
Archaeologist nao usa rotulo em ingles no mermaid.

## pt-BR — mensagens padrao

- prompt de entrevista: `me conta como voce faz hoje, do inicio ao fim.`
- pergunta de detalhe: `o que acontece antes disso?`
- pergunta de trava: `o que trava esse passo?`

## Referencia de escrita

Toda saida ao expert segue `diretrizes-escrita.md`. Frases curtas.
Presente. Voz ativa. Sem adverbios.
