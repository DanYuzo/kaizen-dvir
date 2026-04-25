# State of Agent Engineering 2026 — LangChain

**Fonte:** https://www.langchain.com/state-of-agent-engineering
**Autor:** LangChain team
**Tipo:** Survey/report anual
**Survey period:** 18/11/2025 – 02/12/2025
**Responses:** 1.340 profissionais

---

## Introdução

Entrando em 2026, o foco mudou de "se" construir agentes de IA pra "como" deployar com confiabilidade e em escala. Survey de 1.300+ profissionais examinou evolução de casos de uso e enfrentamento de desafios de engenharia.

### Key Findings

- **57%** dos respondents têm agentes em produção; large enterprises lideram adoção
- **32%** citam qualidade como top barreira; preocupações de custo caíram
- **89%** implementaram observability; evals ficam em 52%
- Múltiplos modelos é padrão; OpenAI lidera, mas Gemini, Claude e open source têm adoção significativa
- Fine-tuning permanece especializado, não difundido

---

## O que é Agent Engineering?

> "Agent engineering é o processo iterativo de aproveitar LLMs em sistemas confiáveis."

Agentes são não-determinísticos — engenheiros precisam iterar rapidamente pra refinar qualidade.

---

## Large Enterprises Liderando Adoção

### Momentum em Produção

- **57.3%** têm agentes em produção
- **30.4%** em desenvolvimento ativo com planos concretos
- Crescimento vs 51% de produção no ano passado

### Diferenças de Escala

- **10k+ funcionários:** 67% em produção, 24% em dev ativo
- **<100 funcionários:** 50% em produção, 36% em dev ativo

Larger orgs transicionam mais rápido de pilots pra sistemas duráveis — provavelmente por maior investimento em platform teams, segurança e infra de confiabilidade.

---

## Casos de Uso Líderes

### Primários

1. **Customer Service: 26.5%** (mais comum)
2. **Research & Data Analysis: 24.4%**
3. **Internal Workflow Automation: 18%**

Essas 3 categorias representam >50% dos deployments primários. Customer service reflete times deployando agentes diretamente pra end users, não só internamente.

### Patterns Enterprise (10k+ funcionários)

Prioridades diferem:
- Internal productivity: **26.8%** (top)
- Customer service: **24.7%**
- Research & data analysis: **22.2%**

Enterprises grandes focam primeiro em eficiência interna antes ou paralelo a deployments customer-facing.

---

## Maiores Barreiras pra Produção

### Top Blockers Gerais

1. **Quality: 33%** — accuracy, relevance, consistency, tone, policy adherence
2. **Latency: 20%** — crítico pra customer-facing (customer service)
3. **Cost** — menos citado que em anos anteriores

### Diferenças Enterprise (2k+)

- Quality permanece top
- **Security emerge como 2º maior: 24.9%** (passando latency)

### Desafios Específicos Enterprise (10k+)

Write-ins destacaram:
- Hallucinations e consistência
- Context engineering
- Gestão de contexto em escala

---

## Observability pra Agentes

### Adoption Rates

- **89%** têm alguma observability
- **62%** têm detailed tracing (inspeção de steps individuais e tool calls)

### Entre Agentes em Produção

- **94%** com alguma observability
- **71.5%** com full tracing

> "Sem visibilidade de como um agente raciocina e age, times não conseguem debugar falhas de forma confiável, otimizar performance ou construir confiança."

---

## Evaluation e Testing

### Offline Evaluations

**52.4%** rodam offline evals em test sets — times reconhecem importância de pegar regressões antes do deploy.

### Online Evaluations

**37.3%** rodam online evals (adoção menor mas crescendo).

### Entre Produção

Práticas amadurecem:
- "Not evaluating" cai de 29.5% → 22.8%
- **44.8%** rodam online evals (vs 37.3% geral)

### Métodos

Times usam abordagens mistas:
- **Human review: 59.8%**
- **LLM-as-judge: 53.3%**
- **Traditional ML metrics (ROUGE, BLEU):** adoção limitada

~25% dos times que avaliam combinam offline + online.

---

## Landscape de Modelos e Ferramentas

### Model Adoption

- **2/3+** usam GPT da OpenAI
- **75%+** usam múltiplos modelos (produção ou dev)
- **1/3** investe em infra pra deploy próprio

Times roteiam tarefas pra modelos diferentes baseado em complexidade, custo, latência — não buscam single-vendor lock-in.

### Fine-Tuning

- **57%** NÃO fazem fine-tuning
- Times confiam em base models + prompt engineering + RAG

Fine-tuning reservado pra casos high-impact/especializados devido ao investimento significativo (data collection, labeling, infra).

---

## Daily Agent Usage Patterns

### 1. Coding Agents Dominam

Mais mencionados:
- Claude Code
- Cursor
- GitHub Copilot
- Amazon Q
- Windsurf
- Antigravity

Usados pra geração de código, debugging, criação de testes, navegação de codebases grandes.

### 2. Research & Deep Research Agents

Segundo pattern:
- Powered by ChatGPT, Claude, Gemini, Perplexity
- Exploração de domínio, summarization de documentos, síntese cross-source
- Frequentemente pareados com coding agents

### 3. Custom Agents em LangChain/LangGraph

Adoção significativa de agentes custom pra:
- QA testing
- Internal knowledge-base search
- SQL/text-to-SQL
- Demand planning
- Customer support
- Workflow automation

---

## Methodology

- **Survey Period:** 18/11/2025 – 02/12/2025
- **Responses:** 1.340

### Industry Breakdown
- Technology: **63%**
- Financial Services: **10%**
- Healthcare: **6%**
- Education: **4%**
- Consumer Goods: **3%**
- Manufacturing: **3%**

### Company Size
- <100: **49%**
- 100-500: **18%**
- 500-2k: **15%**
- 2k-10k: **9%**
- 10k+: **9%**

---

## Key Takeaways

1. **Production adoption is real:** +50% deployado; larger enterprises movendo mais rápido
2. **Quality > cost:** foco em output quality/consistência; preços caindo mudou foco
3. **Observability is foundational:** 9/10 orgs implementam tracing; essencial pra debug, otimização, confiança stakeholder
4. **Multi-model is standard:** evitar single-vendor lock-in; routing por task
5. **Evaluation maturing:** crescimento de online evals e abordagens híbridas human-LLM
6. **Agent diversity expanding:** além de customer service/research — produtividade interna, workflow automation, tasks especializadas
