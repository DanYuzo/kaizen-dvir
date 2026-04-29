---
task_id: phase-10-publication
agents:
  - flow-architect
  - publisher
phase: 10
elicit: true
critical_invariant: true
gate_type: playback
handoff_schema: phase-10-handoff-v1
pre_condition:
  - phase_9_pass: true
  - contracts_dir_populated: contracts/
post_condition:
  - cell_published_at_celulas_nome: true
  - manifest_schema_gate_pass: true
  - changelog_initialized_at_1_0_0: true
  - actions_inline_validator_pass: true
  - ost_closure_validator_pass: true
  - workflows_dir_validator_pass: true
  - success_examples_validator_pass: true
  - hook_model_four_components_instrumented: true
  - cli_kaizen_nome_activates: true
  - automation_plan_written: celulas/{nome}/automation-plan.md
  - quality_gate_f10_pass: true
api:
  schema_gate: [validate]
  playback_gate: [present]
  handoff_engine: [generate, persist, readLatest]
  quality_gate: [evaluate]
  mode_engine: [getMode, isCriticalInvariant]
  ost_writer: [appendChangeLog]
templates:
  - celula-blueprint-tmpl.yaml
  - welcome-message-tmpl.md
  - workflow-tmpl.yaml
  - automation-reflection-tmpl.md
checklists:
  - automation-reflection-completeness.md
---

# F10 — Publication (sub-agente a + sub-agente b — etapa que sempre pausa)

<!--
Machine frontmatter EN. Corpo pt-BR para o expert.
Sub-agente a: flow-architect reflete cada Tarefa da etapa 8 e
classifica como manual, tech ou ai com plano de evolucao.
Sub-agente b: publisher instrumenta Hook Model, valida 4 vezes,
materializa `celulas/{nome}/automation-plan.md` a partir da reflexao
e publica.
F10 e etapa que sempre pausa (AC-102): Playback Gate sempre pausa,
independente do modo. M3.4 playback-gate honra
`criticalInvariant: true`.
Schema Gate sob 500ms para o manifesto final (NFR-003).
Erros em pt-BR com guia de recuperacao (NFR-101).

M9.6: sub-agente a passa a ser o flow-architect.
DNA novo: reflexao por Tarefa, classificacao em tres modos
(manual/tech/ai), plano de evolucao em pt-BR, confirmacao do expert
antes do ponto de passagem ao publisher (D-v2.0-03).
-->

## O que esta fase faz

F10 fecha a celula. Sub-agente a (flow-architect) reflete sobre cada
Tarefa que saiu da etapa 8: classifica como `manual`, `tech` ou
`ai` e propoe um plano de evolucao em pt-BR. A reflexao e foto do
momento, nao contrato eterno. Sub-agente b (publisher) instrumenta o
Hook Model, configura o CLI da celula gerada, escreve o
`automation-plan.md` a partir da reflexao, valida quatro
pre-publicacoes, valida o manifesto via Schema Gate, materializa
`celulas/{nome}/` com a estrutura AC-118 e inicia o CHANGELOG em
`1.0.0`.

F10 e etapa que sempre pausa (AC-102). Playback Gate sempre pausa
para o expert, em qualquer modo. Modo automatico nao auto-aprova. A
regra e load-bearing.

## Pre-condicao

- F9 fechada sem pendencia.
- `contracts/` da celula gerada populado com contrato YAML por Tarefa
  que confere no Schema Gate sem pendencia.

## Sub-agente a (flow-architect) — instrucoes pt-BR

Para cada Tarefa que saiu da etapa 8 (lista vinda dos contratos da
etapa 9):

1. Apresente a Tarefa ao expert em pt-BR. Uma Tarefa por vez, sem
   batch.
2. Proponha um modo: `manual`, `tech` ou `ai`. A proposta sai com
   base na conversa do expert ate aqui ou, em modo automatico, com
   base na heuristica do `VOL-09-padroes-de-ia.md` (consulta em
   leitura).
3. Proponha um plano de evolucao em uma frase pt-BR. Linguagem leiga.
   Sem jargao. Exemplo: `hoje manual; quando o volume passar de X
   por semana, migrar para tech via planilha automatizada`.
4. Em modo interativo, pause. Espere a resposta do expert. Aceite
   confirmacao, troca de modo ou ajuste do plano.
5. Em modo automatico, marque a classificacao como
   `confirmado_pelo_expert: false` e adicione a nota `auto-suposto,
   expert nao confirmou`. Publisher exibe a marca no
   `automation-plan.md` para o expert revisar na pausa final.
6. Sempre lembre que a classificacao pode mudar depois. Cada prompt
   inclui linguagem como `pode mudar depois` ou equivalente.
7. Em Tarefa sem classificacao ao final da rodada, pause a etapa com
   mensagem em pt-BR nomeando a Tarefa.
8. Em Tarefa com modo invalido (qualquer valor fora de `manual`,
   `tech`, `ai`), pause a etapa com mensagem em pt-BR nomeando o
   valor recebido.
9. Em Tarefa com plano de evolucao vazio, pause a etapa com mensagem
   em pt-BR pedindo a frase em pt-BR.
10. Antes do ponto de passagem ao publisher, rode o checklist
    `automation-reflection-completeness.md`. Pendencia bloqueia o
    ponto de passagem.
11. Quando a reflexao fecha sem pendencia, gere ponto de passagem
    F10a→F10b via `handoff-engine.generate('flow-architect',
    'publisher', ...)`. O payload carrega o array
    `automation_classifications` (campo obrigatorio do schema
    `phase-10-handoff-v1`). Cada item: `{task, mode, evolution_plan,
    expert_confirmed}`. Fica abaixo de 500 tokens.

Mensagens padrao:

- abertura: `vamos olhar Tarefa por Tarefa. para cada uma eu pergunto como ela roda hoje (manual, tech ou ai) e proponho um caminho de evolucao. sua resposta vale para esta foto — pode mudar depois.`
- proposta por Tarefa: `Tarefa <id>: <nome>. parece rodar como <modo>. plano de evolucao: <plano>. faz sentido? voce pode confirmar, trocar de modo ou ajustar o plano.`
- classificacao ausente: `a Tarefa <id> ainda nao tem classificacao. escolha entre manual, tech ou ai antes da gente seguir.`
- modo invalido: `a Tarefa <id> esta com classificacao <valor>. o campo aceita apenas manual, tech ou ai.`
- plano ausente: `a Tarefa <id> esta classificada como <modo> mas o plano de evolucao esta vazio. escreva uma frase em pt-BR descrevendo o caminho natural — pode ser bem simples.`
- ponto de passagem ao publisher: `reflexao fechada. cada Tarefa tem modo e plano. envio para o publisher escrever o automation-plan.md em celulas/<nome>/.`

## Sub-agente b (publisher) — instrucoes pt-BR

1. Le o ponto de passagem F10a→F10b via
   `handoff-engine.readLatest('publisher')`. Le o campo
   `automation_classifications` do payload.
2. Materializa `celulas/{nome}/automation-plan.md` a partir do
   template `automation-reflection-tmpl.md`. Cada item de
   `automation_classifications` vira uma linha da tabela. Coluna
   `Confirmado`: `sim` quando `expert_confirmed: true`, `nao`
   quando `expert_confirmed: false`. Para linhas com `nao`, escreve
   a nota `auto-suposto, expert nao confirmou` na secao apropriada
   do documento.
3. Instrumenta os quatro componentes do Hook Model na celula gerada.
   Escreve narrativa em pt-BR (um paragrafo por componente) no
   manifesto ou no README:
   - Trigger: gatilho externo (preferencial) + gatilho interno alvo.
   - Action: caminho de friccao minima para o expert engajar a celula.
   - Variable Reward: payoff fixo + payoff variavel.
   - Investment: mecanismo que retorna o expert a celula em sessoes
     seguintes (MEMORY.md, CHANGELOG, OST.md).
4. Configura **um unico** `/Kaizen:{NomeDaCelula}` (entry point) no
   manifesto da celula gerada. Esse slash carrega o chief; os
   `*comandos` internos sao mapeados sob o mesmo entry point e
   roteados pelo chief. Specialists (tier 2/3, sub-agentes) NAO
   recebem slash proprio — ficam no engine path
   (`@.kaizen-dvir/celulas/{nome}/agents/<id>.md`) e sao carregados
   internamente pelo chief. Regra invariante: 1 celula = 1 slash de
   superficie.
5. Renderiza a mensagem de boas-vindas via `welcome-message-tmpl.md`.
6. Roda os quatro validadores de pre-publicacao:
   - `actionsInlineValidator` — glob `**/action-*.md` em `tasks/`.
     Match bloqueia a publicacao com mensagem pt-BR citando D-v1.3-04
     (AC-119).
   - `ostClosureValidator` — percorre `OST.md` e verifica cadeia Task
     → Solution → Opportunity → Outcome. Aresta orfa bloqueia a
     publicacao com mensagem pt-BR nomeando o no.
   - `workflowsDirValidator` — stat em `workflows/`. Diretorio vazio
     com `README.md` aceitavel (D-v1.4-07). Ausencia bloqueia a
     publicacao.
   - `successExamplesValidator` — abre `kbs/success-examples.md` e
     conta entradas. Menos de 3 ou ausencia bloqueia a publicacao com
     mensagem pt-BR citando D-v1.4-09.
7. Quando os quatro validadores conferem sem pendencia, valida o
   manifesto final via M3.4 Schema Gate contra `celula-schema.json`.
   Sob 500ms (NFR-003).
8. Quando o Schema Gate confere sem pendencia, materializa
   `celulas/{nome}/` com:
   - `celula.yaml` (renderizado de `celula-blueprint-tmpl.yaml`)
   - `README.md` (descricao + Hook Model em pt-BR)
   - `CHANGELOG.md` (linha `1.0.0` com criacao)
   - `MEMORY.md` (placeholder)
   - `OST.md` (vivo)
   - `automation-plan.md` (renderizado de `automation-reflection-tmpl.md`)
   - `agents/` (personas materializadas)
   - `tasks/` (Tasks com Actions inline)
   - `workflows/` (sempre presente, D-v1.4-07)
   - `templates/` (templates da celula)
   - `checklists/` (checklists da celula)
   - `kbs/` (incluindo `kbs/success-examples.md` com 3+ entradas)
9. Inicia o CHANGELOG da celula gerada em `1.0.0` (FR-115). A primeira
   linha registra data ISO, autor (do `dvir-config.yaml`), agentes,
   tasks, templates, checklists, kbs.
10. Fecha o OST como artefato vivo. Adiciona linha de Change Log via
    `ost-writer.appendChangeLog('publisher', '<celula>', '<data ISO>
    F10 fechou OST. celula publicada em 1.0.0.')`.
11. Gera ponto de passagem F10→chief via
    `handoff-engine.generate('publisher', 'chief', ...)`. Payload
    carrega `published_path`, `version`, `ost_closure_verdict`,
    `manifest_schema_verdict`, `automation_plan_path`. Sob 500 tokens.
12. Chief apresenta a revisao final da etapa 10. F10 pausa sempre.
    Expert valida a celula publicada, manifesto, fechamento de OST,
    ativacao via `/Kaizen:{NomeDaCelula}`, e o `automation-plan.md`
    com as classificacoes (especialmente as marcadas como
    `auto-suposto, expert nao confirmou`).

Mensagens padrao:

- bloqueio Actions-inline: `encontrei <path>. as Actions devem ficar inline no markdown da Task (D-v1.3-04). remova o arquivo e tente publicar de novo.`
- bloqueio OST orfa: `o no <node-id> nao tem cadeia completa ate o Outcome. revise o link em OST.md.`
- bloqueio workflows/: `o diretorio workflows/ esta ausente. toda celula gerada precisa dele (D-v1.4-07). crie o diretorio com um README.md.`
- bloqueio success-examples: `kbs/success-examples.md tem <N> entradas — preciso de pelo menos 3 exemplos ancorados (D-v1.4-09).`
- bloqueio automation-plan: `nao recebi automation_classifications no ponto de passagem. flow-architect precisa fechar a reflexao antes da publicacao.`
- sucesso: `celula <nome> publicada em celulas/<nome>/. versao 1.0.0 registrada. ative com /Kaizen:<NomeDaCelula>. revise o automation-plan.md, especialmente as Tarefas marcadas como auto-suposto.`

## Playback Gate F10 — etapa que sempre pausa (AC-102, AC-111)

F10 e etapa que sempre pausa. Playback Gate sempre pausa para o
expert, qualquer que seja o modo. M3.4 playback-gate honra
`criticalInvariant: true` consultando
`mode-engine.isCriticalInvariant(manifest, "phase-10-publication")`.
Modo automatico nao auto-aprova F10.

Esta regra e declarada em tres lugares:

- AC 16 da story M4.5.
- Nota de Dev abaixo da Story (Dev Notes).
- Teste `tests/m4/m4.5/test-publisher-playback-critical.js`.

Falta em qualquer um dos tres bloqueia o review do @architect.

Narrativa apresentada ao expert:

`F10 fechou. publiquei a celula em celulas/<nome>/. versao 1.0.0 no
CHANGELOG. OST fechado. os quatro validadores conferiram. Schema Gate
conferiu sob <ms>ms. /Kaizen:<NomeDaCelula> ativa. automation-plan.md
escrito com <N> Tarefas (<M> marcadas como auto-suposto, expert nao
confirmou). confirma a publicacao?`

Opcoes do expert: `sim` (encerra Yotzer), `ajustar` (volta ao agente
da fase responsavel pela mudanca), `nao` (HALT com motivo registrado).

## Post-condicao

- celula publicada em `celulas/{nome}/` com estrutura AC-118 completa.
- `automation-plan.md` escrito em `celulas/{nome}/automation-plan.md`
  com uma linha por Tarefa da etapa 8.
- manifesto confere no Schema Gate sob 500ms.
- CHANGELOG iniciado em `1.0.0`.
- quatro validadores conferem sem pendencia.
- Hook Model com quatro componentes instrumentados.
- `/Kaizen:{Nome}` ativa em sessao limpa.
- OST fechado como artefato vivo.
- Checagem da etapa 10 fechada sem pendencia.

## Schemas consumidos

| Schema | Uso |
|--------|-----|
| `.kaizen-dvir/dvir/schemas/celula-schema.json` | manifesto da celula gerada (validado por publisher) |
| `.kaizen-dvir/dvir/schemas/handoff-schema.json` | ponto de passagem F10a→F10b e F10→chief — campo `automation_classifications` obrigatorio em F10a→F10b (schema `phase-10-handoff-v1`) |

## Quality Gate F10 — criterios

| Id | Severidade | Verifica |
|----|------------|----------|
| F10-PLAYBACK-PAUSES | critical | playback-gate pausa em modo automatico (AC-102) |
| F10a-REFLECTION-COVERAGE | critical | toda Tarefa da etapa 8 tem linha na reflexao do flow-architect |
| F10a-MODE-VALID | critical | a `Classificacao` de cada Tarefa e exatamente `manual`, `tech` ou `ai` |
| F10a-PLAN-NON-EMPTY | critical | cada Tarefa tem `Plano de evolucao` em pt-BR, nao vazio |
| F10a-CONFIRMATION-FLAG | critical | cada Tarefa tem `Confirmado` valido (`sim` em interativo, `nao` em automatico, sem nulo) |
| F10a-CHECKLIST-PASS | critical | `automation-reflection-completeness.md` em PASS |
| F10a-NO-EXECUTION | high | flow-architect nao executou nenhuma Tarefa — apenas refletiu |
| F10-AUTOMATION-PLAN-WRITTEN | critical | `celulas/{nome}/automation-plan.md` materializado por publisher |
| F10-ACTIONS-INLINE | critical | sem `action-*.md` em `tasks/` (D-v1.3-04, AC-119) |
| F10-OST-CLOSURE | critical | toda Task chega ao Outcome (AC-117) |
| F10-WORKFLOWS-DIR | critical | `workflows/` presente (D-v1.4-07) |
| F10-SUCCESS-EXAMPLES | critical | 3+ entradas em `kbs/success-examples.md` (D-v1.4-09) |
| F10-MANIFEST-SCHEMA | critical | manifesto em PASS no Schema Gate sob 500ms (NFR-003) |
| F10-VERSION-1-0-0 | critical | manifesto declara `version: "1.0.0"` (FR-115) |
| F10-HOOK-MODEL-4 | critical | quatro componentes do Hook Model instrumentados (AC-109A) |
| F10-CLI-MAPPED | critical | **1 unico** `/Kaizen:{Nome}` (entry point que carrega chief) + `*comandos` internos configurados; nenhum specialist exposto como slash de superficie |

## Veto conditions

F10 nao roda sem F9 fechada. F10 nao publica celula com `action-*.md`
em `tasks/`. F10 nao publica celula com aresta orfa no OST. F10 nao
publica celula sem `workflows/`. F10 nao publica celula com menos de 3
exemplos em `kbs/success-examples.md`. F10 nao publica manifesto que
o Schema Gate identifica como problema. F10 nao publica celula sem
`automation-plan.md`. F10 nao fecha sozinha em modo automatico —
sempre pausa para o expert.

## pt-BR — mensagens padrao

- bloqueio de pre-condicao: `a fase 10 precisa que a fase 9 esteja fechada antes. execute a fase 9 primeiro.`
- pausa critica: `esta e a publicacao final — sempre valido com voce antes de fechar.`
- republicacao detectada: `a celula <nome> ja foi publicada. detectei edicoes feitas apos o ultimo publish. voce quer (a) sobrescrever, (b) criar versao paralela celulas/<nome>-v2/, ou (c) cancelar?`
- sucesso: `celula <nome> publicada em celulas/<nome>/. versao 1.0.0 registrada. ative com /Kaizen:<NomeDaCelula>.`

## Referencia de escrita

Toda saida ao expert segue
`arquivos-relevantes/01-contexto-danilo/diretrizes-escrita.md`. Frases
curtas. Presente. Voz ativa. Sem adverbios.
