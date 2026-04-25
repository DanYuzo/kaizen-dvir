# Prompt Engineering — Lilian Weng

**Fonte:** https://lilianweng.github.io/posts/2023-03-15-prompt-engineering/
**Autora:** Lilian Weng
**Data:** 15/03/2023
**Tipo:** Blog post técnico
**Reading time:** 21 min

---

## Introdução

Prompt Engineering (também chamado In-Context Prompting) é o conjunto de métodos para comunicar com LLMs e direcionar seu comportamento pra resultados desejados — **sem atualizar os pesos do modelo**. Campo empírico: efeito dos métodos varia muito entre modelos, exigindo experimentação e heurísticas.

Foco: modelos autoregressivos. Fora do escopo: Cloze tests, geração de imagem, multimodal. Objetivos centrais: **alignment** e **steerability**.

---

## Basic Prompting

### Zero-Shot

Alimentar o modelo direto com o texto da tarefa, sem exemplos.

Exemplo (SST-2 sentiment):
```
Text: i'll bet the video game is a lot more fun than the film.
Sentiment:
```

### Few-Shot

Apresentar "conjunto de demonstrações de alta qualidade, cada uma consistindo em input e output desejado". Geralmente supera zero-shot, mas custa mais tokens e pode bater o limite de contexto.

Exemplo (sentiment):
```
Text: (lawrence bounces) all over the stage...
Sentiment: positive

Text: despite all evidence to the contrary...
Sentiment: negative

Text: for the first time in years, de niro digs deep emotionally...
Sentiment: positive

Text: i'll bet the video game is a lot more fun than the film.
Sentiment:
```

**Key finding:** escolha do formato, exemplos e ordem afeta dramaticamente a performance — de random guessing a near state-of-the-art.

#### Vieses identificados (Zhao et al. 2021)

1. **Majority label bias** — distribuição desbalanceada de labels nos exemplos
2. **Recency bias** — tendência de repetir labels que aparecem no final
3. **Common token bias** — preferência por tokens comuns vs raros

Solução: calibrar probabilidades de label pra uniforme quando input é `N/A`.

#### Tips pra seleção de exemplos

**k-NN Clustering** (Liu et al. 2021): selecionar exemplos semanticamente similares ao teste usando clustering no embedding space.

**Graph-Based Diversity** (Su et al. 2022):
1. Construir grafo dirigido G=(V, E) a partir de similaridades cosseno de embedding
2. Cada nó aponta pros k vizinhos mais próximos
3. Score candidatos: `score(u) = Σ s(v)` onde `s(v) = ρ^(-|neighbors_in_L|)`
4. Encoraja seleção de amostras diversas

**Contrastive Learning** (Rubin et al. 2022): treinar embeddings específicos dos datasets de treino. Qualidade medida por `score(e_i) = P_LM(y | e_i, x)`.

**Q-Learning** (Zhang et al. 2022): aplicar Q-learning na seleção de amostras.

**Uncertainty-Based Active Learning** (Diao et al. 2023): identificar exemplos com alta divergência/entropia em múltiplas amostras, então anotar pra few-shot.

#### Tips pra ordenação de exemplos

- Manter seleções diversas, relevantes, em ordem aleatória pra evitar majority e recency biases
- Aumentar tamanho do modelo ou contagem de exemplos **não** reduz variância entre permutações
- Mesma ordem pode funcionar pra um modelo e ir mal em outro
- Com validation set limitado, escolher ordem que previna predições extremamente desbalanceadas ou overconfident (Lu et al. 2022)

---

## Instruction Prompting

Ao invés de depender de demonstrações, modelos instruction-following recebem descrição direta da tarefa. **Instructed LMs** (InstructGPT, natural instruction) fine-tunam modelos pré-treinados com tuplas de alta qualidade (instrução, input, ground truth output).

**RLHF** (Reinforcement Learning from Human Feedback) é a metodologia comum de fine-tuning, reduzindo significativamente custo de comunicação vs few-shot.

### Boas práticas de instrução

**Seja específico e preciso:**
```
Please label the sentiment towards the movie of the given movie review.
The sentiment label should be "positive" or "negative".
Text: i'll bet the video game is a lot more fun than the film.
Sentiment:
```

**Especifique contexto/audiência:**
- "Describe what is quantum physics to a 6-year-old."
- "... in language that is safe for work."

### In-Context Instruction Learning (Ye et al. 2023)

Combina few-shot com instruction prompting em múltiplas tarefas:
```
Definition: Determine the speaker of the dialogue, "agent" or "customer".
Input: I have successfully booked your tickets.
Output: agent

Definition: Determine which category the question asks for, "Quantity" or "Location".
Input: What's the oldest building in US?
Output: Location

Definition: Classify the sentiment of the given movie review, "positive" or "negative".
Input: i'll bet the video game is a lot more fun than the film.
Output:
```

---

## Self-Consistency Sampling

(Wang et al. 2022a) — amostrar múltiplos outputs com temperatura > 0 e selecionar o melhor candidato.

**Critérios de seleção variam por tarefa:**
- Abordagem geral: majority voting
- Tarefas verificáveis (programação): rodar no interpretador com unit tests

---

## Chain-of-Thought (CoT)

(Wei et al. 2022) — gerar sequência de frases curtas descrevendo a lógica de raciocínio passo a passo (*reasoning chains* ou *rationales*) antes da resposta final.

**Benefícios:**
- Mais pronunciado em tarefas de raciocínio complicado
- Ganho maior com modelos grandes (>50B params)
- Melhoria mínima em tarefas simples

### Tipos de CoT

#### Few-Shot CoT
Prompts incluem cadeias de raciocínio manualmente escritas ou geradas pelo modelo, como demonstração.

Exemplo (GSM8k):
```
Question: Tom and Elizabeth have a competition to climb a hill. Elizabeth takes 30 minutes to climb the hill. Tom takes four times as long as Elizabeth does to climb the hill. How many hours does it take Tom to climb up the hill?
Answer: It takes Tom 30*4 = 120 minutes to climb the hill.
It takes Tom 120/60 = 2 hours to climb the hill.
So the answer is 2.
===
Question: Jack is a soccer player. He needs to buy two pairs of socks and a pair of soccer shoes. Each pair of socks cost $9.50, and the shoes cost $92. Jack has $40. How much more money does Jack need?
Answer: The total cost of two pairs of socks is $9.50 x 2 = $19.
The total cost of the socks and the shoes is $19 + $92 = $111.
Jack need $111 - $40 = $71 more.
So the answer is 71.
===
Question: Marty has 100 centimeters of ribbon...
Answer:
```

#### Zero-Shot CoT
Prompt natural tipo "Let's think step by step" (Kojima et al. 2022) antes da resposta.

Alternativa: "Let's work this out it a step by step to be sure we have the right answer" (Zhou et al. 2022).

### Tips e extensões

**Self-Consistency + CoT** (Wang et al. 2022a): amostrar múltiplas respostas diversas, majority vote.

**Ensemble Learning** (Wang et al. 2022b): alterar ordem de exemplos ou usar rationales gerados pelo modelo, agregar via majority.

**STaR — Self-Taught Reasoner** (Zelikman et al. 2022):
1. Gerar cadeias de raciocínio; manter só as que levam a resposta correta
2. Fine-tune com os rationales gerados
3. Repetir até convergência

Nota: temperaturas altas geram mais rationales incorretos com respostas corretas. Pra dados não-anotados, usar majority votes como "correto".

**Complexity-Based Prompting** (Fu et al. 2023):
- Demonstrações com maior complexidade de raciocínio dão melhor performance
- Medir complexidade pelo número de passos
- Usar separadores `\n` (melhor que "step i", ".", ";")

**Complexity-Based Consistency** (Fu et al. 2023): preferir cadeias complexas, majority vote entre top k complexas.

**Mixed Complexity Observation** (Shum et al. 2023): CoT só com exemplos complexos melhora questões complexas mas cai em simples (GSM8k).

**Formatting** (Fu et al. 2023): trocar "Q:" por "Question:" ajuda.

**Explanation Reliability** (Ye & Durrett 2022): benefício de incluir explicações é "pequeno a moderado" em NLP com raciocínio. Explicações não-factuais levam mais a predições incorretas.

**Self-Ask** (Press et al. 2022): repetir prompts pro modelo fazer follow-up questions, construindo processo de pensamento iterativo. Follow-ups respondidas por search engine.

**IRCoT — Interleaving Retrieval CoT** (Trivedi et al. 2022): combina CoT iterativo com queries Wikipedia API.

**ReAct — Reason + Act** (Yao et al. 2023): combina CoT com tool use via APIs.

**Tree of Thoughts** (Yao et al. 2023): estende CoT explorando múltiplas possibilidades a cada passo. Decompõe em múltiplos thought steps, gera múltiplos pensamentos por passo, forma árvore. Busca via BFS ou DFS; cada estado avaliado por classifier (prompt-based) ou majority.

---

## Automatic Prompt Design

Prompts são sequências de prefix tokens que aumentam a probabilidade do output desejado. Podem ser otimizados no embedding space via gradient descent:

- **AutoPrompt** (Shin et al. 2020)
- **Prefix-Tuning** (Li & Liang 2021)
- **P-tuning** (Liu et al. 2021)
- **Prompt-Tuning** (Lester et al. 2021)

### APE — Automatic Prompt Engineer (Zhou et al. 2022)

Busca sobre instruções candidatas geradas por modelo, filtra por função de score:

1. **Gerar candidatos:** prompt LLM baseado em pares input-output com template `{{Given desired input-output pairs}}\n\nThe instruction is`
2. **Achar instrução ótima:** dado D_train = {(x, y)}, achar ρ maximizando `ρ* = arg max_ρ E_(x,y) ∈ D_train [f(ρ, x, y)]`
3. **Iterative improvement:** Monte Carlo search propondo variantes semânticas

### Automatic CoT Construction (Shum et al. 2023)

Três passos:
1. **Augment:** gerar múltiplas pseudo-cadeias via few-shot ou zero-shot CoT
2. **Prune:** remover cadeias onde resposta não bate com ground truth
3. **Select:** variance-reduced policy gradient (policy = distribuição de exemplos, reward = validation accuracy)

### Clustering-Based Selection (Zhang et al. 2023)

1. **Question clustering:** embed + k-means
2. **Demonstration selection:** pegar questões representativas (mais próximas do centroide)
3. **Rationale generation:** zero-shot CoT nas selecionadas

---

## Augmented Language Models

Survey: Mialon et al. (2023).

### Retrieval

Necessário pra conhecimento recente pós-pretraining ou privado. Open Domain QA típicamente recupera de KB, incorpora no prompt.

**Google Search Integration** (Lazaridou et al. 2022):
1. Extrair texto limpo de 20 URLs do Google
2. Dividir em parágrafos de 6 frases
3. Rankear por similaridade cosseno TF-IDF
4. Usar parágrafo mais relevante

**Answer Probability:**
- RAG style: `p(a_i | q) = Σ p_tf-idf(p_i | q) · p_LM(a_i | q, p_i)`
- Noisy channel: `p(a_i | q) = [p_LM(q | a_i, p_i) · p_LM(a_i | p_i)] / p_LM(q | p_i)`
- Product-of-Experts (PoE)

Ranking: **PoE > Noisy channel > RAG**.

**SituatedQA observation:** mesmo com Google Search, performance em perguntas pós-2020 fica significativamente pior que pré-2020 — "discrepâncias entre informação contextual e conhecimento paramétrico interno".

**Internal Retrieval** (Liu et al. 2022): gerar conhecimento antes de responder.

### Programming Language

**PAL — Program-Aided Language Models** (Gao et al. 2022): LLM gera statements de programação pra resolver problemas de raciocínio natural, offload computação pra Python.

**PoT — Program of Thoughts** (Chen et al. 2022): similar ao PAL, desacopla computação complexa de raciocínio. Requer LM com skills de código.

### External APIs

**TALM — Tool Augmented Language Models** (Parisi et al. 2022): LM augmentado com API calls text-to-text.

Formato:
- Gerar `|tool-call` e `tool input text`
- Quando `|result` aparece, executar API
- Append resultado
- Gerar output final após `|output`

Self-play: LM interage com tool APIs, iterativamente expande dataset com base em melhoria.

**Toolformer** (Schick et al. 2023): LM usando ferramentas externas via APIs simples, self-supervised com poucas demos por API.

**Toolbox:**
- Calculator
- Q&A system
- Search engine
- Translation system
- Calendar

**Training:**
1. Anotar potenciais API calls (few-shot)
2. Filtrar anotações úteis (self-supervised loss)
3. Fine-tune

Inferência: decoding continua até token "→" indicando API call.

**Limitações:** não suporta tool chaining nem uso interativo (seleção humana de respostas API).

---

## Referências (completas)

[1] Zhao et al. "Calibrate Before Use: Improving Few-shot Performance of Language Models." ICML 2021
[2] Liu et al. "What Makes Good In-Context Examples for GPT-3?" arXiv:2101.06804 (2021)
[3] Lu et al. "Fantastically Ordered Prompts..." ACL 2022
[4] Ye et al. "In-Context Instruction Learning." arXiv:2302.14691 (2023)
[5] Su et al. "Selective annotation..." arXiv:2209.01975 (2022)
[6] Rubin et al. "Learning to retrieve prompts..." NAACL-HLT 2022
[7] Wei et al. "Chain of thought prompting..." NeurIPS 2022
[8] Wang et al. "Self-Consistency..." ICLR 2023
[9] Diao et al. "Active Prompting with CoT..." arXiv:2302.12246 (2023)
[10] Zelikman et al. "STaR..." arXiv:2203.14465 (2022)
[11] Ye & Durrett. "The unreliability of explanations..." arXiv:2205.03401 (2022)
[12] Trivedi et al. "Interleaving retrieval with CoT..." arXiv:2212.10509 (2022)
[13] Press et al. "Measuring and narrowing the compositionality gap..." arXiv:2210.03350 (2022)
[14] Yao et al. "ReAct..." ICLR 2023
[15] Fu et al. "Complexity-based prompting..." arXiv:2210.00720 (2022)
[16] Wang et al. "Rationale-augmented ensembles..." arXiv:2207.00747 (2022)
[17] Zhang et al. "Automatic chain of thought prompting..." arXiv:2210.03493 (2022)
[18] Shum et al. "Automatic Prompt Augmentation..." arXiv:2302.12822 (2023)
[19] Zhou et al. "Large Language Models Are Human-Level Prompt Engineers." ICLR 2023
[20] Lazaridou et al. "Internet augmented language models..." arXiv:2203.05115 (2022)
[21] Chen et al. "Program of Thoughts..." arXiv:2211.12588 (2022)
[22] Gao et al. "PAL..." arXiv:2211.10435 (2022)
[23] Parisi et al. "TALM..." arXiv:2205.12255 (2022)
[24] Schick et al. "Toolformer..." arXiv:2302.04761 (2023)
[25] Mialon et al. "Augmented Language Models: a Survey" arXiv:2302.07842 (2023)
[26] Yao et al. "Tree of Thoughts..." arXiv:2305.10601 (2023)

---

## Citação

> Weng, Lilian. (Mar 2023). Prompt Engineering. Lil'Log. https://lilianweng.github.io/posts/2023-03-15-prompt-engineering/

## Tags
NLP, Language Model, Alignment, Steerability, Prompting
