# GLOSSÁRIO — KaiZen

> Vocabulário técnico da KB. Termos atravessam volumes. Ordenado alfabeticamente.

---

## A

### Agent / Agente
Worker/Mind com persona, commands, responsabilidades exclusivas. Executor de tasks. Contraste com Skill: agent tem persona + memória ativa + autoridade; skill é conhecimento ativado sem persona.

### Agent Authority Matrix
Tabela que define quais operações são exclusivas de cada agente. Cross-agent operations exigem delegation. Coberto em VOL-10 seção 3.

### Agent System (Weng)
LLM (brain) + 3 componentes: Planning + Memory + Tool Use. Arquitetura canônica de agentes modernos.

### AGENTS.md
Arquivo padrão (convenção LangChain/Claude Code) com instruções core do agente. Cresce com uso via correções. Ver VOL-07 seção 8.

### AIOX / Synkra
Framework de squads com foco em estrutura formal, JSON Schema validation, task-first architecture. Produz "Craft" (squad-creator). Autoridade em VOL-04.

### Algorithm Distillation (AD)
Pattern Laskin et al. 2023. Aplica Chain of Hindsight a trajetórias RL cross-episode. Aprende o processo RL, não policy task-specific. VOL-09 seção 10.

### ANN (Approximate Nearest Neighbors)
Algoritmos pra busca rápida em vector stores: LSH, ANNOY, HNSW, FAISS, ScaNN. VOL-07 seção 15.

### Anti-emulation
Regra: agente NUNCA finge ser outro agente no mesmo contexto. Previne polução de persona + vazamento de autoridade. VOL-10 seção 5.

### Anti-viagem
Executar dentro do escopo planejado. Mudar só com aprovação explícita. RC-14.

### APE (Automatic Prompt Engineer)
Zhou et al. 2022. Busca sobre instruções candidatas geradas por modelo, filtradas por score. VOL-09 seção 16.

### API-Bank
Benchmark (Li et al. 2023) com 53 APIs e 264 diálogos pra avaliar tool-augmented LLMs. 3 levels de evaluation. VOL-09 seção 20.

### Archaeologist (process-archaeologist)
Agente do squad-forge Auroq. Especialista em extração profunda via 8 lentes. VOL-02.

### Auroq OS
Framework SO de IA para experts (Euriler Jube). Produz squad-forge + companion pattern + Exocortex + framework boundary L1-L4.

### AutoGPT
POC de agente autônomo. LLM como main controller. Reliability issues mas compelling. VOL-09 seção 27.

---

## B

### Blind A/B Comparison
Pattern Anthropic Skills. Avaliador vê outputs v1 e v2 sem saber qual é qual. Refinamento iterativo. VOL-06 seção 11.

### Blueprint (squad blueprint)
Output da Fase 3 (Arquitetura). Documento que precede montagem. Contém agent decomposition + task mapping + workflow + kb-plan. VOL-03 seção 12.

### Bottleneck
Gargalo do processo (Goldratt). Deve ser **abordado** no design do squad — simplificar, paralelizar ou colocar gate. VOL-03.

---

## C

### Chain of Hindsight (CoH)
Liu et al. 2023. Modelo recebe sequências de outputs passados + feedback. Aprende a melhorar. VOL-09 seção 9.

### Chain of Thought (CoT)
Wei et al. 2022. "Think step by step". Padrão fundacional de reasoning. VOL-09 seção 3.

### ChemCrow
LLM + 13 ferramentas químicas (Bran et al. 2023). Mostra que human review > LLM-as-judge em domínios especializados. VOL-09 seção 24.

### Cockpit
Sistema de projetos do Auroq. `business/cockpit.md`. **Max 3 ativos, inegociável.** VOL-08 seção 7.

### COALA
Framework de memória LangChain: Procedural + Semantic + Episodic. KaiZen MVP: procedural + semantic (episodic deferido). VOL-07 seção 2.

### Companion
Agente parceiro cognitivo permanente (Auroq). 6 camadas: SITUAR/LEMBRAR/ORIENTAR/FAZER/ROTEAR/PROTEGER. Orquestra sistema. VOL-08 seção 4.

### Companion Primeiro (rule)
Companion NUNCA tenta resolver algo que especialista sabe fazer melhor. Sempre rotear.

### Constitution
Documento com princípios inegociáveis + severity levels. Sem isso, agentes inventam. VOL-10 seção 2.

### Cowork
Plataforma de IA (mencionada no blueprint info-produtor) com 38+ connectors nativos.

### Craft
@squad-creator do AIOX. Arquétipo Builder (Capricórnio). 10 tasks monolíticas.

---

## D

### Decision Recorder (ADR)
Architecture Decision Records aplicado a decisões de squad. VOL-07 seção 14.

### Decision Tree (na KB)
Árvore de decisão derivada de PU-DECISION. Uma das 6 seções essenciais da KB. VOL-05 seção 4.3.

### Delegation Matrix
Tabela que mostra quando delegar, pra quem. Cross-agent operations. VOL-10 seção 4.

### Dependency (PU-DEPENDENCY)
Relação obrigatória entre passos. Um dos 8 tipos de PU. VOL-02 seção 5.

### Dogfooding
Usar internamente antes de oferecer ao cliente. Parte do staged rollout (RC-18).

### DNA Operacional
5 comportamentos herdados por todo agente no KaiZen/Moreh: Projeto antes de execução · Documentação contínua · Handoff perfeito · Anti-viagem · Anti-entropia. VOL-01 seção 7.

### Dual Mapping (PU → Task + KB)
Cada PU alimenta 2 destinos: estrutura (task/workflow) + KB. Crítico pra squad operacional. VOL-03 seção 6.

---

## E

### Entity Registry
Catálogo YAML de artefatos com checksum + adaptability + lifecycle. 30-50 entries MVP, 745 em AIOX maduro. VOL-10 seção 9.

### Episodic Memory
Tier 3 do COALA: sequências de ações passadas. **Deferido no MVP da KaiZen** (roadmap).

### ETLmaker
Meta-squad do Auroq que extrai conhecimento bruto em KBs estruturadas. Pipeline v3.0 (4 fases + 3-layer validation). Produz a própria KaiZen.

### Evals Quantitativos
Métricas mensuráveis: pass_rate, token_count, time_to_complete, validation_score, coverage, iteration_count. VOL-06 seção 12.

### Exception (PU-EXCEPTION)
Caso atípico, falha, plano B. Um dos 8 tipos de PU. Tem severity (blocker/degraded/cosmetic).

### Exocortex
Memória externa permanente do expert (Auroq). Nunca reseta, sempre cresce. `expert-mind/` + `expert-business/` + `biblioteca-pmi/`. VOL-07 seção 6.

### Executor Type
Classificação de PU-STEP: agent / human / hybrid / worker. Decision tree em VOL-03 seção 5.

---

## F

### FAISS
Facebook AI Similarity Search. Algoritmo ANN pra volume muito alto. VOL-07 seção 15.

### Feedback Loop
Fase 8 do método Danilo. Sistema melhora com uso. Parte do diferencial competitivo.

### Few-shot Learning
Apresentar demonstrações antes da tarefa. Vieses: majority label / recency / common token. VOL-09 seção 13.

### Filesystem-based Memory
Padrão LangChain: representar memória como arquivos. LLMs são bons em filesystems. VOL-07 seção 7.

### Forge
Meta-squad que cria outros agentes. 5 tipos no Auroq: Squad-Forge · Mind-Forge · Worker-Forge · Clone-Forge · ETLmaker. VOL-10 seção 10.

### Function Calling
Pattern OpenAI/Anthropic. Developer define schema, modelo chama com args. Nativo em Claude Code.

---

## G

### G1-G6 (IDS Gates)
6 gates formais do IDS Principle. G1-G4 advisory, G5-G6 hard block. VOL-10 seção 8.

### Gap Detection
Análise de PUs entre rounds de extração. Gera perguntas cirúrgicas pro próximo round. VOL-02 seção 6.5.

### Gate (Quality Gate)
Checkpoint bloqueante entre fases. PASS/CONCERNS/FAIL/WAIVED. VOL-06.

### Gemba (Go and See)
Ohno/Toyota. "Me mostra" > "Me conta". Observar o processo em ação. 30% do processo é implícito. VOL-02 seção 7.7.

### Generative Agents
Simulação de 25 agentes LLM (Park et al. 2023). Memory + Retrieval + Reflection + Planning. VOL-09 seção 26.

### Goldratt, Eliyahu
Theory of Constraints. Encontrar o gargalo. Inspira Lente 7 do squad-forge. VOL-02 seção 3.1.

### GPT-Engineer
Cria repositórios de código a partir de spec natural. POC. VOL-09 seção 27.2.

---

## H

### Handoff Artifact
YAML compacto (~379 tokens) que preserva contexto entre agent switches. Max 3 retained. **33-57% redução de contexto.** VOL-07 seção 13.

### HNSW (Hierarchical Navigable Small World)
Algoritmo ANN mainstream moderno. High recall. VOL-07 seção 15.

### Hooks (Claude Code)
Shell commands executados em response a eventos: UserPromptSubmit, PreCompact, PreToolUse, PostToolUse, Stop. VOL-08 seção 2.

### HuggingGPT
Shen et al. 2023. ChatGPT como task planner selecionando HuggingFace models. 4 stages. **Pattern de Moreh em alto nível.** VOL-09 seção 19.

### Human-in-Loop (RC-15)
Aprovação humana obrigatória em toda mutação de specs. Anti prompt-injection. KaiZen-level rule.

### Hybrid (executor type)
IA prepara, dono revisa. Parte mecânica + parte criativa. VOL-03 seção 5.

---

## I

### IDS Principle
REUSE > ADAPT > CREATE. Hierarquia de verificação pré-criação. 6 gates. VOL-10 seção 7-8.

### Immune System (do agente)
Tabela de triggers de risco + respostas automáticas. Mínimo 3 triggers por agente (RC-11). Extraídos de PU-EXCEPTIONs. VOL-03 seção 11.

### Info-produtor
Expert que vende conhecimento digital (cursos, mentorias, eventos). Público-alvo da Consultoria Danilo.

### In-Context Instruction Learning
Ye et al. 2023. Combina few-shot + instruction em múltiplas tarefas. VOL-09 seção 14.2.

### Input (PU-INPUT)
Material necessário pra um passo. Um dos 8 tipos de PU.

### Instruction Prompting
Direção explícita ao invés de demonstrações. InstructGPT-style. VOL-09 seção 14.

### Internal Retrieval
LLM generate knowledge → LLM answer with generated context. Liu et al. 2022.

### IRCoT (Interleaving Retrieval CoT)
Combina CoT iterativo com queries Wikipedia API. Trivedi et al. 2022.

---

## J

### JSON Schema
Pattern de validação estrutural. AIOX usa pra squad.yaml via AJV. VOL-04 seção 5.

---

## K

### KaiZen
**Esta KB.** Base cognitiva do Moreh. Melhores práticas de multi-agentes + orquestração no Claude Code.

### KB (Knowledge Base)
Artefato primário do squad. Cérebro. 6 seções essenciais. **RC-06: KB é primária, não suporte.** VOL-05.

### Kaizen (conceito)
Melhoria contínua (origem japonesa). Inspira nome da KB.

### kb-plan.md
Plano de KB gerado na Fase 3 (Arquitetura). Mapeia PUs → seções da KB. VOL-03 seção 7.

---

## L

### L1-L8 (Lentes de Extração)
8 ângulos complementares pra extração profunda. Squad-forge Auroq. VOL-02 seção 4.

### L0-L7 (SYNAPSE layers)
8 camadas de rule injection. L0 Constitution sempre; outros contextuais. VOL-08 seção 3.

### L1-L4 (Framework Boundary)
4 camadas de mutabilidade. L1/L2 NUNCA modifica, L3 configura, L4 sempre modifica. VOL-01 seção 6.

### LangChain
Ecossistema Python pra construir agentes. LangGraph pra graphs. LangSmith pra observability. Autoridade em memory patterns + state of agent engineering.

### LangSmith Agent Builder
Plataforma no-code de construção de agentes. Usa COALA + filesystem memory. VOL-07 seção 7.

### LLM+P
Liu et al. 2023. Outsource planning pra PDDL classical planners. VOL-09 seção 5.

### LLM-as-Judge
Padrão de validação com LLM separado do executor. 53% adoption em 2026. VOL-06 seção 16.

### LSH (Locality-Sensitive Hashing)
Algoritmo ANN. Hash functions mapeiam similares no mesmo bucket.

---

## M

### Macro Orchestrator
Companion. Coordena sistema inteiro. Nível mais alto da hierarquia meta-squad. VOL-01 seção 9.

### Markdown-first + DB runtime
Storage model: autoria em markdown, runtime em DB (virtual filesystem). **Insight #3 da exploração.** VOL-07 seção 7.3.

### MCP (Model Context Protocol)
Servers que estendem Claude com tools externos. Governance crítica: preferir nativas (Auroq rule). VOL-09 seção 22.

### MEMORY.md
Arquivo de aprendizado localizado do agente. Cresce com uso. VOL-07 seção 9.

### Meta-Squad
Squad que cria outros squads/agentes. Forge. Hierarquia arquitetural acima de squads operacionais.

### Method Danilo (8 fases)
Método autoral: Problema → Mapear → Stress test → Riscos → Priorização → Gates → Níveis progressivos → Feedback loop. VOL-10 seção 14.

### Mind
Categoria de agente (Auroq). Pensa e julga. Subtipos: Clone · Mente Sintética · Consultor.

### MIPS (Maximum Inner Product Search)
Padrão de busca em vector stores. Base pra ANN algorithms.

### Moreh
Squad criador de squads. Consumer primário da KaiZen. Meta-forge autoral do Danilo.

### MRKL Systems
Modular Reasoning, Knowledge and Language (Karpas et al. 2022). Router + modules (neurais + simbólicos). VOL-09 seção 17.

### Multi-Model Routing
Per-squad model selection. Haiku pra extração, Opus pra generation. 75%+ adoption em 2026. **Insight #7.** VOL-08 seção 9.

---

## N

### Natural Language First
Interface primária é conversa, não comandos. Comandos `*` existem como atalho, nunca exigidos. VOL-10 seção 6.

### Níveis Progressivos
Fase 7 do método Danilo. Manual → Simplificado → Batch → Automatizado. **Nunca pular.**

### NON-NEGOTIABLE
Severity level máxima. Violação = HALT sem override.

---

## O

### Observability (RC-17)
Tracing + logs + dashboards desde o MVP. Não afterthought. **CLI First → Observability Second → UI Third.** 89% adoption em 2026.

### Ohno, Taiichi
Toyota / 5 Whys. Perguntar "por que" até chegar na raiz. Inspira Lente 3 do squad-forge. VOL-02 seção 3.2.

### Ops
Agente core do Auroq. Mãos do sistema. Commit, push, bootstrap, MCP. Operações exclusivas.

### Organizer
Agente core do Auroq. Guardião da organização. Diagnose, architect, optimize, consult, store, clean, backup.

### Output (PU-OUTPUT)
Entregável produzido por um passo. Um dos 8 tipos de PU.

### Output Examples
3+ exemplos concretos por agente (RC-11). Happy path + decisão + exceção. Extraídos do processo real.

---

## P

### PAL (Program-Aided Language Models)
Gao et al. 2022. LLM gera Python, offload compute pra interpreter. VOL-09 seção 29.

### PASS / CONCERNS / FAIL / WAIVED
4 veredictos de gate. VOL-06 seção 4.

### PDDL (Planning Domain Definition Language)
Interface formal pra classical planners. Usado em LLM+P.

### Playback Validation
RC-10 + RC-15. Apresentar processo extraído em narrativa legível, coletar "esse é meu processo". Chief nunca inventa. VOL-02 seção 8.

### PoE (Product-of-Experts)
Padrão de ranking em RAG. **PoE > Noisy channel > RAG** em accuracy. VOL-09 seção 28.

### PoT (Program of Thoughts)
Chen et al. 2022. Similar ao PAL. Desacopla compute de reasoning.

### PreCompact (hook)
Captura snapshot antes do autocompact apagar contexto. VOL-08 seção 6.1.

### Procedural Memory
Tier 1 do COALA. Regras de comportamento. Constitution, rules, skills. **MVP da KaiZen.**

### Process Unit (PU)
Unidade atômica de conhecimento processual. 8 tipos. VOL-02 seção 5.

### Progressive Disclosure
Pattern Anthropic Skills. KB em níveis: resumo (sempre) → completa (quando ativa) → exemplos (sob demanda). VOL-05 seção 9.

### Prompt Engineering (Weng)
"Methods for how to communicate with LLM to steer its behavior without updating the model weights." VOL-09 Parte 3.

---

## Q

### QA Loop Iterativo
Max 5 ciclos review → fix → re-review. VOL-06 seção 6.

### QG-ETL-000 a 005
6 quality gates do ETLmaker pipeline.

### QG-SF-001 a 005
5 quality gates do Squad-Forge pipeline.

### Quality Gate (QG)
Checkpoint bloqueante. PASS/CONCERNS/FAIL/WAIVED. **Bloqueantes (RC-12).** VOL-06.

---

## R

### R1/R2/R3/RN (Rounds)
Rounds iterativos de extração. R1 exploração, R2 profundidade, R3 precisão, RN cirúrgico. VOL-02 seção 6.

### RAG (Retrieval-Augmented Generation)
Incorporar knowledge base no prompt via retrieval. PoE > Noisy > RAG ranking. VOL-09 seção 28.

### RC-01 a RC-18
18 regras cardinais. Ver REGRAS-CARDINAIS.md.

### ReAct (Reason + Act)
Yao et al. 2023. Alternância Thought → Action → Observation. **Padrão base pra tool use.** VOL-09 seção 7.

### Reflexion
Shinn & Labash 2023. Dynamic memory + self-reflection. Aprende com trial-and-error. VOL-09 seção 8.

### REUSE > ADAPT > CREATE
Hierarquia de verificação pré-criação. IDS Principle. RC-09.

### RLHF (Reinforcement Learning from Human Feedback)
Fine-tuning com feedback humano. Base de InstructGPT.

### Rollout Staged (RC-18)
Interno → Beta → GA. Industry pattern (LangChain 2026).

---

## S

### ScaNN
Scalable Nearest Neighbors. Algoritmo ANN state-of-art. VOL-07 seção 15.

### Schema Feedback Loop (RC-16)
Erros de validação voltam pro LLM corrigir. Max 3 iterações.

### Self-Ask
Press et al. 2022. Follow-up questions iterativas. Search engine responde.

### Self-Consistency Sampling
Wang et al. 2022. Múltiplas amostras + majority vote. VOL-09 seção 15.

### Self-Healing Loop
Max 3 tentativas de auto-correção antes de escalar. VOL-06 seção 5.

### Semantic Memory
Tier 2 do COALA. Fatos sobre o mundo. KB, glossário, playbooks. **MVP da KaiZen.**

### Separação de Papéis (RC-05)
Executor ≠ Juíza ≠ Coordenador. NUNCA o mesmo agente faz dois.

### Severity Levels
NON-NEGOTIABLE / MUST / SHOULD. Hierarquia de enforcement.

### SHOULD
Severity level. Violação = WARNING, registrar mas não bloquear.

### Skill
Claude + KB + persona + regras = conhecimento ativado. Contrasta com Agent: skill é one-shot; agent tem persona contínua.

### SKILL.md
Arquivo de skill. < 500 linhas (progressive disclosure).

### Slash Prefix
Identificador de comando do squad. Ex: `/squadForge`.

### Smoke Test
Validação operacional de squad. 3 cenários reais: happy path + decisão + exceção. 2/3 PASS aprova. VOL-06 seção 8.

### Squad
Múltiplos agentes coordenados com pipeline + quality gates. Resolve processo complexo.

### Squad-Creator (Craft)
Monolítico AIOX. 10 tasks. Foco em estrutura formal.

### Squad-Forge
Multi-agente Auroq. 5 fases. 3 agentes (chief/archaeologist/smith). Foco em extração profunda.

### squad-validator.js
Motor de validação estrutural (855 linhas, 94.5% coverage). Reuso direto pelo Moreh. VOL-04 seção 9.

### squad.yaml
Manifest obrigatório do squad. **NUNCA** usar config.yaml (deprecated). VOL-04 seção 2.

### STaR (Self-Taught Reasoner)
Zelikman et al. 2022. Bootstrapping de reasoning. Mantém rationales corretos, fine-tune. VOL-09 seção 11.

### State of Agent Engineering 2026
Survey LangChain (1.340 respostas). VOL-10 seção 13.

### STEP (PU-STEP)
Passo concreto executável. Um dos 8 tipos de PU. Estrutural vs operacional.

### SYNAPSE
Engine de injeção de contexto em 8 camadas (L0-L7). **Sistema nervoso invisível** do Auroq. VOL-08 seção 3.

---

## T

### TACIT (PU-TACIT)
Conhecimento não-articulado. **Mais valioso e mais difícil** de extrair. Um dos 8 tipos de PU.

### TALM (Tool Augmented Language Models)
Parisi et al. 2022. LM com API calls text-to-text. Text → tool → result → text. VOL-09 seção 18.

### Task (AIOX/Auroq)
Unidade atômica de trabalho. 8 campos obrigatórios (TASK-FORMAT-SPECIFICATION-V1). **Primária** na task-first architecture.

### TASK-FORMAT-SPECIFICATION-V1
Padrão obrigatório de tasks: task, responsavel, responsavel_type, atomic_layer, Entrada, Saida, Checklist, execution_type. VOL-04 seção 3.

### Task-First Architecture
Tasks são primárias, agentes são executores. **RC-03.** Convergência AIOX + Auroq.

### Test de 3 Segundos
Heurística do Danilo pra headline. Se não prende em 3s, reescrever. Exemplo de PU-TACIT.

### Theory of Constraints (TOC)
Goldratt. Encontrar o gargalo. Inspira Lente 7.

### Tier 1 / Tier 2 Agent
Hierarquia no squad.yaml. Orchestrator = Tier 0/coordenador. Tier 1 = executores primários. Tier 2 = sub-agentes.

### Tool Use
Um dos 3 componentes de agent system (Weng). External APIs, tools, actions. VOL-09 Parte 4.

### Toolformer
Schick et al. 2023. LM self-supervised pra tool use. 5 tools: calculator, Q&A, search, translation, calendar.

### Tree of Thoughts (ToT)
Yao et al. 2023. Árvore de possibilidades de raciocínio. BFS ou DFS. VOL-09 seção 4.

### Trigger (immune system)
Situação de risco que ativa resposta automática do agente. Extraído de PU-EXCEPTION.

### Trigger (memory save)
Um dos 6 momentos onde agente deve salvar memória. VOL-07 seção 4.

---

## U

### UserPromptSubmit
Hook do Claude Code. **Coração do sistema nervoso.** Injeta Constitution + rules antes do LLM responder. VOL-08 seção 2.

---

## V

### Value Equation
Framework Hormozi. Dream Outcome × Likelihood / (Time Delay × Effort).

### Virtual Filesystem
DB exposto como filesystem hierárquico. Pattern LangChain pra storage de memória.

### Voice DNA
Personalidade + vocabulário + frases-chave + anti-patterns de um agente. Parte da persona 6-níveis.

---

## W

### WAIVED
Veredicto de gate: failed mas expert aprovou override explícito. Registrado permanentemente.

### Weekly Review
Ciclo semanal de 20 min. Companion conduz. Cockpit + trackers + inbox + padrões + consolidação. **Obrigatório.**

### Weng, Lilian
OpenAI. Autoridade em prompt engineering + LLM agents. Fonte primária de VOL-09.

### Worker (executor type)
Automação determinística. Sem IA. Script, webhook, regra fixa.

### Workflow
Sequência de fases ordenada com quality gates. **Unidirecional (RC-04).**

---

## Y

### Yolo Mode
Bypass opcional de human-in-loop (LangChain). Não é default. Usuário ativa explicitamente.

---

## Z

### Zero-Shot Learning
Feed texto direto sem exemplos. VOL-09 seção 12.

### Zero Inference (RC-01)
Não preencher lacunas com suposições. PERGUNTAR. Inegociável.

---

## v1.1 — Termos Adicionados (2026-04-22)

> 28 termos novos do merge v1.1. Organizados alfabeticamente. Origem: re-análise squad-forge/squad-creator + ingestão das 5 refs externas (100M, Continuous Discovery, Elon/Clear, AI Vision, Hooked).

### Action (4º nível da hierarquia)
Ação atômica observável, duração ~30s. Nível mais baixo da hierarquia Role > Workflow > Task > Action. Executada DENTRO de uma task. Deve ser descrita em observable behavior. [`knowledge-refs/ai-vision.txt:6`]

### Assumption Testing Canvas
Artefato estruturado (assumption, tipo, confidence, risco, menor teste, status) pra validar hipóteses antes de construir. Complementa OST. RC-20 entrega ciclo contínuo. [`knowledge-refs/continuous.txt:431-487`]

### Backup Strategy (.backup/)
Padrão AIOX de snapshot automático `.backup/pre-{operation}-{timestamp}/` antes de operações destrutivas. Permite rollback local. Retention: últimos 5 por squad. [`squad-creator-migrate.md:80`]

### Bottleneck Task → Quality Gate
Pattern squad-forge. Constraint identificado (TOC em Lente 7) vira obrigatoriamente quality gate bloqueante no workflow final. Sem essa conversão, squad replica o gargalo. [`forge-smith.md:120`]

### Complexity Mode (simple/standard/complex)
Sistema squad-forge que adapta estratégia de extração baseado em escala do processo (5-15 PUs, 16-30, 31+). Afeta rounds, agentes convocados, tempo esperado. [`wf-squad-forge.yaml:285-300`]

### Confidence Score
Métrica 0.0-1.0 atribuída pelo archaeologist a cada PU. Threshold obrigatório >=0.7 (senão QG-SF-001 FAIL). Distribui incerteza rastreável. [`pu-classification.yaml:189`]

### Continuous Discovery
Abordagem de Torres: weekly touchpoints com customers, pelo trio que constrói o produto, com pesquisa pequena, em busca de outcome desejado. [`continuous.txt:132`]

### Dry-Run Pattern (--dry-run)
Padrão AIOX. Operações mutativas oferecem flag `--dry-run` que simula sem alterar filesystem + preview do diff + requer confirmação explícita pra execução real. [`squad-creator-migrate.md:32`]

### Dual Mapping (PU → Task + KB)
Pattern squad-forge. Cada PU-STEP alimenta simultaneamente 2 destinos: task (estrutura) + seção de KB (profundidade). Ignorar um = violação de RC-06. [`architect-squad.md:63`]

### Executor Hint / Executor Classification
4 tipos: agent (automação total), human (julgamento irredutível), hybrid (agent + human review), worker (delegação externa). Refinado em arquitetura. Se >50% hybrid = redesign. [`pu-classification.yaml:18`, `executor-mapping-guide.yaml`]

### Gap-Driven Round (RN)
Round N após R1/R2/R3 base, guiado por gaps detectados (faltam decisões em X, tacit em Y) — não por lentes fixas. Perguntas cirúrgicas, não assunções. [`forge-chief.md:154-166`]

### Grand Slam Offer
Hormozi: "Make people an offer so good they would feel stupid saying no". Oferta incomparável que combina Value Equation (4 drivers) + scarcity/urgency/bonuses/guarantees. Aplicado ao squad: squad deve ser Grand Slam, não commodity. [`100M.txt:104, 196`]

### Greenfield Detection
Padrão AIOX. Moreh detecta upfront estado do projeto (git, infra Auroq, docs). Comportamento adapta: projeto sem nada → oferecer `*environment-bootstrap`. [`squad-creator.md:24-25`]

### Handoff Artifact (YAML compacto)
Estrutura YAML ~379 tokens com from/to/context/decisions/instruction/next_action passada entre agentes no switch. Substitui carga de persona completa. Reduz contexto 33-57% em switches. [`forge-chief.md:207-234`]

### Hook Model
Eyal. 4-phase framework: Trigger (external/internal) → Action → Variable Reward → Investment. Design pra habit formation. Aplicado a adoção de squad. [`hooked.txt:74-124`]

### Investment (Hook Model)
Última fase do loop. User deposita algo no produto (data, config, esforço) que melhora a próxima volta do hook. Aumenta ties + switching cost. [`hooked.txt:99-102`]

### Market Validation Checklist
4 indicadores (Hormozi): dor massiva, poder de compra, fácil de alcançar, crescente. Hierarquia: Starving Crowd > Offer Strength > Persuasion Skills. Rodar ANTES de extract-process. [`100M.txt:251-276`]

### MAT (Motivation + Ability + Trigger)
BJ Fogg, citado por Eyal. Comportamento acontece quando M + A + T presentes juntos em grau suficiente. Se um falta, ação não rola. [`hooked.txt:399`]

### Niche Lock
Hormozi. Período mínimo de estabilidade arquitetural (10 iterações OR 4 semanas) antes de considerar mudanças grandes. Anti-pivot prematuro. 3 sinais legítimos pra quebrar cedo. [`100M.txt:277-301`]

### Observable Behavior
Hormozi AI Vision. Actions precisam ser descritas em comportamento observável, não abstração. "Seja carismático" não é action. "Levante tom, acene ao outro falar" é. [`ai-vision.txt:58`]

### Opportunity-Solution Tree (OST)
Torres. Estrutura visual Outcome → Opportunities → Solutions → Assumption Tests. Resolve tensão business needs × customer needs. Força "compare and contrast" vs "whether or not". [`continuous.txt:170-260`]

### Playback Artifact
Template estruturado (narrativa + decisões + exceções + gaps + approval matrix signed). Materialização de RC-10 + RC-15. Barreira anti prompt-injection. Sem signed artifact, QG-SF-002 FAIL. [VOL-06 Appendix]

### Product Trio (Torres)
Product Manager + Designer + Software Engineer colaborando continuamente desde ideação até operação. Generalizado pra Moreh como Executor + Validator + Researcher. [`continuous.txt:110, 119`]

### Role (1º nível da hierarquia)
Abstração organizacional, papel humano conceitual (e.g., "Editor"). Nível mais alto da hierarquia Role > Workflow > Task > Action. Contextual, não executável. [`ai-vision.txt:2-10`]

### Skill Markdown (estágio 2)
Markdown + prompt + exemplos testados. Estágio intermediário entre SOP bruto (estágio 1) e agent include (estágio 3). Não se pula estágio (RC-22). [`ai-vision.txt:200-202`]

### State Persistence (.state.json)
Padrão squad-forge. Pipeline mantém estado em JSON (current_phase, metrics, gates passed, timestamps). Permite `*pause` + `*resume` entre sessões. Sobrevive autocompact. [`forge-chief.md:69-89`]

### Story-Based Interviewing
Torres. Técnica: trocar "como você faz X?" por "me conta a última vez que fez X". Memória específica revela variáveis que pergunta idealizada esconde. [`continuous.txt:430-487`]

### Story Traceability (SQS-XX)
Padrão AIOX. Cada componente (task/agent/workflow) carrega linkagem a story IDs (SQS-N). Conecta evolução a contexto de decisão. Facilita debug histórico. [`squad-creator-extend.md:33`]

### Stress Test (5-Step Musk)
Protocolo sequencial (Question → Delete → Simplify → Accelerate → Automate). Não pular etapa. Meta de deleção >=10%. Usado como quality gate intermediário no Moreh (SF-001.5). [`elon.txt:87-129`]

### Trigger (external vs internal — Eyal)
External: embedded no ambiente (paid/earned/relationship/owned). Internal: emoção (especialmente negativa) que produto alivia. Goal: mover user de external pra internal. [`hooked.txt:86, 319`]

### Value Equation
Hormozi. `[(Dream Outcome × Likelihood) - Effort] / Price`. Quantifica valor percebido. Aplicado como critério de design de squad. [`100M.txt:385-390`]

### Variable Reward
Eyal. Reward não-previsível cria craving (dopamina). Diferencia Hook Model de feedback loop vanilla. 4 schedules: FR / VR / FI / VI. [`hooked.txt:94-102`]

### Workflow (2º nível da hierarquia)
SOP completo, ~30 min. Agrupa Tasks pra um outcome. Nível entre Role e Task. Contextual, organiza escopo. [`ai-vision.txt:6`]
