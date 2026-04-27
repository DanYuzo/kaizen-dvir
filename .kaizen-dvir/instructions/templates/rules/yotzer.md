# Yotzer — Célula Meta para construção de SOs de workflow recorrente

> Yotzer é a célula bundled do KaiZen que constrói o sistema operacional vivo de um workflow recorrente do expert. Cada célula gerada acompanha esse workflow, registra o que funciona, corta o que não funciona, e melhora iteração a iteração — kaizen aplicado ao próprio fazer do expert.
>
> Yotzer cria novas células como manifestação concreta desse princípio. Ela tem duas superfícies de ativação: slash command interativo (sessão Claude Code) e shell subcommand (terminal programático). Esta regra explica quando usar cada uma.

## Duas Superfícies de Ativação

| Superfície | Como ativar | Onde rodar | Para que serve |
|------------|-------------|------------|----------------|
| **Slash command** | `/Kaizen:Yotzer` | Dentro de uma sessão Claude Code | Conversa interativa com o agente `chief`. Expert descreve o problema, chief roteia para specialists, descoberta acontece via diálogo. |
| **Shell subcommand** | `kaizen Kaizen:Yotzer publish <work-id>`<br>`kaizen Kaizen:Yotzer resume <work-id>`<br>`kaizen Kaizen:Yotzer validate <work-id>` | Terminal | Operações programáticas sobre um work-id já existente. Não inicia nova conversa — opera sobre artefatos persistidos. |

As duas superfícies são produtos diferentes. O slash command é onde o expert **decide** o que quer; o subcommand é onde o framework **executa** uma operação concreta sobre um work-id já descoberto.

## Quando Usar o Slash Command

- Você ainda não sabe exatamente o que precisa criar.
- Você quer dialogar com o `chief` para descobrir o caminho.
- Você quer começar uma nova spec de célula do zero.

## Quando Usar o Shell Subcommand

- Você já tem um `work-id` (a spec da célula em progresso).
- Você quer publicar a célula descoberta: `kaizen Kaizen:Yotzer publish <work-id>`.
- Você retomou o trabalho depois de pausa: `kaizen Kaizen:Yotzer resume <work-id>`.
- Você quer validar uma spec sem publicar: `kaizen Kaizen:Yotzer validate <work-id>`.

## Visão Geral do Workflow Yotzer (10 Fases)

O workflow do Yotzer é dividido em dez fases. O `chief` conduz a sequência; cada fase tem entrada, saída e specialist responsável.

| Fase | Nome | Specialist | Output |
|------|------|------------|--------|
| **F1** | Recepção | chief | Pergunta inicial registrada; expert convidado a descrever o problema. |
| **F2** | Descoberta de fonte | archaeologist | Materiais brutos do expert localizados e catalogados (Ikigai, KBs, processos existentes). |
| **F3** | Análise de exemplos | archaeologist | Casos de sucesso e padrões extraídos da fonte. |
| **F4** | Definição de problema | chief + analyst | Problema delimitado; expert valida o recorte. |
| **F5** | Stress-test | analyst | Spec testada contra cenários de borda. Riscos e gaps registrados. |
| **F6** | Desenho da célula | architect | Estrutura proposta — agentes, tiers, autoridades, workflows. |
| **F7** | Priorização | chief + expert | Escopo do MVP da célula travado. |
| **F8** | Granulação de tasks | task-granulator | Tasks individuais especificadas (input, output, pre/post-conditions). |
| **F9** | Validação final | validator | Playback Gate ao expert antes do build. |
| **F10** | Publicação | publisher | Spec materializa em `.kaizen-dvir/celulas/{nome}/` com todos os artefatos prontos. |

Detalhes operacionais e contratos de cada fase vivem em `.kaizen-dvir/celulas/yotzer/workflows/`.

## Reativação Direta de Specialist (power-user)

Os specialists não aparecem como slash commands na superfície default — o `chief` os carrega internamente via path de persona. Para um power-user que sabe exatamente qual specialist quer falar e prefere pular a entrada padrão, há um mecanismo de reativação direta: referenciar o arquivo de persona pelo `@path` (engine path, fonte real das personas).

```
@.kaizen-dvir/celulas/yotzer/agents/archaeologist.md          → análise de fonte e exemplos
@.kaizen-dvir/celulas/yotzer/agents/contract-builder.md       → contratos de tasks/specialists
@.kaizen-dvir/celulas/yotzer/agents/prioritizer.md            → priorização de escopo MVP
@.kaizen-dvir/celulas/yotzer/agents/progressive-systemizer.md → sistematização incremental
@.kaizen-dvir/celulas/yotzer/agents/publisher.md              → publicação final da célula
@.kaizen-dvir/celulas/yotzer/agents/risk-mapper.md            → mapa de riscos do processo
@.kaizen-dvir/celulas/yotzer/agents/stress-tester.md          → stress-test do processo
@.kaizen-dvir/celulas/yotzer/agents/task-granulator.md        → granulação de tasks
```

Esse caminho é opcional e voltado a quem já conhece o fluxo. Quando em dúvida, ative o `chief` (`/Kaizen:Yotzer`) e deixe ele rotear.

## Regra invariante: 1 célula = 1 slash command

Cada célula publicada (Yotzer e qualquer célula gerada por ela) expõe **apenas 1 slash command** — o entry point que carrega o `chief`. Specialists (tier 2, tier 3, sub-agentes) **não** recebem slash command próprio. Eles vivem no engine path (`@.kaizen-dvir/celulas/{nome}/agents/<id>.md`) e são carregados internamente pelo chief via roteamento de fase ou delegação. Power-user que quiser pular direto para um specialist usa o `@path` (mecanismo descrito acima), nunca um slash de superfície. Esta regra é validada pelo gate `F10b-CLI-MAPPED` do publisher e está documentada em `.kaizen-dvir/celulas/yotzer/templates/celula-blueprint-tmpl.yaml` (campo `slashPrefix`). O propósito é manter a superfície de ativação limpa, evitar duplicação de entry points, e centralizar a orquestração no chief.

## Quality Gates do Yotzer

Antes da publicação (F10), Yotzer aplica três gates:

1. **Schema Gate** — `celula.yaml` está bem-formado e respeita as decisões canônicas do framework.
2. **Authority Gate** — autoridades declaradas não conflitam com Commandment II (cada um faz o seu).
3. **Playback Gate** — expert recebe o resumo do que será gerado e confirma antes do build (Commandment VI).

Quando um gate identifica problema, o trabalho volta à fase anterior com feedback específico que descreve em pt-BR o que precisa ajustar. Quando o expert decide seguir mesmo com uma situação não ideal, a decisão fica registrada no work artifact com `approved_by`. Os termos `PASS`, `FAIL`, `CONCERNS` e `WAIVED` são identificadores internos de gate (telemetria, schemas, logs) — nunca aparecem como texto direto ao expert na conversa.

## Onde Saber Mais

| Tópico | Path |
|--------|------|
| Anatomia de uma célula gerada pelo Yotzer | `.claude/rules/cells.md` |
| Mutabilidade dos paths que Yotzer escreve | `.claude/rules/boundary.md` |
| Convenções de commit ao publicar | `.claude/rules/commit-conventions.md` |
| Definição operacional do Yotzer | `.kaizen-dvir/celulas/yotzer/celula.yaml` |
