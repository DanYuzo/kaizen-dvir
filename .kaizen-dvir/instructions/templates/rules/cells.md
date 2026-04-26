# Anatomia de uma Célula KaiZen

> Esta regra define o que é uma **célula**, como ela se distingue de um **agente**, e qual é o lifecycle dela dentro do KaiZen. Esta é a definição canônica de vocabulário para todo o framework.

## Vocabulário Canônico — Célula vs. Agente

| Termo | Definição | Exemplo |
|-------|-----------|---------|
| **Célula** | Grupo orquestrado de múltiplos agentes em tiers, executando um workflow específico. Unidade de distribuição e instalação. Ativada via `/Kaizen:{Nome}` em sessão Claude Code. | Yotzer (9 agentes em 3 tiers) é uma célula. |
| **Agente** | Unidade individual com persona, expertise e responsabilidades próprias. Componente interno de uma célula. Acessado via roteamento dentro da célula ou via slash sub-skill (`/Kaizen:Yotzer:archaeologist`). | `chief`, `archaeologist`, `publisher` são agentes dentro da célula Yotzer. |

**Regra de uso:** sempre que se refere à unidade de distribuição, ao produto que é instalado e ativado, use **célula**. Sempre que se refere ao componente individual com expertise, use **agente**. Tratar agente como unidade de distribuição é violação de vocabulário e gera confusão entre framework e harness.

## Estrutura de Pasta

Toda célula vive em `.kaizen-dvir/celulas/{nome-da-celula}/` com a seguinte estrutura:

```
.kaizen-dvir/celulas/{nome}/
├── celula.yaml          # manifest da célula (versão, agentes, autoridades, hooks)
├── MEMORY.md            # memória append-only compartilhada por sub-agentes
├── agents/              # personas dos agentes da célula
├── tasks/               # tarefas executáveis pelos agentes
├── workflows/           # workflows orquestrando agentes em fases
├── templates/           # templates de output user-facing
├── checklists/          # checklists de quality gate
└── kbs/                 # knowledge bases internas da célula
```

`MEMORY.md` é o único arquivo desta árvore com exceção explícita de escrita em runtime (ver `.claude/rules/boundary.md`). Toda escrita é append-only e segue o formato declarado no template `memory-tmpl.md`.

## Manifest `celula.yaml`

O manifest declara identidade, agentes e autoridades da célula. Estrutura mínima:

```yaml
celula_id: {nome-da-celula}
name: {Nome Apresentável}
version: {semver}
description: {1-2 linhas em pt-BR sobre o que a célula faz}

tiers:
  - tier: 1
    agents: [chief]
  - tier: 2
    agents: [agente-a, agente-b]
  - tier: 3
    agents: [agente-c]

authorities:
  - {operação que esta célula tem autoridade exclusiva}

memory:
  scope: cell
  policy: append-only
```

**Authority Matrix**: o que não está em `authorities` não é permitido para a célula. Operações fora do escopo delegam para a célula que detém a autoridade. Consulte Commandment II para detalhes.

## Tiers de Agentes

Toda célula organiza seus agentes em três tiers:

| Tier | Papel | Quem é |
|------|-------|--------|
| **Tier 1 — Chief** | Entry agent. Conversa com o expert, roteia para specialists, coordena o workflow. | Único agente; sempre se chama `chief` ou recebe nome canônico do entry point. |
| **Tier 2 — Specialists** | Agentes de execução. Cada um detém uma expertise específica (pesquisa, análise, copy, validação, etc.). | Múltiplos agentes; cada um com persona dedicada. |
| **Tier 3 — Helpers** | Agentes de apoio. Validam, formatam, publicam outputs gerados pelos specialists. | Opcional; muitas células dispensam tier 3 e fundem essas responsabilidades em tier 2. |

## Lifecycle de uma Célula

```
Yotzer cria  →  publish gera artefatos  →  activate via skill  →  célula opera  →  retro/atualizar
```

| Fase | O que acontece | Quem executa |
|------|----------------|--------------|
| **Yotzer** | Workflow interativo descobre o problema, define os agentes, valida o escopo. Output: spec da nova célula. | Yotzer (célula meta) + expert |
| **Publish** | Materializa a spec em arquivos: `celula.yaml`, `agents/`, `tasks/`, `workflows/`, `templates/`, `checklists/`, `kbs/`. | Subcommand `kaizen Kaizen:Yotzer publish <work-id>` |
| **Activate** | Registra a célula como skill no Claude Code via `.claude/commands/Kaizen/{Nome}.md`. | `kaizen init` para células bundled; `kaizen install` para células externas (roadmap M4) |
| **Operação** | Expert ativa a célula via `/Kaizen:{Nome}` na sessão Claude Code. Chief recebe o pedido e coordena os specialists. | Célula + expert |
| **Retro / Update** | Célula registra aprendizados em `MEMORY.md`. Mudanças estruturais viram nova versão (semver bump em `celula.yaml`). | Célula + expert |

## Sub-agente, Workflow e Task

Para evitar ambiguidade adicional:

- **Sub-agente** — sinônimo de **agente** dentro do contexto de uma célula. Reforça que o agente é componente, não unidade autônoma.
- **Workflow** — sequência de fases declarada em `workflows/{nome}.yaml`. Cada fase invoca uma task com inputs e outputs definidos.
- **Task** — unidade de execução individual com input, output, pre/post-conditions e modo de elicitação. Vive em `tasks/{nome}.md`.

## Onde Saber Mais

| Tópico | Path |
|--------|------|
| Como ativar Yotzer e criar uma nova célula | `.claude/rules/yotzer.md` |
| Como diagnosticar células instaladas | `.claude/rules/doctor.md` |
| Mutabilidade dos paths de célula | `.claude/rules/boundary.md` |
| Política de memória append-only | `.kaizen-dvir/commandments.md` § Commandment V |
