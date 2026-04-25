---
task_id: phase-4-stress-test
agent: stress-tester
phase: 4
elicit: true
critical_invariant: false
pre_condition:
  - phase_3_pass: true
  - process_map_as_is_present: process-map-as-is.yaml
  - ost_first_opportunities_present: OST.md
musk_steps:
  order: [Questionar, Deletar, Simplificar, Acelerar, Automatizar]
  strict_order: true
cut_target_pct: 10
cut_target_miss_verdict: CONCERNS
automatizar_scope: conceptual_only
post_condition:
  - as_is_filtered_written: as-is-filtered.yaml
  - cut_log_written: cut-log.yaml
  - ost_pruned: OST.md
  - quality_gate_f4_pass: true
api:
  ost_writer: [appendChangeLog]
  handoff_engine: [generate, persist, readLatest]
  quality_gate: [evaluate]
checklists:
  - pu-reduction-justified.md
templates:
  - pu-tmpl.yaml
---

# F4 — Stress-test (filtro Musk em ordem estrita)

<!--
Machine frontmatter EN. Corpo pt-BR para o expert.
Stress-tester executa; chief julga; expert aprova.
Nao-critico: Quality Gate auto-aprova em modo automatico quando PASS.
-->

## O que esta fase faz

F4 estressa o As-is. Stress-tester aplica o filtro Musk em ordem
estrita. Cada PU sem razao defensavel cai. Cada corte vira linha
auditavel em `cut-log.yaml`. O OST poda as Opportunities das PUs
cortadas. F4 produz `as-is-filtered.yaml` para F5 consumir.

## Pre-condicao

- F3 em PASS.
- `process-map-as-is.yaml` presente na celula gerada.
- OST com primeiras Opportunities populadas.

## Os 5 passos Musk em ordem estrita

A ordem nao varia. Stress-tester e expert seguem assim:

1. **Questionar** — pergunta a razao de cada PU. Quem decidiu? Para que
   serve? O que quebra se some? Sem decisor nomeado, a PU vira
   candidata a corte.
2. **Deletar** — corta toda PU sem razao defensavel. Cada corte gera
   linha em `cut-log.yaml` com id, data, autor, motivo, e o que quebra.
3. **Simplificar** — para PUs que sobrevivem, reduz a forma. Funde
   passos redundantes. Tira ramificacoes mortas.
4. **Acelerar** — ajusta o que sobrou para ganhar velocidade. Remove
   esperas evitaveis. Encurta caminho critico.
5. **Automatizar** — descreve oportunidade de automacao em prosa
   conceitual. Nao gera script, nao cria gatilho, nao agenda execucao.
   Concretizacao real entra em F10.

A reordenacao dispara Quality Gate FAIL. A mensagem de FAIL nomeia o
passo esperado e o passo tentado em pt-BR:

`ordem Musk quebrada. esperado: <passo>. tentado: <passo>. volte antes
de seguir.`

## Passos da fase

1. Stress-tester le o As-is via `handoff-engine.readLatest('stress-tester')`.
   O handoff carrega ponteiros para `process-map-as-is.yaml` e a
   revisao corrente do `OST.md`.
2. Stress-tester abre o passo Questionar. Para cada PU, faz pergunta
   curta em pt-BR ao expert:
   - `quem decidiu que essa PU existe?`
   - `o que essa PU entrega que ninguem mais entrega?`
   - `o que quebra se a gente tira?`
3. Stress-tester abre o passo Deletar. Para cada PU sem razao
   defensavel, propoe corte. Expert aprova ou rejeita. Cada aprovacao
   gera linha em `cut-log.yaml`:
   ```yaml
   - pu_id: PU-XXX
     date: YYYY-MM-DD
     author: <expert ou stress-tester recomendou>
     reason: <razao curta em pt-BR>
     what_breaks: <consequencia curta em pt-BR>
   ```
4. Stress-tester abre o passo Simplificar. PUs sobreviventes ganham
   forma reduzida quando cabe. A reducao entra como nota na PU, sem
   apagar historico.
5. Stress-tester abre o passo Acelerar. Ajustes de velocidade em PUs
   sobreviventes entram como nota na PU.
6. Stress-tester abre o passo Automatizar. Cada oportunidade de
   automacao entra como prosa conceitual. Artefato concreto dispara
   Quality Gate CONCERNS com mensagem `automacao concreta em F4 nao
   roda. mova para F10 (publisher).`
7. Stress-tester escreve `as-is-filtered.yaml` com as PUs sobreviventes
   e suas notas de simplificacao, aceleracao e automacao conceitual.
8. Stress-tester poda o OST. Para cada PU cortada, a Opportunity
   correspondente recebe linha de remocao via
   `ost-writer.appendChangeLog()` com referencia ao `cut-log.yaml`.
9. Stress-tester verifica a meta de corte. Se cortou ≥10% das PUs do
   As-is, segue. Se cortou abaixo de 10% sem waiver, Quality Gate emite
   CONCERNS com mensagem `corte abaixo de 10%. registre waiver com
   approved_by ou aprofunde a fase Deletar.` CONCERNS nunca vira FAIL
   apenas por meta nao atingida.
10. Chief invoca o checklist `pu-reduction-justified.md` antes de
    emitir Quality Gate PASS. O checklist confere rastreabilidade item
    por item.
11. Stress-tester gera handoff F4→F5 via `handoff-engine.generate()` +
    `persist()`. O payload carrega ponteiros para `as-is-filtered.yaml`,
    `cut-log.yaml` e a revisao corrente do `OST.md`. Fica abaixo de
    500 tokens.
12. Chief apresenta Quality Gate F4. F4 nao e critico: auto-aprova em
    modo automatico quando o gate retorna PASS. CONCERNS surge ao
    expert em qualquer modo. FAIL pausa em qualquer modo.

## Post-condicao

- `as-is-filtered.yaml` presente na celula gerada.
- `cut-log.yaml` presente com linha por PU cortada.
- `OST.md` com Opportunities das PUs cortadas marcadas como removidas
  no Change Log com referencia ao `cut-log.yaml`.
- Quality Gate F4 em PASS (ou CONCERNS com waiver registrado).

## Quality Gate F4 — criterios

| Id | Severidade | Verifica |
|----|------------|----------|
| F4-MUSK-ORDER | critical | ordem Musk respeitada em todas as iteracoes |
| F4-CUT-RATIONALE | critical | toda PU cortada tem id, data, autor, motivo, o que quebra |
| F4-CUT-TARGET | medium | corte ≥10% OU waiver com approved_by |
| F4-OST-PRUNED | high | Opportunities ligadas a PUs cortadas marcadas como removidas |
| F4-AUTOMATIZAR-CONCEPTUAL | medium | sem artefato concreto de automacao |
| F4-CHECKLIST | high | `pu-reduction-justified.md` confere |

`F4-CUT-TARGET` e medium por design — abaixo de meta dispara CONCERNS,
nunca FAIL apenas por meta. Os demais seguem a regra padrao do Quality
Gate.

## Veto conditions

Stress-tester nao reordena passos Musk. Stress-tester nao corta PU sem
rationale completo. Stress-tester nao gera artefato concreto de
automacao em F4. Stress-tester nao remove Opportunity sem justificativa
ligada ao `cut-log.yaml`.

## pt-BR — mensagens padrao

- bloqueio de pre-condicao: `F4 precisa de F3 PASS. execute F3 antes.`
- ordem Musk quebrada: `ordem Musk quebrada. esperado: <passo>. tentado: <passo>. volte antes de seguir.`
- meta nao atingida: `corte abaixo de 10%. registre waiver com approved_by ou aprofunde a fase Deletar.`
- automatizar concreto: `automacao concreta em F4 nao roda. mova para F10 (publisher).`
- corte sem rationale: `PU cortada sem rationale completo. preencha id, data, autor, motivo e o que quebra.`

## Referencia de escrita

Toda saida ao expert segue
`arquivos-relevantes/01-contexto-danilo/diretrizes-escrita.md`. Frases
curtas. Presente. Voz ativa. Sem adverbios.
