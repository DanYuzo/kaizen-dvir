---
task_id: phase-10-publication
agents:
  - progressive-systemizer
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
checklists:
  - progressive-levels-coherence.md
---

# F10 — Publication (sub-agente a + sub-agente b — invariante critico)

<!--
Machine frontmatter EN. Corpo pt-BR para o expert.
Sub-agente a: progressive-systemizer planeja 4 tiers por Task MVP.
Sub-agente b: publisher instrumenta Hook Model, valida 4 vezes,
publica.
F10 e invariante critico (AC-102): Playback Gate sempre pausa,
independente do modo. M3.4 playback-gate honra
`criticalInvariant: true`.
Schema Gate sob 500ms para o manifesto final (NFR-003).
Erros em pt-BR com guia de recuperacao (NFR-101).
-->

## O que esta fase faz

F10 fecha a celula. Sub-agente a (progressive-systemizer) planeja a
sistematizacao em quatro tiers por Task MVP. Sub-agente b (publisher)
instrumenta o Hook Model, configura o CLI da celula gerada, valida
quatro pre-publicacoes, valida o manifesto via Schema Gate, materializa
`celulas/{nome}/` com a estrutura AC-118 e inicia o CHANGELOG em
`1.0.0`.

F10 e invariante critico (AC-102). Playback Gate sempre pausa para o
expert, em qualquer modo. Modo automatico nao auto-aprova. A regra
e load-bearing.

## Pre-condicao

- F9 em PASS.
- `contracts/` da celula gerada populado com contrato YAML por Task em
  PASS no Schema Gate.

## Sub-agente a (progressive-systemizer) — instrucoes pt-BR

Para cada Task MVP listada nos contratos de F9:

1. Defina os quatro tiers em ordem fixa: manual, simplificado, batch,
   automatizado.
2. Documente `expected_learning` em pt-BR para cada tier.
3. Documente `rationale` ligando o tier <N> ao aprendizado do tier
   <N-1>.
4. Identifique pontos de aprendizado que ancoram cada componente do
   Hook Model: tier 1 → Trigger; tier 2 → Action; tier 3 → Variable
   Reward; tier 4 → Investment.
5. Rode o checklist `progressive-levels-coherence.md` antes do
   handoff.
6. Em pulo de tier sem `waiver_rationale`, emita Quality Gate FAIL com
   pt-BR nomeando o tier ofensor.
7. Em `expected_learning` ausente, emita Quality Gate FAIL com pt-BR
   nomeando a Task e o tier.
8. Em PASS, gere handoff F10a→F10b via
   `handoff-engine.generate('progressive-systemizer', 'publisher',
   ...)`. O payload carrega ponteiros para o plano e o veredito do
   checklist. Fica abaixo de 500 tokens.

Mensagens padrao:

- pulo de tier: `progressive-systemizer bloqueou plano: tier <N> sem justificativa do tier <N-1>. ordem fixa: manual, simplificado, batch, automatizado.`
- aprendizado ausente: `progressive-systemizer bloqueou plano: tier <N> da Task <id> sem expected_learning. cada tier precisa do campo preenchido.`
- handoff ao publisher: `plano em PASS. handoff F10a→F10b enviado. publisher instrumenta Hook Model e publica.`

## Sub-agente b (publisher) — instrucoes pt-BR

1. Le o handoff F10a→F10b via
   `handoff-engine.readLatest('publisher')`.
2. Instrumenta os quatro componentes do Hook Model na celula gerada.
   Escreve narrativa em pt-BR (um paragrafo por componente) no
   manifesto ou no README:
   - Trigger: gatilho externo (preferencial) + gatilho interno alvo.
   - Action: caminho de friccao minima para o expert engajar a celula.
   - Variable Reward: payoff fixo + payoff variavel.
   - Investment: mecanismo que retorna o expert a celula em sessoes
     seguintes (MEMORY.md, CHANGELOG, OST.md).
3. Configura `/Kaizen:{NomeDaCelula}` e os `*comandos` internos no
   manifesto da celula gerada.
4. Renderiza a mensagem de boas-vindas via `welcome-message-tmpl.md`.
5. Roda os quatro validadores de pre-publicacao:
   - `actionsInlineValidator` — glob `**/action-*.md` em `tasks/`.
     Match dispara FAIL com pt-BR citando D-v1.3-04 (AC-119).
   - `ostClosureValidator` — percorre `OST.md` e verifica cadeia Task
     → Solution → Opportunity → Outcome. Aresta orfa dispara FAIL com
     pt-BR nomeando o no.
   - `workflowsDirValidator` — stat em `workflows/`. Diretorio vazio
     com `README.md` aceitavel (D-v1.4-07). Ausencia dispara FAIL.
   - `successExamplesValidator` — abre `kbs/success-examples.md` e
     conta entradas. Menos de 3 ou ausencia dispara FAIL com pt-BR
     citando D-v1.4-09.
6. Em PASS dos quatro validadores, valida o manifesto final via M3.4
   Schema Gate contra `celula-schema.json`. Sob 500ms (NFR-003).
7. Em PASS no Schema Gate, materializa `celulas/{nome}/` com:
   - `celula.yaml` (renderizado de `celula-blueprint-tmpl.yaml`)
   - `README.md` (descricao + Hook Model em pt-BR)
   - `CHANGELOG.md` (linha `1.0.0` com criacao)
   - `MEMORY.md` (placeholder)
   - `OST.md` (vivo)
   - `agents/` (personas materializadas)
   - `tasks/` (Tasks com Actions inline)
   - `workflows/` (sempre presente, D-v1.4-07)
   - `templates/` (templates da celula)
   - `checklists/` (checklists da celula)
   - `kbs/` (incluindo `kbs/success-examples.md` com 3+ entradas)
8. Inicia o CHANGELOG da celula gerada em `1.0.0` (FR-115). A primeira
   linha registra data ISO, autor (do `dvir-config.yaml`), agentes,
   tasks, templates, checklists, kbs.
9. Fecha o OST como artefato vivo. Adiciona linha de Change Log via
   `ost-writer.appendChangeLog('publisher', '<celula>', '<data ISO>
   F10 fechou OST. celula publicada em 1.0.0.')`.
10. Gera handoff F10→chief via `handoff-engine.generate('publisher',
    'chief', ...)`. Payload carrega `published_path`, `version`,
    `ost_closure_verdict`, `manifest_schema_verdict`. Sob 500 tokens.
11. Chief apresenta Playback Gate F10. F10 pausa sempre. Expert valida
    a celula publicada, manifesto, fechamento de OST, ativacao via
    `/Kaizen:{NomeDaCelula}`.

Mensagens padrao:

- bloqueio Actions-inline: `publisher bloqueou publicacao: encontrei <path>. Actions devem ser inline no markdown da Task (D-v1.3-04). remova o arquivo e republique.`
- bloqueio OST orfa: `publisher bloqueou publicacao: <node-id> sem cadeia ate Outcome. revise o link em OST.md.`
- bloqueio workflows/: `publisher bloqueou publicacao: diretorio workflows/ ausente. D-v1.4-07 exige workflows/ em toda celula gerada.`
- bloqueio success-examples: `publisher bloqueou publicacao: kbs/success-examples.md com <N> entradas. D-v1.4-09 exige minimo de 3 exemplos ancorados.`
- sucesso: `celula <nome> publicada em celulas/<nome>/. versao 1.0.0 registrada. ative com /Kaizen:<NomeDaCelula>.`

## Playback Gate F10 — CRITICAL INVARIANT (AC-102, AC-111)

F10 e invariante critico. Playback Gate sempre pausa para o expert,
qualquer que seja o modo. M3.4 playback-gate honra
`criticalInvariant: true` consultando
`mode-engine.isCriticalInvariant(manifest, "phase-10-publication")`.
Modo automatico nao auto-aprova F10.

Esta regra e declarada em tres lugares:

- AC 16 da story M4.5.
- Nota de Dev abaixo da Story (Dev Notes).
- Teste `tests/m4/m4.5/test-publisher-playback-critical.js`.

Falta em qualquer um dos tres dispara Quality Gate FAIL no review do
@architect.

Narrativa apresentada ao expert:

`F10 fechou. publiquei a celula em celulas/<nome>/. versao 1.0.0 no
CHANGELOG. OST fechado. quatro validadores em PASS. Schema Gate em
PASS sob <ms>ms. /Kaizen:<NomeDaCelula> ativa. confirma a publicacao?`

Opcoes do expert: `sim` (PASS, encerra Yotzer), `ajustar` (volta ao
agente da fase responsavel pela mudanca), `nao` (HALT com motivo
registrado).

## Post-condicao

- celula publicada em `celulas/{nome}/` com estrutura AC-118 completa.
- manifesto em PASS no Schema Gate sob 500ms.
- CHANGELOG iniciado em `1.0.0`.
- quatro validadores em PASS.
- Hook Model com quatro componentes instrumentados.
- `/Kaizen:{Nome}` ativa em sessao limpa.
- OST fechado como artefato vivo.
- Quality Gate F10 em PASS.

## Schemas consumidos

| Schema | Uso |
|--------|-----|
| `.kaizen-dvir/dvir/schemas/celula-schema.json` | manifesto da celula gerada (validado por publisher) |
| `.kaizen-dvir/dvir/schemas/handoff-schema.json` | F10a→F10b e F10→chief |

## Quality Gate F10 — criterios

| Id | Severidade | Verifica |
|----|------------|----------|
| F10-PLAYBACK-PAUSES | critical | playback-gate pausa em modo automatico (AC-102) |
| F10-TIER-ORDER | critical | plano em ordem manual → simplificado → batch → automatizado |
| F10-LEARNING-PER-TIER | critical | cada tier carrega `expected_learning` em pt-BR |
| F10-ACTIONS-INLINE | critical | sem `action-*.md` em `tasks/` (D-v1.3-04, AC-119) |
| F10-OST-CLOSURE | critical | toda Task chega ao Outcome (AC-117) |
| F10-WORKFLOWS-DIR | critical | `workflows/` presente (D-v1.4-07) |
| F10-SUCCESS-EXAMPLES | critical | 3+ entradas em `kbs/success-examples.md` (D-v1.4-09) |
| F10-MANIFEST-SCHEMA | critical | manifesto em PASS no Schema Gate sob 500ms (NFR-003) |
| F10-VERSION-1-0-0 | critical | manifesto declara `version: "1.0.0"` (FR-115) |
| F10-HOOK-MODEL-4 | critical | quatro componentes do Hook Model instrumentados (AC-109A) |
| F10-CLI-MAPPED | critical | `/Kaizen:{Nome}` + `*comandos` configurados |

## Veto conditions

F10 nao roda sem F9 PASS. F10 nao publica celula com `action-*.md` em
`tasks/`. F10 nao publica celula com aresta orfa no OST. F10 nao
publica celula sem `workflows/`. F10 nao publica celula com menos de 3
exemplos em `kbs/success-examples.md`. F10 nao publica manifesto que
falha em Schema Gate. F10 nao auto-aprova em modo automatico.

## pt-BR — mensagens padrao

- bloqueio de pre-condicao: `F10 precisa de F9 PASS. execute F9 antes.`
- pausa critica: `F10 e invariante critico. valido com voce antes de fechar.`
- republicacao detectada: `a celula <nome> ja foi publicada. detectei edicoes feitas apos o ultimo publish. voce quer (a) sobrescrever, (b) criar versao paralela celulas/<nome>-v2/, ou (c) cancelar?`
- sucesso: `celula <nome> publicada em celulas/<nome>/. versao 1.0.0 registrada. ative com /Kaizen:<NomeDaCelula>.`

## Referencia de escrita

Toda saida ao expert segue
`arquivos-relevantes/01-contexto-danilo/diretrizes-escrita.md`. Frases
curtas. Presente. Voz ativa. Sem adverbios.
