---
task_id: phase-5-risk-map
agent: risk-mapper
phase: 5
elicit: true
critical_invariant: false
pre_condition:
  - phase_4_pass: true
  - as_is_filtered_present: as-is-filtered.yaml
granularization_allowed: false
granularization_verdict: FAIL
granularization_redirect_to: F8_task_granulator
risk_categories:
  - operacional
  - tecnico
  - dependencia
risk_outcomes:
  - mitigation
  - acceptance
  - cut_recommendation
risk_reversal_patterns:
  - uptime_guarantee
  - rollback_guarantee
  - error_recovery_sla
  - preview_before_commit
post_condition:
  - risk_map_written: risk-map.yaml
  - risk_reversal_guarantees_written: risk-reversal-guarantees.yaml
  - ost_residual_opportunities_appended: OST.md
  - ost_first_solutions_appended: OST.md
  - quality_gate_f5_pass: true
api:
  ost_writer: [appendOpportunity, appendSolution, linkSolutionToOpportunity, appendChangeLog]
  handoff_engine: [generate, persist, readLatest]
  quality_gate: [evaluate]
templates:
  - pu-tmpl.yaml
---

# F5 — Risk-map (mapeamento de risco por PU sobrevivente)

<!--
Machine frontmatter EN. Corpo pt-BR para o expert.
Risk-mapper executa; chief julga; expert aprova.
Nao-critico: Quality Gate auto-aprova em modo automatico quando PASS.
F5 NAO granulariza — granularizacao e F8 (D-v1.2-03, AC-108, FR-104).
-->

## O que esta fase faz

F5 mapeia risco. Risk-mapper le o As-is filtrado de F4 e produz uma
entrada de risco por PU sobrevivente. Cada risco recebe destino
explicito: mitigacao concreta, aceite com `approved_by: expert`, ou
recomendacao de corte que volta para F4. Risk-mapper redige garantias
de risk-reversal para a celula gerada. F5 cresce o OST com
Opportunities residuais e primeiras Solutions.

**Referencia de avaliacao:** o risco mapeado por PU avalia o impacto
sobre o output do processo (a entrega concreta do workflow recorrente,
implicita no `process-map-as-is.yaml`), nao sobre a metrica de negocio
(gravada em `outcome-statement.yaml`). Risco que nao toca o output do
processo fica fora de F5 — entra em conversa estrategica fora desta
fase.

## Pre-condicao

- F4 fechada sem pendencia.
- `as-is-filtered.yaml` presente na celula gerada.

## Fronteira critica — F5 NAO granulariza

F5 nao granulariza PUs. Granularizacao e F8 (task-granulator, M4.4). A
regra entra aqui de proposito repetido. Quando a analise revela
sub-fluxo dentro de uma PU, a tentacao e abrir em sub-Tasks.
Risk-mapper resiste. PU continua inteira em F5.

A violacao pausa a fase com mensagem em pt-BR citando `D-v1.2-03`:

`quebrar passo do processo em sub-tarefas nao acontece nesta fase — isso
e o trabalho da fase 8 (task-granulator). reabra a analise de risco sem
dividir o passo. (D-v1.2-03)`

## Passos da fase

1. Risk-mapper le o As-is filtrado via
   `handoff-engine.readLatest('risk-mapper')`. O handoff carrega
   ponteiros para `as-is-filtered.yaml`, `cut-log.yaml` e a revisao
   corrente do `OST.md`.
2. Para cada PU sobrevivente, risk-mapper enumera riscos em tres
   categorias. Cada categoria carrega a mesma pergunta-guia: **este
   risco quebra o output do processo?**
   - **operacional** — risco no fluxo, na execucao, no humano.
     Pergunta-guia: este risco no fluxo quebra o output do processo?
   - **tecnico** — risco em ferramenta, integracao, dado.
     Pergunta-guia: este risco tecnico impede o processo de entregar
     seu output?
   - **dependencia** — risco em terceiro, prazo, recurso externo.
     Pergunta-guia: esta dependencia bloqueia a entrega do output do
     processo?
3. Para cada risco enumerado, risk-mapper associa destino:
   - **mitigacao concreta** — descreve a acao em prosa pt-BR.
   - **aceite explicito** — grava `approved_by: expert` + razao.
   - **recomendacao de corte** — volta para F4 com nota.
4. Risk-mapper escreve `risk-map.yaml`:
   ```yaml
   - pu_id: PU-XXX
     riscos:
       - id: RISK-001
         categoria: operacional
         descricao: <descricao curta em pt-BR>
         destino: mitigacao
         mitigacao: <prosa pt-BR>
       - id: RISK-002
         categoria: tecnico
         descricao: <descricao curta em pt-BR>
         destino: aceite
         aceite:
           approved_by: expert
           razao: <razao curta em pt-BR>
       - id: RISK-003
         categoria: dependencia
         descricao: <descricao curta em pt-BR>
         destino: corte
         recomendacao_corte: <nota em pt-BR>
   ```
5. Risk-mapper redige garantias de risk-reversal e escreve
   `risk-reversal-guarantees.yaml` com quatro padroes em pt-BR:
   - `garantia_disponibilidade`: quando a celula deve estar no ar e o
     que acontece quando cai.
   - `garantia_rollback`: como a celula volta ao estado anterior.
   - `sla_recuperacao_erro`: em quanto tempo a celula recupera o fluxo
     apos erro detectado.
   - `preview_antes_commit`: a celula mostra o resultado para o expert
     antes de gravar mudanca permanente.
6. Risk-mapper cresce o OST. Para cada risco aceito sem mitigacao,
   adiciona Opportunity residual via
   `ost-writer.appendOpportunity()`. Para cada mitigacao concreta,
   adiciona primeira Solution via `ost-writer.appendSolution()`. Liga
   cada Solution a Opportunity de origem via
   `ost-writer.linkSolutionToOpportunity()`. Toda Solution carrega
   ponteiro para a Opportunity de origem.
7. Risk-mapper registra rodada no Change Log via
   `ost-writer.appendChangeLog()`.
8. Risk-mapper gera handoff F5→F6 via `handoff-engine.generate()` +
   `persist()`. O payload carrega ponteiros para `risk-map.yaml`,
   `risk-reversal-guarantees.yaml` e a revisao corrente do `OST.md`
   com Opportunities residuais e primeiras Solutions. Fica abaixo de
   500 tokens.
8a. Risk-mapper roda
   `post-condition-checker.checkArtefacts(celulaPath,
   ['risk-map.yaml', 'risk-reversal-guarantees.yaml', 'OST.md'],
   { phase: 5 })` antes da apresentacao do gate. Falta de qualquer
   arquivo pausa a etapa com mensagem em pt-BR. Mesma checagem roda em
   modo interativo e em modo automatico.
9. Chief apresenta a checagem da fase 5. F5 nao e critica: fecha
   sozinha em modo automatico quando nao ha pendencia. Situacoes nao
   ideais surgem ao expert em qualquer modo, sempre com escolha clara.
   Problema que exige ajuste pausa em qualquer modo.

## Post-condicao

- `risk-map.yaml` presente com entrada por PU sobrevivente.
- `risk-reversal-guarantees.yaml` presente com quatro padroes em pt-BR.
- `OST.md` com Opportunities residuais adicionadas.
- `OST.md` com primeiras Solutions adicionadas e ligadas a
  Opportunities.
- Checagem da fase 5 fechada sem pendencia.

## Quality Gate F5 — criterios

| Id | Severidade | Verifica |
|----|------------|----------|
| F5-PER-PU-COVERAGE | critical | toda PU sobrevivente tem entrada de risco |
| F5-RISK-OUTCOME | critical | todo risco tem mitigacao OU aceite OU corte |
| F5-NO-GRANULARIZATION | critical | nenhuma tentativa de quebrar PU em Tasks |
| F5-OST-SOLUTIONS-LINKED | high | toda Solution liga a uma Opportunity de origem |
| F5-RISK-REVERSAL-PATTERNS | medium | quatro padroes presentes em `risk-reversal-guarantees.yaml` |

`F5-NO-GRANULARIZATION` pausa a fase com mensagem em pt-BR citando
`D-v1.2-03`.

## Veto conditions

Risk-mapper nao granulariza PU. Risk-mapper nao redefine PU.
Risk-mapper nao deixa risco sem destino. Risk-mapper nao registra
aceite sem `approved_by: expert`. Risk-mapper nao adiciona Solution
sem Opportunity de origem.

## pt-BR — mensagens padrao

- bloqueio de pre-condicao: `a fase 5 precisa que a fase 4 esteja fechada antes. execute a fase 4 primeiro.`
- granularizacao nesta fase: `quebrar passo do processo em sub-tarefas nao acontece nesta fase — isso e o trabalho da fase 8 (task-granulator). reabra a analise de risco sem dividir o passo. (D-v1.2-03)`
- risco sem destino: `o risco <id> no passo <id> esta sem destino. quer mitigar com uma acao concreta, aceitar conviver com ele, ou recomendar corte do passo?`
- aceite sem approved_by: `o aceite deste risco precisa do seu nome registrado para seguir. ok aprovar?`
- Solution sem Opportunity: `a Solution <id> ainda nao foi ligada a uma Opportunity de origem. ligue antes de salvar para a cadeia ficar auditavel.`

## Referencia de escrita

Toda saida ao expert segue
`arquivos-relevantes/01-contexto-danilo/diretrizes-escrita.md`. Frases
curtas. Presente. Voz ativa. Sem adverbios.
