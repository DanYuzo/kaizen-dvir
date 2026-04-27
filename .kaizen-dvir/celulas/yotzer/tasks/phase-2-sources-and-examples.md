---
task_id: phase-2-sources-and-examples
agent: archaeologist
phase: 2
elicit: true
critical_invariant: true
pre_condition:
  - phase_1_pass: true
  - outcome_statement_present: outcome-statement.yaml
post_condition:
  - kbs_populated: true
  - success_examples_persisted: kbs/success-examples.md
  - derived_criteria_written: derived-criteria.yaml
  - playback_gate_f2_pass: true
api:
  ost_writer: [appendChangeLog]
  handoff_engine: [generate, persist]
  playback_gate: [present]
context_modes:
  - referenciar-etl-pronto
  - fornecer-links-e-documentos
  - delegar-pesquisa
  - explicar-direto
multi_select: true
min_success_examples: 3
etl_guard: true
---

# F2 — Fontes e Exemplos (ingestao + exemplos de sucesso)

<!--
Machine frontmatter EN. Corpo pt-BR para o expert.
Archaeologist conduz; chief apresenta Playback; expert julga.
Invariante critico: o Playback Gate pausa em qualquer modo.
-->

## O que esta fase faz

F2 colhe o contexto necessario para as proximas fases. Archaeologist
pergunta ao expert quais fontes existem, entra em uma ou mais das
quatro modalidades de contexto, extrai criterios a partir de exemplos
de sucesso que o proprio expert traz.

## Pre-condicao

- F1 fechada sem pendencia.
- `outcome-statement.yaml` presente na celula gerada.

## As quatro modalidades de contexto — multi-select

F2 apresenta quatro modalidades em pt-BR. O expert escolhe uma,
varias ou todas as quatro. Archaeologist agrega as entradas por
modalidade escolhida.

1. `referenciar ETL pronto` — o expert indica uma celula ETL existente.
   Archaeologist grava o caminho em `kbs/` como referencia. Nao copia
   o conteudo denso. A celula ETL continua no lugar dela.
2. `fornecer links e documentos` — o expert traz links, arquivos,
   anotacoes. Archaeologist copia os arquivos para `kbs/` da celula
   gerada. Links viram referencia textual.
3. `delegar pesquisa` — o expert pede investigacao externa.
   Archaeologist registra a pesquisa solicitada em `kbs/` como
   referencia e marca para retomada.
4. `explicar direto` — o expert relata em pt-BR. Archaeologist
   transcreve o relato em nota estruturada dentro de `kbs/`.

Pergunta ao expert em pt-BR:
`quais modos voce quer usar? pode escolher um, varios ou todos os quatro.`

## Guarda de ETL (AC-116)

Yotzer nao processa ETL. Se o expert pede criacao de KB denso dentro
de F2, archaeologist emite WARN em pt-BR:
`yotzer nao processa ETL. peca para o etlmaker criar um KB dedicado.`

O WARN nao bloqueia F2. Expert escolhe: referenciar a celula ETL via
modo 1 ou seguir sem ETL denso.

## Exemplos de sucesso — minimo de 3

F2 colhe no minimo 3 exemplos de sucesso ancorados em artefatos do
expert. Cada exemplo carrega titulo, fonte, criterios de qualidade,
armadilhas a evitar. Archaeologist persiste os exemplos em
`kbs/success-examples.md` da celula gerada, em pt-BR, conforme
`diretrizes-escrita.md`, usando o template
`templates/success-examples-tmpl.md`.

Se o expert traz menos de 3 exemplos, archaeologist pausa a revisao de
fechamento da fase 2 e reporta em pt-BR:
`preciso de 3 exemplos de sucesso. traga mais 2.`

## Criterios derivados

Archaeologist extrai criterios comuns entre os exemplos e escreve
`derived-criteria.yaml`. Os criterios alimentam as fases seguintes
(F3 checa fidelidade; F4 stressa; F5 mapeia risco).

## Passos

1. Archaeologist pergunta ao expert quais modalidades usar. Aceita uma
   ou mais.
2. Para cada modalidade escolhida, archaeologist executa o fluxo
   correspondente e popula `kbs/` da celula gerada.
3. Archaeologist aplica a guarda de ETL quando detecta pedido de KB
   denso.
4. Archaeologist colhe no minimo 3 exemplos de sucesso. Persiste em
   `kbs/success-examples.md` usando `success-examples-tmpl.md`.
5. Archaeologist extrai criterios derivados e escreve
   `derived-criteria.yaml` na celula gerada.
6. Archaeologist registra rodada no Change Log do OST via
   `ost-writer.appendChangeLog()`.
7. Archaeologist gera handoff F2 para F3 via `handoff-engine.generate()`
   + `persist()`. O handoff lista modos escolhidos, fontes, exemplos
   por id e caminho do `kbs/`. Fica abaixo de 500 tokens por
   construcao.
8. Chief apresenta Playback Gate F2 em pt-BR. F2 e invariante critico:
   o gate pausa em modo interativo E em modo automatico. Expert julga.

## Post-condicao

- `kbs/` populado com fontes ou referencias.
- `kbs/success-examples.md` com 3 ou mais entradas em pt-BR.
- `derived-criteria.yaml` presente na celula gerada.
- Revisao de fechamento da fase 2 fechada via `playback-gate.present()`
  sem pendencia.
- Checklist `playback-completeness.md` confere sem pendencia.

## Veto conditions

Archaeologist nao processa ETL. Archaeologist nao escreve em `kbs/`
fora de F2. Archaeologist nao fabrica exemplo de sucesso.
Archaeologist nao aceita menos de 3 exemplos. Chief nao auto-aprova
F2: o flag `critical_invariant: true` obriga pausa em qualquer modo.

## pt-BR — mensagens padrao

- prompt multi-select: `quais modos voce quer usar? pode escolher um, varios ou todos os quatro.`
- WARN de ETL: `yotzer nao processa ETL. peca para o etlmaker criar um KB dedicado.`
- reject de menos de 3 exemplos: `preciso de 3 exemplos de sucesso. traga mais 2.`

## Referencia de escrita

Toda saida ao expert segue `diretrizes-escrita.md`. Frases curtas.
Presente. Voz ativa. Sem adverbios.
