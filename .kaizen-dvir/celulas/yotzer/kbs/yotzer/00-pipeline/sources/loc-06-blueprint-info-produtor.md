# Blueprint: Framework de IA para Info-Produtor

> **Documento de referência** — análise completa de AIOX + Auroq OS para construção de framework próprio voltado a info-produtores (criação de conteúdo).

**Data:** 2026-04-15
**Autor:** Morgan (PM) — sessão com Danilo
**Propósito:** Servir como blueprint de referência para construir (e evoluir) um framework distribuível via GitHub que entrega workflows, agentes e skills personalizados ao cliente final.
**Status:** Pesquisa completa. Aguardando respostas do usuário (9 perguntas no final) para gerar PRD v1.0.

---

## Sumário Executivo (TL;DR)

Um framework como AIOX ou Auroq OS **não é uma coleção de prompts bem escritos** — é um **sistema operacional com 6 camadas**: Constitution → Hooks → Gates → Tasks → Agents → Memory. O que faz eles funcionarem de verdade são **22 mecanismos** interconectados, sendo **13 de impacto alto** (essenciais), 7 médios (fase 2) e 2 descartáveis para seu caso.

**Diferencial real** (que ninguém fala): o sistema **aprende com o trabalho do cliente** via MEMORY.md por agente + logs de decisão datados + contexto dinâmico vivo. Isso transforma o framework de "estrutura bonita" em "máquina de acumular valor" ao longo do tempo.

**Para info-produtor**, o MVP distribuível tem **3 agentes (Companion + Copywriter + Editor)**, **5 tasks**, **3 templates**, **2 checklists**, **Exocortex base**, **Constitution + Authority Matrix** e **1 hook mínimo** — entregue em **10 semanas** via GitHub Releases + script de install (sem npm publish).

---

## Índice

1. [Diagnóstico: 7 Componentes Críticos](#1-diagnóstico-7-componentes-críticos)
2. [Os 22 Sistemas Mapeados](#2-os-22-sistemas-mapeados)
3. [As 5 Grandes Revelações](#3-as-5-grandes-revelações)
4. [Arquitetura em 7 Camadas](#4-arquitetura-em-7-camadas)
5. [Mapeamento AIOX → Info-Produtor](#5-mapeamento-aiox--info-produtor)
6. [Diferenciais do Auroq OS](#6-diferenciais-do-auroq-os)
7. [Evidências de Uso Real](#7-evidências-de-uso-real)
8. [MVP Rigoroso (Incluir/Adiar/Descartar)](#8-mvp-rigoroso)
9. [Armadilhas Comuns](#9-armadilhas-comuns)
10. [Roadmap Revisado](#10-roadmap-revisado)
11. [Estrutura de Pastas Proposta](#11-estrutura-de-pastas-proposta)
12. [Catálogo de Agentes Sugeridos](#12-catálogo-de-agentes-sugeridos)
13. [Sistema de Distribuição](#13-sistema-de-distribuição)
14. [Perguntas Pendentes para PRD](#14-perguntas-pendentes-para-prd)
15. [Recomendações Estratégicas](#15-recomendações-estratégicas)

**Apêndices:**
- [A. Hooks & SYNAPSE (sistema nervoso)](#apêndice-a--hooks--synapse-detalhado)
- [B. Entity Registry + IDS Principle](#apêndice-b--entity-registry--ids)
- [C. Forges do Auroq (meta-squads)](#apêndice-c--forges-detalhados)
- [D. Receita para criar um bom agente](#apêndice-d--receita-para-bom-agente)
- [E. Quality Gates e Self-Healing](#apêndice-e--quality-gates)

---

## 1. Diagnóstico: 7 Componentes Críticos

O que faz AIOX/Auroq serem especiais NÃO é "prompts bons". São **7 sistemas de governança** que forçam qualidade em cada camada.

### 1.1 Constitution Formal

Documento único com princípios inegociáveis e **severity levels** (NON-NEGOTIABLE / MUST / SHOULD) + **gates automáticos** que bloqueiam violações.

**AIOX tem 6 artigos:**
1. CLI First — toda funcionalidade funciona via CLI antes de UI
2. Agent Authority — cada agente tem domínios exclusivos
3. Story-Driven — zero código sem story
4. No Invention — tudo traça para requisito validado
5. Quality First — 5 gates bloqueiam (lint/typecheck/test/build/CodeRabbit)
6. Absolute Imports — nunca relativos

**Auroq tem 6 artigos:**
1. Centro de Comando — Claude Code é o hub
2. Cada um faz o seu — separação de papéis
3. Documentar = Investir — tudo persiste
4. Não inventar
5. Qualidade com julgamento
6. Evolução incremental

**Por que importa:** sem Constitution, agentes inventam features, ignoram padrões, viajam fora do escopo.

### 1.2 Agent Authority Matrix

Cada agente tem **autoridades exclusivas**. Delegation é obrigatória quando fora do escopo.

| Agente AIOX | Autoridade Exclusiva |
|-------------|----------------------|
| `@devops` | git push, PR, releases, MCP management |
| `@pm` | Epic creation, roadmap |
| `@po` | Story validation (10-point), backlog |
| `@sm` | Story creation (`*draft`) |
| `@qa` | Gate verdicts (PASS/CONCERNS/FAIL) |
| `@architect` | Tech decisions, system design |
| `@data-engineer` | Schema, migrations |

**Por que importa:** previne **emulação** (quando Claude pretende ser outro agente no mesmo contexto, poluindo tudo).

### 1.3 Story/Task-Driven Development

Nada é feito sem **documento de trabalho vivo**. Em AIOX: story file. Em Auroq: tracker de projeto.

Progresso via checkboxes, File List sincronizada, Change Log append-only.

### 1.4 Task System com Pre/Post-Conditions + Elicitation

Tasks são **workflows executáveis**, não instruções genéricas. Cada task define:

- Entrada (tipos, validação, origem)
- Pre-conditions bloqueadoras
- Execution modes (YOLO / Interactive / Pre-Flight)
- `elicit=true` (força resposta humana em decisões críticas)
- Post-conditions (verifica sucesso)
- Acceptance Criteria (PASS/FAIL)
- Error handling (retry/abort)

### 1.5 Templates + Checklists com Veto

**Templates YAML** com seções obrigatórias + elicitation forçam qualidade estrutural.

**Checklists** com PASS/CONCERNS/FAIL/WAIVED + **veto automático**:
- Agente sem task file → "LLM improvisa" → BLOQUEADO
- Story <7/10 → NO-GO, volta para fix
- Severity CRITICAL CodeRabbit → HARD block

### 1.6 Quality Gates Multi-Estágio com Self-Healing

Cada transição entre fases tem gate. **CodeRabbit self-healing** auto-corrige CRITICAL/HIGH até 2 iterações antes de escalar.

**QA Loop** permite até 5 ciclos review→fix antes de escalação manual.

### 1.7 Memory/Exocortex Permanente

**AIOX:** `MEMORY.md` por agente + **Entity Registry** (745 artefatos catalogados com checksum + adaptability score, princípio **REUSE > ADAPT > CREATE**).

**Auroq:** Exocortex em 3 camadas:
- **"Quem"** (`expert-mind/`) — propósito, identidade, assessments
- **"Como"** (`expert-business/`) — posicionamento, metodologia, produtos
- **"O Que"** (`business/campanhas/`) — o que está rolando agora

Plus arquivos vivos: `contexto-dinamico.md`, `log-decisoes.md`, `padroes-observados.md`.

---

## 2. Os 22 Sistemas Mapeados

### 2.1 Impacto Alto (13 sistemas — essenciais)

| # | Sistema | O que faz | MVP? |
|---|---------|-----------|------|
| 1 | Constitution formal | 6 artigos NON-NEGOTIABLE | ✅ Sim |
| 2 | SYNAPSE Context Engine (8 camadas) | Injeta regras dinamicamente no prompt | ✅ Sim (simplificado) |
| 3 | Hooks System (UserPromptSubmit, PreCompact, PreToolUse) | Intercepta eventos Claude Code | ✅ Sim (só UserPromptSubmit) |
| 4 | Agent Authority Matrix | Quem pode o quê exclusivamente | ✅ Sim |
| 5 | Story/Tracker-Driven | Documento vivo de trabalho | ✅ Sim |
| 6 | Task System com pre/post + elicit | Workflows executáveis | ✅ Sim |
| 7 | Templates YAML com elicitation | Força qualidade estrutural | ✅ Sim |
| 8 | Checklists com veto | PASS/CONCERNS/FAIL/WAIVED | ✅ Sim |
| 9 | Quality Gates + self-healing | Auto-fix antes de escalar | 🟡 Simplificado |
| 10 | Memory/Exocortex 3 camadas | Persistência entre sessões | ✅ Sim |
| 11 | Agent Handoff Protocol | Compacta persona em artifact ~379 tokens | 🟡 Fase 2 |
| 12 | Companion Pattern (Auroq) | Parceiro cognitivo permanente | ✅ Sim (DIFERENCIAL) |
| 13 | Framework Boundary L1-L4 | deny/allow rules | ✅ Sim |

### 2.2 Impacto Médio (7 sistemas — fase 2+)

| # | Sistema | O que faz |
|---|---------|-----------|
| 14 | Entity Registry (745+ entries) | Checksum, adaptability score, lifecycle |
| 15 | IDS Principle (6 gates G1-G6) | REUSE > ADAPT > CREATE com TF-IDF |
| 16 | Tool Registry 3-Tier | Tier 1 always / 2 deferred / 3 search-only |
| 17 | Session Management + PreCompact digest | Snapshot YAML antes do autocompact |
| 18 | Decision Recorder (ADR format) | Log estruturado com alternativas |
| 19 | Installer Wizard | @clack/prompts + inquirer |
| 20 | ETLmaker (Auroq) | Pipeline: conhecimento bruto → KB |

### 2.3 Impacto Baixo / Over-engineered (2 sistemas — pular)

| # | Sistema | Por que pular |
|---|---------|---------------|
| 21 | Meta-Squads Forges completos (Squad, Mind, Worker, Clone) | Só fazer depois de 3+ SOPs maduros |
| 22 | npm publish + semantic-release + monorepo | GitHub Releases + tarball é igual de bom |

---

## 3. As 5 Grandes Revelações

### 3.1 O sistema APRENDE, não só executa

AIOX não é "prompts bem escritos" — é um **ciclo de feedback com 4 camadas de validação**:

```
VALIDAÇÃO AUTOMÁTICA (deny rules, CodeRabbit)
    ↓
VALIDAÇÃO POR PESSOA (@po, @qa, @devops)
    ↓
CONTEXTO COMPARTILHADO (CLAUDE.md, rules/)
    ↓
APRENDIZADO ACUMULADO (MEMORY.md por agente)
```

**Evidência:** `dev/MEMORY.md` tem entradas como "Windows paths usam forward slashes", "CodeRabbit roda em WSL não Windows direto", "fs.existsSync para sync, fs.promises pra async". **Isso não foi escrito no dia 1 — foi aprendido em produção.**

**Implicação para info-produtor:** seu framework precisa de `MEMORY.md` por agente desde o dia 1. Copywriter aprende "cliente odeia palavra X". Editor aprende "thumbnails amarelos performam 2x". Isso vira moat.

### 3.2 O diferencial está nos ARTEFATOS REAIS, não nos templates

Evidências concretas exploradas:

- **Story 6.1.4:** 1.404 linhas de spec executável (não template vazio)
- **Log de decisões Auroq:** 7 decisões datadas com racional completo
- **Contexto-dinâmico Auroq:** Alerta "Expert declarou emergência financeira real em 15/04. ~15 dias pra fazer caixa. Narrativa de 'side hustle sem pressa' NÃO se aplica mais."
- **Handoff companion→ops:** "Expert está sob pressão financeira real. Para Ops: ser eficiente e direto."

**Implicação:** um framework vazio com templates é lixo. O valor está em **artefatos preenchidos com contexto humano sensível**. Seu framework precisa nascer com 2-3 exemplos reais preenchidos.

### 3.3 SYNAPSE e Hooks — o "sistema nervoso" invisível

- **SYNAPSE** injeta contexto dinâmico em 8 camadas dependendo do estado
- **Hooks** (`.claude/hooks/`) interceptam eventos do Claude Code:
  - `UserPromptSubmit` → injeta contexto antes do Claude responder
  - `PreCompact` → captura snapshot antes do autocompact apagar tudo
  - `PreToolUse` → valida/bloqueia tool calls que violam constitution

**Implicação:** sem isso, cliente precisa colar regras em cada prompt. Com isso, framework "faz sozinho". **Copiar esse mecanismo é o que separa amador de profissional.**

### 3.4 Handoff Protocol — economia invisível de tokens

Quando agente muda (@sm → @dev), protocolo compacta persona anterior (~3K tokens) em **artifact YAML ~379 tokens**. Retenção máx: 3 handoffs.

**Impacto:** 33% menos contexto em 1 switch, 57% em 2 switches.

### 3.5 Pipelines de 5-6 fases são o padrão

Tudo de valor é pipeline com gates, não one-shot:

- **Spec Pipeline:** gather → assess → research → write → critique → plan (6 fases)
- **Story Development Cycle:** create → validate → implement → qa gate → push (5 fases)
- **QA Loop:** review → verdict → fix → re-review (max 5 iterações)
- **Brownfield Discovery:** 10 fases de tech debt
- **ETLmaker Auroq:** ingestão → mapeamento → composição → validação

**Implicação:** seu framework NÃO pode ser "agente mágico". Precisa ser **pipeline de fases com gates**. Exemplo: **Launch Pipeline** — pesquisa audiência → estratégia → copy → criativos → funil → tech → soft launch → full launch → retro.

---

## 4. Arquitetura em 7 Camadas

Modelo mental correto de como TUDO se conecta:

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
│  Companion · Copywriter · Editor · Launch Architect · etc.  │
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

**Insight chave:** cada camada **só confia** na camada abaixo. Se pular uma, vira caos.

---

## 5. Mapeamento AIOX → Info-Produtor

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

---

## 6. Diferenciais do Auroq OS

### 6.1 Companion (Parceiro Cognitivo Permanente)

Agente orquestrador em **6 camadas**: SITUAR → LEMBRAR → ORIENTAR → FAZER → ROTEAR → PROTEGER.

**Ciclos acoplados:**
- **Sessão:** BOOT → BRIEFING → TRABALHO → CHECKPOINT → ENCERRAMENTO
- **Semanal:** Weekly Review consolida 7 dias
- **Projeto:** Nasce → vive (tracker guia) → morre → retro

**Como lembra entre sessões:** lê arquivos REAIS (não prompt memory):
- `agents/companion/data/contexto-dinamico.md` — "última sessão parou aqui"
- `agents/companion/data/log-decisoes.md` — decisões datadas
- `agents/companion/data/padroes-observados.md` — padrões automáticos
- `agents/companion/data/demandas-backlog.md` — ideias não processadas

**Para info-produtor:** Producer Companion que sabe em que fase do lançamento está, qual copy falta, qual métrica monitorar, qual decisão foi tomada 15 dias atrás e por quê.

### 6.2 Forges (Meta-Squads que criam agentes)

5 "fábricas" que criam outros agentes:

| Forge | Propósito | Fases | Output |
|-------|-----------|-------|--------|
| **Squad-Forge** | Cria squads multi-agente | 5 (extração → playback → arquitetura → montagem → validação) | Squad AIOS funcional |
| **Mind-Forge** | Cria mentes sintéticas | 4 | Agente consultor |
| **Worker-Forge** | Cria workers | Simplificado | Worker pronto |
| **Clone-Forge** | Clona mentes reais | 11 (coleta → MIUs → DNA → drivers → psicometria → perfil → validação) | Clone 360 |
| **ETLmaker** | Extrai conhecimento bruto em KB | 4 + validação 3-camadas | KB estruturada multi-volume |

**Fase 2 crítica do Squad-Forge:** Playback Validation — apresenta processo ao expert em NARRATIVA (não YAML) ANTES de construir. Chief nunca inventa nada.

### 6.3 Exocortex (Memória Externa Permanente)

Estrutura real:

```
docs/knowledge/
├── expert-mind/        ← Quem você é
│   ├── proposito/      (missão, visão, chamado)
│   ├── identidade/     (valores, história, tom de voz, bio)
│   └── assessments/    (diagnóstico 3D, zona genialidade)
├── expert-business/    ← O que você faz
│   ├── posicionamento/ (persona, público, núcleo)
│   ├── metodologia/    (método, framework, tese)
│   ├── produto/        (esteira, ofertas, preço)
│   └── criacoes/       (teorias, frameworks inéditos)
└── biblioteca-pmi/     ← Conhecimento tratado (ETL)
    ├── Propósito/
    ├── Marketing/
    └── IA/
```

### 6.4 Sistema de Projetos (Cockpit)

**Regras bloqueantes:**
- **Max 3 ativos — SEM EXCEÇÃO** — Companion força "qual congela?"
- Todo ativo tem next action (sem isso está morto)
- Fila ordenada por prioridade
- Weekly review obrigatório (Companion força)

Seções: ATIVOS (max 3) · FILA (ordenada) · INBOX (ideias brutas) · CONGELADOS (someday/maybe) · OPERAÇÕES (contínuas, não contam no max) · ARQUIVO.

### 6.5 Organizer (Agente de Higiene)

Funde 6 experts: Tiago Forte (PARA) + Greg McKeown (essencialismo) + Cal Newport (deep work) + Abby Covert (sensemaking) + August Bradley (PPV) + Nick Milo (LYT).

7 modos: **diagnose · architect · optimize · consult · store · clean · backup**.

**Diferencial:** lente unificada — quando diagnostica, olha simultaneamente: "organizado por ação? quanto é ruído? atenção protegida? nomenclatura faz sentido? alinhamento vertical? ideias conectadas?"

---

## 7. Evidências de Uso Real

Explorei artefatos reais para validar se os frameworks são usados de verdade:

| Artefato | Evidência | Linhas/Conteúdo |
|----------|-----------|-----------------|
| **Story 6.1.4 AIOX** | 1.404 linhas de spec executável (não template vazio) | 3 análises integradas |
| **PRD LP Dash** | PRD real com dados concretos (tokens, Meta Ads, Vercel) | 80+ linhas estruturadas |
| **MEMORY.md dev** | "Windows paths use forward slashes, CodeRabbit em WSL" | Padrões extraídos de trabalho real |
| **Log decisões Auroq** | 7 decisões datadas 14-15/04/2026 com racional | "Congelou Distribute, priorizou Fase 1 porque era pular etapa" |
| **Contexto-dinâmico** | Alerta "emergência financeira real em 15/04, 15 dias pra caixa" | Pulso vivo do sistema |
| **Handoff companion→ops** | "Expert sob pressão financeira real. Ser eficiente e direto." | Transferência com sensibilidade humana |
| **Git commits** | Conventional (feat/fix/docs), ~1 commit a cada 3 dias | Ritmo consistente |

**Conclusão:** frameworks são **usados de verdade**, não só estrutura bonita. Valor está em artefatos preenchidos com contexto humano sensível.

**Lacuna detectada:** falta galeria de "good examples vs anti-patterns" — um novo usuário não tem exemplar anotado de "PRD bom vs ruim".

---

## 8. MVP Rigoroso

### 8.1 ✅ INCLUIR (fases 1-3, ~6 semanas)

1. **Constitution** (1 arquivo, 6 artigos adaptados)
2. **Agent Authority Matrix** (1 arquivo)
3. **3 agentes apenas:** Companion + Copywriter + Editor
4. **5 tasks core:** create-campaign, write-copy, review-content, publish-content, weekly-review
5. **3 templates:** campaign-tmpl, email-tmpl, content-brief-tmpl
6. **2 checklists:** content-dod, campaign-dod
7. **Exocortex base:** creator-mind/ + creator-business/ (estrutura + 3-4 arquivos preenchidos)
8. **MEMORY.md** por agente (estruturado, vazio ok)
9. **Framework Boundary L1-L4** com deny rules básicas
10. **Hooks mínimos:** só UserPromptSubmit (injeta Constitution)
11. **1 workflow completo:** Content Creation Cycle

### 8.2 🟡 ADIAR (fases 4-6, ~4 semanas)

- Agent Handoff Protocol completo
- Session Management + PreCompact digest
- QA Loop iterativo (max 5)
- Entity Registry (começa com 30-50 entries)
- Tool Registry 3-tier completo
- Decision Recorder ADR format
- Installer wizard com @clack/prompts

### 8.3 🔴 NÃO INCLUIR (pode pular)

- SYNAPSE com 8 layers completo (começar com 2-3)
- IDS Principle com 6 gates (começa com 1 gate de reuso)
- Meta-Squads Forges completos (só após 3+ SOPs maduros)
- Monorepo com workspaces + semantic-release
- Submodule privado `pro/`
- Multi-IDE detection (só Claude Code no MVP)
- Dashboard UI (respeitar CLI First)

---

## 9. Armadilhas Comuns

| Armadilha | Por que acontece | Como evitar |
|-----------|------------------|-------------|
| "Agente faz tudo" | Tentação de 1 mega-agente | Força separação (Copywriter ≠ Editor ≠ Strategist) |
| Templates vazios | Entregar estrutura sem exemplos | Entregar 2-3 artefatos preenchidos |
| Sem Constitution | Parece "burocrático demais" | 6 artigos é o mínimo — impede deriva |
| Sem MEMORY.md | Parece "frescura" | Sem memória, framework não aprende e estagna |
| Tudo na UI | Tentação de dashboard bonito | **CLI First** — UI só observa |
| Sem Authority Matrix | "Qualquer agente faz qualquer coisa" | Authority previne emulação e caos |
| Pular Hooks | "Complicado demais" | Sem hooks, cliente tem que lembrar das regras |
| Forges cedo demais | "Fábrica antes dos produtos" | Só crie Forge depois de 3+ SOPs maduros |
| Documentação técnica | Dev escreveu pra dev | Info-produtor não é dev — linguagem natural always |
| Sem evidência de uso real | "Só estrutura" | Nascer com 2-3 campanhas exemplares |

---

## 10. Roadmap Revisado

| Fase | Objetivo | Entregáveis-chave | Duração |
|------|----------|-------------------|---------|
| **F0 — Diagnóstico** | Validar nicho + nome + diferencial único | Brief + Constitution draft | 1 sem |
| **F1 — Fundação** | Constitution + Boundary L1-L4 + Authority Matrix | 3 arquivos + deny rules | 1 sem |
| **F2 — Agent Core** | 3 agentes (Companion + Copywriter + Editor) | Agents .md + MEMORY.md estruturado | 2 sem |
| **F3 — Workflow & Artifacts** | 5 tasks + 3 templates + 2 checklists | Content Creation Cycle funcional | 2 sem |
| **F4 — Exocortex + Memória** | Estrutura + 3-4 arquivos preenchidos de exemplo | creator-mind/ + creator-business/ | 1 sem |
| **F5 — Sistema Nervoso** | Hook UserPromptSubmit + Constitution injection | Hooks funcionais | 1 sem |
| **F6 — Distribuição** | GitHub Release + install.sh simples | Framework instalável via curl | 1 sem |
| **F7 — Exemplares** | 2-3 campanhas preenchidas como demo | Showcase que convence cliente | 1 sem |
| **F8 — Validação com beta** | Testar com 2-3 alunos | Feedback + ajustes | 2 sem |
| **F9 — Forges (opcional)** | ContentForge + ETLmaker | Meta-squads | 3 sem |

**Total MVP distribuível:** 10 semanas (F0-F7)
**Total com validação:** 12 semanas
**Total com Forges:** 15 semanas

---

## 11. Estrutura de Pastas Proposta

Nome placeholder: **creator-os** (a validar com usuário).

```
creator-os/
├── .creator-core/              # L1-L2 IMUTÁVEL (seu framework)
│   ├── constitution.md         # 6 artigos para info-produtor
│   ├── core/                   # Orchestration, memory, config
│   │   ├── synapse/            # Context injection engine
│   │   ├── orchestration/      # Agent invoker, handoff
│   │   └── hooks/              # UserPromptSubmit, PreCompact
│   └── development/
│       ├── agents/             # Companion, Copywriter, Editor, etc
│       ├── tasks/              # create-campaign, write-copy, review
│       ├── templates/          # campaign-tmpl, email-tmpl, etc
│       ├── checklists/         # content-dod, campaign-dod
│       └── workflows/          # content-cycle, launch-cycle
├── .claude/                    # L3 Ponte Claude Code
│   ├── CLAUDE.md               # Instruções framework
│   ├── rules/                  # agent-authority, handoff, natural-language
│   ├── hooks/                  # synapse-wrapper.cjs, precompact.cjs
│   └── settings.json           # deny/allow rules
├── business/                   # L4 Cliente opera aqui
│   ├── cockpit.md             # Máx 3 projetos ativos
│   ├── lancamentos/           # Cada lançamento com tracker
│   ├── campanhas/             # Email sequences, social
│   ├── produtos/              # Catálogo de ofertas
│   ├── processos/             # SOPs documentados
│   └── vault/                 # Acessos, credenciais (gitignored)
├── docs/knowledge/            # Exocortex do cliente
│   ├── creator-mind/          # Propósito, identidade, voice
│   │   ├── proposito/
│   │   ├── identidade/
│   │   └── assessments/
│   ├── creator-business/      # Metodologia, ofertas, persona
│   │   ├── posicionamento/
│   │   ├── metodologia/
│   │   ├── produto/
│   │   └── criacoes/
│   └── biblioteca-expertise/  # Seu conhecimento empacotado via ETL
└── agents/                    # Forges + agentes customizáveis
    ├── companion/             # Producer Companion
    ├── copywriter/
    ├── editor/
    └── _forges/               # Meta-squads (fase 9)
        ├── content-forge/
        └── etlmaker/
```

---

## 12. Catálogo de Agentes Sugeridos

### 12.1 Core (9 agentes equivalentes ao AIOX)

1. **Creator Companion** — parceiro cognitivo diário (equivalente Companion Auroq)
2. **Strategist** (Morgan-like) — planeja lançamentos, ofertas, roadmap
3. **Copywriter** (Dex-like) — executa copy, emails, scripts, CTAs
4. **Funnel Architect** (Aria-like) — estrutura funis, stacks técnicos, timing
5. **Editor** (Quinn-like) — revisa tom, brand voice, SEO, factchecker
6. **Audience Researcher** (Alex-like) — voice mining, persona, mercado
7. **Designer** (Uma-like) — thumbs, LPs, carrossel, criativos
8. **Analytics** (Dara-like) — métricas, dashboards, atribuição
9. **Publisher** (Gage-like) — scheduler, publicação multi-plataforma, backup

### 12.2 Meta-Squads / Forges (fase 9, opcional)

10. **Content Forge** — pipeline KB → conteúdo de campanha
11. **Funnel Forge** — KB → estrutura de funil completa
12. **Clone Forge** — clona referências de mercado (Halbert, Brunson, Hormozi)
13. **ETLmaker** — extrai expertise em KBs reutilizáveis

### 12.3 Workflows propostos

1. **Content Creation Cycle** — pauta → roteiro → gravação → edição → publicação
2. **Launch Cycle** — pesquisa → estrutura → pré-lançamento → lançamento → retro
3. **Email Sequence Cycle** — mapeamento → escrita → review → agendamento
4. **Funnel Build Cycle** — estratégia → wireframe → copy → tech → teste → live
5. **Audience Research Cycle** — mining → síntese → persona → voice guide

---

## 13. Sistema de Distribuição

### 13.1 AIOX faz assim (complexo)

- npm publish com semantic-release
- Workspaces monorepo (packages/installer, packages/aiox-install)
- Wizard interativo com @clack/prompts + inquirer
- Detecção multi-IDE (Claude Code, Cursor, Gemini, Copilot, Codex, Antigravity)
- Submodule privado `pro/` (git auth gerenciado)
- Semantic versioning automático via conventional commits

### 13.2 Recomendação para info-produtor (simples)

**GitHub Releases + install script**:

```bash
# Cliente roda:
curl -L https://github.com/seu-org/creator-os/releases/latest/download/creator-os.tar.gz | tar xz
cd creator-os && ./install.sh

# ./install.sh pergunta 3x e configura:
# - Nome do criador
# - Área de atuação
# - IDE (default: Claude Code)
```

**Alternativas simples:**

| AIOX | Recomendação MVP |
|------|------------------|
| npm publish | GitHub Releases com tarball |
| Wizard @clack/prompts | shell script com 3 perguntas |
| Multi-IDE detection | só Claude Code (detecta via env) |
| Semantic-release | manual: `npm version patch/minor/major` |
| Submodule privado | ignorar — framework 100% público no MVP |
| Merge YAML em update | replace-only (docs explicam customizações) |

### 13.3 Update mechanism simples

```bash
# Cliente roda:
npx creator-os update

# Script:
# 1. Baixa nova versão do GitHub
# 2. Preserva L4 (docs/, business/)
# 3. Substitui L1-L2 (.creator-core/, .claude/)
# 4. Merge L3 (core-config.yaml) — ou prompt pra re-configurar
```

---

## 14. Perguntas Pendentes para PRD

Respeitando Constitution Art. IV (No Invention), preciso validar **9 pontos** antes de gerar PRD v1.0:

### Bloco A: Produto & Posicionamento

1. **Nicho específico:** Cursos online? Mentorias? Comunidades? Eventos? SaaS digital? Newsletters? Ticket baixo (R$47 ebook) ou alto (R$5k+ mentoria)?

2. **Seu diferencial pessoal:** Qual metodologia única você tem? Que resultados você entrega que outros não entregam? Quem são seus concorrentes?

3. **Público do framework:** Iniciantes (primeiro lançamento)? Intermediários (escalar)? Avançados (operacionalizar time)?

### Bloco B: Técnico & Distribuição

4. **Nome do framework:** Sugestões: CreatorOS, LaunchOS, InfoOS, ExpertOS, ProducerOS, ContentOS, ou algo com sua marca pessoal.

5. **Modelo de distribuição:** Open source grátis? Pago standalone? Bundled com mentoria/curso seu? Licença anual?

6. **IDE-alvo:** Só Claude Code (mais simples, MVP) ou multi-IDE desde início?

### Bloco C: Relação com Referências

7. **Auroq OS do Euriler:** Referência, concorrente, ou possível parceria? Pode forkar (70% trabalho feito) ou precisa ser 100% original?

8. **Urgência/deadline:** Real? MVP em 6 sem (mínimo), 10 sem (recomendado), 15 sem (completo)?

9. **Quem você clona como Mente Sintética?** Info-produtores que te inspiram (Hormozi, Brunson, Halbert, etc) — vale ter "clones" como agentes consultores?

---

## 15. Recomendações Estratégicas

### 15.1 As 3 apostas vencedoras

1. **Não começa pela arquitetura completa.** Começa por **2-3 artefatos exemplares preenchidos** (uma campanha real sua, um launch real seu, um content brief real seu). Isso prova valor antes de qualquer código.

2. **Diferencial = Memory + Companion**, não features. Qualquer um cria "agente copywriter". Poucos criam sistema que **lembra do cliente dele**, **aprende com o trabalho** e **acumula contexto vivo**. Isso é moat.

3. **Avalie fork do Auroq OU parceria com o Euriler.** Se ele permite, economiza 70% do trabalho. Se não, vai reinventar 6 meses o que ele já tem pronto. Pergunta estratégica: **qual sua relação com o Euriler?**

### 15.2 Princípio do 80/20

- **80% do valor** vem de: Constitution + 3 agentes bem feitos + MEMORY.md + Exocortex + 1 workflow completo + 2-3 exemplares reais preenchidos
- **20% do esforço restante** gera os outros 80% de complexidade (Forges, IDS, SYNAPSE 8-layers, Registry)

**Priorize o 80% primeiro. Cliente paga pelo resultado, não pela arquitetura.**

### 15.3 Validação contínua

Antes de cada fase, perguntar:
- "Isso resolve dor real do info-produtor?"
- "Ele consegue usar sozinho ou precisa de mim?"
- "Se eu tirasse isso, o framework ainda entrega valor?"

Se resposta for "não" ou "talvez", corta sem dó.

---

## Apêndice A — Hooks & SYNAPSE Detalhado

### A.1 Hooks System (eventos interceptados)

| Hook | Quando dispara | O que faz | Impacto |
|------|---------------|-----------|---------|
| `UserPromptSubmit` | Antes do Claude responder ao usuário | Injeta SYNAPSE rules + Constitution | ALTO — é o coração |
| `PreCompact` | Antes do autocompact | Captura snapshot de decisões/padrões em YAML | MÉDIO |
| `PreToolUse` | Antes de tool call | Valida/bloqueia calls que violam Constitution | MÉDIO |
| `PostToolUse` | Depois de tool call | Registra no log, atualiza status | BAIXO |
| `Stop` | Agente termina turn | Cleanup, save state | BAIXO |

### A.2 SYNAPSE 8-Layer Rule Injection

| Layer | Nome | Carrega quando | Exemplo |
|-------|------|----------------|---------|
| L0 | Constitution | SEMPRE (non-negotiable) | "CLI First", "No Invention" |
| L1 | Global | Sempre | Convenções de código |
| L2 | Agent | Agente ativo | Persona + commands |
| L3 | Workflow | Workflow em andamento | Story Development Cycle rules |
| L4 | Task | Task específica | Pre/post-conditions |
| L5 | Squad | Squad em uso | Coordenação multi-agente |
| L6 | Keyword | Triggered por palavras | "refactor" → rules específicas |
| L7 | Star-commands | `*comando` invocado | Rules do comando |

### A.3 Para seu framework (simplificado)

MVP pode ter apenas 3 layers:
- **L0 Constitution** (sempre)
- **L1 Global** (conventions)
- **L2 Agent** (persona ativa)

Adicionar L3-L7 conforme necessidade.

---

## Apêndice B — Entity Registry + IDS

### B.1 Entity Registry

Arquivo YAML central catalogando todos artefatos do framework. Cada entidade tem:

```yaml
id: create-campaign
type: task
path: .creator-core/development/tasks/create-campaign.md
version: 1.2.0
checksum: sha256:abc123...
lifecycle: production  # draft | experimental | production | deprecated
usedBy: [strategist, copywriter]
dependencies: [campaign-tmpl, content-dod]
adaptability:
  score: 0.8
  category: ADAPTABLE
lastVerified: 2026-04-10
```

**Para info-produtor MVP:** começa com 30-50 entries (não 745).

### B.2 IDS Principle — REUSE > ADAPT > CREATE

**6 Gates:**

| Gate | Ator | Severidade | Função |
|------|------|-----------|--------|
| G1 | Strategist | Advisory | Ao criar campanha, mostra templates similares |
| G2 | Companion | Advisory | Ao criar projeto, sugere reuso |
| G3 | Editor | Soft block | Valida referências, detecta duplicação |
| G4 | Copywriter | Advisory | Ao escrever, sugere swipes relevantes |
| G5 | QA | HARD BLOCK | Bloqueia publish se duplicação sem justificação |
| G6 | Publisher | HARD BLOCK | CI/CD registry integrity |

**Aplicação info-produtor:** "Este email é 92% igual ao Q1-promo — reutiliza?"

### B.3 Decision Engine (simplificado)

Para MVP, pode usar similaridade por keyword match:
- Match > 90% → **REUSE** (copia direto)
- Match 60-89% → **ADAPT** (customiza)
- Match < 60% → **CREATE** (novo)

---

## Apêndice C — Forges Detalhados

### C.1 Squad-Forge (5 fases)

**Fase 0 — Setup:** Chief coleta nome/escopo, cria estrutura `minds/{slug}/`, inicia `.state.json`

**Fase 1 — Extração:** `@process-archaeologist` entrevista em rounds:
- L1+L2: sequência + passos
- L3: decisões, exceções
- L4: qualidade, dependências

**Fase 2 — Playback Validation (CRÍTICO):** Chief apresenta processo ao expert em NARRATIVA (não YAML bruto) e coleta confirmação ANTES de construir

**Fase 3 — Arquitetura:** `@forge-smith` mapeia em tarefas + workflows

**Fase 4 — Montagem:** Constrói squad AIOS

**Fase 5 — Validação:** Quality gates bloqueantes (QG-SF-001 até QG-SF-005)

### C.2 ETLmaker (mais relevante para info-produtor)

**Input:** PDF, transcrição, entrevista, vídeo, curso

**Processo:**
1. **Ingestão** — normaliza tudo para markdown
2. **Mapeamento Territorial** — identifica 5-10 domínios, 12+ regras cardinais
3. **Composição Blocada** — 1 volume por vez (cada ~300+ linhas)
4. **Validação 3-camadas:**
   - Spot-check (amostragem)
   - Auditoria (estrutural)
   - 6-passes estatísticos (completeness)

**Output:** KB estruturada com:
- VOLUMES (por domínio)
- MAPA-TERRITORIAL.md (11 seções)
- README + REGRAS-CARDINAIS + REPERTÓRIO + GLOSSÁRIO
- Completeness report + fidelidade score

**Para info-produtor:** essencial. Permite clientes empacotarem a própria expertise em KBs reutilizáveis.

### C.3 Clone-Forge (11 fases — OVER-ENGINEERED para MVP)

Fases: coleta → MIUs → DNA → drivers → psicometria → perfil → validação → agente.

**Recomendação:** não implementar no MVP. Versão "quick" (5 fases) seria suficiente.

---

## Apêndice D — Receita para Bom Agente

### D.1 Os 7 campos essenciais

1. **`activation-instructions`** — ritual de entrega (STEP 1-5 com HALT no final)
2. **`persona_profile`** — archetype + tone + vocabulary (5-10 palavras) + greeting_levels + signature_closing
3. **`commands`** — lista `*` com visibility e description (cada um mapeia para task)
4. **`dependencies`** — tasks/templates/checklists/data (lazy loading)
5. **`persona + core_principles`** — role, style, focus + 5-10 princípios operacionais
6. **`whenToUse`** — boundaries claros (quando usar / quando delegar)
7. **`autoClaude`** — metadados de versão + capabilities

### D.2 Campos secundários (importantes)

- **Story-file-permissions** — restringe seções editáveis pelo agente
- **Git restrictions** — quem pode commit/push
- **CodeRabbit integration** — self-healing config (light/full, max iterations)

### D.3 Padrão de orquestração

- **Handoff Protocol** — A compacta persona para artifact, B recebe artifact + própria persona
- **Authority Matrix** — define comandos exclusivos
- **Delegation** — quando fora do escopo, agente chama o especialista

---

## Apêndice F — Os Dois Tipos de `docs/` (AIOX vs Auroq)

### F.1 Distinção filosófica fundamental

Descobri que AIOX e Auroq usam `docs/` para **propósitos opostos**. Seu framework precisa implementar **AMBOS**:

| | **AIOX `aiox-core/docs/`** | **Auroq `ai-business/docs/`** |
|---|---|---|
| **Propósito** | Documentação TÉCNICA do framework | Exocortex (memória externa do expert) |
| **Para quem** | Devs que usam/contribuem | O próprio expert + agentes dele |
| **Conteúdo** | "Como funciona o AIOX" | "Quem é o expert + o que faz" |
| **Público** | Comunidade externa, clientes | Privado, pessoal |
| **Multi-language** | Sim (pt, en, es) | Não |
| **Atualiza** | A cada release | Toda sessão (vivo) |
| **Origem** | Vem com instalação do framework | Preenchido pelo cliente ao longo do tempo |

### F.2 Tipo 1 — Docs do Framework (estilo AIOX)

**Localização:** `.creator-core/docs/` (dentro do framework)

Estrutura modelo baseada no AIOX real:

```
.creator-core/docs/
├── 00-shared-activation-pipeline.md    # Pipeline universal de ativação
├── core-architecture.md                 # Arquitetura central
├── CHANGELOG.md                         # Release notes
├── community.md                         # Como contribuir
├── creator-agent-flows/                 # Fluxo de cada agente
│   ├── README.md                        # Índice
│   ├── companion-system.md
│   ├── copywriter-system.md
│   ├── editor-system.md
│   └── [outros].md
├── creator-workflows/                   # Workflows principais
│   ├── README.md
│   ├── content-creation-cycle-workflow.md
│   ├── launch-cycle-workflow.md
│   ├── email-sequence-workflow.md
│   └── [outros].md
├── examples/                            # Squads exemplares (OURO)
│   └── squads/
│       ├── simple-campaign/
│       ├── full-launch/
│       └── email-sequence/
├── guides/                              # Tutoriais práticos
│   ├── agents/                          # Como criar/customizar
│   ├── workflows/                       # Tutoriais de workflows
│   ├── squad-examples/
│   └── vertical-trails/                 # Por vertical (cursos, mentorias)
├── framework/                           # Specs técnicas L1-L4
├── installation/                        # Getting started
├── legal/                               # Licença, termos
├── community/                           # Snippets para README
└── en/, es/, pt/                        # Traduções (opcional MVP)
```

**Público:** quem instala e usa seu framework.
**Atualização:** a cada release do framework.
**Distribuição:** vem embutido no tarball de instalação.

### F.3 Tipo 2 — Exocortex do Cliente (estilo Auroq)

**Localização:** `docs/knowledge/` (na raiz do projeto do cliente, L4 mutável)

Estrutura modelo baseada no Auroq real:

```
docs/
├── knowledge/
│   ├── creator-mind/                    ← QUEM o cliente é
│   │   ├── proposito.md
│   │   ├── identidade.md
│   │   ├── valores.md
│   │   ├── historia.md
│   │   ├── tom-de-voz.md                ← Brand voice
│   │   └── assessments/                 ← MBTI, zona de genialidade
│   ├── creator-business/                ← O QUE o cliente faz
│   │   ├── posicionamento.md
│   │   ├── publico-alvo.md              ← Persona, avatar
│   │   ├── metodologia/                 ← Métodos proprietários
│   │   └── produto/                     ← Catálogo, preços
│   ├── biblioteca-expertise/            ← KBs via ETLmaker
│   │   ├── copywriting/
│   │   ├── lancamentos/
│   │   └── trafego/
│   └── context/                         ← Snapshot operacional
│       ├── business.md
│       └── concept.md
├── research/                            ← Pesquisas pontuais
└── diagrams/                            ← Diagramas do cliente
```

**Público:** agentes do framework consomem para personalizar outputs.
**Atualização:** toda sessão (Companion, Organizer, ETLmaker atualizam).
**Distribuição:** templates vazios vêm com instalação; cliente preenche.

### F.4 Como os dois se conectam

```
CLIENTE INSTALA FRAMEWORK
    ↓
Recebe .creator-core/docs/ COMPLETO (Tipo 1, imutável)
Recebe docs/knowledge/ TEMPLATES VAZIOS (Tipo 2, mutável)
    ↓
COMPANION ATIVA
    ↓
Lê .creator-core/docs/ (para saber COMO funcionar)
Lê docs/knowledge/ (para saber QUEM é o cliente)
    ↓
COMANDOS PERSONALIZADOS com tom, valores, método do cliente
```

### F.5 Diferencial de mercado

**Se você entrega o framework com seu próprio `creator-mind/` preenchido como exemplo**, o cliente abre e vê:

> "Ah, é ASSIM que parece quando funciona."

Ele copia o modelo, adapta, e em 1 dia tem Exocortex próprio. Isso é o que transforma framework genérico em framework irresistível.

### F.6 Checklist MVP para cada tipo

**Tipo 1 — Docs do Framework (obrigatórios no MVP):**
- [ ] `00-shared-activation-pipeline.md` — como agentes acordam
- [ ] `core-architecture.md` — arquitetura central
- [ ] `CHANGELOG.md` — release notes
- [ ] 3 agent-flows (companion, copywriter, editor)
- [ ] 1 workflow completo (content-creation-cycle)
- [ ] 1 exemplo preenchido em `examples/squads/`
- [ ] `installation/getting-started.md`
- [ ] `installation/first-5-minutes.md` — onboarding super rápido

**Tipo 2 — Exocortex do Cliente (templates + exemplos):**
- [ ] `creator-mind/` com 5 templates (propósito, identidade, valores, história, tom-de-voz)
- [ ] `creator-business/` com 3 templates (posicionamento, público, metodologia)
- [ ] `context/` com 2 templates (business, concept)
- [ ] `README.md` em cada subpasta explicando o que preencher
- [ ] **2-3 exemplos REAIS preenchidos** (o seu Exocortex, como showcase)

### F.7 Insight final

**AIOX ensina a estrutura. Auroq guarda a alma. Seu framework precisa fazer os dois.**

Um sem o outro falha:
- Só Tipo 1 → cliente tem estrutura mas framework não conhece ele (genérico)
- Só Tipo 2 → cliente conhece si mesmo mas não sabe como usar o framework (paralisado)
- **Ambos juntos → cliente recebe sistema que sabe COMO trabalhar E ADAPTA para quem ele é**

---

## Apêndice E — Quality Gates

### E.1 Pre-Conditions (bloqueantes)

- Exemplo: "Story sem AC → @dev não começa"
- Exemplo info-produtor: "Campaign sem audiência definida → @copywriter não escreve"

### E.2 Elicit=true

Força resposta humana em decisões críticas antes de continuar.

### E.3 Execution Modes

- **YOLO** — autônomo, 0 prompts, decision logging ADR
- **Interactive** — 5-10 checkpoints educacionais
- **Pre-Flight** — questionnaire upfront → zero-ambiguity execution

### E.4 Self-Healing Loop

CodeRabbit (ou equivalente) auto-fix CRITICAL/HIGH antes de escalar:
- Iteração 1: tenta fix
- Iteração 2: tenta fix novamente
- Iteração 3+: escala para humano

### E.5 QA Loop iterativo

Max 5 ciclos review→fix com state save em `qa/loop-status.json`. Escalation triggers:
- `max_iterations_reached`
- `verdict_blocked`
- `fix_failure`
- `manual_escalate`

### E.6 Gate Decisions

- **PASS** — todos checks OK
- **CONCERNS** — issues não-bloqueantes
- **FAIL** — AC não atendidos, high-severity
- **WAIVED** — issues aceitas explicitamente (requer `approved_by`)

---

## Apêndice G — Insights de Profundidade (segunda varredura)

Após varredura adicional dos arquivos de documentação do AIOX (`aiox-core/docs/`), foram identificados insights técnicos e estratégicos que não estavam no mapeamento inicial.

### G.1 Squad como Unidade de Distribuição

**Descoberta-chave:** AIOX tem conceito formal de "squad" como pacote distribuível. Estrutura mínima (`examples/squads/basic-squad/`):

```
{squad-name}/
├── squad.yaml              # Manifest obrigatório
├── README.md               # Documentação
├── agents/                 # Agentes do squad
│   └── {agent}.md
├── tasks/                  # Procedimentos
│   └── {task}.md
├── templates/              # Opcional
├── tools/                  # Opcional (JS)
├── workflows/              # Opcional
└── checklists/             # Opcional
```

**Schema mínimo de `squad.yaml`:**
```yaml
name: content-squad
version: 1.0.0
slashPrefix: content
aiox:
  minVersion: "2.1.0"
  type: squad
components:
  agents: [content-lead.md]
  tasks: [plan-content.md]
  workflows: []
  checklists: []
  templates: []
  tools: []
  scripts: []
dependencies:
  node: []
  python: []
  squads: []
```

**Aplicabilidade:** é este o formato que você distribui pro cliente. Pode ser standalone (framework completo) ou expansion pack (sobre AIOX existente).

### G.2 Estratégia Alternativa: Expansion Pack vs Framework do Zero

AIOX suporta nativamente **Expansion Packs** (squads externos). Isso abre caminho alternativo:

| Opção | Tempo | Esforço | Risco | Controle |
|-------|-------|---------|-------|----------|
| **A — Framework do zero** | 10-15 sem | Alto | Reinventar infra | 100% |
| **B — Squad AIOX oficial** | 3-5 sem | Baixo-médio | Dependência AIOX | 60% |
| **C — Fork light do AIOX** | 5-8 sem | Médio | Manter sync | 80% |

**Recomendação estratégica:** começar com Opção B (squad expansion pack) como MVP para validar mercado. Se tração positiva, migrar para A/C em v2.

### G.3 Template System em 3 Camadas

Sistema de templates AIOX é mais sofisticado que parece:

1. **`template-format.md`** — especificação de formato YAML com seções, placeholders, elicitation
2. **`create-doc.md`** — orchestrator que processa templates preenchendo placeholders
3. **`advanced-elicitation.md`** — refinement pass que força interação em decisões críticas

**Dois tipos de markup:**
- `{{placeholder}}` — substituído por valor (visível)
- `[[LLM: instruction]]` — instrução para o Claude (INVISÍVEL ao usuário final)

**Aplicabilidade:** seu framework precisa separar **o que é texto final** de **o que é instrução para o modelo**. Usuário nunca vê as instruções.

### G.4 Bob Mode vs Advanced Mode (User Profile)

Descoberta importante: AIOX tem **dois modos de operação** baseados em `user_profile` no core-config:

| | **Bob Mode** | **Advanced Mode** |
|---|---|---|
| Target | Iniciantes, não-devs | Devs experientes |
| Agentes acessíveis | Apenas @pm (redireciona resto) | Todos |
| Greeting | `named` ou `minimal` (forçado) | `archetypal` (rico) |
| Comandos visíveis | Empty list (explore natural) | Todos (`*command`) |
| Interface | Linguagem natural obrigatória | Comandos + natural |

**Para info-produtor:** Bob Mode é o modelo certo. Cliente não precisa saber nomes de comandos, nem quais agentes existem. Fala naturalmente com o **Producer Companion** e ele roteia.

### G.5 Memory Lifecycle (como agentes aprendem)

Ciclo de promoção de padrões:

```
CAPTURE
(pattern aparece em MEMORY.md de agente)
    ↓
ACTIVE PATTERNS
(validado em 1 contexto)
    ↓
PROMOTION CANDIDATES
(se aparecer em 2+ contextos)
    ↓
[Threshold: 3 agentes]
    ↓
CLAUDE.md ou rules/
(vira regra oficial)
    ↓ OU
ARCHIVED
(se deprecated após 90 dias sem uso)
```

**Threshold de 3 agentes** evita overfitting. Padrões que aparecem em apenas 1-2 agentes ficam locais (MEMORY.md específico).

### G.6 Config Layering — 4 estratégias de merge

AIOX tem sistema de **5 camadas de configuração** (L1 framework → L5 user) com 4 estratégias distintas:

| Tipo | Estratégia | Exemplo |
|------|-----------|---------|
| **scalar** | last-wins | `port: 3000` sobrescreve anterior |
| **object** | deep-merge | `{ retry: { max: 3 } }` + `{ retry: { delay: 1000 } }` = `{ retry: { max: 3, delay: 1000 } }` |
| **array** | replace (não append!) | `plugins: [a,b]` + `plugins: [c]` = `[c]` (armadilha comum) |
| **array+append** | concat | `plugins+append: [c]` = `[a,b,c]` |

**Null deleta chave.** `port: null` remove port completamente.

### G.7 Context Detector (detecção de sessão)

Sistema detecta 3 tipos de sessão **sem consultar LLM**:

| Tipo | Detectado por | Comportamento |
|------|--------------|---------------|
| **new** | Nenhum histórico + sem state file | Greeting completo, full commands |
| **existing** | Histórico existe, sem workflow | Greeting breve, quick commands |
| **workflow** | Workflow pattern matchado | Greeting focado, key commands |

**Workflow patterns são HARDCODED** (story_development, epic_creation, backlog_management), não ML-based. Para info-produtor seriam: `campaign_launch`, `content_production`, `weekly_review`.

### G.8 Permission Mode — Classificador Global

**Toda tool call** passa por OperationGuard que classifica em 3 categorias:

| Categoria | Exemplos | Comportamento |
|-----------|----------|---------------|
| **read** | Read, Grep, Glob, git status | Sempre permitido |
| **write** | Edit, Write, git add/commit | Confirma em `ask` mode |
| **delete** | rm, git reset --hard | Sempre confirma (3 modos) |

**3 modos de permissão** (ciclável via `*yolo`):
- `ask` (default) — confirma antes de write/delete
- `auto` — executa tudo sem confirmar (YOLO)
- `explore` — só read, bloqueia write/delete

### G.9 Performance Tips (git fsmonitor, cache em arquivo)

Descobertas de otimização que não estavam mapeadas:

1. **Git fsmonitor (opt-in)** — daemon file-watching do git 2.37+ reduz git status de 50-200ms para <10ms em repos grandes
2. **Project Status cache em arquivo** — `.aiox/project-status.yaml` com TTL 60s. Git status só roda se cache expirou
3. **Timeout por loader em cascata** — crítico 80ms / high 120ms / best-effort 180ms. Falha de um não bloqueia sucessor

### G.10 Execution Traces — o que documentação esconde

Diferenças entre especificação e comportamento real (descobertas via `guides/agents/traces/`):

| Aspecto | Documentado | Real |
|---------|-------------|------|
| Tempo de Spec Pipeline | "2-4 horas" | Varia de 5min a 45min por fase |
| Self-healing iterations | "Max 2" | 3 para CRITICAL/HIGH, com timeout 30min |
| Agentes no Story Dev Cycle | "5" | 4 executam (SM, PO, Dev, QA); Master orquestra |
| Task outputs | "spec.md" | spec.md + critique.json + plan.json + loop-status.json |
| Path dependencies | "Consistentes" | Path ambiguity (`development/templates/` vs `product/templates/`) — resolver multi-path |

**Implicação:** documentação é aspiracional; traces revelam o sistema real. **Seu framework precisa de traces também** para cliente entender comportamento.

### G.11 Squad Expansion Packs — filosofia

AIOX tem filosofia declarada: squads são para domínios **NON-CORE** (business, wellness, games, mobile). Core agentes (pm, po, sm, dev, qa, architect, devops, analyst, data-engineer, ux) **NÃO devem crescer** — crescimento acontece em squads.

**Lista oficial de squads/packs (mencionada):**
- business/ — produtividade empresarial
- wellness/ — saúde e bem-estar
- games/ — game design
- mobile/ — app mobile
- [seu novo] content/ — criação de conteúdo (info-produtor)

**Isso significa:** o AIOX já considera info-produtor como domínio legítimo para expansion pack.

### G.12 Roadmap Q2 2026 — prioridades reveladas

Lendo `roadmap.md`, AIOX está priorizando:

**P0 (bloqueadores):**
- Learning curve — **10 minutes time-to-first-value**
- Clear IDE compatibility matrix
- First-value flow

**P1:**
- Compatibility contract enforced in CI
- Community-visible expansion packs

**P2:**
- Advanced features (spec pipeline, brownfield discovery)

**Implicação:** se seu framework info-produtor levar mais de 10 minutos para entregar valor após instalação, **você perde**. Onboarding ultra-rápido é chave.

### G.13 Armadilhas técnicas (para NÃO replicar)

1. **Ativação multi-timeout sem fallbacks em cascata** → 20% dos cenários quebram
2. **Template system simplificado demais** (juntar LLM instructions com texto final) → perde power
3. **Config merge sem documentar array vs array+append** → usuários sempre confundem

### G.14 Decisão estratégica atualizada

Com base em G.1 + G.2 + G.11, recomendo revisar estratégia:

**Nova recomendação:** iniciar como **Expansion Pack do AIOX** (3-5 semanas MVP) para validar mercado, com **path de migração** para framework standalone em v2 se houver tração.

**Vantagens:**
- 70% menos tempo até MVP
- Usa infra madura do AIOX (hooks, SYNAPSE, handoffs, Constitution)
- Clientes já familiarizados com AIOX viram canal de distribuição
- Você foca 100% em **conteúdo do domínio** (agentes, tasks, templates de info-produção)

**Desvantagens:**
- Dependência do AIOX (se AIOX muda, você quebra)
- Menos branding próprio inicialmente
- Upside financeiro limitado (você é squad, não framework)

**Recomendação final:** pergunta 7 das 9 originais (relação com Auroq/Euriler) + **adiciona pergunta 10: "Você topa começar como Expansion Pack do AIOX para validar, com path de migração para framework próprio em v2?"**

---

## Referências (paths explorados)

**AIOX (`aiox-core/`):**
- `.aiox-core/constitution.md`
- `.aiox-core/core/` (orchestration, memory, config, registry, synapse, quality-gates, execution)
- `.aiox-core/data/` (aiox-kb.md, entity-registry.yaml, tool-registry.yaml, capability-detection.js)
- `.aiox-core/development/agents/` (10 agentes: pm, po, sm, dev, qa, architect, devops, analyst, data-engineer, ux)
- `.aiox-core/development/tasks/` (create-next-story, dev-develop-story, qa-gate, spec-*, etc)
- `.aiox-core/development/templates/` (prd-tmpl, story-tmpl, handoff-tmpl)
- `.aiox-core/development/checklists/` (pm-checklist, story-dod, change-checklist)
- `.aiox-core/development/workflows/`
- `.aiox-core/infrastructure/`
- `.claude/settings.json` (deny/allow rules)
- `.claude/hooks/` (synapse-wrapper.cjs, precompact-wrapper.cjs)
- `.claude/rules/` (agent-authority, agent-handoff, workflow-execution)
- `bin/aiox.js`, `bin/aiox-init.js`
- `packages/installer/src/wizard/`
- `docs/stories/` (story-6.1.4.md real)
- `docs/architecture/` (command-authority-matrix)

**Auroq (`ai-business/`):**
- `.auroq-core/constitution.md`
- `.auroq-core/development/sistema-gestao-projetos.md`
- `.auroq-core/development/sistema-memoria.md`
- `agents/companion/` (companion.md, knowledge/, data/, commands/, tasks/)
- `agents/squad-forge/`
- `agents/clone-forge/`
- `agents/etlmaker/`
- `agents/organizer/`
- `business/cockpit.md`
- `business/campanhas/`
- `business/processos/`
- `docs/knowledge/expert-mind/`
- `docs/knowledge/expert-business/`
- `docs/knowledge/biblioteca-pmi/`
- `.claude/rules/` (dna-operacional, natural-language-first, memoria-inteligente, project-tracker, commit-inteligente)

---

## Próximos passos

1. **Usuário responde 9 perguntas da seção 14**
2. **Morgan (PM) gera PRD v1.0** via `*create-prd` com:
   - Constitution adaptada ao nicho
   - Catálogo de agentes definitivo
   - Workflows mapeados
   - Estrutura de pastas final
   - Roadmap priorizado
3. **Aprovação do PRD**
4. **Início da F0 — Diagnóstico**

---

**Fim do documento.**

*Gerado em 2026-04-15 por Morgan (PM) após exploração profunda com 9 agentes de pesquisa paralelos cobrindo: arquitetura core, agent system, tasks/templates/checklists, Auroq comparação, mecanismos invisíveis (hooks/SYNAPSE), distribuição/installer, entity registry + IDS, Auroq deep dive (Companion/Forges/Exocortex), e evidências reais.*
