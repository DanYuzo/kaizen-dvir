# VOL-03 — Arquitetura e Design de Squads (Fase 2 da construção)

> **KB:** KaiZen | **Consumer:** Moreh
> **Domínio:** D3 — Arquitetura e Design
> **Fontes primárias:** `loc-04-squad-forge/agents/forge-smith`, `loc-04-squad-forge/tasks/architect-squad`, `loc-04-squad-forge/data/executor-mapping-guide`, `loc-04-squad-forge/templates/squad-blueprint-tmpl`
> **Regras cardinais principais:** RC-03, RC-04, RC-05, RC-11, RC-13

---

## 1. O Que Este Volume Ensina

Depois da extração (VOL-02), Moreh tem **process map validado**: lista de PUs + dependências + playback aprovado. Agora precisa transformar em **arquitetura de squad**.

Aqui Moreh aprende:

1. **Analisar process map** — calcular complexidade, distribuir executores, identificar bottleneck
2. **Identificar clusters** — agrupar PU-STEPs por área de responsabilidade
3. **Definir agentes** (1-7 por squad) com rationale, executor profile, PU count
4. **Executor classification** — agent/human/hybrid/worker com decision tree
5. **Dual mapping PU → Task + KB** — tasks definem O QUE, KB define COMO
6. **Planejar Knowledge Base** — checar ETL existente, mapear PUs operacionais pra KB
7. **Workflow design** — unidirecional, fases, QGs, human touchpoints
8. **Agent design completo** — persona 6-níveis, voice DNA, output examples (3+), immune system (3+ triggers)
9. **Squad blueprint** — documento de arquitetura que precede montagem
10. **QG-SF-003** — gate de coerência arquitetural

---

## 2. Analisar o Process Map

Primeira operação da Fase 2. Ler `02-process-map/process-map.yaml` e `01-extraction/process-units.yaml`, calcular métricas.

### 2.1 Classificar complexidade

| PUs totais | Complexidade | Agentes esperados | Tasks esperadas | Duração build |
|------------|-------------|-------------------|-----------------|---------------|
| 5-15 | Simple | 1-2 | 2-4 | 2-3 horas |
| 16-30 | Standard | 2-4 | 4-8 | 4-6 horas |
| 31+ | Complex | 4-7 | 8-15 | 8-12 horas |

### 2.2 Métricas essenciais

```yaml
analysis:
  total_pus: N
  pus_by_type:
    STEP: N
    DECISION: N
    EXCEPTION: N
    QUALITY_GATE: N
    DEPENDENCY: N
    TACIT: N
  executor_distribution:
    agent: %
    human: %
    hybrid: %
    worker: %
  bottleneck_step: step_number
  parallel_groups: [[step_a, step_b], ...]
  external_dependencies: [step_numbers]
```

### 2.3 Heurística inicial

- **Muitos DECISIONs** (>5) → workflow com branching complexo
- **Muitos EXCEPTIONs** (>5) → processo maduro, error handling robusto
- **Muitos TACITs** → KB rica é crítica (viola RC-06 se raso)
- **Muitos humanos** (>40%) → hybrid squad
- **Muitos agentes** (>60%) → automação viável
- **Bottleneck claro** → abordar explicitamente no design (simplificar/paralelizar/gate)

---

## 3. Identificar Clusters de Responsabilidade

Agrupar PU-STEPs em clusters. Cada cluster vira candidato a agente.

### 3.1 Sinais de agrupamento (mesmo cluster)

- Mesmas ferramentas usadas
- Mesmo tipo de executor (todos agent, todos human)
- Forte acoplamento sequencial
- Área temática comum (ex: todos passos de "pesquisa")
- Mesmo vocabulário de domínio

### 3.2 Sinais de separação (clusters diferentes)

- Executor diferente (human vs agent)
- Independência (podem rodar paralelo)
- Expertise distinta necessária
- Domínios de responsabilidade diferentes
- Mesmo resultado, caminhos cognitivos diferentes

### 3.3 Exemplo prático

Process map de "criar oferta":

| PU-STEP | Cluster candidato |
|---------|-------------------|
| Pesquisar dores do público | **Pesquisa** |
| Pesquisar ofertas concorrentes | **Pesquisa** |
| Definir Value Equation | **Estratégia** |
| Definir preço | **Estratégia** |
| Escrever headline PAS | **Copy** |
| Escrever bullets benefits | **Copy** |
| Definir CTA | **Copy** |
| Montar página de vendas | **Publicação** |
| Configurar integração pagamento | **Publicação** |

→ 4 clusters → 4 agentes candidatos: Researcher, Strategist, Copywriter, Publisher.

### 3.4 Regras de decomposição

- **Mínimo 1 agente** (processo simples)
- **Máximo 7 agentes** (processo complexo)
- Se >7: propor sub-squads (VOL-10)
- Todo squad tem **1 orchestrator (chief)** + **N tier_1 executors**
- Orchestrator **NUNCA executa tasks** [RC-05]

---

## 4. Definir Agentes

Para cada cluster, formalizar agente:

```yaml
agent:
  id: "{nome-kebab-case}"
  role: "{1 frase descrevendo o papel}"
  responsible_for:
    steps: [step_numbers]
    decisions: [pu_ids]
  executor_profile: "{agent|human|hybrid}"
  pu_count: N
  rationale: "{Por que este agente existe — separado dos outros}"
```

### 4.1 Rationale é obrigatório

Cada agente precisa de **justificativa explícita** pra existir separado dos outros. Não basta "faz pesquisa"—precisa explicar por que pesquisa não pode estar junto com estratégia ou copy.

**Exemplo:**
```
Researcher:
  rationale: "Pesquisa e estrategia requerem cognições diferentes —
             pesquisa e empirica, estrategia e sintetica. Separar
             evita viés de confirmação: researcher coleta sem juízo,
             strategist sintetiza com juízo. Herdado Auroq Art. II."
```

### 4.2 Tier system

```yaml
tiers:
  orchestrator:
    - chief-agent-id     # Único. Coordena, não executa.
  tier_1:
    - agent-2-id
    - agent-3-id         # Executores primários.
  tier_2: []             # Opcional. Sub-agentes especializados.
```

---

## 5. Executor Classification

Para cada PU-STEP, classificar **tipo de executor**.

### 5.1 Os 4 tipos

| Tipo | Símbolo | Quem faz | Quando usar |
|------|---------|----------|-------------|
| **agent** | 🤖 | IA executa sozinha | Regras claras, output previsível, regras objetivas |
| **human** | 👤 | Só o dono | Julgamento subjetivo, relação, estratégia, criatividade única |
| **hybrid** | 🤝 | IA prepara, dono revisa | Parte mecânica + parte criativa. Rascunho por IA, polish por humano |
| **worker** | ⚙️ | Automação determinística | Script, webhook, regra fixa. Sem IA |

### 5.2 Árvore de decisão

```
1. Requer julgamento subjetivo do DONO?
   SIM → HUMAN ou HYBRID
   NÃO → passo 2

2. Tem regras claras e output previsível?
   SIM → passo 3
   NÃO → HYBRID (agente tenta, humano valida)

3. Precisa de capacidade generativa (escrita, análise)?
   SIM → AGENT
   NÃO → WORKER

4. Dono PRECISA revisar o resultado?
   SIM → HYBRID
   NÃO → manter classificação anterior
```

### 5.3 Sinais de reclassificação

**agent → hybrid:**
- "Eu sempre reviso isso antes de enviar"
- "Passo envolve tom de voz pessoal"
- "Resultado impacta cliente diretamente"

**human → hybrid:**
- "Gasto 30min mas 80% é mecânico"
- "Pesquisa e coleta de dados antes de decisão"

**hybrid → agent:**
- "Isso eu nem preciso revisar, sempre tá bom"
- "Critérios de qualidade são 100% objetivos"
- "Passo é de baixo risco"

### 5.4 Mapping pra Task Anatomy

| Executor | responsavel_type | execution_type | Supervisão |
|----------|-----------------|----------------|------------|
| agent | agent | semantic | async (checklist pós-execução) |
| human | human | interactive | nenhuma (dono é o executor) |
| hybrid | hybrid | interactive | sync (dono revisa antes de prosseguir) |
| worker | worker | deterministic | nenhuma (determinístico) |

---

## 6. Dual Mapping — PU para Task + KB

**Regra crítica [RC-06]:** cada PU alimenta **DOIS destinos** — a estrutura do squad (tasks/workflow) E a knowledge base. Tasks definem O QUE fazer; KB define COMO fazer com profundidade.

### 6.1 Tabela de mapeamento

| PU Type | Vira na Estrutura (tasks/workflow) | Vira na KB |
|---------|-----------------------------------|------------|
| **STEP (estrutural)** | Passo dentro de task | — |
| **STEP (operacional)** | Passo dentro de task | **Protocolo detalhado com exemplos** |
| **DECISION** | Decision point em task OU quality gate | **Decision tree com branches e critérios** |
| **EXCEPTION** | Error handling section da task | **Troubleshooting com diagnóstico** |
| **QUALITY_GATE** | Checklist item OU quality gate do workflow | **Critérios com benchmarks** |
| **DEPENDENCY** | Ordem das tasks no workflow | — |
| **INPUT** | Campo "Entrada" da task | Glossário (se termo do domínio) |
| **OUTPUT** | Campo "Saída" da task | Glossário (se termo do domínio) |
| **TACIT** | Regra no "STRICT RULES" do agente | **Regra Cardinal com contexto e exemplos** |

### 6.2 STEP estrutural vs operacional

Distinção importante:

- **Estrutural:** "Abrir o gerenciador", "Clicar em criar campanha" → só vai pra task
- **Operacional:** "Escalar 20-50% por dia", "Trading de orçamento com regras horárias" → vai pra task **E** pra KB com profundidade

**Regra:** na dúvida, incluir na KB. **KB demais > KB de menos.** [RC-13 cobertura 80%+]

### 6.3 Cada task gerada deve ter

- Nome claro (verbo + objeto)
- 1 agente responsável
- Entrada e Saída definidos (dos PU-INPUT/OUTPUT)
- Checklist (dos PU-QUALITY_GATE)
- Execution type (deterministic/semantic/interactive)

### 6.4 Agrupar PU-STEPs em tasks

- STEPs fortemente acoplados → **mesma task**
- STEPs independentes → tasks separadas
- **1 task não deve ter mais que 5-7 STEPs** (se tem, quebrar)

---

## 7. Planejar Knowledge Base

**ANTES de desenhar o workflow**, planejar a KB do squad.

### 7.1 Checar ETL existente

```bash
# Checar se ja existe knowledge produzido pelo ETLmaker
ls docs/knowledge/expert-business/*{slug}*/ 2>/dev/null
ls agents/etlmaker/kbs/*{slug}*/ 2>/dev/null
```

**Se existir:**
- Mapear volumes/seções relevantes
- Marcar como "incorporar na KB" no blueprint
- KB do squad será **subconjunto RICO do ETL** (não resumo raso)

**Se não existir:**
- KB será composta a partir dos PUs (assemble-squad Step 6c)

### 7.2 Identificar PUs que alimentam a KB

Percorrer todos os PUs e marcar os que precisam tratamento na KB:

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

Incluir `kb_plan` no squad blueprint.

### 7.3 Anti-padrão histórico (a evitar)

ETL produz 3.000+ linhas de conhecimento rico. Squad building comprime pra 150 linhas de skeleton. Resultado: squad não sabe operar.

**Regra:** KB do squad **preserva profundidade, exemplos, tabelas e decision trees do ETL**. Nada de compressão agressiva. [RC-06, RC-13]

---

## 8. Workflow Design

### 8.1 Estrutura

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

### 8.2 Regras de design

1. **Workflow é UNIDIRECIONAL** [RC-04] — nada volta. Princípio Pedro Valerio.
2. **Quality gates entre fases críticas** (derivados de PU-QUALITY_GATE)
3. **Human touchpoints explícitos** como tasks interativas
4. **Bottleneck** (Goldratt) deve ser **abordado** (simplificado, paralelizado, ou gate)
5. **Tasks paralelas identificadas** (podem rodar simultaneamente)

### 8.3 Tratamento do bottleneck

Três estratégias aceitas:

| Estratégia | Quando | Exemplo |
|------------|--------|---------|
| **Simplificar** | Gargalo é artificial (verificação excessiva) | Cortar 2 aprovações desnecessárias |
| **Paralelizar** | Parte do trabalho pode rodar em paralelo | Research + Copy simultâneos |
| **Gate** | Gargalo é inevitável, precisa de qualidade | QG manual com validação explícita |

### 8.4 Human touchpoints

Cada fase declara explicitamente se humano precisa:

| Interação | Marcação |
|-----------|----------|
| Aprovar antes de prosseguir | `human_approval: required` |
| Fornecer input | `human_input: required` |
| Ser notificado | `human_notification: true` |
| Totalmente autônomo | `human_interaction: none` |

### 8.5 Escalation explícita

```yaml
escalation:
  - SE task trava por mais de X → notificar expert
  - SE quality gate falha N vezes → escalar pra revisão humana
  - SE exceção critical aparece → halt + notificar
```

---

## 9. Agent Design — Persona 6 Níveis

Cada agente gerado precisa de persona completa em 6 níveis.

### 9.1 Os 6 níveis

1. **Identity** — nome, papel, expertise
2. **Operational** — princípios, frameworks, commands
3. **Voice DNA** — vocabulário, metáforas, tom
4. **Quality** — exemplos de output, anti-patterns
5. **Credibility** — autoridade no domínio
6. **Integration** — de quem recebe, pra quem entrega

### 9.2 Quando usar cada nível

| Nível | Agentes simples | Agentes core |
|-------|----------------|--------------|
| 1 Identity | ✅ | ✅ |
| 2 Operational | ✅ | ✅ |
| 3 Voice DNA | Opcional | ✅ |
| 4 Quality | Opcional | ✅ |
| 5 Credibility | — | ✅ |
| 6 Integration | Opcional | ✅ |

**Regra:** níveis 1-2 pra agentes simples. Todos os 6 pra agentes core.

### 9.3 Estrutura em markdown

```markdown
# Agent: {agent-id}

**ID:** {agent-id}
**Tier:** {Orchestrator|Tier 1|Tier 2}
**Version:** 1.0.0

## IDENTIDADE
### Propósito
### Domínio de Expertise
### Personalidade (Voice DNA)
### Estilo de Comunicação

## RESPONSABILIDADES CORE
### {Responsabilidade 1}
### {Responsabilidade 2}

## OUTPUT EXAMPLES (mínimo 3)
### Exemplo 1: {cenário happy path}
### Exemplo 2: {cenário decisão}
### Exemplo 3: {cenário exceção}

## IMMUNE SYSTEM
| Trigger | Resposta Automática |
|---------|-------------------|
| {situação de risco 1} | {resposta protetiva} |
| {situação de risco 2} | {resposta protetiva} |
| {situação de risco 3} | {resposta protetiva} |

## COMMANDS
| Comando | Descrição |
|---------|-----------|
| `*{cmd}` | {descrição} |

## STRICT RULES
### NUNCA:
### SEMPRE:
```

### 9.4 Voice DNA — traços essenciais

Cada persona declara:

- **Tom** — casual/formal, técnico/acessível, assertivo/consultivo
- **Vocabulário** — palavras que usa (ex: "estrutura", "valida", "gera")
- **Frases-chave** — 5-7 expressões marcantes
- **O que NUNCA diz** — palavras proibidas

**Exemplo forge-smith:**
```yaml
voice_dna:
  tom: "Técnico, preciso, orientado a resultado"
  vocabulario: ["estruturar", "validar", "gerar", "publicar", "manifest", "task-first"]
  frases_chave:
    - "Processo validado. Agora vou transformar isso em squad."
    - "Esse passo e uma decisao humana. Nao vou automatizar — vou estruturar."
    - "3 agentes, 7 tasks, 1 workflow. Cada PU mapeado."
    - "Squad validado. Zero erros, 2 warnings. Pronto pra producao."
  nunca:
    - Promessas vagas
    - Linguagem de coach
    - Jargão sem funcionalidade
```

---

## 10. Output Examples — Regra de Geração

**RC-11:** mínimo 3 output examples por agente. Agentes sem exemplos performam pior — LLM não tem referência concreta.

### 10.1 Regras de geração

1. **Escolher 3 cenários representativos do processo real** (happy path + decisão + exceção)
2. Mostrar **input concreto** + **output completo** que o agente produziria
3. **Usar vocabulário do usuário** [RC-02] — não inventar termos
4. Exemplos devem cobrir **responsabilidades principais**

### 10.2 Cenários obrigatórios

| Cenário | O que mostra |
|---------|--------------|
| **Happy path** | Fluxo normal, sem desvios |
| **Decisão** | Bifurcação real do PU-DECISION |
| **Exceção** | Falha real do PU-EXCEPTION + resposta |

### 10.3 Formato

```markdown
## OUTPUT EXAMPLES

### Exemplo 1: Cliente de ticket R$2.500 pedindo oferta de consultoria

**Input do expert:**
"Preciso criar a oferta do meu curso de yoga online, 8 semanas,
publico mulheres 35-50 anos. Ja tenho pesquisa de dores. Vou
cobrar R$497."

**Output do agente:**
```
=== OFERTA PROPOSTA ===

Nome: Transformação em 56 dias

Value Equation:
- Dream outcome: Pratica consistente de yoga em casa
- Perceived likelihood: 85% (baseado em 127 alunas anteriores)
- Time delay: Resultados visíveis em 14 dias
- Effort: 15min por dia, 6x por semana

Preço: R$497 (parcelado 12x R$49,70)
Garantia: 30 dias de reembolso total

Headline proposta:
"Como praticar yoga em casa sem aparecer no tapete só uma vez"
```
```

Repete pra exemplo 2 (decisão) e exemplo 3 (exceção).

---

## 11. Immune System — Regra de Geração

**RC-11:** mínimo 3 triggers por agente. Protege contra desvios do processo.

### 11.1 Regras de geração

1. **Identificar PU-EXCEPTIONs e PU-DECISIONs que representam riscos**
2. **Extrair triggers do conhecimento tácito do usuário** ("isso NUNCA pode acontecer")
3. Cada trigger tem **resposta automática que bloqueia o desvio**
4. Triggers vêm do **processo real**, não inventados

### 11.2 Formato

```markdown
## IMMUNE SYSTEM

| Trigger | Resposta Automática |
|---------|-------------------|
| Usuário pede oferta sem pesquisa de dores disponível | Halt + "Preciso da pesquisa antes. Tem o documento?" |
| Headline produzida contém "compre agora" isolado | Bloquear + "CTA imperativo sem contexto gera resistência. Vou refazer." |
| Preço proposto > 3x média do mercado sem justificativa | Halt + "Esse preço exige argumento de justificação. Qual é?" |
| Cliente solicita garantia fora do padrão (>90 dias) | Escalar pro humano — decisão fora do escopo |
| Detectado texto copiado de swipe sem adaptação | Bloquear + "Detectei copy idêntica ao template. Adaptar ao nicho." |
```

### 11.3 Hierarquia de resposta

| Resposta | Quando |
|----------|--------|
| **Halt + perguntar** | Falta input ou contexto |
| **Bloquear + refazer** | Output viola regra explícita |
| **Escalar pro humano** | Decisão fora do escopo do agente |
| **Warning + log** | Comportamento suspeito, não bloqueante |

---

## 12. Squad Blueprint

Output da Fase 2: `03-blueprint/squad-blueprint.yaml` + `agent-decomposition.md` + `task-mapping.md` + `kb-plan.md`.

### 12.1 Estrutura do blueprint

```yaml
blueprint:
  name: "{squad-name}"
  source_process: "{slug}"
  generated_at: "{timestamp}"
  process_map_path: "02-process-map/process-map.yaml"

squad:
  name: "{squad-name}"
  version: "1.0.0"
  description: "{Baseada no processo}"
  slash_prefix: "{camelCase}"

agent_decomposition:
  rationale: "{Por que esses agentes e nao outros}"
  total_agents: N
  agents:
    - id: "{agent-id}"
      role: "{Papel no processo}"
      responsible_for:
        steps: []
        decisions: []
      executor_profile: "{agent|human|hybrid}"
      pu_count: N
      estimated_effort: "{% do processo total}"

task_mapping:
  total_tasks: N
  tasks:
    - task_name: "{nome}"
      source_steps: []
      source_pus: []
      assigned_agent: "{agent-id}"
      execution_type: "{deterministic|semantic|interactive}"
      entrada: []
      saida: []
      checklist: []

workflow:
  name: "wf-{squad-name}"
  total_phases: N
  phases:
    - phase: 0
      name: "{Nome}"
      tasks: []
      agent: "{agent-id}"
      blocking: true
      quality_gate: ""

quality_gates:
  - id: "QG-{PREFIX}-{N}"
    source_pu: "PU-xxx"
    transition: "{fase} -> {fase}"
    blocking: true
    criteria: "{Critério traduzido}"

exception_strategy:
  - exception_pu: "PU-xxx"
    handling: "{Como o squad lida}"
    agent_responsible: "{agent-id}"
    fallback: "{Plano B}"

human_touchpoints:
  - step: N
    reason: "{Por que precisa humano}"
    agent: "{agent-id}"
    interaction_type: "{approval|input|decision|review}"

dependency_graph:
  sequential_tasks: []
  parallel_tasks: []
  bottleneck_task: ""
  critical_path: []
```

### 12.2 Documentos complementares

| Arquivo | Conteúdo |
|---------|----------|
| `agent-decomposition.md` | Rationale de cada agente em formato legível |
| `task-mapping.md` | Tabela PU → task (estrutura) |
| `kb-plan.md` | Plano de KB: PUs que alimentam + volumes ETL a incorporar |

---

## 13. QG-SF-003 — Gate de Coerência Arquitetural

**Bloqueia Fase 2 → Fase 3** (Arquitetura → Montagem).

### 13.1 Critérios obrigatórios

| Critério | Obrigatório |
|----------|-------------|
| 1-7 agentes definidos com rationale | Sim |
| Cada PU-STEP mapeado para exatamente 1 task | Sim |
| Cada PU-DECISION mapeado para decision point ou gate | Sim |
| Sem dependência circular no grafo | Sim |
| Cada task tem agente atribuído | Sim |
| Human touchpoints identificados | Sim |
| Bottleneck abordado | Sim |
| KB plan documentado (kb-plan.md) | Sim |
| PU-TACITs mapeados pra KB (não só STRICT RULES) | Sim |
| ETL existente identificado e marcado pra incorporação | Sim (se existir) |

### 13.2 Veto conditions

- 0 tasks geradas
- Dependência circular detectada
- >50% das tasks são Hybrid (sugere decomposição confusa)
- PU-STEP órfão (não mapeado)
- Squad operacional sem kb-plan.md

---

## 14. Catálogo de 9 Agentes Core (Info-Produtor)

Referência do blueprint info-produtor. Moreh usa como ponto de partida quando cliente é info-produtor:

1. **Creator Companion** — parceiro cognitivo diário (equivalente Companion Auroq)
2. **Strategist** (Morgan-like) — planeja lançamentos, ofertas, roadmap
3. **Copywriter** (Dex-like) — executa copy, emails, scripts, CTAs
4. **Funnel Architect** (Aria-like) — estrutura funis, stacks técnicos, timing
5. **Editor** (Quinn-like) — revisa tom, brand voice, SEO, factchecker
6. **Audience Researcher** (Alex-like) — voice mining, persona, mercado
7. **Designer** (Uma-like) — thumbs, LPs, carrossel, criativos
8. **Analytics** (Dara-like) — métricas, dashboards, atribuição
9. **Publisher** (Gage-like) — scheduler, publicação multi-plataforma, backup

### 14.1 Workflows típicos

1. **Content Creation Cycle** — pauta → roteiro → gravação → edição → publicação
2. **Launch Cycle** — pesquisa → estrutura → pré-lançamento → lançamento → retro
3. **Email Sequence Cycle** — mapeamento → escrita → review → agendamento
4. **Funnel Build Cycle** — estratégia → wireframe → copy → tech → teste → live
5. **Audience Research Cycle** — mining → síntese → persona → voice guide

### 14.2 MVP mínimo

Blueprint recomenda começar com **3 agentes**:
- Creator Companion
- Copywriter
- Editor

E 5 tasks: create-campaign, write-copy, review-content, publish-content, weekly-review.

Não criar todos os 9 de uma vez — validar 3 primeiro.

---

## 15. Exemplo Completo — Processo "Montar Oferta"

Moreh aplica tudo num caso real. Input: process map de "montar oferta" com 24 PUs.

### 15.1 Análise

```
Total PUs: 24
PUs por tipo:
  STEP: 12
  DECISION: 4
  EXCEPTION: 2
  QUALITY_GATE: 3
  DEPENDENCY: 2
  TACIT: 1

Complexidade: Standard (16-30 PUs)
Agentes esperados: 2-4
Tasks esperadas: 4-8

Distribuição executor:
  agent: 58%
  hybrid: 25%
  human: 17%

Bottleneck: Passo 5 (definir preço) — exige decisão humana
```

### 15.2 Clusters identificados

| Cluster | PU-STEPs | Executor |
|---------|----------|----------|
| **Pesquisa** | 1, 2, 3 | agent |
| **Estratégia** | 4, 5, 6 | hybrid (dono decide, agente pesquisa) |
| **Copy** | 7, 8, 9, 10 | agent |
| **Publicação** | 11, 12 | worker (automação) |

### 15.3 Agentes definidos

```yaml
agents:
  - id: offer-chief
    tier: orchestrator
    role: "Coordena pipeline de oferta, faz playback"

  - id: researcher
    tier: tier_1
    role: "Pesquisa dores do publico e concorrentes"
    responsible_for:
      steps: [1, 2, 3]
    executor_profile: agent

  - id: strategist
    tier: tier_1
    role: "Define Value Equation e estrategia de preço"
    responsible_for:
      steps: [4, 5, 6]
    executor_profile: hybrid
    rationale: "Estratégia exige julgamento do dono — hybrid com dono no loop"

  - id: copywriter
    tier: tier_1
    role: "Escreve headline, bullets, CTA"
    responsible_for:
      steps: [7, 8, 9, 10]
    executor_profile: agent

  - id: publisher
    tier: tier_1
    role: "Monta página e integra pagamento"
    responsible_for:
      steps: [11, 12]
    executor_profile: worker
```

5 agentes total (1 chief + 4 tier_1). Dentro do limite.

### 15.4 Workflow

```
FASE 1: Pesquisa
  @researcher → pesquisa-dores + pesquisa-concorrentes
  QG: dores mapeadas, mínimo 10

FASE 2: Estratégia (human-in-loop)
  @strategist → value-equation + preço
  QG: 4 elementos VE + preço justificado

FASE 3: Copy
  @copywriter → headline + bullets + CTA
  QG: headline passa teste 3s, bullets têm benefícios concretos

FASE 4: Publicação
  @publisher → montar-página + integrar-pagamento
  QG: página live + pagamento testado
```

4 fases, 3 QGs, 1 human touchpoint (fase 2).

---

## 16. Regras Cardinais Aplicáveis Neste Volume

| Regra | Aplicação em VOL-03 |
|-------|---------------------|
| **RC-03 Task-first** | Primeiro listar tasks, depois atribuir agentes |
| **RC-04 Pipeline unidirecional** | Workflow não volta. Revisões dentro de fases |
| **RC-05 Separação de papéis** | Coordenador não executa. Executor não valida |
| **RC-11 3+ examples + 3+ immune triggers** | Regras de geração de agente |
| **RC-13 Cobertura KB 80%+** | kb-plan.md obrigatório no blueprint |

---

## 17. Anti-Patterns

| Anti-pattern | Por que falha |
|--------------|---------------|
| Definir agentes antes de tasks | Viola RC-03. Agent-first leva a improvisação |
| Agente sem rationale | Não justifica separação dos outros. Arbitrário |
| Mesmo agente coordena + executa | Viola RC-05. Viés de execução |
| >7 agentes sem sub-squads | Over-engineering. Propor decomposição |
| Squad monolítico (1 agente pra tudo) | Contexto estoura, sem gates, output ruim |
| Workflow bidirecional | Viola RC-04. Quebra garantias de progresso |
| Bottleneck não abordado | Squad gerado replica o gargalo do processo original |
| KB skeleton de 150 linhas | Viola RC-06, RC-13. Squad operacional burro |
| Output examples inventados | Viola RC-02. Não reflete processo real |
| Immune system genérico | Triggers precisam vir do processo real |
| PU-STEP órfão | Esquecido no mapeamento. Veto automático |

---

## 18. Resumo Executivo (cartão de referência)

**Fase 2 transforma process map validado em squad arquitetado.**

**6 operações-chave:**
1. Analisar process map (complexidade, bottleneck, distribuição)
2. Identificar clusters de responsabilidade
3. Definir 1-7 agentes com rationale
4. Executor classification (agent/human/hybrid/worker)
5. Dual mapping PU → Task + KB
6. Planejar KB (checar ETL, mapear PUs operacionais)

**Dual mapping é crítico:** tasks definem O QUE (estrutura), KB define COMO (profundidade). STEP operacional + DECISION + EXCEPTION + TACIT **sempre** vão pra KB.

**Workflow é unidirecional (RC-04):** nada volta. Revisões acontecem dentro de fases.

**Separação de papéis inegociável (RC-05):** coordenador orquestra, executor faz, juíza valida.

**Todo agente tem:**
- Persona em 6 níveis
- ≥3 output examples (happy path + decisão + exceção)
- ≥3 immune system triggers
- Rationale explícito pra existir separado

**Bottleneck deve ser abordado:** simplificar · paralelizar · gate. Não ignorar.

**Blueprint é o output:** squad-blueprint.yaml + agent-decomposition.md + task-mapping.md + **kb-plan.md** (obrigatório pra squad operacional).

**QG-SF-003 bloqueia.** Veto conditions: 0 tasks, dependência circular, >50% hybrid, PU-STEP órfão, sem kb-plan.

---

**Próximo volume:** VOL-04 — Estrutura Nuclear e Contratos (Fase 3 da construção).

---

# APPENDIX v1.1 — Enriquecimento (2026-04-22)

Patches adicionados via merge v1.1. 6 padrões arquiteturais/heurísticos que estavam implícitos no squad-forge e squad-creator + hierarquia de 4 níveis reconciliando RC-03 com workflow-first.

## A. Bottleneck → Quality Gate Transformation (MP-02)

Padrão do squad-forge [Fonte: `agents/squad-forge/agents/forge-smith.md:120`, `templates/squad-blueprint-tmpl.yaml:94`].

**Regra:** constraint identificado (Theory of Constraints) em L7 não é só documentado — vira obrigatoriamente um Quality Gate bloqueante no workflow final.

```
Fluxo:
1. L7 identifica constraint crítico (ex: "passo 5 depende de aprovação do expert")
2. Blueprint marca `bottleneck_task: "step-5-approval"`
3. Smith converte em:
   quality_gate:
     id: QG-CUSTOM-01
     transition: "step-4 -> step-5"
     blocking: true
     criteria: "expert_approval_received == true"
```

Sem essa transformação, o squad replica o bottleneck original sem controlá-lo. Com gate, o bottleneck vira ponto de medição/alerta/escalação.

## B. Dual Mapping PU → Task + KB (MP-04)

Padrão do architect-squad [Fonte: `agents/squad-forge/tasks/architect-squad.md:63`]. Cada PU-STEP alimenta 2 destinos em paralelo:

```
PU-STEP "Escrever headline com teste 3s"
    ↓
├── Task: `write-headline.md`
│     Entrada: [briefing, voice-dna]
│     Saida: [headline string <120 chars]
│     Checklist: [3s test, active voice, benefit-forward]
│     
└── KB section: "Headlines: Anatomy and Criteria"
      - Estrutura (hook + benefit + proof)
      - 3-second test protocol
      - Anti-patterns (10+ exemplos)
      - Voice-DNA application
```

Regra: PU-STEP operacional SEMPRE gera entrada em ambos. Ignorar um = violação de RC-06 (KB primária).

## C. Executor Hint Refinement (MP-05)

Classification granular de responsabilidade [Fonte: `agents/squad-forge/data/pu-classification.yaml:18`, `data/executor-mapping-guide.yaml`].

**4 tipos de executor:**

| Tipo | Quando | Rationale |
|------|--------|-----------|
| **agent** | Task integralmente determinística ou semântica | Automação total |
| **hybrid** | Agent prepara, humano revisa | Decisão crítica ou factchecking |
| **human** | Decisão/julgamento irredutível | Expert-only |
| **worker** | Tarefa delegada a 3º (vendor, contractor) | Externo ao squad |

**Regra dura:** Se >50% das tasks são hybrid, design é confuso — redesign obrigatório. Squad funcional tem mix claro: maior parte agent, pontos-chave humano, pouco hybrid.

## D. PU-STEP:Task = 1:1 estrito (HO-02)

Padrão implícito validado [Fonte: `agents/squad-forge/tasks/architect-squad.md:6`, `templates/squad-blueprint-tmpl.yaml:102`].

```
PU-STEP  ═══> Task (exatamente 1)

NÃO 0:  órfão (decomposição incompleta, FAIL no gate)
NÃO 2+: composto (extração falhou em decompor, voltar pra Fase 1)
```

Se um passo extraído "merece" virar 2 tasks, significa que a extração não decompôs o suficiente. Voltar ao archaeologist, rodar mais 1 round cirúrgico no passo ambíguo.

## E. Decision Tree Materialization (HO-03)

PU-DECISION não vira task. Vira um de 2 destinos [Fonte: `agents/squad-forge/tasks/architect-squad.md:65`]:

| Tipo de decisão | Mapeamento |
|-----------------|------------|
| **Binária + determina fluxo** | Quality gate ou phase transition |
| **Multi-ramo + determina conteúdo** | Fields dentro de task + instruction branching |

Exemplo:
- "Se ticket >R$500, garantia 30 dias, senão 7 dias" → gate transition (decisão binária de fluxo)
- "Qual tom: técnico, consultivo, amigável?" → field `tom` dentro da task write-copy, instrução ramifica

## F. Modos de Interação (HO-05)

Classification de tasks por natureza [Fonte: `agents/squad-forge/tasks/architect-squad.md:49`, `templates/squad-blueprint-tmpl.yaml:50`]:

| Modo | Descrição | Exemplo |
|------|-----------|---------|
| **Deterministic** | Input fixo → output predizível | Cálculo, formatação, parsing |
| **Semantic** | Input gera raciocínio → output criativo | LLM gera copy, analisa transcript |
| **Interactive** | Requer feedback humano mid-task | Playback, briefing refinement |

**Implicação:** task que é "decidir estratégia" NUNCA é deterministic. task que é "recortar vídeo" NUNCA é semantic. Escolha errada quebra o squad.

## G. Reconciliação Task-First ↔ Workflow-First (RC-21 adotada)

Contradição construtiva resolvida [Fonte: `knowledge-refs/ai-vision.txt:2-10`, detalhado em VOL-11 §7].

**Hierarquia de 4 níveis:**

```
Role       (abstração organizacional, e.g., "Editor")
  Workflow (SOP de 30 min, e.g., "Processar hotline")
    Task   (unidade KaiZen — RC-03 continua)
      Action (atomic observable, e.g., "remover pausas >2s")
```

**Leituras:**
- Role/Workflow são contextuais — organizam escopo, não execução
- Task continua unidade de execução do squad (RC-03 intacta)
- Action é o que a Task FAZ dentro de si (descrito em observable behavior)

**Regra:** se Task tem >5-7 Actions internas → ou deveria ser 2 Tasks, ou as Actions viram skill reutilizável (RC-22).

---

## Fim do Appendix VOL-03 v1.1
