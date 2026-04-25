# VOL-09 — Padrões de IA (Reasoning + Prompting + Tool Use)

> **KB:** KaiZen | **Consumer:** Moreh
> **Domínio:** D9 — Padrões de IA
> **Fontes primárias:** `ext-01-lilianweng-prompt-engineering`, `ext-02-lilianweng-llm-agents`, CLAUDE.md mcp-usage rule
> **Regras cardinais principais:** RC-09

---

## 1. O Que Este Volume Ensina

Volume técnico denso. Consolida research externo (Weng, LangChain, academic papers) sobre padrões que Moreh deve conhecer pra construir squads competentes.

Três macro-áreas:

1. **Reasoning patterns** — como agentes pensam (CoT, ToT, ReAct, Reflexion, CoH, AD, STaR)
2. **Prompting patterns** — como comunicar com LLMs (zero/few-shot, instruction, self-consistency, APE)
3. **Tool use patterns** — como agentes agem no mundo (MRKL, Toolformer, HuggingGPT, API-Bank, MCP)

Plus: padrões de retrieval, code-augmented generation, governance de tools.

---

## 2. Agent System Architecture (Weng)

Base pra tudo que vem. LLM agent = **brain + 3 components**.

```
┌─────────────────────────────────────┐
│             LLM (brain)              │
└────┬──────────────┬───────────────┬──┘
     │              │               │
┌────▼────┐   ┌────▼─────┐   ┌────▼────┐
│PLANNING │   │  MEMORY   │   │TOOL USE │
└─────────┘   └───────────┘   └─────────┘
```

| Component | Subcomponents |
|-----------|---------------|
| **Planning** | Task decomposition + Self-reflection |
| **Memory** | Short-term (context window) + Long-term (vector store) — ver VOL-07 |
| **Tool Use** | External APIs, tools, actions |

Moreh entende isso e projeta squads que materializam os 3 componentes.

---

# PARTE 1 — PLANNING PATTERNS

---

## 3. Chain of Thought (CoT) — Wei et al. 2022

Pattern fundacional. Modelo gera sequência de raciocínio antes da resposta final.

### 3.1 Por que funciona

- Test-time computation → decompõe problema difícil em simples
- Interpretabilidade do processo de raciocínio
- Benefício maior em modelos grandes (>50B params)
- Melhoria mínima em tarefas simples — mais pronunciado em raciocínio complexo

### 3.2 Tipos

#### Zero-Shot CoT (Kojima et al. 2022)

Prompt natural:
```
Question: {pergunta}
Answer: Let's think step by step.
```

Alternativa (Zhou et al. 2022):
```
Let's work this out step by step to be sure we have the right answer.
```

#### Few-Shot CoT

Inclui demonstrações de reasoning chains antes da pergunta.

```
Question: Tom and Elizabeth have a competition...
Answer: It takes Tom 30*4 = 120 minutes to climb the hill.
It takes Tom 120/60 = 2 hours to climb the hill.
So the answer is 2.
===
Question: {nova pergunta}
Answer:
```

### 3.3 Variações avançadas

**Complexity-Based Prompting** (Fu et al. 2023):
- Demonstrações com maior complexidade → melhor performance
- Medir complexidade pelo número de passos de raciocínio
- Usar separadores `\n` (melhor que "step i", ".", ";")

**Mixed Complexity Observation** (Shum et al. 2023):
- CoT só com exemplos complexos melhora questões complexas mas piora em simples (GSM8k)

**Formatting** (Fu et al. 2023):
- Trocar "Q:" por "Question:" ajuda

### 3.4 Limitações

**Explanation Reliability** (Ye & Durrett 2022):
- Benefício de incluir explicações é "pequeno a moderado" em NLP com raciocínio
- Explicações não-factuais → predições incorretas

### 3.5 Aplicação em Moreh

Em agentes que fazem análise complexa (strategist, researcher, architect), incluir CoT prompting no system prompt. Agentes simples (workers) não precisam.

---

## 4. Tree of Thoughts (ToT) — Yao et al. 2023

Extensão de CoT. Explora **múltiplas possibilidades de raciocínio** a cada passo.

### 4.1 Funcionamento

- Decompõe problema em múltiplos thought steps
- Gera múltiplos pensamentos por passo
- Forma árvore de possibilidades
- Busca: **BFS** (breadth-first) ou **DFS** (depth-first)
- Avaliação: classifier (prompt-based) ou majority vote

### 4.2 Quando usar

- Problemas com múltiplas soluções viáveis
- Quando "first answer" tende a ser subótimo
- Tarefas que se beneficiam de exploração (planning, design)

### 4.3 Trade-off

Mais tokens (exploração custa). Usar quando qualidade > velocidade. [RC-07]

### 4.4 Aplicação Moreh

Em fases críticas (arquitetura, design de agentes), agente usa ToT internamente: gera 3 arquiteturas possíveis, avalia, escolhe. Custo justificável.

---

## 5. LLM+P — Liu et al. 2023

Outsource planning pra **classical planners externos**. Usa PDDL (Planning Domain Definition Language) como interface.

### 5.1 Processo

```
1. LLM traduz problema → Problem PDDL
2. Classical planner gera plano do Domain PDDL
3. Plano traduz de volta pra natural language
```

### 5.2 Quando usar

- Planejamento de horizonte longo
- Domínios robóticos com PDDL estabelecido
- Quando LLM sozinho falha em planos longos

### 5.3 Limitação

Requer PDDL definido. Dificilmente aplicável em domínios sem formalização prévia.

### 5.4 Aplicação Moreh

Limitada no MVP. Relevante se squads do expert forem integrados a sistemas robóticos ou de orquestração formal.

---

## 6. Task Decomposition Methods (Weng)

Três approaches:

### 6.1 LLM com simple prompting

```
"Steps for XYZ.\n1."
"What are the subgoals for achieving XYZ?"
```

### 6.2 Task-specific instructions

```
"Write a story outline."  (pra novel writing)
```

### 6.3 Human inputs

Orientação humana direta. Sempre válido. [RC-15]

### 6.4 Aplicação Moreh

Moreh mesmo faz task decomposition quando recebe processo do expert. Combina (1) e (3) — extraí com LLM, valida com human.

---

# PARTE 2 — SELF-REFLECTION PATTERNS

---

## 7. ReAct (Reason + Act) — Yao et al. 2023

Integra reasoning e acting. Alterna entre Thought → Action → Observation.

### 7.1 Template

```
Thought: ...
Action: ...
Observation: ...
(Repeated many times)
```

### 7.2 Action space

- Ações discretas task-specific (interagir com environment)
- Espaço de linguagem (gerar reasoning traces)

### 7.3 Performance

ReAct supera Act-only em:
- Knowledge-intensive tasks (HotpotQA, FEVER)
- Decision-making tasks (AlfWorld, WebShop)

### 7.4 Por que funciona

LLM pensa antes de agir. Ação não é reflex, é justificada. Observação alimenta próximo thought.

### 7.5 Aplicação Moreh

**Padrão base pra tool use.** Qualquer agente de Moreh que usa ferramentas deve seguir ReAct. Por exemplo, o process-archaeologist:

```
Thought: Usuário disse "depende" no passo 5. Preciso aplicar 5 Whys.
Action: Perguntar "Depende de quê exatamente?"
Observation: "Depende do ticket do cliente."
Thought: Tenho o primeiro why. Vou pro segundo.
Action: "E o que determina esse ticket?"
...
```

---

## 8. Reflexion — Shinn & Labash 2023

Agente com **dynamic memory + self-reflection**. Aprende com trial-and-error.

### 8.1 Setup

- RL standard com binary reward model
- Action space aumenta task-specific actions com linguagem
- Agente computa heurística após cada ação
- Pode decidir **resetar environment** pra nova trial baseado em self-reflection

### 8.2 Heurística identifica

| Problema | O que é |
|----------|---------|
| **Inefficient planning** | Trajetórias longas sem sucesso |
| **Hallucination** | Sequências de ações idênticas com observações idênticas |

### 8.3 Self-reflection generation

Two-shot examples mostrando trajetórias falhas com guidance ideal. Agente aprende a refletir por exemplo.

### 8.4 Working memory

Até 3 reflexões armazenadas. Contexto pras próximas tentativas.

### 8.5 Aplicação Moreh

Quando squad falha em produção (não atinge goal), aplicar Reflexion:
1. Analisar trajetória falha
2. Gerar reflexão (what went wrong)
3. Armazenar em MEMORY.md do agente
4. Próxima execução carrega reflexão
5. Iterar até sucesso

---

## 9. Chain of Hindsight (CoH) — Liu et al. 2023

Encoraja self-improvement apresentando sequências de outputs passados **com feedback**.

### 9.1 Dataset

Human feedback em completions do modelo:
- Ratings
- Hindsight annotations

### 9.2 Training

- Supervised fine-tuning com sequências ordenadas por reward
- Modelo treinado a prever output de maior qualidade condicionado em feedback sequence
- Regularização + token masking pra prevenir overfitting

### 9.3 Data sources típicas

- WebGPT comparisons
- Summarization feedback
- Preference datasets

### 9.4 Aplicação Moreh

Versioning de squads:
- Squad v1 produz output → cliente dá feedback
- Squad v1 com feedback → squad v2 melhora
- Aprendizado acumulado via CoH

---

## 10. Algorithm Distillation (AD) — Laskin et al. 2023

Aplica princípios de CoH a **trajetórias RL cross-episode**.

### 10.1 Funcionamento

- Encapsula algoritmo em long history-conditioned policy
- Concatena learning history entre episódios
- Próxima ação prevista **deve superar trial anterior**
- **Aprende o processo RL**, não policy task-specific

### 10.2 Requisitos

- Episódios curtos o suficiente pra multi-episode history
- 2-4 episode contexts pra near-optimal in-context RL
- Context window longo

### 10.3 Aplicação

AD aproxima RL² usando offline RL, aprende mais rápido que alternativas.

### 10.4 Moreh

Avançado. Não necessário MVP.

---

## 11. STaR — Self-Taught Reasoner (Zelikman et al. 2022)

Padrão de bootstrapping de reasoning.

### 11.1 Processo

```
1. Gerar cadeias de raciocínio; manter só as que levam a resposta correta
2. Fine-tune modelo com os rationales gerados
3. Repetir até convergência
```

### 11.2 Nota técnica

Temperaturas altas geram mais rationales incorretos com respostas corretas. Pra dados não-anotados, usar majority votes como "correto".

### 11.3 Aplicação

Avançada. Relevante se Moreh pretende fine-tune modelos (não no MVP).

---

# PARTE 3 — PROMPTING PATTERNS

---

## 12. Zero-Shot Learning

Feed texto da tarefa direto, sem exemplos.

```
Text: i'll bet the video game is a lot more fun than the film.
Sentiment:
```

**Quando usar:** tasks simples, modelo treinado bem no domínio, escala.

---

## 13. Few-Shot Learning

Apresenta set de demonstrações antes da tarefa.

```
Text: {exemplo 1}
Sentiment: positive

Text: {exemplo 2}
Sentiment: negative

Text: {input real}
Sentiment:
```

### 13.1 Trade-off

| Pro | Con |
|-----|-----|
| Melhor que zero-shot | Custa mais tokens |
| Explicita formato | Pode bater context length |

### 13.2 Vieses identificados (Zhao et al. 2021)

1. **Majority label bias** — distribuição desbalanceada nos exemplos
2. **Recency bias** — repetir labels do final
3. **Common token bias** — preferir tokens comuns vs raros

**Solução:** calibrar probabilidades pra uniform quando input é `N/A`.

### 13.3 Tips pra seleção de exemplos

#### k-NN Clustering (Liu et al. 2021)
Selecionar semanticamente similares via embeddings.

#### Graph-Based Diversity (Su et al. 2022)
1. Grafo dirigido de similaridades cosseno
2. Cada nó aponta pros k vizinhos próximos
3. Score `s(v) = ρ^(-|neighbors_in_L|)` encoraja diversidade

#### Contrastive Learning (Rubin et al. 2022)
Embeddings específicos dos datasets. `score(e_i) = P_LM(y | e_i, x)`.

#### Q-Learning (Zhang et al. 2022)
Aplicar Q-learning na seleção.

#### Uncertainty-Based Active Learning (Diao et al. 2023)
Identificar exemplos com alta divergência/entropia, anotar pra few-shot.

### 13.4 Tips de ordenação

- Seleções diversas em ordem aleatória evitam vieses
- Tamanho do modelo ou count de exemplos **não** reduz variância entre permutações
- Mesma ordem funciona num modelo, mal em outro
- Com validation set limitado: escolher ordem que previna predições extremamente desbalanceadas

---

## 14. Instruction Prompting

Ao invés de demonstrações, **instrução direta**. InstructGPT-style.

### 14.1 Boas práticas

**Seja específico:**
```
Please label the sentiment towards the movie of the given movie review.
The sentiment label should be "positive" or "negative".
Text: ...
Sentiment:
```

**Especifique contexto/audiência:**
- "Describe what is quantum physics to a 6-year-old."
- "... in language that is safe for work."

### 14.2 In-Context Instruction Learning (Ye et al. 2023)

Combina few-shot + instruction em múltiplas tarefas:

```
Definition: Determine the speaker of the dialogue, "agent" or "customer".
Input: I have successfully booked your tickets.
Output: agent

Definition: Determine which category the question asks for, "Quantity" or "Location".
Input: What's the oldest building in US?
Output: Location

Definition: Classify the sentiment of the given movie review, "positive" or "negative".
Input: {input}
Output:
```

### 14.3 RLHF context

Instruction-following models (InstructGPT, etc.) são fine-tuned via RLHF. Reduz custo de comunicação vs few-shot.

---

## 15. Self-Consistency Sampling (Wang et al. 2022)

Amostrar múltiplos outputs com temperatura > 0 e selecionar melhor candidato.

### 15.1 Critérios de seleção

| Tarefa | Seleção |
|--------|---------|
| Geral | Majority voting |
| Verificável (programação) | Interpretador + unit tests |

### 15.2 Combinado com CoT

**Self-Consistency + CoT:** amostrar múltiplas respostas diversas, majority vote. Aumenta accuracy de reasoning.

### 15.3 Aplicação Moreh

Em decisões críticas (ex: classificação de executor pra PU), amostrar 3-5 vezes e majority vote. Aumenta robustez.

---

## 16. Automatic Prompt Design

Prompts são sequências de prefix tokens. Podem ser otimizados no embedding space.

### 16.1 Algorithms

- **AutoPrompt** (Shin et al. 2020) — gradient descent no embedding
- **Prefix-Tuning** (Li & Liang 2021) — prefix tokens treináveis
- **P-tuning** (Liu et al. 2021) — soft prompts
- **Prompt-Tuning** (Lester et al. 2021) — full prompt tuning

### 16.2 APE — Automatic Prompt Engineer (Zhou et al. 2022)

Busca sobre instruções geradas por modelo. Score function filtra.

**Processo:**
1. Gerar candidatos via prompt `{{Given desired input-output pairs}}\n\nThe instruction is`
2. Achar ρ maximizando `ρ* = arg max_ρ E_(x,y) ∈ D_train [f(ρ, x, y)]`
3. Monte Carlo search propondo variantes semânticas

### 16.3 Automatic CoT Construction (Shum et al. 2023)

3 passos:
1. **Augment:** gerar pseudo-cadeias via few-shot ou zero-shot CoT
2. **Prune:** remover cadeias com respostas incorretas
3. **Select:** variance-reduced policy gradient

### 16.4 Clustering-Based Selection (Zhang et al. 2023)

1. Embed questões + k-means
2. Selecionar representativos (mais próximos do centroide)
3. Zero-shot CoT pra gerar reasoning chains

### 16.5 Aplicação Moreh

MVP não precisa. Relevante se Moreh evoluir pra otimização automática de prompts baseada em feedback real.

---

# PARTE 4 — TOOL USE PATTERNS

---

## 17. MRKL Systems (Karpas et al. 2022)

**M**odular **R**easoning, **K**nowledge and **L**anguage. Arquitetura neuro-simbólica.

### 17.1 Estrutura

- Coleção de módulos expert
- LLM general-purpose age como **router** pra módulos
- Módulos podem ser **neurais** (deep learning) ou **simbólicos** (calculadoras, weather APIs)

### 17.2 Finding relevante

Fine-tuning experiments mostraram LLMs struggle em extrair args corretos pra aritmética básica. Importância de **saber quando e como usar ferramentas**.

### 17.3 Aplicação Moreh

Pattern base pra qualquer squad multi-tool. Moreh cria router (chief) que decide qual tool invocar baseado em query.

---

## 18. TALM e Toolformer

**TALM** (Tool Augmented Language Models; Parisi et al. 2022):
- LM com API calls text-to-text
- Generate `|tool-call` + `tool input text`
- Quando `|result` aparece, executar API
- Gerar output final após `|output`

**Toolformer** (Schick et al. 2023):
- Self-supervised training com poucas demos por API
- Modelo aprende invocação via training em exemplos curados

### 18.1 Toolbox típico (Toolformer)

| Tool | Uso |
|------|-----|
| **Calculator** | Precisão matemática |
| **Q&A system** | Reduzir hallucination |
| **Search engine** | Info pós-pretraining |
| **Translation** | Low-resource languages |
| **Calendar** | Time awareness |

### 18.2 Training (Toolformer)

1. **Anotar potenciais API calls** (few-shot)
2. **Filtrar anotações úteis** (self-supervised loss — if API call improves prediction, keep)
3. **Fine-tune** LM no annotated dataset

### 18.3 Limitações

Não suporta:
- **Tool chaining** (output de uma tool → input de outra)
- **Uso interativo** (humano seleciona API responses)

### 18.4 Aplicação Moreh

Claude nativamente suporta tool use via function calling. Não precisa treinar. Aplicar pattern de **quando e como** usar.

---

## 19. HuggingGPT (Shen et al. 2023)

ChatGPT como task planner selecionando HuggingFace models.

### 19.1 4 estágios

#### Stage 1: Task Planning

LLM parseia user input em múltiplas tasks:

```
[{"task": task, "id": task_id, "dep": dependency_task_ids,
"args": {"text": text, "image": URL, "audio": URL, "video": URL}}]
```

Cada task tem:
- Task type
- ID
- Dependencies
- Arguments (text/image/audio/video)

#### Stage 2: Model Selection

LLM distribui tasks pra expert models. Multiple-choice question com model list, filtered por task type.

#### Stage 3: Task Execution

Expert models executam specific tasks e logam results.

#### Stage 4: Response Generation

LLM recebe execution results e entrega summary.

### 19.2 Desafios

- **Eficiência:** múltiplas inferências LLM
- **Context length:** long context pra comunicar tasks complexas
- **Estabilidade:** LLM outputs + external services variam

### 19.3 Aplicação Moreh

Pattern de Moreh em alto nível! Moreh é task planner + expert selection + execution + response. Arquitetura canônica pra meta-squads.

---

## 20. API-Bank Benchmark (Li et al. 2023)

Avalia performance tool-augmented.

### 20.1 Escala

- 53 APIs comuns (search engines, calendars, smart home, health, auth)
- 264 diálogos anotados
- 568 API calls

### 20.2 LLM Workflow

1. Acessar API search engine pra achar API apropriada
2. Usar documentação pra function call
3. Responder baseado em result

### 20.3 Pontos de decisão

| Decisão | Descrição |
|---------|-----------|
| **Chamar API?** | Vale a pena? |
| **Identificar API correta** | Iterar se necessário |
| **Responder baseado em resultado** | Refinar/recall se insatisfatório |

### 20.4 Níveis de avaliação

| Level | Capacidade |
|-------|-----------|
| **Level-1** | Call API dada description |
| **Level-2** | Retrieve API via search + aprender da doc |
| **Level-3** | Plan usage além de retrieval/calling |

Level-3 é o mais avançado — exige planning real, não só lookup.

### 20.5 Aplicação Moreh

Agentes de Moreh devem operar em Level-2 mínimo (buscam tools apropriadas). Squads avançados em Level-3.

---

## 21. ChatGPT Plugins e Function Calling

Implementação prática de tool use.

### 21.1 ChatGPT Plugins

APIs providas por devs. Plugin manifest define capacidades. Modelo decide usar baseado em query.

### 21.2 OpenAI Function Calling

Self-defined functions. Developer define schema, modelo chama com args.

### 21.3 Anthropic Tools

Similar: schema + description. Modelo escolhe e chama. Resultado volta como user message.

### 21.4 Aplicação Moreh

Claude Code nativamente. Moreh define tools em `squad.yaml#/components/tools` + scripts em `tools/`.

---

## 22. MCP Governance (Auroq)

Regra crítica do Auroq. Model Context Protocol servers.

### 22.1 Preferir ferramentas nativas

**SEMPRE** preferir Claude native sobre MCP:

| Task | USAR | NÃO USAR |
|------|------|----------|
| Ler arquivos | `Read` | MCP servers |
| Escrever | `Write` / `Edit` | MCP servers |
| Rodar comandos | `Bash` | MCP servers |
| Buscar arquivos | `Glob` | MCP servers |
| Buscar conteúdo | `Grep` | MCP servers |

### 22.2 Quando usar MCP

1. **Browser automation** (Playwright) — testes, screenshots
2. **WhatsApp/Slack/Notion** (quando configurado)
3. **Ferramentas externas sem equivalente nativo**

### 22.3 Gestão exclusiva (Auroq Art. II)

MCP add/remove/configure = **exclusivo do Ops**. Outros agentes são **consumidores**, não admins.

### 22.4 Rationale

- Ferramentas nativas rodam no sistema LOCAL (rápidas, confiáveis)
- MCP servers têm latência, falhas de conexão, custos
- Nativas são mais rápidas pra operações locais

### 22.5 Aplicação Moreh

Moreh gera squads que seguem essa governance. Prioriza tools nativas em squad.yaml, MCP só quando necessário.

---

## 23. 3-Tier Tool Registry

Pattern de AIOX pra gerenciar tool proliferação.

### 23.1 Os 3 tiers

| Tier | Quando carrega | Exemplos |
|------|---------------|----------|
| **Tier 1 — Always** | Sempre no contexto | Read, Write, Edit, Grep, Glob, Bash |
| **Tier 2 — Deferred** | Carregado sob demanda | Tools específicas de squad |
| **Tier 3 — Search-only** | Descoberto via search | Tools especializadas raras |

### 23.2 Por que importa

Cada tool no contexto custa tokens. Tier 1 limitado a essenciais. Tier 2/3 carregam só se precisar.

### 23.3 Aplicação Moreh

Quando squad tem 20+ tools potenciais, classificar em tiers. Claude Code descobre Tier 3 via ToolSearch quando relevante.

---

# PARTE 5 — CASE STUDIES

---

## 24. ChemCrow (Bran et al. 2023)

LLM + 13 ferramentas expert-designed pra:
- Organic synthesis
- Drug discovery
- Materials design

### 24.1 Workflow

LangChain, reflete ReAct + MRKL:
- LLM recebe tool names, utility descriptions, input/output details
- Instruído a responder usando tools quando necessário
- Formato ReAct: Thought, Action, Action Input, Observation

### 24.2 Finding importante

Human experts mostraram ChemCrow **substancialmente superior** a GPT-4 em correctness química. Mas **avaliações LLM-based mostraram equivalência**.

**Implicação:** LLM-as-judge tem limites em domínios especializados. Human review continua necessário.

### 24.3 Aplicação Moreh

Validação híbrida (LLM + human) continua importante em domínios onde expertise profunda importa. Moreh facilita isso via playback (RC-15).

---

## 25. Boiko et al. 2023 — Scientific Agent

LLM-powered agent pra descoberta científica autônoma.

### 25.1 Capabilities

- Internet browsing
- Documentation reading
- Code execution
- Robotics APIs
- Outros LLMs

### 25.2 Task exemplo: "Develop a novel anticancer drug"

Reasoning steps:
1. Inquired about anticancer drug discovery trends
2. Selected target
3. Requested compound scaffold
4. Attempted synthesis upon identification

### 25.3 Risk assessment (armas químicas)

- 4 de 11 requests (36%) geraram soluções de síntese com implementação
- 7 de 11 rejected (5 após web search, 2 só no prompt)

### 25.4 Implicação

Safety + constraint enforcement são críticos em agentes com tool use extensivo. Constitution (VOL-10) + deny rules previnem usos maliciosos.

---

## 26. Generative Agents (Park et al. 2023)

Simulação de 25 agentes LLM vivendo e interagindo em sandbox tipo The Sims.

### 26.1 Componentes

#### Memory Stream
Long-term memory module gravando experiência em natural language. Cada elemento = observation.

#### Retrieval Model
Surfaça contexto via:
- **Recency** — eventos recentes mais alto
- **Importance** — distingue mundano de core (via LLM query)
- **Relevance** — relação com situação/query atual

#### Reflection Mechanism
Sintetiza memórias em inferências high-level:
- Summaries de eventos passados
- Prompt LLM com 100 observações mais recentes
- Gera 3 perguntas high-level salientes
- LLM responde

#### Planning and Reacting
Traduz reflections + environment → actions. Otimiza believability.

### 26.2 Emergent behaviors

- Information diffusion entre agentes
- Relationship memory
- Conversação contínua
- Coordenação de eventos sociais (party)

### 26.3 Aplicação Moreh

Padrões de memória + reflection + retrieval aplicáveis a qualquer squad multi-agente. VOL-07 já cobre memória base; Generative Agents mostra sofisticação possível.

---

## 27. AutoGPT e GPT-Engineer (POCs)

POCs de agentes autônomos.

### 27.1 AutoGPT

LLM como main controller. Reliability issues (natural language interface), mas compelling POC.

System message template inclui: goals, constraints, commands, resources, performance evaluation, response format.

### 27.2 GPT-Engineer

Cria repositórios de código a partir de spec natural. Instrui modelo a pensar em componentes menores e pedir clarificação.

Modo clarification + modo code writing.

### 27.3 Aplicação Moreh

Padrões úteis:
- Goals + constraints explícitos
- Self-criticism
- Clarification quando spec é ambígua

Mas ambos têm limites de confiabilidade. Moreh aplica com human-in-loop (RC-15).

---

# PARTE 6 — RETRIEVAL E CODE-AUGMENTED

---

## 28. Retrieval-Augmented Generation (RAG)

Base pra conhecimento recente ou privado.

### 28.1 Google Search Integration (Lazaridou et al. 2022)

Processo:
1. Extrair texto limpo de 20 Google URLs
2. Dividir em parágrafos de 6 frases
3. Rankear por similaridade cosseno TF-IDF
4. Usar parágrafo mais relevante

### 28.2 Answer probability

- **RAG style:** `p(a_i | q) = Σ p_tf-idf(p_i | q) · p_LM(a_i | q, p_i)`
- **Noisy channel:** `p(a_i | q) = [p_LM(q | a_i, p_i) · p_LM(a_i | p_i)] / p_LM(q | p_i)`
- **Product-of-Experts (PoE)**

Ranking: **PoE > Noisy channel > RAG**.

### 28.3 SituatedQA observation

Mesmo com Google Search, performance em perguntas pós-2020 fica pior que pré-2020 — "discrepâncias entre contextual e paramétrico interno".

### 28.4 Internal Retrieval (Liu et al. 2022)

Gerar conhecimento antes de responder. LLM generate → LLM answer with generated context.

---

## 29. Code-Augmented Generation

### 29.1 PAL — Program-Aided Language Models (Gao et al. 2022)

LLM gera statements de programação pra resolver problemas de raciocínio natural. **Offload computação pra Python interpreter.**

### 29.2 PoT — Program of Thoughts (Chen et al. 2022)

Similar ao PAL. Desacopla computação complexa de raciocínio. Requer LM com skills de código.

### 29.3 Aplicação Moreh

Squads que fazem análise quantitativa (analytics, data analyst) devem usar PAL/PoT. Delegar computação pra Python interpreter nativo.

---

## 30. Self-Ask (Press et al. 2022)

Repete prompts pro modelo fazer **follow-up questions**, construindo processo de pensamento iterativo. Follow-ups respondidas por search engine.

### 30.1 Uso

Quando LLM não sabe diretamente → decompõe em sub-questões → responde cada → compõe resposta final.

---

## 31. IRCoT — Interleaving Retrieval CoT (Trivedi et al. 2022)

Combina CoT iterativo com queries Wikipedia API. A cada passo de reasoning, busca info nova.

---

## 32. Regras Cardinais Aplicáveis

| Regra | Aplicação em VOL-09 |
|-------|---------------------|
| **RC-09 REUSE > ADAPT > CREATE** | Pattern existe? Usa. Não inventa novo |

---

## 33. Anti-Patterns

| Anti-pattern | Por que falha |
|--------------|---------------|
| Reinventar CoT do zero | Pattern canônico. Usar direto |
| ToT em tarefas simples | Over-engineering. Token waste |
| Few-shot com exemplos viesados | Vieses Zhao et al. contaminam |
| Instruction sem especificidade | "Seja bom" não instrui. Ser específico |
| Tool use sem MRKL (sem router) | Agente improvisa qual tool. Caos |
| MCP pra tudo | Viola Auroq governance. Ferramentas nativas primeiro |
| LLM-as-judge em domínio especializado sem human | ChemCrow mostrou limites. Human necessário |
| Self-consistency sem majority vote | Amostra uma vez, passa. Valor da técnica perdido |
| RAG sem rankeamento | Top-k sem qualidade. PoE > Noisy > RAG |
| Code-augmented sem interpreter | Moot. Precisa do interpreter funcional |
| Ignorar Anthropic tools / Claude function calling | Já existe, nativo. Não rodar via API externa |

---

## 34. Resumo Executivo (cartão de referência)

**Agent = LLM (brain) + Planning + Memory + Tool Use.**

**PLANNING — Task decomposition:**
- CoT (Wei et al.) — "think step by step"
- ToT (Yao et al.) — árvore de possibilidades + BFS/DFS
- LLM+P (Liu et al.) — outsource pra PDDL classical planners

**PLANNING — Self-reflection:**
- ReAct — Thought → Action → Observation (padrão base)
- Reflexion — dynamic memory + self-reflection (aprende com falhas)
- CoH — sequences com feedback humano
- AD — algorithm distillation RL
- STaR — bootstrapping de reasoning

**PROMPTING:**
- Zero-shot — feed direto
- Few-shot — demonstrations before task (cuidado com vieses)
- Instruction prompting — específico, com audiência
- Self-consistency — múltiplas amostras + majority vote
- APE — automatic prompt engineer
- Complexity-based CoT

**TOOL USE:**
- MRKL — router + modules (neurais + simbólicos)
- TALM/Toolformer — LM com tool calls treinados
- HuggingGPT — 4 stages (plan → select → execute → respond) — **pattern de Moreh**
- API-Bank — Level 1/2/3 evaluation
- ChatGPT/Anthropic function calling — nativo
- MCP governance (Auroq) — **nativas > MCP**
- 3-tier tool registry — always/deferred/search-only

**RETRIEVAL:**
- RAG via similarity search (PoE > Noisy > RAG)
- Internal retrieval (generate knowledge before answering)
- Self-Ask — follow-up questions
- IRCoT — interleave retrieval com CoT

**CODE-AUGMENTED:**
- PAL — offload compute pra Python
- PoT — desacopla compute de reasoning

**Case studies:**
- ChemCrow — human review > LLM-as-judge em domínios especializados
- Boiko — agentes scientific + risk assessment (constitution importa)
- Generative Agents — memory + retrieval + reflection + planning
- AutoGPT/GPT-Engineer — goals + constraints + self-criticism

**Moreh em alto nível É um HuggingGPT pattern:** task planner + expert selection + execution + response generation.

---

**Próximo volume:** VOL-10 — Governance, Evolução e Meta-Squads.
