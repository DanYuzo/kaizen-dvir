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

**Referencia de avaliacao:** o filtro Musk avalia cada PU contra o
output do processo (a entrega concreta do workflow recorrente, presente
implicitamente no `process-map-as-is.yaml`), nao contra o objetivo de
negocio (gravado em `outcome-statement.yaml`). O outcome serve como
contexto estrategico; nao serve como gate de corte. Toda pergunta Musk
abaixo e ancorada no output do processo.

## Pre-condicao

- F3 fechada sem pendencia.
- `process-map-as-is.yaml` presente na celula gerada.
- OST com primeiras Opportunities populadas.

## Os 5 passos Musk em ordem estrita

A ordem nao varia. Stress-tester e expert seguem assim:

1. **Questionar** — pergunta se a PU e necessaria para o processo
   entregar seu output. Essa etapa e necessaria para o processo entregar
   o que entrega? O que o processo deixa de entregar se essa etapa some?
   Quem decidiu que essa etapa existe? Sem conexao defensavel ao output
   do processo, a PU vira candidata a corte. (A pergunta nao avalia se
   a PU contribui para o objetivo de negocio.)
2. **Deletar** — corta toda PU sem razao defensavel para o output do
   processo. Cada corte gera linha em `cut-log.yaml` com id, data,
   autor, motivo, e o que o processo deixa de entregar.
3. **Simplificar** — para PUs que sobrevivem, reduz a forma sem mudar
   o output do processo. Funde passos redundantes. Tira ramificacoes
   mortas.
4. **Acelerar** — ajusta o que sobrou para ganhar velocidade na entrega
   do output. Remove esperas evitaveis. Encurta caminho critico ate o
   output do processo.
5. **Automatizar** — descreve oportunidade de automacao em prosa
   conceitual, sempre amarrada ao output do processo. Nao gera script,
   nao cria gatilho, nao agenda execucao. Concretizacao real entra em
   F10.

Quebra da ordem Musk emite Quality Gate FAIL e pausa a fase. A mensagem
nomeia o passo esperado e o passo tentado em pt-BR:

`ordem Musk quebrada. esperado: <passo>. tentado: <passo>. volte antes
de seguir.`

## Passos da fase

1. Stress-tester le o As-is via `handoff-engine.readLatest('stress-tester')`.
   O handoff carrega ponteiros para `process-map-as-is.yaml` e a
   revisao corrente do `OST.md`.
2. Stress-tester abre o passo Questionar. Para cada PU, faz pergunta
   curta em pt-BR ao expert (sempre ancorada no output do processo):
   - `essa etapa e necessaria para o processo entregar seu output?`
   - `o que o processo deixa de entregar se a gente tira essa etapa?`
   - `quem decidiu que essa etapa existe?`
3. Stress-tester abre o passo Deletar. Para cada PU sem razao
   defensavel para o output do processo, propoe corte. Expert aprova
   ou rejeita. Cada aprovacao gera linha em `cut-log.yaml`:
   ```yaml
   - pu_id: PU-XXX
     date: YYYY-MM-DD
     author: <expert ou stress-tester recomendou>
     reason: <razao curta em pt-BR — ancorada no output do processo>
     what_breaks: <o que o processo deixa de entregar — em pt-BR curto>
   ```
4. Stress-tester abre o passo Simplificar. PUs sobreviventes ganham
   forma reduzida quando cabe. A reducao entra como nota na PU, sem
   apagar historico.
5. Stress-tester abre o passo Acelerar. Ajustes de velocidade em PUs
   sobreviventes entram como nota na PU.
6. Stress-tester abre o passo Automatizar. Cada oportunidade de
   automacao entra como prosa conceitual. Artefato concreto traz a
   mensagem ao expert: `automacao concreta nao roda nesta fase — vira
   artefato so na publicacao final. quer descrever a oportunidade em
   prosa por enquanto?`
7. Stress-tester escreve `as-is-filtered.yaml` com as PUs sobreviventes
   e suas notas de simplificacao, aceleracao e automacao conceitual.
8. Stress-tester poda o OST. Para cada PU cortada, a Opportunity
   correspondente recebe linha de remocao via
   `ost-writer.appendChangeLog()` com referencia ao `cut-log.yaml`.
9. Stress-tester verifica a meta de corte. Se cortou ≥10% das PUs do
   As-is, segue. Se cortou abaixo de 10% sem decisao explicita do
   expert, a checagem traz a situacao ao expert com a mensagem
   `cortamos menos de 10% dos passos ate agora. quer aprofundar a fase
   Deletar para cortar mais, ou seguir com o resultado atual mesmo
   assim? se seguir, registro a decisao com seu nome.` Meta nao
   atingida sozinha nunca encerra a fase com problema bloqueante.
10. Chief invoca o checklist `pu-reduction-justified.md` antes de
    fechar a fase. O checklist confere rastreabilidade item por item.
11. Stress-tester gera handoff F4→F5 via `handoff-engine.generate()` +
    `persist()`. O payload carrega ponteiros para `as-is-filtered.yaml`,
    `cut-log.yaml` e a revisao corrente do `OST.md`. Fica abaixo de
    500 tokens.
12. Chief apresenta a checagem da fase 4. F4 nao e critica: fecha
    sozinha em modo automatico quando nao ha pendencia. Situacoes nao
    ideais surgem ao expert em qualquer modo, sempre com escolha clara.
    Problema que exige ajuste pausa em qualquer modo.

## Post-condicao

- `as-is-filtered.yaml` presente na celula gerada.
- `cut-log.yaml` presente com linha por PU cortada.
- `OST.md` com Opportunities das PUs cortadas marcadas como removidas
  no Change Log com referencia ao `cut-log.yaml`.
- Checagem da fase 4 fechada (ou seguindo adiante com decisao do expert
  registrada via `approved_by`).

## Quality Gate F4 — criterios

| Id | Severidade | Verifica |
|----|------------|----------|
| F4-MUSK-ORDER | critical | ordem Musk respeitada em todas as iteracoes |
| F4-CUT-RATIONALE | critical | toda PU cortada tem id, data, autor, motivo, o que quebra |
| F4-CUT-TARGET | medium | corte ≥10% OU waiver com approved_by |
| F4-OST-PRUNED | high | Opportunities ligadas a PUs cortadas marcadas como removidas |
| F4-AUTOMATIZAR-CONCEPTUAL | medium | sem artefato concreto de automacao |
| F4-CHECKLIST | high | `pu-reduction-justified.md` confere |

`F4-CUT-TARGET` emite verdict CONCERNS (nunca FAIL) quando o corte fica
abaixo de 10% sem waiver. CONCERNS surge ao expert com escolha
(aprofundar a fase Deletar OU seguir com `approved_by` registrado).
Verdict FAIL apenas por meta nao se aplica aqui — meta nao atingida
nunca, sozinha, encerra a fase como problema bloqueante. Os demais
criterios seguem a regra padrao do Quality Gate.

## Veto conditions

Stress-tester nao reordena passos Musk. Stress-tester nao corta PU sem
rationale completo. Stress-tester nao gera artefato concreto de
automacao em F4. Stress-tester nao remove Opportunity sem justificativa
ligada ao `cut-log.yaml`.

## pt-BR — mensagens padrao

- bloqueio de pre-condicao: `a fase 4 precisa que a fase 3 esteja fechada antes. execute a fase 3 primeiro.`
- ordem Musk quebrada: `a ordem dos passos foi trocada — o metodo exige sequencia fixa. esperado: <passo>. tentado: <passo>. quer voltar para o passo correto?`
- meta nao atingida: `cortamos menos de 10% dos passos ate agora. quer aprofundar a fase Deletar para cortar mais, ou seguir com o resultado atual mesmo assim? se seguir, registro a decisao com seu nome.`
- automatizar concreto: `automacao concreta nao roda nesta fase — vira artefato so na publicacao final. quer descrever a oportunidade em prosa por enquanto?`
- corte sem rationale: `o corte deste passo do processo esta sem rationale completo. preencha id, data, autor, motivo e o que o processo deixa de entregar.`

## Referencia de escrita

Toda saida ao expert segue
`arquivos-relevantes/01-contexto-danilo/diretrizes-escrita.md`. Frases
curtas. Presente. Voz ativa. Sem adverbios.
