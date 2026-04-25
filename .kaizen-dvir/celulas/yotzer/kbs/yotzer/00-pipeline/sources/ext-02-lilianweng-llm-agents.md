# LLM Powered Autonomous Agents — Lilian Weng

**Fonte:** https://lilianweng.github.io/posts/2023-06-23-agent/
**Autora:** Lilian Weng
**Data:** 23/06/2023
**Tipo:** Blog post técnico
**Reading time:** 31 min

---

## Introdução

Construir agentes com LLMs como controladores centrais é paradigma convincente. Proofs-of-concept: AutoGPT, GPT-Engineer, BabyAGI. Capacidade vai além de geração de texto — rumo a problem-solving geral.

---

## Agent System Overview

Num sistema LLM-powered autonomous agent, o modelo de linguagem funciona como **cérebro do agente**, suportado por componentes-chave:

### Planning
- **Subgoal and decomposition:** agentes quebram tarefas complexas em subgoals manejáveis
- **Reflection and refinement:** auto-crítica permite aprender com erros e melhorar passos futuros

### Memory
- **Short-term memory:** in-context learning usando a janela finita do modelo
- **Long-term memory:** vector stores externos pra retenção e recuperação de info extensa

### Tool Use
- Agentes chamam APIs externas pra acessar info faltante além dos pesos
- Permite info atualizada, execução de código, integração com dados proprietários

---

## Component One: Planning

Tarefas complexas envolvem múltiplos passos sequenciais. Agentes precisam identificar esses passos e planejar.

### Task Decomposition

#### Chain of Thought (CoT)

Padrão pra melhorar performance em tarefas complexas. Instrui o modelo a "think step by step", usa test-time compute pra decompor problema difícil em componentes mais simples.

- Transforma tarefas grandes em subtarefas manejáveis
- Oferece interpretabilidade do processo de raciocínio
- Referência: Wei et al. 2022

#### Tree of Thoughts

(Yao et al. 2023) estende CoT explorando múltiplas possibilidades:
- Decompõe em múltiplos thought steps
- Gera múltiplos pensamentos por passo (árvore)
- BFS ou DFS
- Avalia estados via classifiers ou majority voting

#### Task Decomposition Methods

1. **LLM com simple prompting:** `"Steps for XYZ.\n1."` ou `"What are the subgoals for achieving XYZ?"`
2. **Task-specific instructions:** `"Write a story outline."`
3. **Human inputs:** orientação humana direta

#### LLM+P Approach

(Liu et al. 2023) usa planners clássicos externos pra planejamento de horizonte longo:
- PDDL (Planning Domain Definition Language) como interface intermediária
- Processo: (1) LLM traduz problema pra Problem PDDL, (2) planner clássico gera plano do Domain PDDL, (3) plano traduz de volta pra linguagem natural
- Outsource planning pra ferramentas especializadas
- Mais prático em domínios robóticos com PDDL definido

### Self-Reflection

Permite melhoria iterativa através do refinamento de decisões passadas e correção de erros.

#### ReAct Framework

(Yao et al. 2023) integra reasoning e acting estendendo o action space pra combinar:
- Ações discretas task-specific (permitem interagir com environment)
- Espaço de linguagem (gera reasoning traces em natural language)

**Template:**
```
Thought: ...
Action: ...
Observation: ...
(Repeated many times)
```

Performance: ReAct supera Act-only em knowledge-intensive (HotpotQA, FEVER) e decision-making (AlfWorld, WebShop).

#### Reflexion Framework

(Shinn & Labash 2023) equipa agentes com dynamic memory e self-reflection:
- RL setup com binary reward model
- Action space aumenta ações task-specific com linguagem
- Agente computa heurística após cada ação
- Pode decidir resetar environment pra nova trial baseado em self-reflection

**Heurística identifica:**
- Planejamento ineficiente (trajetórias longas sem sucesso)
- Alucinação (sequências de ações idênticas com observações idênticas)

Self-reflection criado via two-shot examples mostrando trajetórias falhas com guidance ideal. Até 3 reflexões na working memory.

#### Chain of Hindsight (CoH)

(Liu et al. 2023) encoraja self-improvement apresentando sequências de outputs passados com feedback:
- Dataset: human feedback com ratings e hindsight annotations
- Processo: supervised fine-tuning com sequências ordenadas por reward
- Modelo treinado a prever output de maior qualidade condicionado na sequência de feedback
- Previne overfitting via regularização e token masking
- Training data combina WebGPT comparisons, summarization feedback, preference datasets

#### Algorithm Distillation

(AD; Laskin et al. 2023) aplica princípios de CoH a trajetórias RL cross-episode:
- Encapsula algoritmo em history-conditioned policy longa
- Concatena learning history entre episódios
- Próxima ação prevista deve superar trial anterior
- Aprende o processo RL, não policy task-specific

**Requisitos:**
- Episódios curtos o suficiente pra multi-episode history
- 2-4 episode contexts pra near-optimal in-context RL
- Context window longo

AD aproxima RL² usando offline RL, aprende mais rápido que alternativas.

---

## Component Two: Memory

Processos de adquirir, armazenar, reter e recuperar informação.

### Types of Memory

#### Categorias do cérebro humano

1. **Sensory Memory:** impressões de input sensorial (visual, auditivo), segundos
   - Iconic (visual), Echoic (auditivo), Haptic (tato)
2. **Short-Term / Working Memory:**
   - ~7 itens (Miller 1956), 20-30 segundos
3. **Long-Term Memory:**
   - Dias a décadas, capacidade essencialmente ilimitada
   - **Explicit/declarative:** fatos e eventos conscientes
     - Episodic: eventos e experiências
     - Semantic: fatos e conceitos
   - **Implicit/procedural:** skills inconscientes (andar de bike, digitar)

#### Mapeamento pra Agent Memory

- **Sensory memory** → embedding representations de raw inputs (text, images, modalities)
- **Short-term memory** → in-context learning limitado pela context window
- **Long-term memory** → vector stores externos com recuperação rápida

### Maximum Inner Product Search (MIPS)

Memória externa alivia a limitação finita de atenção. Padrão: armazenar embeddings em vector DBs com MIPS rápido. ANN (Approximate Nearest Neighbors) sacrifica um pouco de acurácia por ganho substancial de velocidade.

#### Algoritmos ANN comuns

**LSH (Locality-Sensitive Hashing):**
- Hashing functions mapeiam itens similares no mesmo bucket
- Contagem de buckets << contagem de inputs

**ANNOY (Approximate Nearest Neighbors Oh Yeah):**
- Estrutura: random projection trees (binárias)
- Non-leaf nodes são hiperplanos
- Leaves guardam data points
- Busca: atravessar halves mais próximos em todas as árvores

**HNSW (Hierarchical Navigable Small World):**
- Inspirado em small-world networks (seis graus de separação)
- Camadas hierárquicas
- Bottom layer: data points reais
- Middle layers: shortcuts de busca
- Start: random top-layer node, navega até target, desce camadas

**FAISS (Facebook AI Similarity Search):**
- Assume distâncias high-dim seguem Gaussian
- Vector quantization + refinement dentro de clusters

**ScaNN (Scalable Nearest Neighbors):**
- Anisotropic vector quantization
- Quantiza pra maximizar similaridade inner-product original
- Melhora sobre selecionar closest centroids

Métrica: recall@10 entre implementações.

---

## Component Three: Tool Use

Capacidade humana distintiva — criar, modificar e usar objetos externos além dos limites físicos/cognitivos. Equipando LLMs com ferramentas externas estende dramaticamente suas capacidades.

### MRKL Systems

(Modular Reasoning, Knowledge and Language; Karpas et al. 2022): arquitetura neuro-simbólica pra autonomous agents:
- Coleção de módulos expert
- LLM general-purpose age como router
- Módulos podem ser neurais (deep learning) ou simbólicos (calculadoras, weather APIs)

**Experimento fine-tuning:** LLMs tiveram dificuldade em extrair args corretos pra aritmética básica — importância de saber **quando** e **como** usar ferramentas.

### TALM e Toolformer

**TALM** (Parisi et al. 2022) e **Toolformer** (Schick et al. 2023) fine-tunam LMs pra usar APIs externas:
- Expansão de dataset baseada em se anotações de API call melhoram output
- Modelos aprendem invocação via training em exemplos curados

### ChatGPT e Function Calling

ChatGPT Plugins e OpenAI API function calling — implementação prática:
- APIs providas por devs (Plugins) ou self-defined (function calls)

### HuggingGPT

(Shen et al. 2023) usa ChatGPT como task planner selecionando modelos do HuggingFace.

**4 estágios:**

**1. Task Planning:** LLM parseia user request em múltiplas tarefas:
- Task type, ID, dependencies, args (text, image, audio, video)

```
The AI assistant parses user input to several tasks:
[{"task": task, "id": task_id, "dep": dependency_task_ids,
"args": {"text": text, "image": URL, "audio": URL, "video": URL}}]
```

**2. Model Selection:** LLM distribui tasks pra modelos expert (multiple-choice question com model list, filtered por task type).

**3. Task Execution:** modelos expert executam e logam.

**4. Response Generation:** LLM recebe resultados e entrega summary.

**Desafios:** eficiência (múltiplas inferências), context length, estabilidade.

### API-Bank Benchmark

(Li et al. 2023) avalia performance tool-augmented:
- 53 APIs comuns
- Workflow completo
- 264 diálogos anotados, 568 API calls
- Search engines, calendars, smart home, health, auth

**LLM workflow:** primeiro acessa API search engine → usa documentação pra function call.

**Pontos de decisão:**
1. Chamar API?
2. Identificar API correta (iterativo)
3. Responder baseado em resultados (refinar se insatisfatório)

**Níveis de avaliação:**
- Level-1: call API dado description
- Level-2: retrieve API via search, aprender da doc
- Level-3: plan usage além de retrieval/calling

---

## Case Studies

### Scientific Discovery Agent

#### ChemCrow

(Bran et al. 2023) LLM + 13 ferramentas expert pra:
- Organic synthesis, drug discovery, materials design

**Workflow** (LangChain, reflete ReAct + MRKL):
- LLM recebe tool names, utility descriptions, input/output details
- Instruído a responder usando tools quando necessário
- Formato ReAct: Thought, Action, Action Input, Observation

**Finding:** human experts mostraram ChemCrow substancialmente superior a GPT-4 em correctness química, mas avaliações LLM-based mostraram equivalência — **limites de avaliação LLM em domínios especializados**.

#### Autonomous Scientific Experimentation

Boiko et al. (2023): agentes LLM pra descoberta científica autônoma
- Design, planning, performance de experimentos complexos
- Tools: internet, documentação, código, APIs robóticas, outras LLMs

**Task exemplo:** "Develop a novel anticancer drug"

**Risk assessment (armas químicas):**
- 4 de 11 (36%) geraram soluções de síntese com tentativas
- 7 de 11 rejeitados (5 após web search, 2 baseado só em prompt)

### Generative Agents Simulation

(Park et al. 2023) simula 25 agentes LLM vivendo e interagindo em sandbox estilo The Sims.

Combina LLM com **memory, planning, reflection** pra comportamento condicionado em experiência passada e interação.

#### Memory Stream
Long-term memory module gravando experiência em natural language:
- Cada elemento = observation
- Comunicação inter-agent trigger novos statements

#### Retrieval Model
Surfa contexto via:
- **Recency:** eventos recentes mais alto
- **Importance:** distingue mundano de core (via LLM query)
- **Relevance:** relação com situação/query atual

#### Reflection Mechanism
Sintetiza memórias em inferências de nível mais alto:
- Summaries de eventos passados
- Prompt LLM com 100 observações mais recentes
- Gera 3 perguntas high-level salientes
- LLM responde

#### Planning and Reacting
Traduz reflections e environment em ações:
- Otimiza believability no momento vs ao longo do tempo
- Considera relações e observações

**Emergent behaviors:** information diffusion, relationship memory, coordenação de eventos sociais.

### Proof-of-Concept Examples

#### AutoGPT

LLM como main controller. Reliability issues por natural language interface, mas compelling POC.

**System Message (template):**
```
You are {{ai-name}}, {{ai-bot-description}}.
Your decisions must be made independently without user assistance.

GOALS:
1. {{user-provided goal 1}}
2. {{user-provided goal 2}}

CONSTRAINTS:
1. ~4000 word limit for short-term memory
2. Save important information to files
3. No user assistance
4. Exclusively use listed commands
5. Use subprocesses for long-running commands

COMMANDS:
1. Google Search: "google", args: "input": "<search>"
2. Browse Website: "browse_website", args: "url": "<url>",
   "question": "<what_to_find>"
[... 20 total commands ...]

RESOURCES:
1. Internet access
2. Long-term memory management
3. GPT-3.5 powered agent delegation
4. File output

PERFORMANCE EVALUATION:
1. Continuously review and analyze actions
2. Constructively self-criticize
3. Reflect on decisions
4. Optimize for efficiency

RESPONSE FORMAT:
JSON with "thoughts" (text, reasoning, plan, criticism, speak)
and "command" (name, args)
```

#### GPT-Engineer

Cria repositórios de código a partir de spec natural. Instrui modelo a pensar em componentes menores e pedir clarificação.

**Clarification mode:**
```
System: Summarize clarification areas, then ask one clarifying question
User: "A Super Mario game in Python with MVC components and keyboard control"
Assistant: Summarizes 3 clarification areas, asks about game specifics
User: Details gameplay and objectives
Assistant: Asks about MVC file split
User: "Make assumptions and state them explicitly"
```

**Code writing mode:**
- Write long answers with complete architecture
- Core classes, functions, methods with purposes
- Strict markdown code blocks
- Start at entrypoint, proceed to imports
- Fully functional, no placeholders
- Language best practices
- Dependency files (requirements.txt, package.json)
- Verify architecture completeness

Python toolbelt: pytest, dataclasses

---

## Challenges

### Finite Context Length
Restrição limita:
- Info histórica
- Instruções detalhadas
- API call context

Self-reflection e learning beneficiariam de contexto longo/infinito. Vector stores expandem knowledge, mas representação < full attention.

### Long-term Planning and Task Decomposition
- Planning de histórico longo difícil
- Exploração de solution space
- Ajuste pra erros inesperados
- Menos robusto que trial-and-error humano

### Natural Language Interface Reliability
- Output reliability questionável (erros de formatação)
- Comportamento rebelde (refusing instructions)
- Muito código em parsing
- Estabilidade requer engineering substancial

---

## Citação

> Weng, Lilian. (Jun 2023). "LLM-powered Autonomous Agents". Lil'Log. https://lilianweng.github.io/posts/2023-06-23-agent/

## References

1. Wei et al. "Chain of thought prompting elicits reasoning in large language models." NeurIPS 2022
2. Yao et al. "Tree of Thoughts." arXiv:2305.10601 (2023)
3. Liu et al. "Chain of Hindsight Aligns Language Models with Feedback." arXiv:2302.02676 (2023)
4. Liu et al. "LLM+P." arXiv:2304.11477 (2023)
5. Yao et al. "ReAct." ICLR 2023
6. Google Blog. "Announcing ScaNN." (Jul 2020)
7. Shinn & Labash. "Reflexion." arXiv:2303.11366 (2023)
8. Laskin et al. "In-context Reinforcement Learning with Algorithm Distillation." ICLR 2023
9. Karpas et al. "MRKL Systems." arXiv:2205.00445 (2022)
10. Nakano et al. "WebGPT." arXiv:2112.09332 (2021)
11. Parisi et al. "TALM." arXiv:2205.12255
12. Schick et al. "Toolformer." arXiv:2302.04761 (2023)
13. Weaviate Blog. "Why is Vector Search so fast?" (Sep 2022)
14. Li et al. "API-Bank." arXiv:2304.08244 (2023)
15. Shen et al. "HuggingGPT." arXiv:2303.17580 (2023)
16. Bran et al. "ChemCrow." arXiv:2304.05376 (2023)
17. Boiko et al. "Emergent autonomous scientific research capabilities of LLMs." arXiv:2304.05332 (2023)
18. Park et al. "Generative Agents." arXiv:2304.03442 (2023)
19. AutoGPT. https://github.com/Significant-Gravitas/Auto-GPT
20. GPT-Engineer. https://github.com/AntonOsika/gpt-engineer

## Tags
NLP, Language-Model, Agent, Steerability, Prompting
