# VOL-01 — Fundamentos e Arquitetura

> **KB:** KaiZen | **Consumer:** Moreh (squad criador de squads)
> **Domínio:** D1 — Fundamentos e Arquitetura
> **Fontes primárias:** `loc-03-framework-7-artefatos`, `loc-06-blueprint-info-produtor` (seções 1-6, 11-12), CLAUDE.md Auroq (via `loc-02-metodo-forge-exploracao`)
> **Regras cardinais principais:** RC-01, RC-03, RC-05, RC-08, RC-09

---

## 1. O Que Este Volume Responde

Moreh vai ler este volume antes de qualquer outro. Aqui ele aprende:

1. **O que é um squad multi-agente** — e o que NÃO é
2. **Taxonomia completa de agentes** — Companion, Minds, Workers, Squads (+ subtipos)
3. **Framework universal de 7 artefatos** — o esqueleto que TODO processo segue
4. **Arquitetura em 7 camadas** — como o sistema se conecta de Constitution até Cliente
5. **Framework Boundary L1-L4** — o que pode e não pode ser modificado
6. **DNA Operacional** — 5 comportamentos inegociáveis herdados por todo agente
7. **Task-First Architecture** — por que tasks são primárias e agentes são executores
8. **Hierarquia meta-squad + macro orchestrator** — por que KaiZen ↔ Moreh é padrão validado, não invenção
9. **Mapeamento AIOX → Info-Produtor** — tradução operacional do framework pra domínio do Danilo

Sem este volume, Moreh não sabe **onde cada peça se encaixa**.

---

## 2. O Que É um Squad Multi-Agente

### 2.1 Definição operacional

Um **squad** é um conjunto coordenado de agentes especializados executando um pipeline com **quality gates entre fases**. Cada agente tem responsabilidade exclusiva. O squad resolve um problema que seria caótico pra um único agente generalista.

**Não é:**
- Uma coleção de prompts bem escritos
- Um "agente mega-poderoso" fazendo tudo
- Um wrapper em torno de uma API
- Uma automação sequencial deterministic

**É:**
- **Sistema operacional de agentes** com governança (Constitution, Authority, Gates)
- **Pipeline com memória** (Exocortex + MEMORY.md + handoffs estruturados)
- **Arquitetura de responsabilidades** onde cada papel é exclusivo
- **Máquina que aprende com uso** (feedback loop, decisões registradas, padrões extraídos)

### 2.2 Por que monolito falha

Tentação: criar "um agente que faz tudo". Falha porque:

1. **Contexto estoura** — persona + skills + histórico não cabem num prompt
2. **Sem separação de papéis** — mesmo agente executa e valida → viés
3. **Sem gates** — não bloqueia avanço em output ruim
4. **Sem memória por função** — tudo fica num blob indiferenciado

**Regra:** se o processo tem mais de 3 fases distintas ou ≥2 tipos de executor (humano + IA), é squad, não agente único. [RC-05]

### 2.3 Inversão mental crítica

No mundo de código, o padrão é "função chama função". No mundo de agentes:

```
Task (O QUE fazer)  →  Agent (QUEM executa)  →  KB (COMO fazer)
```

**Tasks são primárias.** Agentes existem pra executar tasks. KB existe pra dar profundidade de execução. Inversão disso vira agente personagem sem funcionalidade operacional.

---

## 3. Taxonomia de Agentes (Auroq)

Todo agente na KaiZen/Moreh se classifica em **uma das 4 categorias**. Categoria define O QUE o agente é; função define COMO o expert o usa.

### 3.1 As 4 Categorias

| Categoria | O que é | Função principal | Exemplo canônico |
|-----------|---------|-----------------|------------------|
| **Companion** | Parceiro cognitivo pessoal. Interface entre humano e sistema. Não executa tarefas operacionais — orquestra, situa, roteia, protege foco. | Situar, lembrar, pensar junto, rotear, proteger | Creator Companion, Producer Companion |
| **Minds** | Agentes que **pensam e julgam**. Consultam, mentoram, avaliam. Carregam repertório profundo de um domínio. | Consultoria, mentoria, julgamento | Euriler Mentor Clone, Data Engineer |
| **Workers** | Agentes que **executam tarefas operacionais**. Persona, cargo, expertise. | Execução sob demanda | Copywriter, Editor, Ops |
| **Squads** | Múltiplos agentes com pipeline + quality gates. Processo coordenado. | Processos complexos multi-fase | Squad-Forge, Moreh, ETLmaker |

### 3.2 Subtipos de Minds

| Subtipo | Definição | Exemplo |
|---------|-----------|---------|
| **Clone** | Réplica funcional de pessoa real (via Clone Forge) | Clone Euriler, Clone Hormozi |
| **Mente Sintética** | Funde conhecimento de múltiplos experts num agente | Consultor de Ofertas (Hormozi + Brunson + Kahneman) |
| **Consultor** | Empacota repertório de domínio específico | Consultor de Tráfego, Consultor de Copy |

### 3.3 Matriz Categoria × Função

Define **como usar** cada tipo:

| | Mentora ("O que eu faço?") | Juíza ("Tá bom?") | Executora ("Faz.") |
|---|---|---|---|
| **Companion** | Primária | Sim | Sim |
| **Minds** | Primária | Primária | Raro |
| **Workers** | Raro | Às vezes | Primária |
| **Squads** | Coordenador (papel) | Juíza (papel) | Executor (papel) |

### 3.4 Separação de papéis dentro de squads [RC-05]

Em squads, papéis são **mutuamente exclusivos**:

| Papel | Regra inegociável |
|-------|-------------------|
| **Coordenador** | Orquestra, define sequência. NUNCA executa tasks |
| **Executor** | Faz o trabalho. NUNCA se auto-valida |
| **Juíza** | Avalia qualidade. NUNCA cria |

**Exemplo Squad-Forge (validado):**
- forge-chief = Coordenador + Juíza (playback)
- process-archaeologist = Executor (extração)
- forge-smith = Executor (arquitetura + montagem)

Tentação comum: fazer o chief executar também. **Bloqueia** — viés de execução compromete julgamento.

---

## 4. Framework Universal de 7 Artefatos

Todo processo de negócio — independente do domínio — é composto por 7 artefatos organizados em 4 camadas. Este é o **esqueleto** que Moreh vai usar pra arquitetar qualquer squad novo.

### 4.1 Visão geral

```
CONHECIMENTO ─── ① KB (método + exemplos)

PROCESSO ──────── ② Workflow (sequência)
                  ③ Tasks (com output_format embutido)

QUALIDADE ─────── ④ Rules (constraints pré-execução)
                  ⑤ Quality Gates (validação pós-execução)

EXECUÇÃO ──────── ⑥ Skill/Agent
                  ⑦ Tools
```

### 4.2 Os 7 artefatos em detalhe

#### ① KB — Knowledge Base
**Pergunta que responde:** "O que eu preciso saber pra fazer isso bem?"

**Composta de:**
- **Método** — framework, princípios, etapas, fundamentação
- **Contexto do domínio** — público-alvo, mercado, particularidades
- **Exemplos de referência** — 2-3 outputs reais excelentes com análise

**Regra fundamental [RC-06]:** KB é artefato **primário**, não suporte. Squad operacional sem KB rica = squad burro.

#### ② Workflow
**Pergunta:** "Qual a sequência do início ao fim?"

**Define:**
- Fases (3 a 7 tipicamente)
- Sequência detalhada (input/executor/tasks/output/ponto de decisão/interação humana)
- Condições de branching
- Escalation (o que acontece quando trava)

**Regra:** Workflow é **unidirecional** [RC-04]. Nada volta. Revisões acontecem dentro de fases, não entre fases.

#### ③ Tasks
**Pergunta:** "O que exatamente precisa ser feito neste passo?"

**Estrutura obrigatória (TASK-FORMAT-SPECIFICATION-V1, 8 campos):**
```yaml
task: "Nome da Task"
responsavel: "@agent-id"
responsavel_type: "agent|human|hybrid|worker"
atomic_layer: "task"
Entrada: "inputs"
Saida: "outputs"
Checklist:
  - "critério 1"
  - "critério 2"
execution_type: "deterministic|semantic|interactive"
```

**Output format embutido ou referenciado** (template concreto do que esperar).

#### ④ Rules
**Pergunta:** "O que NUNCA fazer durante a execução?"

**Contém:**
- Constraints do domínio (legais, éticas, de marca)
- Anti-patterns (erros que o modelo tende a cometer)
- Limites de escopo (o que está FORA)
- Tom e linguagem

**Boa prática dos Skills Anthropic:** explicar o POR QUE de cada regra, não só enunciar. Modelo raciocina melhor com razão.

#### ⑤ Quality Gates
**Pergunta:** "O resultado está bom?"

**Contém:**
- Critérios de aceitação
- Checklist de validação
- Guardrails automáticos (schema, tamanho, presença de elementos)
- Evals (casos de teste com assertion)
- Veredicto: PASS / REVISÃO / FAIL

**Regra [RC-05]:** quem produz NUNCA avalia. Executor ≠ Juíza.

#### ⑥ Skill/Agent

| Situação | Use |
|----------|-----|
| Processo one-shot (gerar script, criar post) | Skill |
| Processo recorrente com consistência de estilo | Skill ou Agent |
| Interação contínua com usuário | Agent |
| Múltiplos processos sob mesmo "papel" | Agent (1 agent, N skills) |
| Orquestração complexa entre agentes | Agent |

**SKILL.md < 500 linhas** (progressive disclosure).

#### ⑦ Tools
**Pergunta:** "O que preciso pra executar no mundo real?"

Define ferramentas (MCP servers, APIs, scripts custom). **Regra de governança [RC-09]:** preferir ferramentas nativas do Claude (Read, Write, Edit, Grep, Glob) sobre MCP. Reservar MCP pra integrações externas.

### 4.3 Profundidade por complexidade

Nem todo processo precisa dos 7 artefatos em profundidade máxima. Tabela de referência pra Moreh dimensionar:

| Complexidade | KB | Workflow | Tasks | Rules | Q.Gates | Skill/Agent | Tools |
|-------------|-----|----------|-------|-------|---------|-------------|-------|
| **Simples** | 1 página | 3 fases | 3-5 tasks | 5 rules | Checklist simples | Skill (1 SKILL.md) | 0-2 |
| **Médio** | 2-3 páginas | 5 fases | 5-10 tasks | 10 rules | Checklist + evals | Skill com references | 2-5 |
| **Complexo** | KB + refs | 7+ fases + branching | 10+ tasks | 15 rules | QA loop + evals | Agent com persona | 5+ |

---

## 5. Arquitetura em 7 Camadas

Esta é a arquitetura **completa** de um sistema de agentes maduro. Cada camada confia apenas na camada abaixo. Pular uma = caos.

```
┌─────────────────────────────────────────────────────────────┐
│  L7 — CLIENTE (o trabalho dele)                             │
│  docs/knowledge/ + business/campanhas/ + outputs            │
└──────────────────────┬──────────────────────────────────────┘
                       │ alimenta
┌──────────────────────▼──────────────────────────────────────┐
│  L6 — MEMÓRIA (Exocortex + MEMORY.md + contexto-dinâmico)   │
│  contexto-dinamico.md · log-decisoes.md · padroes.md        │
│  MEMORY.md por agente · handoff artifacts                   │
└──────────────────────┬──────────────────────────────────────┘
                       │ lido por
┌──────────────────────▼──────────────────────────────────────┐
│  L5 — AGENTES (personas)                                    │
│  Companion · Copywriter · Editor · etc.                     │
│  Cada um com persona + commands + dependencies              │
└──────────────────────┬──────────────────────────────────────┘
                       │ executa
┌──────────────────────▼──────────────────────────────────────┐
│  L4 — TASKS (procedimentos)                                 │
│  Tasks (.md) com pre/post-conditions, elicit, modes         │
│  + Templates (.yaml) + Checklists (.md)                     │
└──────────────────────┬──────────────────────────────────────┘
                       │ controladas por
┌──────────────────────▼──────────────────────────────────────┐
│  L3 — GATES (quality, authority, reuse)                     │
│  Constitution gates · IDS gates (G1-G6) · CodeRabbit loop   │
│  QA Loop (max 5) · Validation checklists                    │
└──────────────────────┬──────────────────────────────────────┘
                       │ orquestrados por
┌──────────────────────▼──────────────────────────────────────┐
│  L2 — HOOKS (sistema nervoso invisível)                     │
│  UserPromptSubmit · PreCompact · PreToolUse · Stop          │
│  SYNAPSE Engine (8 layers) · Session Manager                │
└──────────────────────┬──────────────────────────────────────┘
                       │ tudo governado por
┌──────────────────────▼──────────────────────────────────────┐
│  L1 — CONSTITUTION (lei suprema)                            │
│  6 artigos non-negotiable · authority matrix · deny rules   │
└─────────────────────────────────────────────────────────────┘
```

### 5.1 Detalhe por camada

| Camada | Artefatos principais | Frequência de mudança |
|--------|---------------------|------------------------|
| **L1 Constitution** | `.auroq-core/constitution.md`, artigos + severity levels | Raríssima (versionamento major) |
| **L2 Hooks/SYNAPSE** | `.claude/hooks/*.cjs`, engine de injeção | Baixa (refinar ao longo do tempo) |
| **L3 Gates** | Checklists, validators, IDS gates G1-G6 | Média (novos patterns descobertos) |
| **L4 Tasks** | Tasks + templates + workflows | Alta (cada squad novo adiciona) |
| **L5 Agentes** | Personas + commands + persona 6-níveis | Alta (novos agentes, refinamentos) |
| **L6 Memória** | `MEMORY.md` por agente, `contexto-dinamico.md`, handoffs | Altíssima (cada sessão escreve) |
| **L7 Cliente** | `docs/knowledge/`, `business/campanhas/` | Constante (trabalho real) |

### 5.2 Insight chave

Cada camada **só confia** na camada abaixo. Se Moreh inventa tasks sem verificar Rules → viola Constitution. Se Agentes ignoram Memória → perdem continuidade. Se Hooks não injetam Constitution → Agentes improvisam.

**Princípio operacional:** quando algo falha, diagnosticar de baixo pra cima. O problema geralmente está numa camada mais fundamental do que parece.

---

## 6. Framework Boundary L1-L4 (Auroq)

Diferente das 7 camadas arquiteturais (que descrevem como coisas se conectam), o Framework Boundary descreve **o que pode ser modificado**. Moreh precisa conhecer pra não corromper o framework base.

| Camada | Mutabilidade | Paths | Quem modifica |
|--------|-------------|-------|---------------|
| **L1 Framework Core** | **NUNCA** modificar | `.auroq-core/core/`, `.auroq-core/constitution.md` | Só o criador do framework (Euriler pro Auroq) |
| **L2 Framework Templates** | **NUNCA** modificar (extend-only) | `.auroq-core/development/` | Só o criador do framework |
| **L3 Project Config** | Mutável | `.claude/CLAUDE.md`, `.claude/rules/`, `core-config.yaml` | Expert (Danilo) configura |
| **L4 Project Runtime** | **SEMPRE** modificar | `business/`, `docs/`, `agents/` | Expert + agentes trabalham aqui |

### 6.1 Regra de ouro

Moreh, ao criar um squad novo, **só escreve em L4**. O squad gerado fica em `agents/{squad-name}/`. Nunca modifica L1 ou L2.

Squads que precisam de utilitários novos (scripts JS, schemas) — o squad **carrega esses utilitários dentro de si**, não altera L2.

### 6.2 Por que isso importa

**Sem boundary:**
- Squad gerado modifica `.auroq-core/`
- Framework update quebra
- Nada mais atualiza

**Com boundary:**
- Framework evolui independente dos squads do expert
- Expert pode receber updates do framework sem perder seu trabalho
- Squads do expert são portáveis entre máquinas

---

## 7. DNA Operacional — 5 comportamentos inegociáveis

Todo agente na KaiZen/Moreh herda este DNA automaticamente. São rules carregadas de `.claude/rules/dna-operacional.md`.

### 7.1 Projeto antes de execução [RC-14]

Todo trabalho complexo começa com **documento estruturado** (briefing/plano). O plano é a coleira — agente executa o planejado, **não inventa**.

Exemplo: Moreh extraindo processo → primeiro apresenta plano de extração, expert aprova, depois executa.

### 7.2 Documentação contínua [RC-08]

A cada etapa significativa:
1. Atualizar documento de trabalho (progresso, decisões, problemas)
2. Salvar estado ANTES de operações longas (previne perda por autocompact)
3. Consolidar ao final (resultado, aprendizados, próximos passos)

O documento de trabalho fica em `business/campanhas/{campanha}/` ou `business/processos/`. Sobrevive autocompact, sobrevive troca de sessão.

### 7.3 Handoff perfeito

Documento de trabalho sempre atualizado **É** o handoff. Qualquer agente que leia o documento consegue continuar sem perguntar "o que tá acontecendo?"

Protocolo formal: handoff artifact ~379 tokens em `.auroq/handoffs/` (ver VOL-07).

### 7.4 Anti-viagem [RC-01, RC-14]

- Executa o planejado
- Muda plano só com aprovação explícita
- Veto conditions bloqueiam caminhos errados
- Zero inferência — se parece faltar, PERGUNTA

### 7.5 Anti-entropia [RC-05]

- Tasks com inputs/outputs definidos
- Separação de papéis
- Documentos > conversas
- Quality gates verificam output
- Cada execução melhora o sistema

---

## 8. Task-First Architecture

Convergência entre AIOX e Auroq: **tasks são primárias, agentes são executores**.

### 8.1 Por que task-first

**Abordagem agent-first (errada):**
1. Cria agente com persona linda
2. Agente tem "capabilities"
3. Usuário chama agente com pedido vago
4. Agente improvisa

**Problema:** sem task explícita, o agente não tem contrato. Output varia. Validação impossível.

**Abordagem task-first (correta):**
1. Cria task com inputs/outputs/checklist/execution_type
2. Task define O QUE fazer e COMO validar
3. Agente é o **executor** da task
4. Output previsível, validável, auditável

### 8.2 Diretórios (estrutura convergente)

```
squads/{squad-name}/
├── squad.yaml              # Manifest
├── README.md               # Documentação
├── agents/                 # Executores (personas)
├── tasks/                  # PRIMÁRIO — o que fazer
├── workflows/              # Sequência de tasks
├── checklists/             # Validação
├── templates/              # Modelos de output
├── data/                   # KB (CÉREBRO do squad)
├── tools/                  # Scripts custom
└── config/                 # Coding standards, tech stack
```

### 8.3 Inversão mental

Quando Moreh for arquitetar um squad novo, o primeiro passo é **listar as tasks**, não os agentes. Agentes emergem como "quem é melhor executor desta task".

---

## 9. Hierarquia Meta-Squad + Macro Orchestrator

**Insight fundamental (Weng, LLM Agents):** sistemas de agentes maduros seguem padrão de hierarquia:

```
MACRO ORCHESTRATOR (Companion, sempre-ativo)
        │
        │ coordena
        ▼
META-SQUADS (Forges — criam outros agentes)
        │
        │ produzem
        ▼
SQUADS OPERACIONAIS (Content, Launch, Funnel)
        │
        │ executam
        ▼
CLIENTE (trabalho real)
```

### 9.1 Relação KaiZen ↔ Moreh

```
KaiZen (KB)          Moreh (Meta-Squad)
  │                       │
  │   alimenta            │
  ├──────────────────────►│
  │                       │
  │                       │ cria outros squads
  │                       ▼
  │                  Squads operacionais do cliente
  │
  │ (KB estática, versionada)
```

- **KaiZen** = base cognitiva (esta KB). Procedural + Semantic. Consumo: read-only.
- **Moreh** = meta-squad autoral. Lê KaiZen, executa 8 fases do método Danilo, produz squads operacionais.

### 9.2 Por que essa hierarquia é validada

Lilian Weng (OpenAI) documenta agent systems com 3 componentes (Planning + Memory + Tool Use) que se repetem em **todos** os sistemas maduros: AutoGPT, BabyAGI, HuggingGPT, Generative Agents.

**Não é invenção do Danilo.** É **padrão** — e padrão validado é fundação defensável.

### 9.3 Quando adicionar meta-squads

| Sinal | Ação |
|-------|------|
| Expert está criando squads manualmente | Considerar meta-squad |
| 3+ squads operacionais maduros existem | Meta-squad tem volume pra justificar |
| Pattern de criação se repete | Extrair padrão → meta-squad |
| Squad novo demanda expertise profunda que se repete | Meta-squad com mente sintética |

**Anti-pattern:** criar meta-squad antes de ter 3+ squads base. Forja antes dos produtos.

---

## 10. Mapeamento AIOX → Info-Produtor

Moreh opera no domínio info-produtor/expert. Mapeamento direto do vocabulário AIOX (eng. software) pro domínio do Danilo:

| AIOX (Eng. Software) | Info-Produtor (Conteúdo) |
|---|---|
| Story | **Campanha** (lançamento, email seq, funil, post) |
| Epic | **Lançamento** (macro-projeto com múltiplas campanhas) |
| `@pm` Morgan | **Estrategista** (planeja lançamento, ofertas) |
| `@dev` Dex | **Copywriter / Produtor** (executa assets) |
| `@architect` Aria | **Arquiteto de Lançamento** (funil, timing) |
| `@qa` Quinn | **Editor/Revisor** (tom, brand voice, SEO) |
| `@analyst` Alex | **Pesquisador de Audiência** (voice mining, persona) |
| `@ux` Uma | **Designer** (thumbs, LPs, carrossel) |
| `@data-engineer` | **Analista de Métricas** (dashboards, atribuição) |
| `@devops` Gage | **Publisher** (scheduler, publicação, backup) |
| Acceptance Criteria | **Critérios de Performance** (CTR, conversão, engagement) |
| File List | **Asset Manifest** (copy, criativos, emails, SRT) |
| Code | **Copy + Mídia** (texto, vídeo, áudio, imagem) |
| Constitution | **Manifesto do Criador** (sua metodologia) |
| CodeRabbit review | **Brand Voice Review** (aderência ao seu tom) |
| Dev Notes `[Source: ...]` | **Creative References** (swipes, inspirações citadas) |
| Story-DoD Checklist | **Content-DoD** (copy revisada, thumb testada, UTM OK) |
| Pre-push gates | **Pre-publish gates** (brand voice, SEO, CTA, thumbnail) |

### 10.1 Aplicação prática pro Moreh

Quando Moreh for criar um squad pro cliente (info-produtor), ele:
1. Mapeia a dor no vocabulário info-produtor (acima)
2. Identifica qual "papel AIOX" se aplica
3. Cria agente com persona adaptada ao contexto creator

**Exemplo:** cliente precisa de squad de lançamento → Moreh cria:
- Strategist (Morgan-like)
- Copywriter (Dex-like)
- Funnel Architect (Aria-like)
- Publisher (Gage-like)

Quatro agentes, cada um com vocabulário do domínio creator.

---

## 11. Skill vs Agent — Tabela de Decisão

Moreh vai constantemente decidir: é Skill ou Agent? Tabela de referência:

| Situação | Use | Rationale |
|----------|-----|-----------|
| Processo one-shot (gerar script, criar post) | **Skill** | Ativação sob demanda, sem estado |
| Processo recorrente com consistência de estilo | Skill ou Agent | Skill se é consulta. Agent se é parceria contínua |
| Interação contínua com usuário | **Agent** | Persona + memória ativa |
| Múltiplos processos sob mesmo "papel" | **Agent** (1 agent, N skills) | Agent carrega várias skills |
| Entrega pra cliente não-técnico via Cowork | **Skill** | UX simples, sem persona complexa |
| Orquestração complexa entre múltiplos agentes | **Agent** | Precisa de persona + autoridade |

**Regra de composição:** SKILL.md < 500 linhas. Se ultrapassa, usar progressive disclosure (Anthropic Skills pattern): SKILL.md curto + arquivos referenciados (`exemplos.md`, `metodo-completo.md`).

---

## 12. Escolha Arquitetural — Monolito Craft vs Multi-Agente Forge

**Contradição observada entre AIOX e Auroq** (ambos válidos em contextos diferentes):

### 12.1 Padrão Craft (AIOX) — Monolito de 10 tasks

**1 agente** (`squad-creator`) que tem **10 tasks** (design, create, validate, analyze, extend, migrate, publish, etc.).

**Quando usar:**
- Processos altamente estruturados (design → create → validate é linear)
- Docs prontos como input (não precisa extrair da cabeça)
- Task switching barato (mesmo agente, contexto leve)
- Cliente técnico

### 12.2 Padrão Forge (Auroq) — 3 agentes separados

**3 agentes** (chief, archaeologist, smith) com responsabilidades **exclusivas**.

**Quando usar:**
- Extração complexa de processo implícito
- Playback obrigatório com expert (human-in-loop)
- Expertise metodológica profunda por agente (Goldratt + Ohno + Gawande)
- Cliente não-técnico

### 12.3 Heurística de decisão

Moreh usa esta tabela:

| Sinal | Escolha |
|-------|---------|
| Input = docs prontos | Monolito (Craft) |
| Input = cabeça do expert | Multi-agente (Forge) |
| Processo < 5 fases | Monolito |
| Processo ≥ 5 fases + 3+ quality gates | Multi-agente |
| Expert técnico | Monolito OK |
| Expert não-técnico | Multi-agente (separação facilita UX) |
| Precisa de playback narrativo | Multi-agente (Chief dedicado) |

**Moreh em si é multi-agente** (Forge-style) — extrai processo implícito do Danilo + clientes.

---

## 13. Regras Cardinais Aplicáveis Neste Volume

| Regra | Aplicação em VOL-01 |
|-------|---------------------|
| **RC-01 Zero inferência** | Ao definir taxonomia e camadas, citar fonte. Nada inventado. |
| **RC-03 Task-first** | Princípio fundacional — seção 8. Inversão mental explicada. |
| **RC-05 Separação de papéis** | Seção 3.4 — coordenador/executor/juíza nunca o mesmo. |
| **RC-08 Documentar = investir** | Seção 7.2 — DNA operacional, documentação contínua obrigatória. |
| **RC-09 REUSE > ADAPT > CREATE** | Framework Boundary (seção 6) — respeitar L1/L2 existentes antes de criar. |

---

## 14. Anti-Patterns deste Volume

Comportamentos que Moreh **NUNCA** deve repetir:

| Anti-pattern | Por que falha |
|--------------|---------------|
| "Agente que faz tudo" | Viola RC-05 (separação), contexto estoura, sem gates |
| Pular camadas da arquitetura | Sistema perde integridade (ex: Agentes sem Memória, Tasks sem Rules) |
| Modificar L1/L2 do framework | Quebra updates futuros, corrompe framework |
| Criar agente sem task | Improvisação sem contrato (RC-03) |
| Definir agente antes de tasks | Ordem invertida — agent-first (errado) |
| Meta-squad antes de 3+ squads base | Forja antes dos produtos — over-engineering |
| Skill com 1000+ linhas sem references | Viola progressive disclosure |
| Agent executando + validando | Viés (RC-05) |

---

## 15. Resumo Executivo (cartão de referência)

**Um squad é:** pipeline coordenado de agentes especializados com quality gates.

**4 categorias:** Companion (orquestra) · Minds (pensam/julgam) · Workers (executam) · Squads (processos complexos).

**Papéis em squads:** Coordenador (orquestra, não executa) · Executor (faz, não valida) · Juíza (valida, não cria). **Mutuamente exclusivos.**

**7 artefatos:** KB · Workflow · Tasks · Rules · Quality Gates · Skill/Agent · Tools.

**7 camadas:** Constitution → Hooks → Gates → Tasks → Agentes → Memória → Cliente. Cada uma confia só na de baixo.

**4 boundaries:** L1/L2 nunca modifica. L3 configura. L4 sempre modifica.

**DNA operacional:** Projeto antes de execução · Documentação contínua · Handoff perfeito · Anti-viagem · Anti-entropia.

**Task-first:** tasks são primárias. Agentes executam tasks. KB dá profundidade.

**Hierarquia validada:** Macro Orchestrator → Meta-Squads → Squads Operacionais → Cliente. KaiZen ↔ Moreh segue esse padrão (Weng).

**Decisão Skill vs Agent:** one-shot = Skill · interação contínua = Agent · múltiplos processos = Agent com N skills.

**Decisão arquitetura squad:** input de docs + técnico = Monolito Craft · extração de expert não-técnico = Multi-agente Forge.

---

**Próximo volume:** VOL-02 — Extração de Processo (Fase 1 da construção de squad pelo Moreh).

---

# APPENDIX v1.1 — Enriquecimento (2026-04-22)

Patches de fundamentos: hierarquia de 4 níveis Role>Workflow>Task>Action, Mercado>Oferta>Persuasão, Greenfield Detection.

## A. Hierarquia Role > Workflow > Task > Action (RC-21 adotada)

Reconciliação task-first (RC-03) com workflow-first (Hormozi AI-Vision) [Fonte: `knowledge-refs/ai-vision.txt:2-10`]. Detalhado em VOL-11 §7.

**4 níveis oficiais:**

| Nível | Natureza | Exemplo |
|-------|----------|---------|
| **Role** | Abstração organizacional (papel humano conceitual) | "Editor de Podcast" |
| **Workflow** | SOP completo — agrupa Tasks pra um outcome | "Processar hotline Hormozi" |
| **Task** | Unidade de execução do squad (RC-03 — primária) | "Segmentar transcrição por falante" |
| **Action** | Ação atômica observável (~30 segundos) | "Detectar mudança Alex → interlocutor" |

**Regras:**
- RC-03 continua: Tasks são a unidade primária do squad
- Role e Workflow são níveis CONTEXTUAIS — organizam escopo
- Action é o que a Task FAZ internamente (descrita em observable behavior)
- Se Task tem >5-7 Actions → decompor em 2 Tasks OU Actions viram skill (RC-22)

**Implicação pra taxonomia:**
- Companion / Minds / Workers / Squads continuam as 4 categorias (VOL-01 §2)
- Companion opera em nível Role (orquestra múltiplos workflows)
- Squads operam em nível Workflow (encapsulam pipeline completo)
- Workers operam em nível Task (executam unidade)
- Dentro de cada Task, Actions são o que o agente FAZ

## B. Mercado > Oferta > Persuasão (IC-01)

Hierarquia de Hormozi sobre sucesso de squad como "oferta" [Fonte: `knowledge-refs/100M.txt:273`]. Detalhado em VOL-11 §2.

**Ordem de importância pra Moreh (antes de construir squad):**

```
Mercado (há demanda real?) > Oferta (squad bom?) > Persuasão (comunicação?)
```

**Implicação:** antes do Moreh ativar process-archaeologist, validar mercado via checklist:

```
[ ] Dor real? (não idealização do expert)
[ ] Budget/autonomia? (quem sofre a dor pode adotar squad?)
[ ] Fácil de alcançar? (usuários identificáveis?)
[ ] Crescente? (contexto vai expandir ou encolher?)
```

Se 1+ indicador RED, discutir com expert antes de seguir. Squad brilhante em mercado morto = desperdício.

## C. Greenfield Detection (PA-04)

Padrão AIOX [Fonte: `aiox-core/.codex/skills/aiox-squad-creator/squad-creator.md:24-25`].

**Regra:** Moreh detecta upfront o estado do projeto onde vai operar.

```
Checklist de Greenfield Detection:
  ├── .git existe?        → false = projeto sem versionamento
  ├── agents/ existe?     → false = infra Auroq ausente
  ├── business/ existe?   → false = sem cockpit/campanhas
  ├── docs/knowledge/?    → false = Exocortex vazio
  └── .claude/CLAUDE.md?  → false = sem ponte Claude Code
```

**Comportamento baseado em detecção:**

| Detecção | Ação |
|----------|------|
| Todos false | Oferecer `*environment-bootstrap` (via Ops) — setup completo |
| git sim, Auroq infra não | Criar estrutura básica + perguntar se expert quer Auroq OS |
| Parcial (git + Auroq) | Complementar o que falta |
| Tudo OK | Seguir para extração direto |

**Por que importa:** tentar operar Moreh em projeto imaturo gera erros confusos ("arquivo não encontrado", "path inválido"). Detecção upfront evita isso.

---

## Fim do Appendix VOL-01 v1.1
