# Yotzer — Célula Meta de Criação de Células

> Yotzer é a célula bundled do KaiZen que cria novas células. Ela tem duas superfícies de ativação: slash command interativo (sessão Claude Code) e shell subcommand (terminal programático). Esta regra explica quando usar cada uma.

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
- Você quer acessar um specialist direto: `/Kaizen:Yotzer:archaeologist`, `/Kaizen:Yotzer:publisher`, etc.

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

## Specialists Acessíveis Direto

Sempre que você quer pular a entrada padrão e falar direto com um specialist, use a sub-skill:

```
/Kaizen:Yotzer:archaeologist     → análise de fonte e exemplos
/Kaizen:Yotzer:analyst           → stress-test e análise
/Kaizen:Yotzer:architect         → desenho da célula
/Kaizen:Yotzer:task-granulator   → granulação de tasks
/Kaizen:Yotzer:validator         → Playback Gate
/Kaizen:Yotzer:publisher         → publicação final
```

Quando em dúvida, ative o `chief` e deixe ele rotear.

## Quality Gates do Yotzer

Antes da publicação (F10), Yotzer aplica três gates:

1. **Schema Gate** — `celula.yaml` está bem-formado e respeita as decisões canônicas do framework.
2. **Authority Gate** — autoridades declaradas não conflitam com Commandment II (cada um faz o seu).
3. **Playback Gate** — expert recebe o resumo do que será gerado e confirma antes do build (Commandment VI).

`FAIL` em qualquer gate retorna o trabalho à fase anterior com feedback específico. `WAIVED` exige `approved_by` do expert registrado no work artifact.

## Onde Saber Mais

| Tópico | Path |
|--------|------|
| Anatomia de uma célula gerada pelo Yotzer | `.claude/rules/cells.md` |
| Mutabilidade dos paths que Yotzer escreve | `.claude/rules/boundary.md` |
| Convenções de commit ao publicar | `.claude/rules/commit-conventions.md` |
| Definição operacional do Yotzer | `.kaizen-dvir/celulas/yotzer/celula.yaml` |
