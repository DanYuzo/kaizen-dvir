# REPERTÓRIO — KaiZen

> Frameworks, padrões e metodologias referenciados na KB. Índice consolidado pra consulta rápida pelo Moreh.

---

## 1. Frameworks Arquiteturais

### 1.1 Framework Universal de 7 Artefatos

**Origem:** síntese Auroq OS + CrewAI + AIOX-Core + Anthropic Skills.
**Volume principal:** VOL-01.
**Uso:** esqueleto de TODO processo de negócio.

```
CONHECIMENTO ── ① KB
PROCESSO ────── ② Workflow + ③ Tasks
QUALIDADE ──── ④ Rules + ⑤ Quality Gates
EXECUÇÃO ───── ⑥ Skill/Agent + ⑦ Tools
```

### 1.2 Arquitetura em 7 Camadas

**Origem:** blueprint info-produtor.
**Volume principal:** VOL-01.

```
L1 Constitution → L2 Hooks → L3 Gates → L4 Tasks → L5 Agentes → L6 Memória → L7 Cliente
```

Cada camada confia só na camada abaixo.

### 1.3 Framework Boundary L1-L4

**Origem:** Auroq OS.
**Volume principal:** VOL-01.

| Camada | Mutabilidade |
|--------|-------------|
| L1 Framework Core | NUNCA modificar |
| L2 Framework Templates | NUNCA modificar |
| L3 Project Config | Mutável |
| L4 Project Runtime | SEMPRE modificar |

### 1.4 Task-First Architecture

**Origem:** AIOX + Auroq convergem.
**Volumes:** VOL-01, VOL-03, VOL-04.

Tasks primárias, agentes executores. TASK-FORMAT-SPECIFICATION-V1 (8 campos).

### 1.5 Hierarquia Meta-Squad + Macro Orchestrator

**Origem:** Weng (LLM Agents).
**Volume:** VOL-01.

```
Macro Orchestrator (Companion) → Meta-Squads (Forges) → Squads Operacionais → Cliente
```

KaiZen ↔ Moreh segue esse padrão.

---

## 2. Squad Frameworks (fontes primárias)

### 2.1 Squad-Forge Auroq

**Origem:** Euriler Jube.
**Volumes:** VOL-02, VOL-03 (primários), VOL-06.

Pipeline de 5 fases:
1. Setup
2. Extração (8 lentes × N rounds)
3. Arquitetura
4. Montagem
5. Validação

3 agentes: forge-chief (coordenador + playback) + process-archaeologist (extração) + forge-smith (arquitetura + montagem).

5 QGs: SF-001 (extraction) · SF-002 (user validation) · SF-003 (architecture) · SF-004 (nuclear) · SF-005 (operational).

**Moreh herda direto:** agents pattern, 5-phase pipeline, playback rule.

### 2.2 Squad-Creator AIOX (Craft)

**Origem:** Synkra / AIOX team.
**Volumes:** VOL-04 (primário), VOL-06.

Monolítico: 1 agente "Craft" com 10 tasks (design, create, validate, analyze, extend, migrate, publish, etc.).

Schemas: squad-schema.json + squad-design-schema.json.

Scripts (7K+ linhas): squad-validator.js · squad-loader.js · squad-generator.js · squad-designer.js · squad-analyzer.js · squad-migrator.js · squad-extender.js.

3 templates: basic · etl · agent-only.

**Moreh herda:** schemas, validators, migration pattern, config inheritance.

### 2.3 Escolha Monolito vs Multi-Agente

**Volume:** VOL-01 seção 12.

| Sinal | Craft (monolito) | Forge (multi-agente) |
|-------|-----------------|---------------------|
| Input docs prontos | ✅ | — |
| Input cabeça do expert | — | ✅ |
| <5 fases | ✅ | — |
| ≥5 fases + 3+ QGs | — | ✅ |
| Expert técnico | ✅ | — |
| Expert não-técnico | — | ✅ |
| Playback narrativo | — | ✅ |

---

## 3. 8 Lentes de Extração (Squad-Forge)

**Origem:** squad-forge + Goldratt/Ohno/Gawande.
**Volume:** VOL-02.

| Lente | Objetivo | Round |
|-------|----------|-------|
| L1 Visão Geral 🦅 | Macro: início, fim, propósito | R1 |
| L2 Sequência 📋 | Passos em ordem | R1 |
| L3 Decisões 🔀 | IF/THEN, bifurcações | R2 |
| L4 Exceções ⚠️ | Falhas, plano B | R2 |
| L5 I/O 📦 | Inputs e outputs | R2 |
| L6 Qualidade ✅ | Critérios de "bem feito" | R3 |
| L7 Dependências 🔗 | Ordem obrigatória, gargalos | R3 |
| L8 Tácito 🧠 | Conhecimento automático | R3 |

Completude: R1 ~50% · R2 ~75% · R3 ~90% · RN (cirúrgico) ≥95%.

---

## 4. Process Units (PUs) — 8 Tipos

**Origem:** squad-forge.
**Volume:** VOL-02 seção 5.

| Tipo | Captura |
|------|---------|
| STEP | Passo concreto executável |
| DECISION | Bifurcação com condição e branches |
| EXCEPTION | Caso atípico, falha, plano B |
| QUALITY_GATE | Critério de qualidade |
| DEPENDENCY | Relação obrigatória entre passos |
| INPUT | Material necessário |
| OUTPUT | Entregável produzido |
| TACIT | Conhecimento não-articulado |

---

## 5. Metodologias de Raciocínio (Weng)

**Volume:** VOL-09.

### 5.1 Task Decomposition

| Padrão | Uso |
|--------|-----|
| **CoT** (Chain of Thought) | "Think step by step" — base |
| **Tree of Thoughts** | Múltiplas possibilidades + BFS/DFS |
| **LLM+P** | Outsource pra PDDL classical planners |

### 5.2 Self-Reflection

| Padrão | Uso |
|--------|-----|
| **ReAct** | Thought → Action → Observation (base pra tool use) |
| **Reflexion** | Dynamic memory + self-reflection (aprende com falhas) |
| **Chain of Hindsight** | Sequences com feedback humano |
| **Algorithm Distillation** | Aprende processo RL |
| **STaR** | Bootstrapping de reasoning |

### 5.3 Self-Consistency Sampling

**Uso:** múltiplas amostras com temperatura > 0, majority vote. Aumenta robustez em decisões críticas.

---

## 6. Metodologias de Prompting (Weng)

**Volume:** VOL-09.

### 6.1 Basic

| Padrão | Uso |
|--------|-----|
| Zero-shot | Feed direto sem exemplos |
| Few-shot | Demonstrations before task |
| Instruction prompting | Direção explícita |
| In-Context Instruction Learning | Few-shot + instruction em múltiplas tarefas |

### 6.2 Tips de few-shot

- k-NN Clustering pra selecionar similares
- Graph-Based Diversity pra diversidade
- Contrastive Learning
- Q-Learning
- Uncertainty-Based Active Learning

### 6.3 Vieses identificados (Zhao et al. 2021)

1. Majority label bias
2. Recency bias
3. Common token bias

**Mitigação:** calibrar probabilidades pra uniform com `N/A`.

### 6.4 Automatic Prompt Design

| Padrão | Uso |
|--------|-----|
| AutoPrompt | Gradient descent no embedding |
| Prefix-Tuning | Prefix tokens treináveis |
| P-tuning | Soft prompts |
| Prompt-Tuning | Full prompt tuning |
| **APE** (Automatic Prompt Engineer) | Busca sobre candidatos gerados |
| Automatic CoT Construction | Augment + Prune + Select |

---

## 7. Tool Use Patterns (Weng)

**Volume:** VOL-09.

| Padrão | Uso |
|--------|-----|
| **MRKL** | Modular Reasoning — router + modules (neurais + simbólicos) |
| **TALM** | LM com API calls text-to-text |
| **Toolformer** | Self-supervised training com APIs |
| **HuggingGPT** | 4 stages: plan → select → execute → respond (**Moreh pattern**) |
| **API-Bank** | Benchmark em 3 levels (call → retrieve+learn → plan) |
| **ChatGPT Plugins** | APIs providas por devs |
| **Function Calling** | Self-defined schemas |

---

## 8. MCP Governance (Auroq)

**Origem:** CLAUDE.md mcp-usage rule.
**Volume:** VOL-09 seção 22.

**Preferir ferramentas nativas:** Read, Write, Edit, Bash, Glob, Grep.

**Usar MCP só quando:** browser automation · integrações externas (Slack, Notion) · ferramentas sem equivalente nativo.

**Gestão de MCP:** exclusiva do Ops (Auroq Art. II).

---

## 9. 3-Tier Tool Registry

**Origem:** AIOX.
**Volume:** VOL-09 seção 23.

| Tier | Carregamento |
|------|--------------|
| **Tier 1 Always** | Sempre no contexto (nativos essenciais) |
| **Tier 2 Deferred** | Sob demanda |
| **Tier 3 Search-only** | Via ToolSearch |

---

## 10. Memory Frameworks

**Volume:** VOL-07.

### 10.1 COALA (LangChain)

| Tier | Definição | MVP KaiZen |
|------|-----------|-----------|
| **Procedural** | Regras de comportamento | ✅ Sim |
| **Semantic** | Fatos sobre o mundo | ✅ Sim |
| **Episodic** | Sequências de ações passadas | ❌ Deferido (roadmap) |

### 10.2 3 Camadas Temporais (Auroq)

| Camada | Onde | Sobrevive |
|--------|------|-----------|
| Sessão (efêmera) | Conversa atual | Até autocompact |
| Operacional | `agents/companion/data/` | Entre sessões |
| Permanente (Exocortex) | `docs/knowledge/` + `business/` | Pra sempre |

### 10.3 6 Triggers de Salvamento

1. Decisão tomada → log-decisoes.md
2. Projeto progrediu → tracker
3. Conhecimento criado → docs/knowledge/
4. Padrão detectado → padroes-observados.md
5. Sessão encerrando → contexto-dinamico.md
6. Autocompact iminente → documento de trabalho

### 10.4 Filesystem-Based Memory (LangChain)

Arquivos padrão:
- `AGENTS.md` — core instructions
- Agent skills
- Subagent definitions
- `tools.json`

Storage: **markdown-first autoria + DB runtime** (virtual filesystem).

### 10.5 MIPS / ANN Algorithms

| Algoritmo | Quando |
|-----------|--------|
| LSH | Dataset pequeno-médio |
| ANNOY | Médio, busca rápida |
| **HNSW** | High recall, mainstream |
| FAISS | Volume muito alto |
| ScaNN | State-of-art accuracy/speed |

---

## 11. Orquestração (Auroq + LangChain)

**Volume:** VOL-08.

### 11.1 Hooks (Claude Code)

| Hook | Quando |
|------|--------|
| UserPromptSubmit | Antes do Claude responder (**coração**) |
| PreCompact | Antes do autocompact |
| PreToolUse | Antes de tool call |
| PostToolUse | Depois de tool call |
| Stop | Agente termina turn |

MVP Moreh: só UserPromptSubmit.

### 11.2 SYNAPSE 8-Layer

| L | Nome | Carrega |
|---|------|---------|
| L0 | Constitution | SEMPRE |
| L1 | Global | Sempre |
| L2 | Agent | Agente ativo |
| L3 | Workflow | Em andamento |
| L4 | Task | Específica |
| L5 | Squad | Em uso |
| L6 | Keyword | Triggered |
| L7 | Star-commands | `*cmd` invocado |

MVP: L0 + L1 + L2.

### 11.3 Companion 6 Camadas

```
SITUAR → LEMBRAR → ORIENTAR → FAZER → ROTEAR → PROTEGER
```

### 11.4 Modus Operandi (3 ciclos)

- **Sessão:** BOOT → BRIEFING → TRABALHO → CHECKPOINT → ENCERRAMENTO
- **Semanal:** Weekly Review (20 min, obrigatório)
- **Projeto:** NASCE → VIVE → MORRE → RETRO

### 11.5 Multi-Model Routing

- Haiku: extração, classificação, validation rápida (baixo custo)
- Sonnet: default, equilíbrio
- Opus: generation complexa, reasoning profundo

---

## 12. Governance Frameworks

**Volume:** VOL-10.

### 12.1 Constitution Pattern

6 artigos + 3 severity levels (NON-NEGOTIABLE / MUST / SHOULD).

### 12.2 Agent Authority Matrix

Cada agente tem autoridades exclusivas. Cross-agent = delegation.

### 12.3 IDS Principle

**REUSE > ADAPT > CREATE.** 6 gates formais (G1-G6).

| Match | Decisão |
|-------|---------|
| >90% | REUSE |
| 60-89% | ADAPT |
| <60% | CREATE |

### 12.4 Entity Registry

Catálogo YAML com checksum + adaptability + lifecycle. 30-50 entries MVP, 745 em AIOX maduro.

### 12.5 Staged Rollout

Interno → Beta → GA. Industry pattern (LangChain 2026).

---

## 13. Quality Patterns

**Volume:** VOL-06.

### 13.1 PASS / CONCERNS / FAIL / WAIVED

| Veredicto | Ação |
|-----------|------|
| PASS | Avança |
| CONCERNS (≤3 warnings) | Avança com logs |
| FAIL | Bloqueia |
| WAIVED | Avança com registro permanente |

### 13.2 Self-Healing Loop (RC-16)

Max 3 tentativas. Erros voltam pro LLM estruturados.

### 13.3 QA Loop Iterativo

Max 5 ciclos review → fix → re-review.

### 13.4 CodeRabbit Multi-Estágio

Auto-fix CRITICAL/HIGH · Review MEDIUM · Log LOW.

### 13.5 Smoke Tests (3 cenários)

1. Happy path
2. Decisão (bifurcação real)
3. Exceção (falha real)

2/3 PASS aprova gate.

### 13.6 LLM-as-Judge

53% adoption em 2026. Agente separado do executor (RC-05).

### 13.7 Blind A/B Comparison

Pra refinamento iterativo. v1 vs v2 sem saber qual é qual.

### 13.8 Evals Quantitativos

pass_rate · token_count · time_to_complete · validation_score · coverage · iteration_count.

---

## 14. Validators & Analyzers

**Volume:** VOL-04, VOL-06.

| Script | Função |
|--------|--------|
| `squad-validator.js` | Valida manifest + estrutura + tasks + agents + workflows |
| `squad-analyzer.js` | Métricas de cobertura + sugestões |
| `squad-loader.js` | Resolver + carregar squads |
| `squad-generator.js` | Gerar squads a partir de templates |
| `squad-designer.js` | Design de squad via análise de docs |
| `squad-migrator.js` | Migração legacy → AIOX 2.1 |
| `squad-extender.js` | Adicionar componentes a squad existente |

---

## 15. Técnicas Especiais de Extração

**Volume:** VOL-02 seção 7.

| Técnica | Trigger |
|---------|---------|
| "O Basicamente" | "basicamente faço X" |
| "5 Whys" (Ohno) | "depende" / "às vezes" |
| "O Observador" | Não consegue articular |
| "O Gargalo" (Goldratt) | Sempre aplicar |
| "O Decompositor" (Gawande) | Passo parece grande |
| "O Cenário" | Usuário abstrato |
| "O Gemba" (Ohno) | Envolve ferramenta/tela |

---

## 16. Case Studies (Weng)

**Volume:** VOL-09.

| Agent | Padrão |
|-------|--------|
| **ChemCrow** | LLM + 13 ferramentas expert. Human > LLM-as-judge em domínios especializados |
| **Boiko Scientific Agent** | Descoberta autônoma. Risk assessment crítico |
| **Generative Agents (Park)** | 25 agentes em sandbox. Memory + Retrieval + Reflection + Planning |
| **AutoGPT** | LLM como main controller (POC) |
| **GPT-Engineer** | Cria repositórios a partir de spec natural |

---

## 17. Método Danilo 8 Fases

**Origem:** Danilo Yuzo.
**Volume:** VOL-10 seção 14.

1. Entender o problema real
2. Mapear passo a passo
3. Stress test *(diferencial)*
4. Riscos + soluções *(diferencial)*
5. Priorização 80/20 *(diferencial)*
6. Inputs/outputs/quality gates
7. Níveis progressivos *(diferencial mais único)*
8. Feedback loop *(diferencial)*

### 17.1 Mapeamento pro Moreh

| Fase | Origem |
|------|--------|
| 1, 2 | Reuso direto squad-forge |
| 3, 4, 5, 7 | Autoria própria |
| 6 | Combo squad-forge (gates) + squad-creator (schemas) |
| 8 | Herda squad-creator (versionamento) |

### 17.2 Bases Intelectuais

- Kahneman (Sistema 1/2)
- Greene (Maestria — prática deliberada)
- Levine (Apaixone-se pelo Problema)
- Cagan (Inspired — product management)
- Torres (Continuous Discovery Habits)
- Hormozi (100M series — workflows granulares)

### 17.3 Voice DNA

Casual, direto, "professor de boteco". CONCEITO → EXEMPLO → RETORNO. Vulnerabilidade estratégica. Fé como âncora.

### 17.4 Diretrizes de Escrita (Euriler + Hormozi)

- Nível 3ª série · Voz presente · Voz ativa · Evitar advérbios · Frases curtas (1 vírgula máx) · Linguagem positiva

---

## 18. State of Agent Engineering 2026

**Origem:** LangChain survey (1.340 respostas).
**Volume:** VOL-10 seção 13.

### Findings-chave

- **57%** em produção (growing from 51% YoY)
- **67%** enterprises 10k+ em produção
- **Quality top barrier** (33%), cost caiu
- **89%** com observability, **62%** com full tracing
- **75%+** usam múltiplos modelos
- **52%** rodam offline evals, 37% online evals
- **Human review** 60% · **LLM-as-judge** 53%

### Coding agents dominam

Claude Code, Cursor, GitHub Copilot, Amazon Q, Windsurf, Antigravity.

---

## 19. Heurísticas Operacionais

Consolidado de várias fontes.

### 19.1 Quando usar Skill vs Agent

| Situação | Skill | Agent |
|----------|-------|-------|
| One-shot | ✅ | Overkill |
| Interação contínua | — | ✅ |
| Múltiplos processos sob papel | — | ✅ (1 agent, N skills) |
| KB >5k linhas | Progressive disclosure | — |

### 19.2 Quando criar Forge

- Apenas com 3+ squads operacionais maduros
- Pattern de criação se repete
- Volume justifica

**Anti-pattern:** Forge antes dos produtos.

### 19.3 Quando fazer multi-model routing

- Squad com 3+ agentes e perfis de task distintos
- Observability mensura benefício
- MVP pode ir com Sonnet default, otimizar depois

---

## 20. Cross-References

### 20.1 Regras Cardinais → Volumes

Ver `REGRAS-CARDINAIS.md` seção "Mapa de Aplicação".

### 20.2 Frameworks → Volumes

| Framework | Volume primário |
|-----------|-----------------|
| 7 Artefatos | VOL-01 |
| 7 Camadas | VOL-01 |
| 8 Lentes | VOL-02 |
| 8 Tipos PU | VOL-02 |
| Dual mapping | VOL-03 |
| TASK-FORMAT-V1 | VOL-04 |
| 6 seções KB | VOL-05 |
| 5+6 QGs | VOL-06 |
| COALA + 3 camadas | VOL-07 |
| SYNAPSE 8-layer | VOL-08 |
| CoT/ToT/ReAct/Reflexion | VOL-09 |
| Constitution + IDS | VOL-10 |

### 20.3 Insights pós-exploração → Volumes

| Insight | Volume primário |
|---------|-----------------|
| #1 Meta-squad + macro orchestrator | VOL-01 |
| #2 Procedural + Semantic (defer Episodic) | VOL-07 |
| #3 Markdown-first + DB runtime | VOL-07 |
| #4 Human-in-loop em specs (RC-15) | VOL-02, VOL-06 |
| #5 Schema feedback loop (RC-16) | VOL-04, VOL-06 |
| #6 Observability dia 1 (RC-17) | VOL-06, VOL-08 |
| #7 Multi-model routing | VOL-08 |
| #8 Staged rollout (RC-18) | VOL-10 |

### 20.4 Meta-patterns v1.1 (squad-forge + squad-creator re-análise)

| Pattern | Volume primário |
|---------|-----------------|
| Complexity Routing (3 modos) | VOL-08 Appendix |
| Bottleneck → Quality Gate | VOL-03 Appendix |
| State Persistence + Resumability | VOL-08 Appendix |
| Dual Mapping PU → Task + KB | VOL-03 Appendix, VOL-05 Appendix |
| Executor Hint Refinement | VOL-03 Appendix |
| Confidence + Inferred tracking | VOL-02 Appendix, VOL-06 Appendix |
| Handoff Artifact Protocol | VOL-07 Appendix, VOL-08 Appendix |
| Dry-Run Pattern | VOL-10 Appendix |
| Backup Strategy | VOL-10 Appendix |
| Story Traceability (SQS-XX) | VOL-10 Appendix |
| Greenfield Detection | VOL-01 Appendix |
| Playback Artifact Template | VOL-06 Appendix |

---

## 21. Frameworks Externos v1.1 (5 refs que inspiraram o método Danilo)

**Origem:** merge v1.1 (2026-04-22). Cada framework operacionalizável, com aplicação explícita no Moreh.

### 21.1 Grand Slam Offer + Value Equation (Hormozi)

**Origem:** Alex Hormozi, 100M Leads. [`knowledge-refs/100M.txt:104-113, 196, 385-390`]
**Volume principal:** VOL-11 §5.

```
Grand Slam Offer = "Make people an offer so good they would feel stupid saying no"

Value Equation:
           (Dream Outcome × Likelihood of Achievement)
Valor = ─────────────────────────────────────────────
          (Time Delay × Effort & Sacrifice)
```

**Aplicação Moreh:** critério de design do squad. Maximizar dream outcome + likelihood · minimizar time delay + effort. Avaliar todo squad gerado contra os 4 eixos.

### 21.2 Opportunity-Solution Tree (Torres)

**Origem:** Teresa Torres, Continuous Discovery Habits. [`knowledge-refs/continuous.txt:170-260`]
**Volume principal:** VOL-11 §3.

```
Outcome (valor pro negócio)
  ├── Opportunity (customer need)
  │    ├── Solution (hipótese)
  │    │    └── Assumption Test
  │    └── Solution
  └── Opportunity
```

**Aplicação Moreh:** upstream ao extract-process. Antes de mapear processo, mapear o outcome + espaço de oportunidades. Evita construir o squad errado (pela razão certa).

### 21.3 Assumption Testing Canvas (Torres)

**Origem:** Torres. [`knowledge-refs/continuous.txt:431-487`]
**Volume principal:** VOL-11 §4.

```
Assumption: [frase declarativa]
Tipo: Desirability | Viability | Feasibility | Usability
Confidence: 0.0-1.0
Risco: [o que quebra se falsa]
Menor teste: [experimento mais barato]
Status: Untested | Testing | Validated | Refuted
```

**Aplicação Moreh:** cada PU com confidence <0.7 é assumption. Rodar mini-teste antes de construir em cima.

### 21.4 5-Step Musk Algorithm (Musk/Clear)

**Origem:** Elon Musk via James Clear. [`knowledge-refs/elon.txt:87-129`]
**Volume principal:** VOL-11 §6.

```
Sequência OBRIGATÓRIA (não pular etapa):

1. Question  → atribuir nome ao requirement
2. Delete    → alvo >=10% (se <10%, insuficiente)
3. Simplify  → só após Delete
4. Accelerate → só após Simplify
5. Automate  → só após todos os anteriores
```

**Aplicação Moreh:** entre extract-process e architect-squad, rodar como quality gate intermediário (SF-001.5). Se nenhum passo deletado, CONCERNS.

### 21.5 Workflow Decomposition — hierarquia 4 níveis (Hormozi AI Vision)

**Origem:** Alex Hormozi + Eva Juergens. [`knowledge-refs/ai-vision.txt:2-10, 192-204`]
**Volume principal:** VOL-11 §7 + VOL-01 Appendix.

```
Role     (abstração organizacional, e.g., "Editor")
  Workflow (SOP, ~30 min, e.g., "Processar hotline")
    Task    (unidade KaiZen — RC-03 intacta)
      Action (atomic observable, ~30 seg)
```

**Aplicação Moreh:** RC-21 adotada. Task permanece primária (RC-03); Role/Workflow são contexto; Action é o que task FAZ. Task com >5-7 Actions → decompor.

### 21.6 Hook Model (Eyal)

**Origem:** Nir Eyal, Hooked. [`knowledge-refs/hooked.txt:74-124, 262-345`]
**Volume principal:** VOL-11 §9.

```
Trigger (External OU Internal)
  ↓
Action (B = MAT — Motivation + Ability + Trigger)
  ↓
Variable Reward (surpresa cria craving)
  ↓
Investment (user deposita dados/esforço)
  ↓
[loopa — agora Trigger interno]
```

**Tipos de trigger externo:** Paid / Earned / Relationship / Owned.

**Aplicação Moreh:** cada squad gerado precisa Hook Canvas preenchido. Sem trigger + variable reward + investment, squad vira museu.

### 21.7 Variable Reward Schedule (Eyal)

**Origem:** Eyal. [`knowledge-refs/hooked.txt:94-102, 177-210`]
**Volume principal:** VOL-11 §10.

| Schedule | Padrão | Uso |
|----------|--------|-----|
| FR (Fixed Ratio) | Reward a cada N ações | Output principal consistente |
| VR (Variable Ratio) | Reward em N aleatório | Surpresa, insight colateral |
| FI (Fixed Interval) | Reward após tempo fixo | Retro semanal |
| VI (Variable Interval) | Reward em tempo aleatório | Pattern detectado, flag |

**Aplicação Moreh:** Squad tem 1 FR (entrega previsível) + 1 VR/VI (reforço intermitente). Sem VR, rotina morta. Sem FR, caos.

### 21.8 Trio Pattern (Torres)

**Origem:** Torres. [`knowledge-refs/continuous.txt:110, 119-128`]
**Volume principal:** VOL-11 §11 + VOL-08 Appendix.

```
Executor + Validator + Researcher
  (cadência semanal de 15-20 min)
  Executor: o que rodou, onde travou
  Validator: onde reprovei, por quê
  Researcher: patterns observados
```

**Aplicação Moreh:** RC-20 adotada. Trio Sync mantém KB viva pós-launch. Sem trio, squad decai em meses.

### 21.9 Market Validation Checklist (Hormozi)

**Origem:** Hormozi. [`knowledge-refs/100M.txt:251-276`]
**Volume principal:** VOL-11 §2.

```
Starving Crowd > Offer Strength > Persuasion Skills

4 indicadores:
  [ ] Dor massiva
  [ ] Poder de compra
  [ ] Fácil de alcançar
  [ ] Em crescimento
```

**Aplicação Moreh:** rodar ANTES de extract-process. Squad em mercado morto = desperdício.

### 21.10 Niche Lock Protocol (Hormozi)

**Origem:** Hormozi. [`knowledge-refs/100M.txt:277-301`]
**Volume principal:** VOL-11 §12 + VOL-10 Appendix.

```
Min iterations: 10
Min duration: 4 semanas
Allowed: KB content, prompts, checklists
Forbidden: num_agents, role separation, quality gates

3 sinais legítimos pra quebrar lock cedo (TODOS):
  1. Mercado mudou estruturalmente
  2. Assumption crítica refutada
  3. Min iterations/duration atingido
```

**Aplicação Moreh:** anti-pivot prematuro. Squad recém-gerado entra em lock.

### 21.11 Story-Based Interviewing (Torres)

**Origem:** Torres. [`knowledge-refs/continuous.txt:430-487`]
**Volume principal:** VOL-11 §13 + VOL-02 Appendix.

```
Pergunta idealizada (fraca): "Como você faz X?"
Story-based (forte):        "Me conta a última vez que fez X"
```

Memória específica revela variáveis que pergunta direta esconde. Complementa Gemba quando observação não é possível.

### 21.12 KB → Skill → Agent Pipeline (Hormozi AI Vision)

**Origem:** Hormozi + Juergens. [`knowledge-refs/ai-vision.txt:194-207`]
**Volume principal:** VOL-04 Appendix, VOL-11 §8.

```
Estágio 1: Markdown file (SOP natural)
Estágio 2: Skill markdown (markdown + prompt + N testes)
Estágio 3: Agent include (skill integrada)
```

**Aplicação Moreh:** RC-22 adotada. Skill não é criada — é produzida iterativamente. Só vira agent include com tested_cases >=10 + PASS rate >=80%.

### 21.13 Guarantee as Risk Reversal (Hormozi)

**Origem:** Hormozi. [síntese, 100M.txt]
**Volume principal:** VOL-04 Appendix, VOL-11 §14.

```yaml
squad.yaml:
  guarantees:
    uptime: "<=2 falhas em 10 execuções → auto-retry 3x"
    rollback: "2 reprovações seguidas → rollback"
    error_recovery: "erro crítico <4h ou escala"
    preview_before_commit: "zero mutations sem signed playback"
```

**Aplicação Moreh:** squad operacional (não consultivo) tem >=2 guarantees declaradas. Squad sem guarantee é "vende confia", não oferta formal.
