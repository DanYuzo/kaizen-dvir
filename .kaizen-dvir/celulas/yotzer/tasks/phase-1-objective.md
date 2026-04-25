---
task_id: phase-1-objective
agent: archaeologist
phase: 1
elicit: true
critical_invariant: true
pre_condition:
  - session_mode_selected: mode-engine.getMode
  - reuse_gate_pre_f1_acknowledged: true
post_condition:
  - outcome_statement_written: outcome-statement.yaml
  - ost_root_populated: OST.md
  - playback_gate_f1_pass: true
api:
  ikigai_reader: [readDimension]
  ost_writer: [writeRoot]
  handoff_engine: [generate, persist]
  playback_gate: [present]
outcome_types:
  - problema
  - desejo
  - melhoria
  - mapeamento
  - automacao
---

# F1 — Objetivo (Continuous Discovery + outcome lock)

<!--
Machine frontmatter EN. Corpo pt-BR para o expert.
Archaeologist conduz; chief apresenta Playback; expert julga.
Invariante critico: o Playback Gate pausa em qualquer modo.
-->

## O que esta fase faz

F1 ancora o objetivo da celula. Archaeologist roda rodadas de Continuous
Discovery com o expert ate o objetivo travar em um dos cinco tipos:
problema, desejo, melhoria, mapeamento, automacao. F1 abre a raiz do OST
com o objetivo mensuravel.

## Pre-condicao

1. Modo de sessao selecionado via `mode-engine.getMode()`. Se nulo,
   archaeologist roteia para `tasks/start.md`.
2. Reuse Gate pre-F1 executado pelo chief. Se WARN com candidatos,
   expert precisa reconhecer antes de F1 comecar.
3. Leitura do Ikigai completa. Archaeologist chama
   `ikigai-reader.readDimension()` para `o-que-faco`, `quem-sou`,
   `para-quem` e `como-faco` antes do primeiro elicit. Se qualquer
   leitura falhar, F1 bloqueia o primeiro elicit e reporta em pt-BR:
   `ikigai indisponivel. rode "kaizen init" ou crie o arquivo antes de F1.`

## Passos

1. Archaeologist le as quatro dimensoes do Ikigai via
   `ikigai-reader.readDimension()`. Guarda o retorno na memoria de
   trabalho da sessao.
2. Archaeologist abre a rodada de Continuous Discovery. Pergunta em
   pt-BR, segundo `diretrizes-escrita.md`:
   - `qual resultado voce busca?`
   - `como voce mede esse resultado?`
   - `o que muda quando esse resultado chega?`
3. Expert responde. Archaeologist repete por quantas rodadas forem
   necessarias ate o objetivo travar.
4. Archaeologist classifica o objetivo em um dos cinco tipos:
   problema, desejo, melhoria, mapeamento, automacao. Se o objetivo
   nao cai em nenhum tipo, archaeologist rejeita em pt-BR:
   `resultado precisa ser mensuravel e cair em um dos 5 tipos: problema, desejo, melhoria, mapeamento, automacao. reformule.`
5. Archaeologist escreve `outcome-statement.yaml` na celula gerada com
   os campos `id`, `type` e `description`. A descricao carrega a
   metrica (exemplo: `reduzo em 60% o tempo de X`).
6. Archaeologist chama `ost-writer.writeRoot(celulaPath, outcome)` com
   o objetivo. OST.md abre com a raiz preenchida.
7. Archaeologist gera handoff F1 para F2 via `handoff-engine.generate()`
   + `persist()` com o objetivo, os ids e o caminho do OST. O handoff
   fica abaixo de 500 tokens por construcao.
8. Chief apresenta Playback Gate F1 em pt-BR. F1 e invariante critico:
   o gate pausa em modo interativo E em modo automatico. Expert julga.

## Post-condicao

- `outcome-statement.yaml` presente na celula gerada.
- OST.md aberto com raiz preenchida.
- Playback Gate F1 em PASS via `playback-gate.present()`.
- Checklist `playback-completeness.md` em PASS.

## Veto conditions

Archaeologist nao avanca para F2 sem objetivo mensuravel. Archaeologist
nao inventa tipo novo fora dos cinco. Archaeologist nao pula a leitura
do Ikigai. Chief nao auto-aprova F1: o flag `critical_invariant: true`
obriga pausa em qualquer modo.

## pt-BR — exemplos de reject

- `resultado precisa ser mensuravel e cair em um dos 5 tipos: problema, desejo, melhoria, mapeamento, automacao. reformule.`
- `ikigai indisponivel. rode "kaizen init" ou crie o arquivo antes de F1.`
- `objetivo sem metrica. defina o numero antes de F1 fechar.`

## Referencia de escrita

Toda saida ao expert segue `diretrizes-escrita.md`. Frases curtas.
Presente. Voz ativa. Sem adverbios.
