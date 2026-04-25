# VOL-08 — Orquestração e Sistema Nervoso

> **KB:** KaiZen | **Consumer:** Moreh
> **Domínio:** D8 — Orquestração e Sistema Nervoso
> **Fontes primárias:** `loc-06-blueprint-info-produtor` (seções 3-6, apêndice A — hooks/SYNAPSE), CLAUDE.md (modus operandi, sistema de projetos), `ext-02-lilianweng-agents` (planning component), `ext-04-state-2026` (multi-model routing)
> **Regras cardinais principais:** RC-07, RC-08, **RC-17** (observability desde dia 1)

---

## 1. O Que Este Volume Ensina

Sistema nervoso é o que separa amador de profissional. Sem isso, cliente tem que colar regras em cada prompt. Com isso, framework "faz sozinho".

Moreh aprende aqui:

1. **Hooks** — eventos interceptados do Claude Code (UserPromptSubmit, PreCompact, PreToolUse)
2. **SYNAPSE** — engine de injeção de contexto em 8 camadas (L0-L7)
3. **Companion pattern** — 6 camadas (SITUAR/LEMBRAR/ORIENTAR/FAZER/ROTEAR/PROTEGER)
4. **Modus operandi** — ciclos de sessão, semanal, projeto
5. **Session management** — PreCompact digest, state preservation
6. **Sistema de Projetos (Cockpit)** — max 3 ativos, inegociável
7. **Weekly review** — consolidação semanal
8. **Multi-model routing per-squad** (insight #7) — Haiku pra extração, Opus pra generation
9. **Observability desde dia 1 (RC-17)** — tracing + logs + dashboards

---

## 2. Hooks — Sistema Nervoso Invisível

Hooks são shell commands que Claude Code executa em resposta a eventos. Interceptam momentos-chave do loop.

### 2.1 Os 5 eventos principais

| Hook | Quando dispara | O que faz | Impacto |
|------|---------------|-----------|---------|
| **UserPromptSubmit** | Antes do Claude responder ao usuário | Injeta SYNAPSE rules + Constitution | **ALTO — é o coração** |
| **PreCompact** | Antes do autocompact | Captura snapshot de decisões/padrões em YAML | MÉDIO |
| **PreToolUse** | Antes de tool call | Valida/bloqueia calls que violam Constitution | MÉDIO |
| **PostToolUse** | Depois de tool call | Registra no log, atualiza status | BAIXO |
| **Stop** | Agente termina turn | Cleanup, save state | BAIXO |

### 2.2 Por que importa

**Sem hooks:** cliente precisa colar regras em cada prompt. Framework é só documentação.

**Com hooks:** framework **se auto-aplica**. Agente não precisa lembrar — rules entram automaticamente.

### 2.3 Implementação

Hooks em `.claude/hooks/`:

```
.claude/hooks/
├── synapse-wrapper.cjs          # UserPromptSubmit
├── precompact.cjs               # PreCompact
├── pretool-validator.cjs        # PreToolUse
└── posttool-logger.cjs          # PostToolUse
```

Configuração em `.claude/settings.json`:

```json
{
  "hooks": {
    "UserPromptSubmit": "node .claude/hooks/synapse-wrapper.cjs",
    "PreCompact": "node .claude/hooks/precompact.cjs"
  }
}
```

### 2.4 Hooks feedback é user-like

Feedback de hooks entra no contexto do Claude como se fosse do usuário. Se hook retorna "BLOCKED: viola Constitution Art. IV", Claude ajusta comportamento.

### 2.5 MVP da KaiZen/Moreh

**Blueprint recomenda** começar com **apenas UserPromptSubmit**:
- Injeta Constitution automaticamente
- Carrega rules do agente ativo
- Injeta contexto dinâmico relevante

Outros hooks vêm depois (Fase 2+).

---

## 3. SYNAPSE — 8-Layer Rule Injection

Engine de injeção de contexto. Carrega regras **dependendo do estado** atual.

### 3.1 As 8 camadas

| Layer | Nome | Carrega quando | Exemplo |
|-------|------|----------------|---------|
| **L0** | Constitution | SEMPRE (non-negotiable) | "CLI First", "No Invention", "KB Primária" |
| **L1** | Global | Sempre | Convenções de código, tom universal |
| **L2** | Agent | Agente ativo | Persona + commands + immune system |
| **L3** | Workflow | Workflow em andamento | Rules do Story Development Cycle |
| **L4** | Task | Task específica | Pre/post-conditions da task |
| **L5** | Squad | Squad em uso | Coordenação multi-agente do squad |
| **L6** | Keyword | Triggered por palavras | "refactor" → rules específicas |
| **L7** | Star-commands | `*comando` invocado | Rules do comando |

### 3.2 Exemplo de injeção

Usuário digita: `*create-squad my-squad`

SYNAPSE injeta:
- L0 Constitution (sempre)
- L1 Global conventions (sempre)
- L2 Persona do Craft/@squad-creator (agente ativo)
- L5 Squad-creator rules (squad em uso)
- L7 `*create-squad` task rules

Total injetado no contexto do LLM antes de responder.

### 3.3 MVP simplificado

Blueprint recomenda **3 layers no MVP**:
- **L0 Constitution** (sempre)
- **L1 Global** (conventions)
- **L2 Agent** (persona ativa)

Adicionar L3-L7 conforme necessidade.

### 3.4 Regra

SYNAPSE **não é substituto de KB**. KB é consulta explícita. SYNAPSE é **injeção automática** — rules operacionais sempre presentes.

---

## 4. Companion Pattern — 6 Camadas

Agente orquestrador permanente. Diferencial do Auroq.

### 4.1 As 6 camadas

```
SITUAR → LEMBRAR → ORIENTAR → FAZER → ROTEAR → PROTEGER
```

| Camada | Função |
|--------|--------|
| **SITUAR** | "Onde estou?" — carrega contexto dinâmico, posiciona expert |
| **LEMBRAR** | Acessa Exocortex + MEMORY.md de agentes, decisões passadas |
| **ORIENTAR** | Propõe foco do momento baseado em prioridades + contexto |
| **FAZER** | Executa tarefas diretas (briefings, ideações, decisões rápidas) |
| **ROTEAR** | Encaminha pra agente especializado quando caso exige |
| **PROTEGER** | Bloqueia desvios de foco, impõe max 3 projetos ativos |

### 4.2 Regra Companion Primeiro

**Companion NUNCA tenta resolver sozinho algo que agente especializado sabe fazer melhor.**

Exemplos:
- Expert pede "organiza meus arquivos" → Companion: "Tenho o Organizer. Ativo?"
- Expert pede "cria squad pro processo" → Companion: "Squad Forge faz isso. Ativo?"
- Expert pede "commit" → Companion: "Ops cuida. Chamo?"

### 4.3 Fallback

- Se expert disser não → Companion ajuda no que puder (avisa que resultado pode ser inferior)
- Se não existir agente pra aquilo → Companion resolve direto
- Se for dúvida rápida sobre agente → Companion responde sem rotear

### 4.4 Varredura de agentes instalados

Companion precisa saber o que tá instalado. Protocol:

1. Varrer `agents/` subdirectories
2. Ler `squad.yaml` / `config.yaml` / `README.md` de cada
3. Montar mapa em memória da sessão (não precisa arquivo)
4. Consultar quando expert pede algo que pode ter especialista

Atualizar varredura quando:
- Primeira vez que expert pede algo específico
- Pós instalação de novos agentes
- Expert pergunta "o que tenho instalado?"

---

## 5. Modus Operandi — Ciclos

Sistema não é coleção de pastas — é máquina que **gira**. Três ciclos acoplados.

### 5.1 Ciclo de Sessão

Toda vez que abre Claude Code:

```
BOOT → BRIEFING → TRABALHO → CHECKPOINT → ENCERRAMENTO
```

| Fase | O que acontece |
|------|---------------|
| **BOOT** | Companion carrega estado (contexto, cockpit, trackers, decisões, escalações) |
| **BRIEFING** | "Aqui é onde estamos. Isso importa. Foco sugerido." |
| **TRABALHO** | Expert escolhe foco. Trabalha com qualquer agente. Memória roda passivamente |
| **CHECKPOINT** | Ops `*commit` — checa trackers, contexto, decisões. Salva checkpoint |
| **ENCERRAMENTO** | Commit final. Contexto atualizado. Push = backup |

### 5.2 Ciclo Semanal

- Companion detecta 7+ dias sem review → puxa `*review`
- **20 min fixos:** cockpit, trackers, inbox, padrões, consolidação de memória

**Weekly review é obrigatório.** Sem ele, sistema estagna.

### 5.3 Ciclo de Projeto

```
NASCE → VIVE → MORRE → RETRO
```

| Fase | O que acontece |
|------|---------------|
| **NASCE** | `*novo-projeto` → cockpit + tracker + fases |
| **VIVE** | Agentes trabalham → tracker atualiza → Companion monitora escalações |
| **MORRE** | Retro → arquivo → vaga abre → próximo da fila entra |
| **RETRO** | 3 perguntas obrigatórias (o que funcionou · o que não · o que levar adiante) |

---

## 6. Session Management

### 6.1 PreCompact digest

Hook `PreCompact` captura snapshot em YAML antes do autocompact apagar tudo:

```yaml
snapshot:
  timestamp: "2026-04-21T14:30:00Z"
  active_agent: "@etl-chief"
  active_task: "kaizen composition"
  recent_decisions:
    - "KaiZen ↔ Moreh confirmado"
    - "10 volumes backbone aprovado"
  files_modified:
    - MAPA-TERRITORIAL.md
    - VOL-01 through VOL-06
  next_action: "Continue VOL-08"
```

Salvo em local persistente (`.auroq/sessions/`).

### 6.2 Post-autocompact recovery

Ao retomar:
1. Reler documento de trabalho
2. Reler snapshot (se existe)
3. Resumir estado
4. Confirmar com expert: "Continuamos de onde paramos?"

### 6.3 Regra operacional

**Salvar estado ANTES de operações longas.** DNA operacional obriga.

---

## 7. Sistema de Projetos — Cockpit

Expert opera negócio via projetos gerenciados.

### 7.1 4 camadas

| Camada | Onde | Propósito |
|--------|------|-----------|
| **Inbox** | Companion memory | Ideias brutas capturadas |
| **Cockpit** | `business/cockpit.md` | Fonte única de verdade. Max 3 ativos |
| **Playbooks** | `business/processos/` | Receitas reutilizáveis |
| **Trackers** | `business/campanhas/{projeto}/tracker.md` | Execução ao vivo |

### 7.2 Regras INEGOCIÁVEIS

- **Max 3 projetos ativos — SEM EXCEÇÃO** — Companion força "qual congela?"
- Todo ativo tem **next action** (sem isso, está morto)
- Fila ordenada por prioridade
- Weekly review obrigatório
- Todo projeto termina com **retro** (3 perguntas)

### 7.3 Seções do cockpit

```markdown
# Cockpit

## ATIVOS (max 3)
1. {projeto 1} — status + next action
2. {projeto 2} — status + next action
3. {projeto 3} — status + next action

## FILA (ordenada por prioridade)
1. {projeto 4}
2. {projeto 5}

## INBOX (ideias brutas)
- Ideia X
- Ideia Y

## CONGELADOS (someday/maybe)
- Projeto Z

## OPERAÇÕES (contínuas, não contam no max)
- Lead gen
- Conteúdo diário

## ARQUIVO
- {projeto finalizado A}
- {projeto finalizado B}
```

### 7.4 Por que max 3 é inegociável

- Atenção é finita
- Context switching destrói produtividade (Deep Work — Cal Newport)
- 3 é o limite empírico onde qualidade não colapsa
- Violação = sistema vira to-do list glorificado

Companion **bloqueia** tentativa de 4º ativo: "Qual dos 3 você congela?"

### 7.5 Protocolo pra agentes trabalhando em projetos [RC-08]

**ANTES de trabalhar:**
1. Ler tracker do projeto
2. Verificar dependências
3. Identificar sua tarefa

**DURANTE:**
4. Focar no escopo
5. Registrar blockers imediatamente

**DEPOIS:**
6. Atualizar tracker (Done + data)
7. Adicionar entrada no LOG
8. Se desbloqueou outra tarefa: fica visível automaticamente
9. Se completou última tarefa da fase: atualizar fase

---

## 8. Weekly Review

Companion conduz, expert valida.

### 8.1 Estrutura (20 min)

```
1. Cockpit (5 min)
   - 3 ativos avançaram?
   - Algum precisa congelar?
   - Fila mudou de prioridade?

2. Trackers (5 min)
   - Blockers ativos
   - Decisões pendentes
   - Escalações

3. Inbox (3 min)
   - Processar ideias novas
   - Mover pra fila ou descartar

4. Padrões (3 min)
   - O que se repetiu essa semana?
   - Padrões pra documentar?

5. Consolidação (4 min)
   - Atualizar contexto-dinamico.md
   - Commit semanal
```

### 8.2 Quando Companion puxa

- Se 7+ dias sem review → puxa automaticamente
- Se expert pede `*review`
- Se cockpit acumulou 5+ decisões não revisadas

---

## 9. Multi-Model Routing Per-Squad (RC-17-ish, insight #7)

**Novo insight do LangChain 2026:** 75%+ dos times em produção usam **múltiplos modelos**. Não é over-engineering — é padrão.

### 9.1 Por que routing

Tarefas diferentes têm trade-offs diferentes:

| Tarefa | Prioridade | Modelo sugerido |
|--------|-----------|-----------------|
| Extração rápida de texto | Velocidade, custo | Haiku |
| Classificação simples | Custo | Haiku |
| Generation complexa | Qualidade | Opus |
| Reasoning profundo | Capacidade | Opus |
| Playback de narrativa | Clareza, fluência | Sonnet |
| Validation (schema) | Precisão | Haiku ou Sonnet |

### 9.2 Aplicação em Moreh

Exemplo: squad de extração de processo do Moreh.

- **process-archaeologist** → Sonnet (extração com nuance)
- **forge-chief** (playback narrativo) → Sonnet (clareza)
- **forge-smith** (arquitetura técnica) → Opus (profundidade)
- **validator/analyzer** → Haiku (validação estrutural rápida)

**Resultado:** qualidade alta onde precisa, custo baixo onde não precisa.

### 9.3 Config por agente

```yaml
# Em squad.yaml ou agent.md
agents:
  - id: archaeologist
    model: sonnet
    reasoning: "Extração exige nuance mas não precisa Opus"

  - id: smith
    model: opus
    reasoning: "Arquitetura complexa exige capacidade máxima"

  - id: validator
    model: haiku
    reasoning: "Validação estrutural rápida, custo baixo"
```

### 9.4 Observability por modelo

Rastrear (RC-17):
- Token cost por agente
- Quality score por modelo (blind A/B em tasks equivalentes)
- Latency por modelo

Permite otimizar routing ao longo do tempo.

### 9.5 Default conservador

Se não souber qual modelo, default **Sonnet** (equilíbrio). Otimizar depois com dados.

---

## 10. Observability Desde Dia 1 (RC-17)

Já coberto em VOL-06 seção 15. Aqui foco em **implementação no nível de orquestração**.

### 10.1 Tracing hierárquico

```
Squad session (trace ID)
├── Phase 1: Extraction (span)
│   ├── archaeologist (span)
│   │   ├── Round 1 (span)
│   │   ├── Round 2 (span)
│   │   └── Round 3 (span)
│   └── QG-SF-001 check (span)
├── Phase 2: Playback (span)
│   └── chief playback (span)
└── ...
```

### 10.2 O que rastrear por camada

| Camada | O que |
|--------|-------|
| Session | Duração total, cost, outcome |
| Phase | Duração, PUs gerados, QG result |
| Agent | Tokens in/out, tools used, model used |
| Task | Input, output, iterations (self-healing) |

### 10.3 Dashboard mínimo

Não precisa ser UI. Pode ser markdown report:

```markdown
# Squad Session Report — kaizen-2026-04-21

## Overview
Duration: 3h 42min
Total cost: $X.XX
Phases: 6/6 PASS

## Agents
| Agent | Tokens | Model | Cost |
|-------|--------|-------|------|
| etl-chief | 45k | sonnet | $1.20 |
| ... | ... | ... | ... |

## QG Results
- QG-ETL-000: PASS
- QG-ETL-001: PASS
- ...
```

### 10.4 CLI First → Observability Second → UI Third

Ordem de implementação:
1. CLI funcional (todas as operações via terminal)
2. Observability (logs + traces + reports)
3. UI (só observa, nunca duplica funcionalidade)

Violar essa ordem = projeto que nunca entrega MVP.

---

## 11. Hooks Feedback Como User-Like

Feedback de hooks é tratado como mensagem do usuário pelo Claude.

### 11.1 Implicação

Se hook retorna "BLOCKED: ação viola Constitution Art. IV", Claude:
1. Interrompe execução
2. Trata como se usuário tivesse dito isso
3. Ajusta comportamento
4. Pode explicar ao usuário o que foi bloqueado

### 11.2 Uso em validação

```
PreToolUse hook valida:
  - tool chamado viola allow/deny rules?
  - parâmetros violam constitution?
  - agent tem autoridade pra essa operação?

Se falha: retorna mensagem estruturada
Claude ajusta sem continuar a operação bloqueada
```

### 11.3 Poder e perigo

**Poder:** aplicar regras automaticamente sem depender do LLM lembrar.

**Perigo:** hooks mal implementados bloqueiam operações legítimas. Exige teste cuidadoso.

---

## 12. Padrões Arquiteturais de Orquestração

Do Weng (LLM Agents):

### 12.1 ReAct (Reason + Act)

Alternância entre pensamento e ação. Coberto em VOL-09.

### 12.2 HuggingGPT pattern

Task planner + experts + executor + response generator. Moreh opera nesse pattern em alto nível:
- Chief = task planner
- Archaeologist/Smith = experts
- Validators = executor
- Chief again = response generator

### 12.3 AutoGPT pattern

Single agent com goals + constraints + commands + memory + performance evaluation. Simplificação mono-agente.

### 12.4 Generative Agents (Park et al.)

Múltiplos agentes com memory stream + reflection + planning. Multi-agent simulation.

**Aplicação Moreh:** pegar elementos de cada conforme caso. Não adotar um como dogma.

---

## 13. Regras Cardinais Aplicáveis

| Regra | Aplicação em VOL-08 |
|-------|---------------------|
| **RC-07 Qualidade > velocidade** | Companion pausa, protege foco, força review |
| **RC-08 Documentar = investir** | PreCompact digest, session state, weekly review |
| **RC-17 Observability dia 1** | Tracing + logs + dashboards. CLI First → Obs Second → UI Third |

---

## 14. Anti-Patterns

| Anti-pattern | Por que falha |
|--------------|---------------|
| Sem hooks | Cliente tem que colar rules manualmente. Framework = só doc |
| Hooks complexos no MVP | Over-engineering. UserPromptSubmit basta pra começar |
| SYNAPSE 8 layers completo de cara | Over-engineering. MVP = L0 + L1 + L2 |
| Sem Companion | Framework não se auto-coordena. Expert faz trabalho do SO |
| Companion tenta resolver tudo | Viola Companion Primeiro. Rotear pra especialistas |
| >3 projetos ativos | Atenção fragmentada. Qualidade colapsa |
| Sem weekly review | Sistema estagna. Padrões se perdem |
| Sem retro no fim de projeto | Aprendizado perdido |
| Session state não persistido | Autocompact apaga tudo. Recomeça |
| Multi-model desde MVP | Over-optimization. Default Sonnet, routing depois |
| Observability "quando tiver tempo" | Viola RC-17. Nunca acontece |
| UI antes de CLI completo | Viola CLI First. Projeto trava |

---

## 15. Resumo Executivo (cartão de referência)

**Sistema nervoso = hooks + SYNAPSE + Companion + modus operandi.**

**5 hooks:** UserPromptSubmit (coração) · PreCompact · PreToolUse · PostToolUse · Stop. **MVP = só UserPromptSubmit.**

**SYNAPSE 8 layers:** L0 Constitution (sempre) · L1 Global · L2 Agent · L3 Workflow · L4 Task · L5 Squad · L6 Keyword · L7 Star-commands. **MVP = L0+L1+L2.**

**Companion 6 camadas:** SITUAR · LEMBRAR · ORIENTAR · FAZER · ROTEAR · PROTEGER. **Regra Companion Primeiro:** nunca resolve algo que especialista faz melhor.

**3 ciclos:**
- **Sessão:** BOOT → BRIEFING → TRABALHO → CHECKPOINT → ENCERRAMENTO
- **Semanal:** Weekly Review (20 min, obrigatório)
- **Projeto:** NASCE → VIVE → MORRE → RETRO (3 perguntas)

**Cockpit:** max 3 projetos ativos INEGOCIÁVEL. Companion força "qual congela?" quando tenta 4º.

**Multi-model routing (insight #7):** Haiku extrai/valida · Sonnet default · Opus generation complexa. Config por agente, observability mede.

**Observability (RC-17):** tracing hierárquico (session/phase/agent/task) + dashboards básicos. Ordem: **CLI First → Observability Second → UI Third**.

**Companion varre `agents/` pra saber o que tá instalado. Atualiza em triggers específicos.**

---

**Próximo volume:** VOL-09 — Padrões de IA (Reasoning + Prompting + Tool Use).

---

# APPENDIX v1.1 — Enriquecimento (2026-04-22)

Patches de orquestração: State Persistence, Complexity Routing, Handoff Artifact Protocol e Trio Pattern. Origem: re-análise squad-forge + Torres.

## A. State Persistence + Resumability (MP-03)

Padrão do squad-forge completo [Fonte: `agents/squad-forge/agents/forge-chief.md:69-89`, `squad.yaml:resumable: true`, `workflows/wf-squad-forge.yaml:74-75`].

Pipeline é pausável e resumível. Chief mantém estado em `.state.json`:

```yaml
state:
  process_slug: "{slug}"
  process_name: "{nome}"
  mode: "extract|architect|assemble|validate|refine"
  version: "{X.Y.Z}"
  current_phase: 0-5
  phase_status:
    phase_0: "pending|in_progress|completed"
    phase_1: "pending|in_progress|completed"
    # ...
  extraction_rounds: N
  total_pus: N
  quality_gates_passed: []
  paused_at: ""
  resumed_at: ""
```

**Comandos de controle:**
- `*pause` — salva estado atual, pipeline fica idle
- `*resume` — carrega `.state.json`, continua da fase em `in_progress`
- `*status` — imprime estado atual sem agir

**Regra pós-autocompact:** ao reativar, Chief relê `.state.json` + MAPA (se existir) antes de qualquer ação. Nunca assume estado da memória de trabalho.

**Aplicado ao Moreh:** qualquer squad gerado que tenha pipeline longo (>2h) DEVE ter `.state.json` + comandos `*pause`/`*resume`.

## B. Complexity Routing (MP-01)

3 modos de operação que adaptam estratégia baseado em escala [Fonte: `agents/squad-forge/workflows/wf-squad-forge.yaml:285-300`]:

| Modo | Trigger | Rounds | Agentes | Tempo |
|------|---------|--------|---------|-------|
| **simple** | 5-15 PUs esperados | 2-3 | 1-2 | 2-3h |
| **standard** | 16-30 PUs esperados | 3-4 | 2-4 | 4-6h |
| **complex** | 31+ PUs esperados | 4-6 | 4-7 | 8-12h |

**Como detectar complexidade upfront (heurísticas):**
- Complexidade baixa: processo linear, 1 decisor, <5 ferramentas
- Complexidade média: múltiplas áreas, 2-3 decisores, 5-10 ferramentas
- Complexidade alta: fluxos paralelos, >3 decisores, 10+ ferramentas

**Regra:** Moreh escolhe modo NA FASE 0 (setup). Chief adapta rondas, agentes convocados, timeline esperada. Modificar modo mid-pipeline exige aprovação explícita do expert.

## C. Handoff Artifact Protocol (MP-07) — visão executável

Já coberto em VOL-07. Aqui a integração com orquestração [Fonte: `agents/squad-forge/agents/forge-chief.md:207-234`]:

**Fluxo operacional:**

```
1. Chief coordena transição:
   @archaeologist → @smith
   
2. Gera handoff artifact (YAML ~379 tokens):
   from: archaeologist
   to: smith
   context:
     process_slug: "montar-oferta"
     pus_extracted: 24
     confidence_avg: 0.82
     gaps_remaining: 0
     playback_approved: true
   instruction: "Arquitetar squad com 2-4 agentes"
   
3. Chief salva em .auroq/handoffs/
4. Chief ativa @smith, passa artifact (não persona anterior)
5. Smith lê artifact + KB relevante + MAPA
6. Smith executa sem carregar contexto de @archaeologist
```

**Ganho:** 33-57% redução de contexto em switches (medido em VOL-07).

## D. Trio Pattern — discovery contínua pós-launch

Do Torres [Fonte: `knowledge-refs/continuous.txt:55, 119-128`]. Detalhado em VOL-11 §11. Aqui a aplicação operacional na orquestração:

**3 papéis permanentes por squad ativo:**

| Papel | Responsabilidade | Quem preenche |
|-------|------------------|---------------|
| **Executor** | Roda a task | Agent principal do squad |
| **Validator** | Avalia output | Agent separado (RC-05) |
| **Researcher** | Observa drift, detecta patterns, sugere ajustes | Companion ou agente dedicado |

**Cadência semanal obrigatória (15-20 min):**

```
[Seg 9:00] Trio Sync
  Executor: O que rodou? Onde travou?
  Validator: Onde reprovei? Por quê?
  Researcher: O que observei que ninguém pediu?

Output: 1-3 decisões pra semana (ajuste em KB, prompt, checklist).
Escreve em business/campanhas/{squad}/trio-log.md
```

**Alinhamento com RC-20:** trio é o mecanismo que mantém a KB viva. Sem trio sync, KB congela, squad decai.

## E. Greenfield Detection (PA-04)

Padrão AIOX [Fonte: `aiox-core/.codex/skills/aiox-squad-creator/squad-creator.md:24-25`].

**Detecção:** se `gitStatus=false` (não é repo git), squad-creator pula narrativa git + oferece `*environment-bootstrap`.

**Aplicado ao Moreh:**
- Se o projeto do expert não tem `.git`, oferecer bootstrap (Ops cria repo inicial)
- Se o projeto não tem `agents/` ou `business/`, avisar: "projeto não tem infra Auroq — quer que eu crie?"
- Se tem estrutura mas inconsistente, rotear pro Organizer

Sem essa detecção, Moreh tenta operar em projeto imaturo e gera erros confusos.

## F. Dashboard mínimo (enriquecimento de RC-17)

Consolidação com insight #6 (observability dia 1) + multi-model routing. Formato de relatório por sessão:

```markdown
# Squad Session Report — {squad}-{timestamp}

## Overview
Mode: {simple|standard|complex}
Duration: {Xh Ymin}
Total cost: ${X.XX}
Phases: X/Y PASS

## State transitions
{YYYY-MM-DD HH:MM} — phase_0 → phase_1 (PASS QG-XYZ-000)
{YYYY-MM-DD HH:MM} — phase_1 → phase_2 (PASS QG-XYZ-001)
...

## Agents
| Agent | Model | Tokens in/out | Cost | Iter |
|-------|-------|---------------|------|------|
| ...   | ...   | ...           | ...  | ...  |

## QG Results
- QG-XYZ-000: PASS
- QG-XYZ-001: CONCERNS (2 warnings)
- ...

## Handoffs
archaeologist → smith (artifact: 412 tokens, saved)
smith → validator (artifact: 378 tokens, saved)

## Detected patterns (Researcher output)
- ...
```

Alinha observability com state persistence (seção A) e handoffs (seção C) num único formato consumível.

---

## Fim do Appendix VOL-08 v1.1
