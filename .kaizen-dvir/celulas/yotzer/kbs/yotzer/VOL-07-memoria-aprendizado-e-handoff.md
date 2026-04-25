# VOL-07 — Memória, Aprendizado e Handoff

> **KB:** KaiZen | **Consumer:** Moreh
> **Domínio:** D7 — Memória, Aprendizado e Handoff
> **Fontes primárias:** `ext-03-langchain-agent-builder-memory` (COALA, filesystem), `ext-02-lilianweng-llm-agents` (Memory component, MIPS), CLAUDE.md (sistema-memoria), `agent-handoff.md` (rule)
> **Regras cardinais principais:** RC-08, RC-10

---

## 1. O Que Este Volume Ensina

Sem memória, squad não aprende. Cada sessão recomeça do zero. O framework vira estrutura sem inteligência acumulada.

Moreh aprende aqui:

1. **COALA** (LangChain) — 3 tiers de memória: Procedural + Semantic + Episodic
2. **Escopo MVP da KaiZen** — Procedural + Semantic. Episodic → roadmap
3. **3 camadas temporais** (Auroq) — sessão / operacional / permanente
4. **6 triggers de salvamento** — quando persistir
5. **Exocortex estrutura** — expert-mind / expert-business / biblioteca
6. **Filesystem-based memory** (LangChain) — "LLMs são bons em filesystems"
7. **Storage model** — **markdown-first autoria + DB runtime** (virtual filesystem)
8. **AGENTS.md, skills, subagent definitions, tools.json** — arquivos padrão
9. **MEMORY.md por agente** — aprendizado localizado
10. **Self-improvement via correções** (padrão LangChain)
11. **Handoff artifact** (~379 tokens, max 3 retained)
12. **Decision Recorder** (ADR format)
13. **MIPS/ANN algorithms** (LSH, ANNOY, HNSW, FAISS, ScaNN)

---

## 2. COALA — 3 Tiers de Memória

Framework canônico de memória de agentes. Definido por paper COALA e adotado pela LangChain.

### 2.1 Os 3 tiers

| Tier | Definição | Exemplos |
|------|-----------|----------|
| **Procedural** | Regras aplicadas pra determinar comportamento do agente | Constitution, rules, skills, tasks instructions |
| **Semantic** | Fatos sobre o mundo | KB, glossário, playbooks, preferences |
| **Episodic** | Sequências de ações passadas | Conversation history, past interactions, work sessions |

### 2.2 Escopo MVP da KaiZen

**Insight #2 crítico:** implementar procedural + semantic no MVP. **Deferir episodic.**

| Tier | MVP KaiZen | Roadmap |
|------|-----------|---------|
| Procedural | ✅ Sim | — |
| Semantic | ✅ Sim | — |
| Episodic | ❌ Deferido | Fase 2 |

### 2.3 Por que deferir Episodic

- Episodic é o mais complexo de implementar bem
- Exige storage de conversas completas + indexação semântica
- Alto custo de implementação vs benefício MVP
- Procedural + Semantic já cobrem 80% do valor

### 2.4 Mapeamento prático

**Na KaiZen/Moreh:**

| Tier | Onde mora |
|------|-----------|
| Procedural | `.claude/rules/*.md`, Constitution, `MEMORY.md` de cada agente (comportamentos aprendidos) |
| Semantic | `docs/knowledge/`, `agents/etlmaker/kbs/` (KaiZen), glossários, playbooks |
| Episodic | (futuro) `agents/*/episodes/` ou DB de conversations |

---

## 3. 3 Camadas Temporais (Auroq)

Outro modelo mental. Organiza memória por **duração**.

| Camada | Onde | Sobrevive |
|--------|------|-----------|
| **Sessão (efêmera)** | Conversa atual | Até autocompact |
| **Operacional (curto/médio)** | `agents/companion/data/` | Entre sessões |
| **Permanente (Exocortex)** | `docs/knowledge/` + `business/` | Pra sempre |

### 3.1 Sessão

Contexto da conversa atual. Se autocompact bate, perde.

**Mitigação:** salvar estado em documento de trabalho ANTES de operações longas (DNA operacional).

### 3.2 Operacional

Sobrevive entre sessões. Atualizado frequentemente.

**Arquivos:**
- `contexto-dinamico.md` — onde paramos, o que rola
- `log-decisoes.md` — decisões datadas com racional
- `padroes-observados.md` — padrões recorrentes
- `demandas-backlog.md` — ideias não processadas

### 3.3 Permanente

Exocortex. Nunca reseta, sempre cresce.

**Arquivos:**
- `docs/knowledge/expert-mind/` — quem o expert é
- `docs/knowledge/expert-business/` — o que faz
- `docs/knowledge/biblioteca-pmi/` — KBs tratadas via ETL
- `business/` — campanhas, processos, vault

---

## 4. 6 Triggers de Salvamento

Todo agente no Auroq segue. Protocolo inegociável.

### 4.1 Trigger 1: Decisão Tomada

Se expert decide algo significativo (estratégia, preço, foco, prioridade, cancelamento):

→ Perguntar: "Registro essa decisão no log?"
→ Se sim: salvar em `agents/companion/data/log-decisoes.md`:

```markdown
## [DATA] — [TÍTULO]
**Contexto:** [situação]
**Decisão:** [o que decidiu]
**Racional:** [por quê]
**Impacto:** [o que muda]
```

### 4.2 Trigger 2: Projeto Progrediu

Se completou tarefa ou avançou fase:

→ Atualizar tracker do projeto
→ Adicionar entrada no LOG do tracker

### 4.3 Trigger 3: Conhecimento Criado

Se produziu documento/framework/análise/processo novo com valor permanente:

→ Perguntar: "Salvo na biblioteca? Onde faz mais sentido?"
→ Salvar em `docs/knowledge/` (subpasta adequada) ou `business/processos/`

### 4.4 Trigger 4: Padrão Detectado

Se Companion percebe comportamento recorrente (só Companion faz isso):

→ Registrar silenciosamente em `padroes-observados.md`

### 4.5 Trigger 5: Sessão Encerrando

Se expert indica que vai fechar ou pede commit final:

→ Ops verifica no ritual de commit: contexto e trackers atualizados?
→ Atualizar `contexto-dinamico.md` com onde paramos

### 4.6 Trigger 6: Autocompact Iminente

Se sessão longa e contexto pode ser compactado:

→ **SALVAR ESTADO IMEDIATAMENTE** no documento de trabalho
→ Atualizar `contexto-dinamico.md` se ainda não fez

### 4.7 Regra de ouro [RC-08]

**Na dúvida, salva.** É mais barato salvar info que não usa do que perder info que precisava.

### 4.8 O que NÃO salvar

- Conversa trivial sem decisão/aprendizado
- Info que já existe em outro lugar (não duplicar)
- Dados temporários que perdem valor em 24h
- Output intermediário que vai ser refinado (salvar só o final)

---

## 5. Onde Cada Coisa Vai

Tabela consolidada. Moreh consulta ao decidir destino de informação.

| Tipo de informação | Destino |
|-------------------|---------|
| Decisão estratégica | `agents/companion/data/log-decisoes.md` |
| Progresso de projeto | `business/campanhas/{projeto}/tracker.md` |
| Onde estamos agora | `agents/companion/data/contexto-dinamico.md` |
| Ideia ou pendência | `agents/companion/data/demandas-backlog.md` |
| Padrão recorrente | `agents/companion/data/padroes-observados.md` |
| Conhecimento permanente | `docs/knowledge/{subpasta}/` |
| Processo documentado | `business/processos/` |
| Estado de trabalho (pré-autocompact) | Documento de trabalho do projeto |
| Aprendizado do agente | `agents/{agent-id}/MEMORY.md` |

---

## 6. Exocortex — Estrutura Permanente

Memória externa permanente do expert. Organização real do Auroq.

### 6.1 Estrutura de diretórios

```
docs/knowledge/
├── expert-mind/               ← Quem você é
│   ├── proposito/             (missão, visão, chamado)
│   ├── identidade/            (valores, história, tom de voz, bio)
│   └── assessments/           (diagnóstico 3D, zona de genialidade)
├── expert-business/           ← O que você faz
│   ├── posicionamento/        (persona, público, núcleo)
│   ├── metodologia/           (método, framework, tese)
│   ├── produto/               (esteira, ofertas, preço)
│   └── criacoes/              (teorias, frameworks inéditos)
└── biblioteca-pmi/            ← Conhecimento tratado (ETL)
    ├── Propósito/
    ├── Marketing/
    └── IA/
```

### 6.2 3 camadas de contexto (já em VOL-05)

| Camada | Pergunta | Vem de |
|--------|----------|--------|
| "Quem" | Pra quem trabalha? | `expert-mind/` |
| "Como" | O que sabe fazer? | `expert-business/` + `biblioteca-pmi/` |
| "O Que" | O que tá rolando agora? | `business/campanhas/` |

### 6.3 Propriedades

- **Nunca reseta, sempre cresce**
- **Cada sessão torna o sistema mais inteligente**
- **Companion navega pelo Exocortex pelo expert** — não É o Exocortex, é quem acessa

### 6.4 Regra de crescimento

Cada trabalho importante vira **documento permanente**. Processos SOPs, campanhas mapeadas, decisões registradas. Exocortex é acumulativo por design.

---

## 7. Filesystem-Based Memory (LangChain)

**Insight #3:** memória representada como arquivos. LangChain descobriu que **"modelos são bons em usar filesystems"**.

### 7.1 Por que funciona

- Sem necessidade de ferramentas especializadas
- LLM navega `ls`, `cat`, `grep` nativamente
- Estrutura hierárquica é intuitiva
- Portabilidade entre frameworks (Claude Code, Deep Agents CLI, OpenCode)

### 7.2 Arquivos padrão da indústria

| Arquivo | Propósito |
|---------|-----------|
| `AGENTS.md` | Set de instruções core (Constitution-like) |
| Agent skills | Instruções de tarefas especializadas |
| Subagent definitions | Formato Claude Code |
| `tools.json` | Acesso a MCP servers (formato custom permitindo tool subsetting) |

### 7.3 Storage híbrido (LangChain pattern)

**Insight #3 completo:** arquivos **markdown-first pra autoria**, mas **runtime em DB** (Postgres ou similar).

| Camada | Formato | Por quê |
|--------|---------|---------|
| **Autoria** | Markdown hierárquico | Legível, versionável, editável |
| **Runtime** | PostgreSQL (virtual filesystem) | Performance, concorrência, escalabilidade |

### 7.4 Virtual filesystem

DB exposto como filesystem hierárquico. Agente navega como se fosse FS real:

```
/agents/
├── copywriter/
│   ├── AGENTS.md
│   ├── skills/
│   │   ├── write-headline.md
│   │   └── write-bullets.md
│   └── memory.md
```

Mas por trás: linhas em tabela Postgres.

**Vantagem:** "do ponto de vista de infra, é mais fácil e eficiente" — LangChain.

---

## 8. AGENTS.md — Pattern Emergente

Arquivo central com instruções do agente. Equivalente a `SYSTEM.md` ou Constitution local.

### 8.1 Estrutura típica

```markdown
# AGENTS.md

## Propósito
{Quem sou, o que faço}

## Expertise
{Domínios de competência}

## Regras
{Do-s e dont-s, derivados de Constitution}

## Memória operacional
- Cliente X odeia palavra "garantido" [aprendido 2026-02-14]
- Thumbnails amarelos performam 2x em YouTube [padrão extraído 2026-03-01]

## Preferências do usuário
{Tom, formato, convenções}

## Ferramentas disponíveis
- Read, Edit, Write (nativas)
- MCP: Slack, Notion
```

### 8.2 Evolução progressiva

Exemplo real do blueprint:
- **Semana 1:** AGENTS.md básico com formatação preferida
- **Semana 2:** adiciona action item extraction
- **Mês 3:** guia abrangente com format specs, meeting types, edge cases

**"A especificação se construiu através de correções, não através de documentação upfront."** — LangChain

### 8.3 Regra

AGENTS.md **cresce com uso**. Expert corrige comportamento → AGENTS.md absorve correção → próxima vez aplica.

---

## 9. MEMORY.md Por Agente

Arquivo localizado de aprendizado.

### 9.1 Estrutura

```markdown
# MEMORY — Agent {name}

## Aprendizados técnicos
- Windows paths use forward slashes (not backslashes)
- CodeRabbit roda em WSL, não Windows direto
- `fs.existsSync` pra sync, `fs.promises` pra async

## Preferências do usuário
- Prefere bullets a parágrafos
- Tom informal OK em docs internas, formal em customer-facing

## Padrões observados
- Autocompact bate tipicamente aos 180k tokens
- Commits tendem a vir sex à tarde

## Anti-patterns que já mordi
- Tentei gerar squad sem playback → cliente rejeitou
- Assumi estrutura do processo sem validar → retrabalho
```

### 9.2 Regra de escrita

- **Entradas concisas** (1-2 linhas)
- **Datadas** (quando aprendi)
- **Contexto** (em que situação aplica)
- **Apenas o que NÃO é óbvio** (evidente do código/KB não entra)

### 9.3 Diferença de KB

| KB | MEMORY.md |
|----|-----------|
| Método universal do domínio | Aprendizado específico da operação |
| Estável, versionada | Cresce por uso |
| Revisada/curada | Append-only geralmente |
| Vale pra qualquer cliente | Pode ser cliente-específica |

---

## 10. Self-Improvement Via Correções (LangChain)

**Pattern observado:** agentes aprendem **através de correções do usuário**, não através de documentação upfront.

### 10.1 Exemplo canônico (LangChain)

Prompt inicial: "Summarize meeting notes."

- **Week 1 feedback** → agente atualiza AGENTS.md com preferências de formatação
- **Week 2 feedback** → adiciona extração de action items
- **Month 3 result** → AGENTS.md é guide abrangente

### 10.2 Implicação pra Moreh

Squads gerados devem ter **AGENTS.md mínimo no dia 1** que cresce com uso.

**Não tentar gerar especificação completa upfront.** Cliente vai descobrir refinamentos em produção.

### 10.3 Infraestrutura mínima

- AGENTS.md inicial com placeholders
- `/remember` command (planejado LangChain) ou equivalente
- Prompting que explicitamente pede updates quando feedback chega

### 10.4 Compaction challenge

**Observação LangChain:** agentes eram eficientes em **adicionar** informação, mas **"não compactavam"** learnings. Listavam vendors específicos a evitar ao invés de generalizar "cold outreach rejection".

**Compactação continua fronteira aberta.** Moreh não tenta resolver no MVP — deixa aditivo.

---

## 11. Schema Validation em Memória

Agentes às vezes geram arquivos inválidos (JSON malformado, frontmatter quebrado, etc).

### 11.1 Solução LangChain

Validação de schema explícita. **Erros voltam pro LLM** ao invés de committar malformed.

### 11.2 Aplicação

Antes de salvar em MEMORY.md/AGENTS.md/etc:

```
1. Gerar content
2. Validar schema (ex: frontmatter YAML válido, sections obrigatórias)
3. Se INVALID: retornar erro pro LLM com suggestion
4. LLM corrige
5. Re-validar
6. Se VALID: commit
```

Liga com RC-16 (schema feedback loop).

---

## 12. Human-in-Loop em Edições (LangChain)

Todas edições de memória exigem **aprovação humana explícita**.

### 12.1 Por quê

Minimizar vetores de ataque via prompt injection. Usuário malicioso pode tentar envenenar memória.

### 12.2 Yolo mode

Opcional. Usuário pode habilitar bypass em contextos confiáveis. **Não é default.**

### 12.3 Aplicação Moreh

- Primeira vez escrevendo memória → requer aprovação
- Updates incrementais → podem auto-aprovar se dentro de padrão
- Mudanças em AGENTS.md → sempre requer aprovação

---

## 13. Handoff Protocol Entre Agentes

Quando squad tem múltiplos agentes, handoffs preservam contexto **sem duplicação**.

### 13.1 O problema

Sem protocolo formal:
- @sm → @dev → @qa → @devops
- Cada switch carrega persona anterior completa
- Contexto acumula: ~3K + 3K + 3K + 3K = 12K tokens duplicados

### 13.2 A solução (Auroq agent-handoff.md)

Handoff artifact YAML ~379 tokens que preserva:

```yaml
handoff:
  from_agent: "{current_agent_id}"
  to_agent: "{new_agent_id}"
  story_context:
    story_id: "{active story ID}"
    story_path: "{active story path}"
    story_status: "{current status}"
    current_task: "{last task being worked on}"
    branch: "{current git branch}"
  decisions:
    - "{key decision 1}"
    - "{key decision 2}"
  files_modified:
    - "{file 1}"
    - "{file 2}"
  blockers:
    - "{any active blockers}"
  next_action: "{what the incoming agent should do}"
```

### 13.3 Compaction limits

| Limite | Valor |
|--------|-------|
| Max handoff artifact size | 500 tokens |
| Max retained agent summaries | 3 (oldest discarded on 4th) |
| Max decisions in artifact | 5 |
| Max files_modified | 10 |
| Max blockers | 3 |

### 13.4 O que preservar (sempre incluir)

- Active story/campaign ID e path
- Current task being worked on
- Git branch name
- Key architectural decisions
- Files created/modified
- Active blockers

### 13.5 O que descartar (NUNCA carregar)

- Persona completa do agente anterior
- Command list do agente anterior
- Dependencies list do anterior
- Tool configurations do anterior
- Greeting templates

### 13.6 Economia

Exemplo real:
- `@sm` → `@dev` switch: persona `@sm` (3K) descartada, artifact (379) retido, `@dev` (5K) carregado = **5.4K total** (vs ~8K sem protocolo, **33% redução**)
- Após 2 switches: **5.2K** vs 12K (**57% redução**)

### 13.7 Storage

`.auroq/handoffs/handoff-{from}-to-{to}-{timestamp}.yaml` (runtime, gitignored).

---

## 14. Decision Recorder (ADR Format)

Architecture Decision Records aplicado a decisões de negócio do squad.

### 14.1 Estrutura

```markdown
# ADR-{NNNN}: {Título da decisão}

**Data:** YYYY-MM-DD
**Status:** proposed | accepted | deprecated | superseded

## Contexto
{Por que essa decisão precisou ser tomada}

## Opções consideradas
1. Option A — prós/contras
2. Option B — prós/contras
3. Option C — prós/contras

## Decisão
{O que decidimos}

## Racional
{Por que esta opção}

## Consequências
### Positivas
### Negativas
### Neutras

## Alternativas descartadas
{Por que não foram escolhidas}
```

### 14.2 Quando registrar

- Escolha arquitetural significativa
- Trade-off não-óbvio
- Decisão que outros agentes podem questionar depois
- Override de padrão

### 14.3 Aplicação Moreh

Squads gerados podem ter `adrs/` com decisões do design. Facilita manutenção e evolução.

---

## 15. MIPS / ANN Algorithms

Quando memory cresce, vector stores entram. Algoritmos pra Maximum Inner Product Search (MIPS).

### 15.1 Tipos de memória humana (mapping)

| Humano | Agent equivalent |
|--------|-----------------|
| Sensory memory (iconic/echoic/haptic) | Embedding representations of raw inputs |
| Short-term (working) memory | In-context learning (context window) |
| Long-term memory (explicit/implicit) | External vector stores |

### 15.2 Algoritmos ANN comuns

| Algoritmo | Estrutura | Quando |
|-----------|-----------|--------|
| **LSH** (Locality-Sensitive Hashing) | Hash functions mapeiam similares no mesmo bucket | Dataset pequeno-médio, memória limitada |
| **ANNOY** (Approximate Nearest Neighbors Oh Yeah) | Random projection trees | Embeddings médios, busca rápida |
| **HNSW** (Hierarchical Navigable Small World) | Small-world graphs em camadas | High recall, mainstream moderno |
| **FAISS** (Facebook AI Similarity Search) | Vector quantization + clusters | Volume muito alto (>1M vectors) |
| **ScaNN** (Scalable Nearest Neighbors) | Anisotropic vector quantization | State-of-art em accuracy/speed |

### 15.3 Métrica padrão

Recall@10 entre implementações. Trade-off: accuracy vs speed.

### 15.4 Quando Moreh precisa

Em MVP, não precisa. Markdown + grep basta.

Quando squad acumula >5.000 linhas de memória consultada frequentemente, considerar embeddings + ANN.

**Migração:** markdown → embeddings indexados → busca via HNSW (mainstream).

---

## 16. Hierarquia de Memória (futuro)

LangChain planeja níveis hierárquicos (ainda não implementado):

| Nível | Escopo |
|-------|--------|
| **Agent-level** | Específico de um agente (implementado) |
| **User-level** | Compartilhado entre agentes do mesmo user |
| **Organization-level** | Compartilhado na org |

**Pra Moreh no MVP:** só agent-level. Roadmap: user-level pra preferências globais do Danilo.

---

## 17. Regras Cardinais Aplicáveis

| Regra | Aplicação em VOL-07 |
|-------|---------------------|
| **RC-08 Documentar = investir** | Core deste volume. 6 triggers de salvamento |
| **RC-10 Playback antes de construir** | Memory edits requerem human-in-loop |

---

## 18. Anti-Patterns

| Anti-pattern | Por que falha |
|--------------|---------------|
| Sem memória persistente | Squad não aprende. Framework estagna |
| Salvar tudo indiscriminadamente | Ruído. Memory vira basura |
| Não salvar decisões | Perde rastreabilidade. Mesmo debate volta |
| Memory desorganizada (1 file gigante) | LLM não navega. Usar hierarquia |
| Compactação agressiva sem validação | Perde nuance importante |
| Memory editable sem human-in-loop | Prompt injection vulnerability |
| Duplicar info (KB + MEMORY.md) | Drift. Uma versão fica desatualizada |
| Handoff carregando persona completa | Viola compactação. Token waste |
| ADR pra decisões triviais | Ruído. ADRs são pra decisões importantes |
| Implementar Episodic no MVP | Over-engineering. Deferir. Insight #2 |

---

## 19. Resumo Executivo (cartão de referência)

**Memória define se squad aprende ou esquece.**

**COALA (LangChain):** 3 tiers — Procedural (regras) + Semantic (fatos) + Episodic (histórico).

**Escopo MVP KaiZen (insight #2):** Procedural + Semantic. Episodic → roadmap.

**3 camadas temporais (Auroq):** sessão (efêmera) · operacional (entre sessões) · permanente (Exocortex, nunca reseta).

**6 triggers de salvamento:** decisão tomada · projeto progrediu · conhecimento criado · padrão detectado · sessão encerrando · autocompact iminente. **Na dúvida, salva (RC-08).**

**Exocortex:** `expert-mind/` (quem) + `expert-business/` (como) + `biblioteca/` (conhecimento tratado).

**Filesystem-based memory (insight #3):** LLMs bons em filesystems. **Markdown-first autoria, DB runtime** (virtual filesystem).

**Arquivos padrão:** `AGENTS.md` (core instructions) · skills · subagent definitions · `tools.json`.

**MEMORY.md por agente:** aprendizado localizado. Cresce por uso (não upfront). "Especificação se constrói através de correções" (LangChain).

**Schema validation:** errors voltam pro LLM (RC-16). **Human-in-loop em edições (RC-15).**

**Handoff artifact:** ~379 tokens YAML. Preserva contexto essencial. Max 3 retained. **33-57% redução de contexto** entre switches.

**ADR (Decision Recorder):** decisões arquiteturais significativas. Rastreabilidade.

**MIPS/ANN (futuro):** LSH · ANNOY · HNSW · FAISS · ScaNN. Mainstream moderno: HNSW.

**Compaction is frontier:** agentes adicionam bem, compactam mal. Aceitar aditivo no MVP.

---

**Próximo volume:** VOL-08 — Orquestração e Sistema Nervoso.

---

# APPENDIX v1.1 — Enriquecimento (2026-04-22)

Patch: Handoff Artifact Protocol complementado com casos do squad-forge.

## A. Handoff Artifact — casos operacionais do squad-forge

Já coberto em §13 deste volume. Enriquecimento v1.1 adiciona 2 exemplos reais do squad-forge Auroq [Fonte: `agents/squad-forge/agents/forge-chief.md:207-234`].

### A.1 Handoff Chief → Archaeologist (Setup → Extração)

```yaml
handoff:
  from: etl-chief
  to: process-archaeologist
  timestamp: 2026-04-22T14:30:00Z
  
  context:
    process_slug: "montar-oferta"
    process_name: "Montar oferta de lançamento"
    scope: "Processo completo, da ideia até página publicada"
    complexity_hint: "standard (16-30 PUs esperados)"
    expert_id: "danilo"
    expert_availability: "weekly sync + async"
  
  inputs:
    - type: "briefing"
      path: "business/campanhas/novo-launch/briefing.md"
    - type: "existing_kb"
      path: "docs/knowledge/biblioteca-pmi/ofertas/"
      relevance: "voice-DNA + frameworks relacionados"
  
  instruction: |
    Extrair processo de "Montar oferta" em 3 rounds + RN.
    Foco em PU-TACIT (decisões implícitas do expert).
    Playback obrigatório antes de fechar Fase 1.
  
  expected_output:
    - "process-map.yaml com >=15 PUs"
    - "playback-artifact.md signed off"
    - "confidence média >=0.7"
  
  deadline: "EOW 2026-04-26"
```

### A.2 Handoff Archaeologist → Smith (Extração → Arquitetura)

```yaml
handoff:
  from: process-archaeologist
  to: forge-smith
  timestamp: 2026-04-26T17:00:00Z
  
  context:
    process_slug: "montar-oferta"
    pus_extracted: 24
    confidence_avg: 0.82
    inferred_rate: 0.15
    gaps_remaining: 0
    playback_approved: true
    playback_artifact: ".auroq/artifacts/PB-montar-oferta-2026-04-26.md"
  
  decisions:
    - "Bottleneck identificado: passo 5 (decisão de preço)"
    - "Expert quer human-in-loop em passo 5, agent em 1-4 e 6-12"
    - "3 PU-EXCEPTION críticas capturadas (vale registro em immune system)"
  
  inputs:
    - type: "process_map"
      path: "business/campanhas/novo-launch/process-map.yaml"
    - type: "kb_seed"
      path: "business/campanhas/novo-launch/kb-seed.md"
  
  instruction: |
    Arquitetar squad com 2-4 agentes.
    Complexity mode: standard.
    Respeitar bottleneck do passo 5 como human-in-loop + quality gate.
    Dual mapping PU → Task + KB section (RC-06).
  
  expected_output:
    - "squad-blueprint.yaml"
    - "agent-decomposition.md"
    - "task-mapping.md"
    - "kb-plan.md"
  
  blockers: []
  deadline: "EOW 2026-05-03"
```

## B. Handoff para compactação de contexto

Enriquecimento v1.1: quando sessão aproxima autocompact, gerar handoff "auto-to-self" salvando estado:

```yaml
handoff:
  from: current-agent
  to: current-agent  # self-handoff pra sobreviver compact
  timestamp: {ISO}
  type: "pre-compact-checkpoint"
  
  context:
    active_phase: "extraction round 2"
    last_action: "capturou PU-DECISION-007 sobre precificação"
    next_action: "rodar L5 (I/O) no próximo passo"
    
  state_path: ".auroq/state/current-session-state.json"
```

Após compact, agent ativado relê `.state.json` + relevant handoff artifact antes de continuar.

## C. Handoff Limits (consolidação)

Limites já listados em §13.3. Enriquecimento v1.1 adiciona visualização de "token budget" antes do switch:

```
[Pre-switch check]
Current context: 82.4K tokens (82.4% do limite)
Switching to: forge-smith (persona ~5K tokens)
Handoff artifact: ~380 tokens

If proceed naively: 82.4K + 5K = 87.4K (acima do recommended 80K)
Recommendation: gerar handoff + discard archaeologist persona
After switch: ~5.4K effective context (handoff 380 + smith 5K)

→ PROCEED with compaction
```

Esse check automatizado previne estouro de contexto em switches.

---

## Fim do Appendix VOL-07 v1.1
