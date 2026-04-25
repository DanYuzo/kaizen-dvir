---
task: "Architect Squad"
responsavel: "@forge-smith"
responsavel_type: "agent"
atomic_layer: "task"
Entrada: "02-process-map/process-map.yaml, 01-extraction/process-units.yaml"
Saida: "03-blueprint/squad-blueprint.yaml, agent-decomposition.md, task-mapping.md"
Checklist:
  - "1-7 agentes definidos com rationale"
  - "Cada PU-STEP mapeado para exatamente 1 task"
  - "Cada PU-DECISION mapeado para decision point ou gate"
  - "Sem dependencia circular no grafo"
  - "Human touchpoints identificados"
  - "Bottleneck abordado no design"
execution_type: "semantic"
---

# Task: Architect Squad — Arquitetura do Squad

**Task ID:** squad-forge/architect-squad
**Version:** 1.0.0
**Status:** Production Ready
**Created:** 2026-03-03
**Category:** Architecture
**Execution Type:** Semantic

---

## Executive Summary

Fase 3 do pipeline Squad Forge. O @forge-smith recebe o process map validado e transforma em arquitetura de squad AIOS: decompoe em agentes, mapeia PUs para tasks, desenha workflow e quality gates. Output: squad blueprint pronto pra montagem.

**Posicao no Workflow:** Fase 3 — Apos Playback (Fase 2), antes de Montagem (Fase 4)
**Definicao de Sucesso:** Blueprint coerente com cada PU mapeado, sem dependencia circular
**Gate:** QG-SF-003 — Architecture Coherence

---

## Purpose

Ter um processo extraido e validado nao e o mesmo que ter um squad. Alguem precisa decidir: quantos agentes? qual a responsabilidade de cada um? como os PUs viram tasks? onde ficam os quality gates? este task faz essa traducao.

---

## Pipeline Visual

```
architect-squad
  |
  v
STEP 1: ANALYZE PROCESS MAP
  Ler PUs, dependencias, complexidade
  |
  v
STEP 2: IDENTIFY CLUSTERS
  Agrupar PUs por area de responsabilidade
  |
  v
STEP 3: DEFINE AGENTS
  1-7 agentes com roles claros
  |
  v
STEP 4: MAP PUs TO TASKS + KB (dual mapping)
  PU-STEPs -> tasks + KB, DECISIONs -> decision points + decision trees
  |
  v
STEP 5: PLANEJAR KNOWLEDGE BASE
  Checar ETL existente, mapear PUs operacionais pra KB
  |
  v
STEP 6: DESIGN WORKFLOW
  Fases, quality gates, human touchpoints
  |
  v
STEP 7: GENERATE BLUEPRINT
  squad-blueprint.yaml + kb-plan.md
  |
  v
QUALITY GATE: QG-SF-003
  |
  v
HANDOFF -> assemble-squad
```

---

## Step-by-Step Execution

### Step 1: Analyze Process Map

Ler:
- `02-process-map/process-map.yaml`
- `01-extraction/process-units.yaml`

Calcular:
- Total de PU-STEPs (define quantidade de tasks)
- Total de PU-DECISIONs (define complexidade)
- Total de PU-QUALITYGATEs (define checkpoints)
- Distribuicao de executor_hints (human vs agent vs hybrid)
- Grafo de dependencias
- Bottleneck identificado

**Classificar complexidade:**

| PUs | Complexidade | Agentes esperados | Tasks esperadas |
|-----|-------------|-------------------|-----------------|
| 5-15 | Simple | 1-2 | 2-4 |
| 16-30 | Standard | 2-4 | 4-8 |
| 31+ | Complex | 4-7 | 8-15 |

### Step 2: Identify Clusters

Agrupar PU-STEPs por area de responsabilidade usando sinais:

**Sinais de agrupamento:**
- Mesmas ferramentas usadas → mesmo agente
- Mesmo tipo de executor → mesmo agente
- Forte acoplamento sequencial → mesmo agente
- Area tematica comum (ex: todos os passos de "pesquisa") → mesmo agente

**Sinais de separacao:**
- Executor diferente (human vs agent) → agentes diferentes
- Independencia (podem rodar em paralelo) → agentes diferentes
- Expertise distinta necessaria → agentes diferentes

### Step 3: Define Agents

Para cada cluster:

```yaml
agent:
  id: "{nome-kebab-case}"
  role: "{1 frase descrevendo o papel}"
  responsible_for:
    steps: [step_numbers]
    decisions: [pu_ids]
  executor_profile: "{agent|human|hybrid}"
  pu_count: N
  rationale: "{Por que este agente existe}"
```

**Regras:**
- Minimo 1, maximo 7 agentes
- Se 1 agente: processo simples, tudo num so
- Se >7: propor decomposicao em sub-squads
- Todo squad tem 1 orchestrator (chief) + N tier_1
- Orchestrator gerencia fluxo, nao executa tasks

**Se processo tem passos human-only e agent-only:**
- Criar agente separado pros agent-only
- Human touchpoints ficam como tasks interativas no orchestrator

### Step 4: Map PUs to Tasks

**Regra de mapeamento (DUAL — Tasks + KB):**

Cada PU alimenta DOIS destinos: a estrutura do squad (tasks/workflow) E a knowledge base. Tasks definem O QUE fazer; KB define COMO fazer com profundidade.

| PU Type | Vira na Estrutura (tasks/workflow) | Vira na KB |
|---------|-----------------------------------|------------|
| STEP (estrutural) | Passo dentro de uma task | — |
| STEP (operacional) | Passo dentro de uma task | Protocolo detalhado com exemplos |
| DECISION | Decision point dentro de task OU quality gate | Decision tree com branches e criterios |
| EXCEPTION | Error handling section da task | Troubleshooting com diagnostico |
| QUALITY_GATE | Checklist item da task OU quality gate do workflow | Criterios de qualidade com benchmarks |
| DEPENDENCY | Ordem das tasks no workflow | — |
| INPUT | Campo "Entrada" da task | Glossario (se termo do dominio) |
| OUTPUT | Campo "Saida" da task | Glossario (se termo do dominio) |
| TACIT | Regra no "STRICT RULES" do agente | Regra Cardinal com contexto e exemplos |

**Distinguir STEP estrutural vs operacional:**
- **Estrutural:** "Abrir o gerenciador", "Clicar em criar campanha" → so vai pra task
- **Operacional:** "Escalar 20-50% por dia", "Trading de orcamento com regras horarias" → vai pra task E pra KB com profundidade

**Regra:** Na duvida, inclui na KB. KB demais > KB de menos.

**Cada task gerada deve ter:**
- Nome claro (verbo + objeto)
- 1 agente responsavel
- Entrada e Saida definidos (dos PU-INPUT/OUTPUT)
- Checklist (dos PU-QUALITY_GATE)
- Execution type (deterministic/semantic/interactive)

**Agrupar PU-STEPs em tasks:**
- STEPs fortemente acoplados → mesma task
- STEPs independentes → tasks separadas
- 1 task nao deve ter mais que 5-7 STEPs

### Step 5: Planejar Knowledge Base

**ANTES de desenhar o workflow, planejar a KB do squad.**

**5a: Checar ETL existente**

```bash
# Checar se ja existe knowledge produzido pelo ETLmaker
ls docs/knowledge/expert-business/*{slug}*/ 2>/dev/null
ls agents/etlmaker/kbs/*{slug}*/ 2>/dev/null
```

Se existir:
- Mapear quais volumes/secoes do ETL sao relevantes pro escopo do squad
- Marcar como "incorporar na KB" no blueprint
- A KB do squad sera subconjunto RICO do ETL (nao resumo raso)

Se nao existir:
- KB sera composta a partir dos PUs (Step 6c do assemble-squad)

**5b: Identificar PUs que alimentam a KB**

Percorrer todos os PUs e marcar os que precisam de tratamento na KB:

```yaml
kb_plan:
  cardinal_rules:
    - pu_id: "PU-TACIT-xxx"
      content: "{regra}"
  protocols:
    - pu_id: "PU-STEP-xxx"
      type: "operational"
      content: "{protocolo}"
  decision_trees:
    - pu_id: "PU-DECISION-xxx"
      branches: N
      content: "{arvore}"
  troubleshooting:
    - pu_id: "PU-EXCEPTION-xxx"
      content: "{diagnostico}"
  etl_volumes:
    - path: "{caminho do volume ETL}"
      sections: ["{secoes relevantes}"]
```

Incluir `kb_plan` no blueprint (Step 7).

### Step 6: Design Workflow

**Estrutura do workflow:**

```yaml
workflow:
  phases:
    - phase: 0
      name: "{Nome descritivo}"
      tasks: [task_names]
      agent: "{agent-id}"
      blocking: true/false
      quality_gate: "QG-xxx"  # Se existir
```

**Regras de design:**

1. Workflow e UNIDIRECIONAL (nada volta — principio Pedro Valerio)
2. Quality gates entre fases criticas (dos PU-QUALITY_GATE)
3. Human touchpoints explicitados como tasks interativas
4. Bottleneck do processo deve ser abordado (simplificado, paralelizado, ou gate)
5. Tasks paralelas identificadas

### Step 7: Generate Blueprint

Salvar em `03-blueprint/squad-blueprint.yaml` usando `templates/squad-blueprint-tmpl.yaml`.

Tambem gerar:
- `03-blueprint/agent-decomposition.md` — rationale de cada agente em formato legivel
- `03-blueprint/task-mapping.md` — tabela PU → task (estrutura)
- `03-blueprint/kb-plan.md` — plano de KB: PUs que alimentam a KB + volumes ETL a incorporar

### Step 8: Quality Gate — QG-SF-003

**Criterios:**

| Criterio | Obrigatorio |
|----------|-------------|
| 1-7 agentes definidos | Sim |
| Cada PU-STEP mapeado para exatamente 1 task | Sim |
| Cada PU-DECISION mapeado para decision point ou gate | Sim |
| Sem dependencia circular no grafo | Sim |
| Cada task tem agente atribuido | Sim |
| Human touchpoints identificados | Sim |
| Bottleneck abordado | Sim |
| KB plan documentado (kb-plan.md) | Sim |
| PU-TACITs mapeados pra KB (nao so STRICT RULES) | Sim |
| ETL existente identificado e marcado pra incorporacao | Sim (se existir) |

**Veto conditions:**
- 0 tasks geradas
- Dependencia circular detectada
- >50% das tasks sao Hybrid (sugere decomposicao confusa)
- PU-STEP orfao (nao mapeado pra nenhuma task)
- Squad operacional sem kb-plan.md

---

## Outputs

| Arquivo | Conteudo |
|---------|----------|
| `03-blueprint/squad-blueprint.yaml` | Arquitetura completa |
| `03-blueprint/agent-decomposition.md` | Rationale dos agentes |
| `03-blueprint/task-mapping.md` | Mapeamento PU → task |

---

**Task Status:** Ready for Production
