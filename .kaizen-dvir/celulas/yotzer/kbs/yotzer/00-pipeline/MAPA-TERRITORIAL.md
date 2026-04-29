# MAPA-TERRITORIAL — KB kaizen

> **Gerado por:** @etl-chief (Fase 1b — Mapeamento Territorial)
> **Data:** 2026-04-21
> **KB:** kaizen (melhores práticas de construção de multi-agentes e orquestração no Claude Code)
> **Consumer pretendido:** squad criador de squads do Danilo

---

## 1. Metadata

| Campo | Valor |
|-------|-------|
| KB Slug | kaizen |
| KB Nome | KaiZen |
| Escopo | Melhores práticas de construção de multi-agentes + orquestração de frameworks no Claude Code, integrando Auroq (squad-forge) + AIOX (squad-creator) + research externo, usando contexto Danilo como lente |
| Modo | Full Pipeline |
| Fontes totais | 18 (4 externas + 14 locais) |
| Tipos de fonte | Documentação interna, frameworks validados, research papers, blog posts, blueprints |
| **Consumer confirmado** | **Moreh** — squad criador de squads (meta-forge autoral). Relação: **KaiZen ↔ Moreh** (KB alimenta squad) |
| Ticket operacional | Lente Danilo (8 fases do método, tom casual, diretrizes de escrita) |
| Hierarquia arquitetural | Meta-squad + macro orchestrator (padrão validado — Weng Agents) |

---

## 2. Resumo Executivo

A KB **KaiZen** unifica três territórios que até hoje viviam separados:

1. **Squads validados** — `squad-forge-auroq` (Euriler) e `squad-creator-aiox` (AIOX team). Duas escolas com focos complementares: Auroq forte em **extração de processo implícito** (8 lentes + Process Units), AIOX forte em **estrutura formal e contratos** (JSON Schemas + scripts de validação).
2. **Research externo de ponta** — Lilian Weng (prompt engineering, LLM agents) + LangChain (agent builder memory, state of agent engineering 2026).
3. **Lente autoral Danilo** — 8 fases do método ("implícito em obvio"), tom casual, diretrizes de escrita (Euriler + Hormozi), mapeamento método-forge com decisões pendentes.

A KB é a base cognitiva do **Moreh** (squad criador de squads) — o meta-forge autoral que vai executar literalmente as 8 fases do método. Tem profundidade operacional (protocolos executáveis), regras cardinais (o que NUNCA fazer), tabelas de referência (cenário → ação) e glossário técnico.

**Pilares arquiteturais validados pela indústria** (insights da exploração):
- Hierarquia **meta-squad + macro orchestrator** é padrão, não invenção (Weng)
- Memória em tiers: **procedural + semantic** no MVP, **episodic deferido** (COALA, LangChain)
- Storage: **markdown-first pra autoria, DB pro runtime** (LangChain pattern)
- **Human-in-loop obrigatório** em toda mutação de specs — anti prompt-injection
- **Observability desde dia 1** — não afterthought (89% adoção em 2026)
- **Multi-model routing per-squad** — Haiku pra extração, Opus pra generation (75%+ adoption)
- **Staged rollout** — interno → cliente é industry pattern, não scrappy

**Anti-objetivo:** não é enciclopédia acadêmica. Cada volume é **operável** — Moreh lê, aplica e produz output.

---

## 3. Domínios Identificados

Extraí **10 domínios centrais** que organizam o território. Cada domínio vira um Volume.

| # | Domínio | O que cobre | Fontes primárias |
|---|---------|-------------|-----------------|
| D1 | **Fundamentos e Arquitetura** | Taxonomia de agentes, 7 artefatos, 7 camadas (L1 Constitution → L7 Cliente), DNA operacional, task-first architecture, mapeamento AIOX → Info-produtor | 03-framework-7-artefatos, 06-blueprint (seções 1-6), CLAUDE.md Auroq |
| D2 | **Extração de Processo** | 8 lentes iterativas, Process Units (8 tipos), técnicas (5 Whys, Gemba, "O Basicamente"), playback validation, gap detection, zero inference | 04-squad-forge (extraction-lenses, pu-classification, process-archaeologist, extract-process, playback-validate) |
| D3 | **Arquitetura e Design de Squads** | Clusters de responsabilidade, decomposição 1-7 agentes, dual mapping PU→Task+KB, executor classification, workflow unidirecional, agent design (persona 6-níveis), output examples, immune system | 04-squad-forge (forge-smith, architect-squad, executor-mapping-guide) |
| D4 | **Estrutura Nuclear e Contratos** | squad.yaml (Auroq + AIOX variants), TASK-FORMAT-SPECIFICATION-V1 (8 campos), agent format, JSON Schema validation, 3 templates (basic/etl/agent-only), directory task-first | 05-squad-creator (schema, creator-create, creator-design, skeleton), 04-squad-forge (assemble-squad, nuclear-structure-validation) |
| D5 | **Knowledge Base como Cérebro** | KB como artefato primário, 6 seções (regras cardinais, protocolos, decision trees, tabelas, troubleshooting, glossário), ETL integration, cobertura 80%+, skill vs agent, progressive disclosure | 04-squad-forge (forge-kb, assemble-squad Step 6), 03-framework-7-artefatos, ext-03-langchain-memory |
| D6 | **Quality Gates, Validação e Self-Healing** | QGs multi-estágio (SF-001 a 005), checklists PASS/CONCERNS/FAIL/WAIVED, self-healing loop (max 3), smoke tests, squad-validator.js, blind A/B, evals quantitativos, separação executor/juiz | 04-squad-forge (validate-squad, extraction-completeness, nuclear-structure-validation), 05-squad-creator (creator-validate), ext-04 (state of agent eng) |
| D7 | **Memória, Aprendizado e Handoff** | 3 camadas (sessão/operacional/permanente), 6 triggers, Exocortex (Auroq), COALA (LangChain — procedural/semantic/episodic), filesystem-based memory, AGENTS.md, MEMORY.md por agente, handoff artifact (~379 tokens), MIPS/ANN | CLAUDE.md (sistema-memoria), ext-03-langchain-memory, ext-02-lilianweng-agents, agent-handoff rule |
| D8 | **Orquestração e Sistema Nervoso** | Hooks (UserPromptSubmit/PreCompact/PreToolUse), SYNAPSE 8-layer injection, Companion pattern (6 camadas), modus operandi (ciclos sessão/semanal/projeto), session management, cockpit (max 3 ativos) | 06-blueprint (seções 3-6, apêndice A), CLAUDE.md (modus operandi, sistema de projetos) |
| D9 | **Padrões de IA (Reasoning + Prompting + Tool Use)** | CoT (zero/few-shot/auto), ToT, ReAct, Reflexion, Chain of Hindsight, task decomposition; few-shot patterns, APE, instruction prompting; MRKL, Toolformer, HuggingGPT, API-Bank, MCP governance, 3-tier tool registry | ext-01-lilianweng-prompt-eng, ext-02-lilianweng-agents, CLAUDE.md (mcp-usage) |
| D10 | **Governance, Evolução e Meta-Squads** | Constitution formal (6 artigos, severity levels), Agent Authority Matrix, delegation, anti-emulation, natural language first, REUSE > ADAPT > CREATE (IDS, 6 gates G1-G6), Entity Registry, Forges (5 meta-squads), versionamento/migration, state 2026 | CLAUDE.md (constitution, agent-authority), 06-blueprint (seções 1, 8-9, 15, apêndices B-C), 05-squad-creator (creator-migrate), ext-04 (state 2026) |

**Lente autoral Danilo** (contexto-danilo/*) aparece **transversalmente** em TODOS os volumes — como tom de voz, referência de método (8 fases) e filtro de relevância. Além disso, o Volume 10 tem seção específica sobre o mapeamento método-forge (fases 3, 4, 5, 7, 8 são autoria).

---

## 4. Regras Cardinais (inegociáveis)

Top 18 regras que atravessam todos os volumes. Cada volume vai amplificar as regras relevantes ao seu domínio.

| # | Regra | Domínio-chave | Fonte |
|---|-------|---------------|-------|
| RC-01 | **Zero inferência.** Se parece faltar, PERGUNTAR. Não preencher com suposições. | D2, D3, D10 | process-archaeologist, Constitution Art. IV (No Invention) |
| RC-02 | **Vocabulário do usuário é sagrado.** Usar os termos dele, nunca inventar nomenclatura. | D2, D3, D5 | extraction-lenses, tom-de-voz Danilo |
| RC-03 | **Task-first architecture.** Tasks são primárias, agentes são executores. | D1, D3, D4 | squad-schema, AIOX + Auroq convergem |
| RC-04 | **Pipeline unidirecional.** Workflows não voltam. Decisões são upstream. | D3, D6, D8 | Pedro Valerio (creator), squad-forge |
| RC-05 | **Separação de papéis.** Executor ≠ Juiz ≠ Coordenador. NUNCA o mesmo agente faz dois. | D1, D3, D6 | AIOX constitutional, Auroq Art. II |
| RC-06 | **KB é artefato primário, não suporte.** Squad operacional sem KB rica = squad burro. | D4, D5 | forge-kb, assemble-squad Step 6 |
| RC-07 | **Qualidade > Velocidade, sempre.** Pipeline blocado, não one-shot. | D6, D8, D10 | Método Danilo, Constitution Auroq Art. V |
| RC-08 | **Documentar = investir.** O que não é documentado morre. | D7, D8, D10 | CLAUDE.md DNA, Constitution Auroq Art. III |
| RC-09 | **REUSE > ADAPT > CREATE.** Antes de criar qualquer artefato, verificar se já existe. | D10 | IDS Principle, Constitution Auroq Art. VI |
| RC-10 | **Playback antes de construir.** Apresentar processo em narrativa (não YAML) e coletar aprovação explícita do usuário. | D2, D6 | playback-validate, Chief forge |
| RC-11 | **3+ output examples + 3+ immune system triggers** por agente. Extraídos do processo real, não inventados. | D3, D4 | assemble-squad, nuclear-structure-validation |
| RC-12 | **Quality gates são bloqueantes.** Se não passa, não avança. (Exceção: override explícito do usuário.) | D6 | squad-forge QGs, AIOX self-healing |
| RC-13 | **Cobertura de KB mínima 80%.** Cada PU-TACIT representado, decisions têm trees, steps operacionais têm protocolo. | D5, D6 | assemble-squad Step 6d |
| RC-14 | **Anti-viagem.** Executar dentro do escopo planejado. Mudar plano só com aprovação explícita. | D2, D6, D10 | DNA operacional, Constitution Auroq |
| **RC-15** | **Human-in-loop obrigatório em toda mutação de specs.** Playback não é etapa — é rule KaiZen-level. Razão: anti prompt-injection + previne deriva. | D2, D6, D10 | LangChain Memory — insight #4 |
| **RC-16** | **Schema validation com feedback loop pro LLM.** Erros de validação voltam como input (max 3 retries) antes de escalar. Reuso direto do squad-validator.js. | D4, D6 | LangChain + AIOX — insight #5 |
| **RC-17** | **Observability desde dia 1.** Não é afterthought. Tracing + logs estruturados desde o MVP. Hierarquia constitucional: **CLI First → Observability Second → UI Third**. | D6, D8 | LangChain 2026 (89% adoção, 71% full tracing) — insight #6 |
| **RC-18** | **Staged rollout.** Interno (Danilo) primeiro, cliente depois. Industry best practice, não scrappy. | D10 | LangChain 2026 — insight #8 |

---

## 5. Personas e Stakeholders

### 5.1 Consumer da KB
| Persona | Papel | O que precisa da KB |
|---------|-------|--------------------|
| **Moreh** (squad criador de squads) | Meta-forge autoral — consumer primário da KaiZen | Base cognitiva completa pra executar as 8 fases do método + construir squads AIOS funcionais |
| **Danilo (expert)** | Operador primário do Moreh (staged rollout — uso interno primeiro, RC-18) | Protocolos claros, tom casual, referências ao método próprio, evitar jargão acadêmico |
| **Cliente da Consultoria Híbrida 60d** (fase 2 do rollout) | Consumer final dos squads gerados pelo Moreh | Outputs operacionais, documentação clara, delegação gradual |

### 5.2 Autores/fontes das fontes
| Fonte | Autoridade |
|-------|-----------|
| Euriler Jube | Criador do Auroq OS + squad-forge |
| AIOX team (Synkra) | Criadores do squad-creator |
| Lilian Weng | OpenAI (prompt engineering + LLM agents) |
| LangChain team | Ecossistema LangGraph + LangSmith Agent Builder |
| Danilo Yuzo | Expert/autor do método 8 fases |

### 5.3 Stakeholders do território
- Experts/info-produtores (público-alvo final)
- Comunidade aiox-core (evolução do framework)
- Comunidade Auroq (evolução do framework)
- Academia/research (Weng, Park et al., Boiko et al., Shinn, Yao, Wei, etc.)

---

## 6. Frameworks e Metodologias Referenciadas

| Framework/Metodologia | Domínio | Uso na KB |
|----------------------|---------|-----------|
| **Squad Forge Auroq** (8 lentes, PUs, 5 fases) | D2, D3, D4 | Columna vertebral da fase de extração e arquitetura |
| **Squad Creator AIOX** (task-first, JSON Schema, validators) | D4, D6, D10 | Contratos formais, validação, migration |
| **Framework 7 Artefatos** (KB/Workflow/Tasks/Rules/QGs/Skill-Agent/Tools) | D1, D4, D5 | Taxonomia universal de processos |
| **COALA** (Procedural/Semantic/Episodic memory) | D7 | Taxonomia de memória do agente |
| **ReAct** (Thought→Action→Observation) | D9 | Pattern de tool use com reasoning |
| **Reflexion** (dynamic memory + self-reflection) | D9 | Pattern de self-improvement |
| **Chain-of-Thought** (zero/few/auto) | D9 | Reasoning base |
| **Tree of Thoughts** (BFS/DFS + evaluator) | D9 | Reasoning para problemas complexos |
| **MRKL** (Modular Reasoning) | D9 | Arquitetura neuro-simbólica |
| **HuggingGPT** (planner + experts) | D3, D9 | Pattern multi-agente |
| **API-Bank** (Level 1/2/3) | D9 | Benchmark de tool use |
| **IDS Principle** (6 gates G1-G6) | D10 | Governança de reuso |
| **CrewAI Flows** | D3, D8 | Workflows event-driven |
| **Anthropic Skills** (progressive disclosure) | D5 | KB em níveis |
| **Método Danilo 8 fases** (apaixone-se pelo problema → feedback loop) | Transversal | Lente autoral |
| **TOC (Goldratt)** | D2 | Gargalo e constraint |
| **5 Whys (Ohno)** | D2 | Extração de decisões |
| **Checklist Manifesto (Gawande)** | D2 | Decomposição de complexidade |
| **Kahneman (Sistema 1/2)** | Transversal | Base teórica do método Danilo |
| **Hormozi (workflows granulares)** | D3, Transversal | Tese de decomposição |

---

## 7. Vocabulário Central (Glossário Seed)

Termos que atravessam a KB. Volume 5 terá glossário expandido.

| Termo | Definição operacional |
|-------|---------------------|
| **KaiZen** | A própria KB — base cognitiva do Moreh |
| **Moreh** | Squad criador de squads (meta-forge autoral do Danilo). Consumer primário da KaiZen |
| **KaiZen ↔ Moreh** | Relação KB → squad. KaiZen alimenta; Moreh consome e executa |
| **Squad** | Múltiplos agentes coordenados com pipeline + quality gates |
| **Agent** | Worker/Mind com persona, commands, responsabilidades exclusivas |
| **Task** | Unidade atômica de trabalho com 8 campos obrigatórios (TASK-FORMAT-SPEC-V1) |
| **Workflow** | Sequência de fases ordenada com quality gates entre elas |
| **Process Unit (PU)** | Unidade atômica de conhecimento processual. 8 tipos (STEP, DECISION, EXCEPTION, QUALITY_GATE, DEPENDENCY, INPUT, OUTPUT, TACIT) |
| **Quality Gate (QG)** | Checkpoint bloqueante entre fases. PASS/CONCERNS/FAIL/WAIVED |
| **Knowledge Base (KB)** | Cérebro do squad. Conhecimento tratado via ETL. Artefato primário |
| **Skill** | Claude + KB + persona + regras = conhecimento ativado |
| **Constitution** | Documento com princípios inegociáveis + severity levels |
| **Authority Matrix** | Delegação exclusiva de operações entre agentes |
| **Exocortex** | Memória externa permanente do expert (Auroq) |
| **Companion** | Agente parceiro cognitivo que orquestra o sistema |
| **Forge** | Meta-squad que cria outros agentes |
| **Meta-squad + macro orchestrator** | Hierarquia arquitetural padrão: squad que cria squads + orquestrador que coordena o meta (validado por Weng) |
| **Playback** | Apresentar processo extraído de volta pro usuário em narrativa, coletar validação. **KaiZen-level rule** (RC-15) |
| **Gemba** | "Me mostra" > "Me conta". Observar o processo real em ação |
| **Dual mapping** | PU alimenta 2 destinos: estrutura (task/workflow) + KB |
| **Self-healing loop** | Auto-correção até 3 tentativas antes de escalar |
| **Schema feedback loop** | Erros de validação voltam pro LLM como input (max 3 iterações) — padrão AIOX |
| **Handoff artifact** | YAML compacto (~379 tokens) que preserva contexto entre agent switches |
| **SYNAPSE** | Engine de injeção de contexto em 8 camadas (L0-L7) |
| **Hook** | Automação que intercepta eventos do Claude Code (UserPromptSubmit, PreCompact, etc.) |
| **Slash prefix** | Identificador de comando do squad (ex: `/squadForge`) |
| **Executor type** | Classificação: agent / human / hybrid / worker |
| **Immune system** | Tabela de triggers de risco + respostas automáticas do agente |
| **IDS Principle** | REUSE > ADAPT > CREATE. Hierarquia de verificação pré-criação |
| **LLM-as-judge** | Validação de output por LLM separado do executor (53% adoption em 2026) |
| **COALA** | Framework de memória em 3 tiers: Procedural + Semantic + Episodic (LangChain) |
| **Procedural memory** | Rules, constitution, skills. Define COMPORTAMENTO do agente |
| **Semantic memory** | KB, fatos, glossário. Define CONHECIMENTO do agente |
| **Episodic memory** | Past interactions, conversation history. **Deferido no MVP da KaiZen** — entra no roadmap |
| **Multi-model routing** | Per-squad model selection. Ex: Haiku pra extração (rápido/barato) + Opus pra generation (qualidade). 75%+ adoption |
| **Markdown-first storage** | Autoria em .md hierárquico; runtime em DB (Postgres/similar). Virtual filesystem sobre DB |
| **Virtual filesystem** | DB exposto como filesystem hierárquico pro agente navegar — padrão LangChain |
| **Observability desde dia 1** | Tracing + logs estruturados desde o MVP. Hierarquia: CLI First → Observability Second → UI Third |
| **Staged rollout** | Interno → cliente. MVP pro Danilo primeiro, cliente depois. Industry pattern |
| **Método Danilo 8 fases** | 1.Problema → 2.Mapear → 3.Stress test → 4.Riscos → 5.Priorização → 6.Contratos → 7.Níveis progressivos → 8.Feedback loop |
| **Níveis progressivos** | Manual → Simplificado → Batch → Automatizado. Nunca pular |

---

## 8. Backbone de Volumes (plano de composição)

Ordem importa — volumes posteriores assumem o anterior.

| Vol | Título | Foco | Linhas estimadas |
|-----|--------|------|------------------|
| **VOL-01** | **Fundamentos e Arquitetura** | Taxonomia (Companion/Minds/Workers/Squads), 7 artefatos, 7 camadas, framework boundary L1-L4, DNA operacional, task-first architecture, mapeamento AIOX → info-produtor, **hierarquia meta-squad + macro orchestrator**, **relação KaiZen ↔ Moreh** | 400-500 |
| **VOL-02** | **Extração de Processo (Fase 1 da construção)** | 8 lentes L1-L8, Process Units (8 tipos), técnicas (5 Whys/Gemba/Basicamente/Observador), gap detection, **playback como KaiZen-level rule** (human-in-loop anti prompt-injection) | 500-650 |
| **VOL-03** | **Arquitetura e Design de Squads (Fase 2)** | Clusters, decomposição 1-7 agentes, dual mapping PU→Task+KB, executor classification, workflow unidirecional, agent design (persona 6-níveis), 3+ output examples, 3+ immune triggers | 500-650 |
| **VOL-04** | **Estrutura Nuclear e Contratos (Fase 3)** | squad.yaml, TASK-FORMAT-SPEC-V1 (8 campos), agent format, JSON Schema validation, **schema feedback loop pro LLM** (erros voltam como input, max 3 retries), 3 templates, directory structure | 400-500 |
| **VOL-05** | **Knowledge Base como Cérebro** | KB como artefato primário, 6 seções (regras cardinais/protocolos/decision trees/tabelas/troubleshooting/glossário), ETL integration, cobertura 80%+, skill vs agent, progressive disclosure | 400-500 |
| **VOL-06** | **Quality Gates, Validação e Self-Healing** | QGs multi-estágio, checklists PASS/CONCERNS/FAIL/WAIVED, self-healing loop (max 3), smoke tests, squad-validator.js **como fase 6 do Moreh**, blind A/B, evals, separação executor/juiz, **Observability desde dia 1** (CLI First → Observability Second → UI Third) | 500-600 |
| **VOL-07** | **Memória, Aprendizado e Handoff** | COALA (**Procedural + Semantic** no MVP, **Episodic deferido pro roadmap**), 3 camadas temporais (sessão/operacional/permanente), 6 triggers, Exocortex, **markdown-first autoria + DB runtime** (virtual filesystem), AGENTS.md, MEMORY.md por agente, handoff artifact (~379 tokens), MIPS/ANN | 450-550 |
| **VOL-08** | **Orquestração e Sistema Nervoso** | Hooks (UserPromptSubmit/PreCompact/PreToolUse), SYNAPSE 8-layer injection, Companion pattern, modus operandi (ciclos sessão/semanal/projeto), cockpit max 3, **multi-model routing per-squad** (Haiku pra extração, Opus pra generation) | 400-500 |
| **VOL-09** | **Padrões de IA (Reasoning + Prompting + Tool Use)** | CoT/ToT/ReAct/Reflexion/CoH/Algorithm Distillation; few-shot patterns/APE/instruction; MRKL/Toolformer/HuggingGPT/API-Bank/MCP governance/3-tier tool registry | 650-800 |
| **VOL-10** | **Governance, Evolução e Meta-Squads** | Constitution (6 artigos + severity), Authority Matrix, delegation, Natural Language First, REUSE>ADAPT>CREATE (6 gates G1-G6), Entity Registry, Forges, migration/versionamento, **staged rollout pattern** (Decisão #3 resolvida: interno Danilo → cliente), state 2026, lente autoral Danilo (8 fases + mapeamento Moreh) | 500-600 |

**Total estimado:** 4.700-5.850 linhas. Média ~500 linhas/volume.

### Insights que atravessam a KB (ajuste pós-exploração)

Cada volume integra os 8 insights de exploração (doc: `business/campanhas/metodo-forge/exploracao.md`):

| Insight | Aplicação principal | Volume-chave |
|---------|-------------------|--------------|
| #1 Meta-squad + macro orchestrator é padrão (Weng) | Validação da arquitetura KaiZen ↔ Moreh | VOL-01 |
| #2 Memória em tiers (defer episodic) | Scope do MVP de memória | VOL-07 |
| #3 Markdown-first + DB runtime | Storage model explícito | VOL-07 |
| #4 Human-in-loop em mutações de specs | Playback como KaiZen-level rule (RC-15) | VOL-02, VOL-06 |
| #5 Schema validation com feedback loop | squad-validator.js como fase 6 do Moreh (RC-16) | VOL-04, VOL-06 |
| #6 Observability desde dia 1 | Artigo constitucional (RC-17) | VOL-06, VOL-08 |
| #7 Multi-model routing per-squad | Haiku extract / Opus generate | VOL-08 |
| #8 Staged rollout (interno → cliente) | Resposta à decisão #3 (RC-18) | VOL-10 |

---

## 9. Mapeamento Fonte → Volume

Indica, para cada volume, quais fontes são **primárias** (leitura obrigatória) e **de enriquecimento** (consultar conforme relevância).

| Volume | Fontes Primárias | Fontes de Enriquecimento |
|--------|------------------|-------------------------|
| VOL-01 | loc-03-framework-7-artefatos, loc-06-blueprint-info-produtor (seções 1-6, 11-12), CLAUDE.md Auroq (via loc-02) | loc-01-danilo-* (todos), ext-04-state-2026 |
| VOL-02 | loc-04-squad-forge/data/extraction-lenses, loc-04-squad-forge/data/pu-classification, loc-04-squad-forge/agents/process-archaeologist, loc-04-squad-forge/tasks/extract-process, loc-04-squad-forge/tasks/playback-validate | loc-04-squad-forge/templates/pu-tmpl, loc-04-squad-forge/templates/process-map-tmpl, loc-04-squad-forge/checklists/extraction-completeness |
| VOL-03 | loc-04-squad-forge/agents/forge-smith, loc-04-squad-forge/tasks/architect-squad, loc-04-squad-forge/data/executor-mapping-guide, loc-04-squad-forge/templates/squad-blueprint-tmpl | loc-04-squad-forge/data/forge-kb, loc-06-blueprint seção 12, loc-05-squad-creator/tasks/squad-creator-design |
| VOL-04 | loc-05-squad-creator/schemas/squad-schema, loc-05-squad-creator/schemas/squad-design-schema, loc-05-squad-creator/tasks/squad-creator-create, loc-04-squad-forge/tasks/assemble-squad, loc-04-squad-forge/checklists/nuclear-structure-validation | loc-05-squad-creator/squad-template-skeleton/*, loc-04-squad-forge/squad.yaml |
| VOL-05 | loc-04-squad-forge/data/forge-kb, loc-04-squad-forge/tasks/assemble-squad (Step 6), loc-03-framework-7-artefatos (seção KB) | ext-03-langchain-memory, ext-04 (state 2026) |
| VOL-06 | loc-04-squad-forge/tasks/validate-squad, loc-04-squad-forge/checklists/*, loc-05-squad-creator/tasks/squad-creator-validate, loc-05-squad-creator/tasks/squad-creator-analyze | loc-03-framework (seção QG), ext-04 (state 2026 — 89% observability) |
| VOL-07 | ext-03-langchain-memory (COALA, filesystem), ext-02-lilianweng-agents (Memory component), CLAUDE.md (sistema-memoria), agent-handoff rule | ext-02-lilianweng-agents (MIPS/ANN algorithms) |
| VOL-08 | loc-06-blueprint (seções 3-6, apêndice A — hooks/SYNAPSE), CLAUDE.md (modus operandi, sistema de projetos) | ext-02-lilianweng-agents (planning component) |
| VOL-09 | ext-01-lilianweng-prompt-engineering, ext-02-lilianweng-agents (planning + tool use), CLAUDE.md mcp-usage rule | loc-05-squad-creator (tool registry implícito) |
| VOL-10 | loc-06-blueprint (seções 1, 8-9, 15, apêndices B-C), CLAUDE.md constitution + agent-authority, loc-05-squad-creator/tasks/squad-creator-migrate, ext-04 state 2026 | loc-01-danilo-metodo, loc-02-exploracao (decisões pendentes), loc-01-danilo-posicionamento |

**Lente transversal Danilo** (loc-01-danilo-*): consultada em TODOS os volumes para:
- Tom de voz (casual, direto, "professor de boteco")
- Diretrizes de escrita (3ª série, frases curtas, voz ativa)
- Método 8 fases (âncora metodológica)
- Posicionamento ("transformar implícito em obvio")

---

## 10. Gaps Conhecidos e Decisões Pendentes

### 10.1 Gaps no material-fonte
- **Scripts JS do squad-creator** (validator, loader, generator, etc.) estão referenciados mas **não foram incluídos no pacote** (7K+ linhas). Impacto: a KB vai descrever O QUE os scripts fazem, mas não pode mostrar implementação. Mitigação: citar paths e referenciar.
- **Tasks restantes do squad-creator** (extend, migrate, list, download, publish, sync) — algumas foram lidas, outras não. Mitigação: o que foi ingerido é suficiente pra cobrir os patterns principais.
- **Constitution completa do Auroq** (`.auroq-core/constitution.md`) — resumida no CLAUDE.md. Mitigação: seções-chave estão no blueprint info-produtor.

### 10.2 Decisões pendentes (não bloqueiam composição)
Registradas em `loc-02-metodo-forge-exploracao.md`:
1. Unidade atômica: PU ou conceito próprio?
2. Output canônico: YAML, JSON Schema, ou híbrido?
3. ~~Cliente do método-forge: Danilo interno ou self-service?~~ **RESOLVIDA** — staged rollout (RC-18): interno Danilo → cliente em fase 2. Industry pattern validado (LangChain 2026, insight #8).
4. Lente dos 5 agentes novos (stress-tester, risk-mapper, prioritizer, flow-architect, loop-instrumenter): internos ou entregáveis?

**Tratamento na KB:** decisões 1, 2, 4 aparecem em VOL-10 como "decisões abertas do Moreh" — a KB não responde, mas documenta trade-offs. Decisão 3 vira caso de aplicação do RC-18.

### 10.3 Contradições detectadas entre fontes
- **Pedro Valerio / creator AIOX diz "processos não voltam, nunca"** vs **squad-forge aceita rounds cirúrgicos gap-driven**. Resolução: são compatíveis — rounds iterativos ocorrem DENTRO de uma fase (extração), o WORKFLOW macro é unidirecional.
- **AIOX usa monolito "Craft"** (1 agente com 10 tasks) vs **Auroq usa 3 agentes separados** (chief/archaeologist/smith). Registrar como **trade-off arquitetural** — não há "certo", há contextos diferentes.
- **Auroq faz playback obrigatório com expert** vs **AIOX assume docs prontos**. Resolução: dois pontos de entrada diferentes — Auroq extrai do humano, AIOX extrai de docs. Ambos cabem na KB como **patterns distintos**.

### 10.4 Questões abertas pra eventual v2 da KB
- Integração com MCP servers específicos (Slack, GitHub, Notion) — não explorado
- Deploy de squads em produção (beyond local Claude Code)
- Monetização/distribuição (Synkra marketplace, GitHub Releases) — tangenciado

---

## 11. Proveniência e Atribuição

Regras de citação na KB (a serem usadas pelo Composer em cada volume):

- **Citação literal** (quote + parágrafo): `[Fonte: loc-04-squad-forge/agents/process-archaeologist.md]`
- **Paráfrase conceitual** (ideia extraída): `[Baseado em: ext-02-lilianweng-agents]`
- **Síntese autoral** (integração de múltiplas fontes): `[Síntese: loc-04-forge + ext-01-weng + loc-06-blueprint]`
- **Lente Danilo** (quando aplica tom/método/diretriz): `[Lente: loc-01-danilo-metodo]` ou similar

**Autoridade por território:**
- Extração de processo + validação iterativa → **Euriler (Auroq)**
- Estrutura formal + contratos + scripts → **AIOX team (Synkra)**
- Reasoning + memory + tool use → **Lilian Weng (OpenAI)**
- Memory filesystem + state of agent eng → **LangChain team**
- Método 8 fases + lente autoral → **Danilo Yuzo**

**Anti-plágio:** a KB **não copia literal** — ela **sintetiza, organiza e conecta**. Cada parágrafo é identificável ao seu source via proveniência. Quando é literal, aspas + `[Fonte:]`.

---

## Fim do MAPA-TERRITORIAL

**Próximo passo:** QG-ETL-002 — apresentar plano de volumes (backbone) ao usuário para aprovação ANTES de compor.
