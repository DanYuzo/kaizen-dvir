# VOL-10 — Governance, Evolução e Meta-Squads

> **KB:** KaiZen | **Consumer:** Moreh
> **Domínio:** D10 — Governance, Evolução e Meta-Squads
> **Fontes primárias:** `loc-06-blueprint-info-produtor` (seções 1, 8-9, 15, apêndices B-C), CLAUDE.md constitution + agent-authority, `loc-05-squad-creator/tasks/squad-creator-migrate`, `ext-04-state-2026`, `loc-01-danilo-metodo`, `loc-02-metodo-forge-exploracao`, `loc-01-danilo-posicionamento`
> **Regras cardinais principais:** RC-05, RC-09, RC-14, **RC-17**, **RC-18** (staged rollout)

---

## 1. O Que Este Volume Ensina

Volume final. Fecha o ciclo: como manter squads alinhados ao longo do tempo, como evoluir sem quebrar, como criar squads que criam squads (meta-forges).

Moreh aprende aqui:

1. **Constitution formal** — 6 artigos + severity levels + gates automáticos
2. **Agent Authority Matrix** — quem pode o quê exclusivamente
3. **Delegation matrix** — quando delegar, pra quem
4. **Anti-emulation** — por que nunca fingir ser outro agente
5. **Natural Language First** — interface primária é conversa, não comandos
6. **REUSE > ADAPT > CREATE** (IDS Principle) — 6 gates G1-G6
7. **Entity Registry** — catálogo de artefatos com checksum + adaptability score
8. **Forges (meta-squads)** — 5 tipos que criam outros agentes
9. **Migration e versionamento** — padrão creator-style
10. **Staged rollout (RC-18)** — interno → cliente é industry pattern
11. **State of Agent Engineering 2026** — LangChain survey
12. **Lente autoral Danilo** — 8 fases do método + mapeamento Moreh
13. **Decisões abertas do Moreh** — 3 pendências não resolvidas

---

## 2. Constitution Formal

Documento único com princípios **inegociáveis** + severity levels + gates automáticos.

### 2.1 Por que importa

Sem Constitution:
- Agentes inventam features
- Ignoram padrões
- Viajam fora do escopo
- Cada execução diverge

Com Constitution:
- Rules são carregadas em todo prompt (via SYNAPSE L0)
- Violações bloqueadas por gates
- Agentes referenciam artigos ao explicar decisões
- Consistência entre sessões

### 2.2 Constitution do AIOX (6 artigos)

| Art. | Nome | Severidade |
|------|------|-----------|
| I | **CLI First** — toda funcionalidade funciona via CLI antes de UI | NON-NEGOTIABLE |
| II | **Agent Authority** — cada agente tem domínios exclusivos | NON-NEGOTIABLE |
| III | **Story-Driven** — zero código sem story | MUST |
| IV | **No Invention** — tudo traça para requisito validado | MUST |
| V | **Quality First** — 5 gates bloqueiam (lint/typecheck/test/build/CodeRabbit) | MUST |
| VI | **Absolute Imports** — nunca relativos | SHOULD |

### 2.3 Constitution do Auroq (6 artigos)

| Art. | Nome | Severidade |
|------|------|-----------|
| I | **Claude Code é o Centro de Comando** | NON-NEGOTIABLE |
| II | **Cada um faz o seu** (separação de papéis) | NON-NEGOTIABLE |
| III | **Documentar = Investir** | MUST |
| IV | **Não inventar** | MUST |
| V | **Qualidade com julgamento** | MUST |
| VI | **Evolução incremental** | SHOULD |

### 2.4 Constitution proposta pra Moreh (derivada)

6 artigos, enriquecidos pelos insights:

| Art. | Nome | Severidade | Inspiração |
|------|------|-----------|------------|
| **I** | **CLI First → Observability Second → UI Third** | NON-NEGOTIABLE | AIOX + insight #6 |
| **II** | **Cada um faz o seu** (executor ≠ juíza ≠ coordenador) | NON-NEGOTIABLE | AIOX Art. II + Auroq Art. II |
| **III** | **Documentar = Investir** (6 triggers de salvamento) | MUST | Auroq Art. III |
| **IV** | **Não inventar** (zero inference, vocabulário do usuário) | MUST | Auroq Art. IV |
| **V** | **Qualidade com Gates Bloqueantes** | MUST | AIOX + Auroq |
| **VI** | **Evolução Incremental** (REUSE > ADAPT > CREATE + staged rollout) | SHOULD | Auroq Art. VI + insight #8 |

### 2.5 Severity levels

| Severity | Comportamento |
|----------|--------------|
| **NON-NEGOTIABLE** | Violação = HALT. Sem override |
| **MUST** | Violação = FAIL. Override possível com aprovação explícita (WAIVED) |
| **SHOULD** | Violação = WARNING. Registrar mas não bloquear |

### 2.6 Enforcement

Constitution aplica via:
- **SYNAPSE L0** (injeção em cada prompt)
- **Hooks PreToolUse** (bloqueia ações que violam)
- **Quality Gates** (checam aderência)
- **Agent instructions** (cada agente cita constitution em STRICT RULES)

---

## 3. Agent Authority Matrix

Cada agente tem **autoridades exclusivas**. Delegation é obrigatória quando fora do escopo.

### 3.1 Matriz do Auroq (já em CLAUDE.md)

#### Ops — Operações Exclusivas

| Operação | Exclusivo? |
|----------|-----------|
| `git push` / `git push --force` | SIM |
| `gh pr create` / `gh pr merge` | SIM |
| MCP add/remove/configure | SIM |
| Environment bootstrap | SIM |
| Commit inteligente (ritual completo) | SIM |

#### Companion — Cérebro do Sistema

| Operação | Exclusivo? |
|----------|-----------|
| Situação diária (boot + briefing) | SIM |
| Sistema de memória | SIM |
| Sistema de projetos | SIM |
| Weekly review | SIM |
| Roteamento pra agente adequado | SIM |
| Criação de projetos | SIM |

#### Organizer — Organização e Higiene

| Operação | Exclusivo? |
|----------|-----------|
| Diagnóstico de organização | SIM |
| Mover/renomear arquivos pra organizar | SIM (com aprovação) |
| Limpeza de temporários/duplicados | SIM (com aprovação) |
| Backup espelhado pro Google Drive | SIM |

#### Meta Squads — Criação de Agentes

| Squad | Operação Exclusiva |
|-------|--------------------|
| Squad Forge (`/squad-forge`) | Criar squads multi-agente |
| Mind Forge (`/mind-forge`) | Criar mentes sintéticas |
| Worker Forge (`/worker-forge`) | Criar workers |
| Clone Forge (`/clone-forge`) | Clonar mentes reais |
| ETLmaker (`/etlmaker`) | Extrair/estruturar KBs |

#### Workers — Execução

| Permitido | Bloqueado |
|---------|---------|
| `git add`, `git commit`, `git status` | `git push` (delegar pra Ops) |
| Execução de tasks operacionais | Criar novos agentes (delegar pro Meta Squad) |
| Atualização de documentos | Decisões estratégicas (delegar pro Expert) |

### 3.2 Moreh tem autoridade sobre

- Criação de novos squads via pipeline de 8 fases
- Extração de processos (via Archaeologist interno)
- Arquitetura de squads (via Smith interno)
- Validação de squads gerados

### 3.3 Moreh NÃO tem autoridade sobre

- `git push` / MCP config (delegar pro Ops)
- Weekly review / sistema de projetos (delegar pro Companion)
- Organização de arquivos (delegar pro Organizer)
- Decisões estratégicas do negócio (Expert decide)

---

## 4. Delegation Matrix

Quando Moreh encontra operação fora da sua autoridade:

### 4.1 Cross-agent delegation

```
Git push → Moreh → Ops (*commit / *push)
Novo agente → Moreh já faz (é meta-squad!)
Projeto novo → Moreh → Companion (*novo-projeto)
Memory save → Moreh detecta trigger → salva via rule memoria-inteligente
```

### 4.2 Escalation rules

1. Agente não consegue completar task → informar expert
2. Quality gate falha → retornar pro executor com feedback específico
3. Violação constitucional detectada → BLOCK, corrigir
4. Conflito de boundary → Constitution Art. II resolve (cada um faz o seu)

---

## 5. Anti-Emulation

Agente NUNCA pode "fingir ser" outro agente no mesmo contexto.

### 5.1 Por que é problema

Sem anti-emulation:
```
@dev ativo, usuário pede algo do escopo do @qa
→ @dev pretende ser @qa temporariamente
→ Contexto pollui (persona dual)
→ Output confuso
→ Autoridades vazam
```

### 5.2 Solução

| Situação | Ação |
|----------|------|
| Usuário pede algo fora do escopo | Rotear pra agente adequado (Companion intermedia) |
| Agente detecta autoridade alheia | Recusar + sugerir agente correto |
| Emergência onde outro agente não disponível | Halt + pedir usuário ativar manualmente |

### 5.3 Aplicação em Moreh

Moreh gera squads que respeitam anti-emulation. Cada agente do squad tem STRICT RULES que enumeram:
- O que esse agente NUNCA faz
- Quando delegar pra outro agente
- Autoridade exclusiva

---

## 6. Natural Language First

Todo agente opera por **linguagem natural**. Expert descreve o que quer com palavras dele; agente entende e executa.

### 6.1 Princípio

Expert **NUNCA** precisa saber nomes de comandos, sintaxe ou atalhos.

### 6.2 Como funciona

1. Expert fala naturalmente: "guarda esse documento", "cria squad pro meu processo"
2. Agente detecta intent (mapeia frase → modo/ação)
3. Agente executa

### 6.3 Regras

**Greetings:**
- Descrevem quem o agente é e o que faz
- Listam capacidades em linguagem natural com opções numeradas
- **NUNCA** listar sintaxe `*comando` no greeting
- Comandos `*` só aparecem em `*help` explícito

**Padrão de greeting:**
```
1. Banner com nome
2. Assinatura (ex: "Agente Auroq | Criado por Euriler Jube")
3. Uso ("Usado por ele e pela Mentoria Arcane")
4. Descrição criativa (2-3 linhas)
5. "O que posso fazer:" + opções numeradas
6. Convite aberto
```

**Deteção de intent:**
- Agente mantém mapa interno (frase natural → modo/ação)
- Se não encaixa: **perguntar pra clarificar, não pedir comando**
- Se ambíguo: "Você quer X ou Y?" com linguagem natural

**Comandos `*`:**
- Atalho pra power users
- **NUNCA** mencionados proativamente (exceto em `*help`)
- **NUNCA** exigidos

### 6.4 Aplicação em Moreh

Moreh gera squads que seguem Natural Language First. Agentes aceitam qualquer forma de pedido e roteiam internamente. Comandos existem mas não são interface primária.

---

## 7. REUSE > ADAPT > CREATE (IDS Principle)

Hierarquia de verificação antes de criar qualquer artefato.

### 7.1 Os 3 gates fundamentais

| Gate | Pergunta | Ação se sim |
|------|----------|-------------|
| **Gate 1: REUSE** | Já existe algo que resolve? | USAR direto |
| **Gate 2: ADAPT** | Existe algo parecido? | ADAPTAR |
| **Gate 3: CREATE** | Não existe nada? | CRIAR |

### 7.2 Aplicações práticas

| Situação | REUSE | ADAPT | CREATE |
|----------|-------|-------|--------|
| Nova campanha | Copiar `_template/` | Ajustar campanha anterior | Só se modelo novo |
| Novo processo | Verificar SOP existente | Adaptar similar | Documentar após |
| Novo agente | Verificar squad/worker | Adaptar existente | Meta Squad adequado |
| Novo documento | Verificar biblioteca-pmi/ | Adaptar doc existente | Adicionar à biblioteca |

### 7.3 Regra de ouro

**Cada artefato criado deve ser reusável.**

Sistema fica mais rico a cada uso, não mais poluído.

---

## 8. 6 Gates do IDS (AIOX)

Nível mais formal do IDS Principle.

### 8.1 Os 6 gates

| Gate | Ator | Severidade | Função |
|------|------|-----------|--------|
| **G1** | Strategist | Advisory | Ao criar campanha, mostra templates similares |
| **G2** | Companion | Advisory | Ao criar projeto, sugere reuso |
| **G3** | Editor | Soft block | Valida referências, detecta duplicação |
| **G4** | Copywriter | Advisory | Ao escrever, sugere swipes relevantes |
| **G5** | QA | **HARD BLOCK** | Bloqueia publish se duplicação sem justificação |
| **G6** | Publisher | **HARD BLOCK** | CI/CD registry integrity |

### 8.2 Aplicação info-produtor

"Este email é 92% igual ao Q1-promo — reutiliza?"

### 8.3 Decision Engine simplificado (MVP)

Similaridade por keyword match:

| Match | Decisão |
|-------|---------|
| > 90% | **REUSE** (copia direto) |
| 60-89% | **ADAPT** (customiza) |
| < 60% | **CREATE** (novo) |

### 8.4 Aplicação Moreh

MVP: 1 gate de reuso no Companion. G1-G6 completos = fase 2+.

---

## 9. Entity Registry

Arquivo YAML central catalogando **todos os artefatos** do framework.

### 9.1 Estrutura de cada entry

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

### 9.2 Escala

| Framework | Entries |
|-----------|---------|
| AIOX maduro | 745 artefatos catalogados |
| MVP info-produtor | 30-50 entries |

### 9.3 Uso

- Busca pre-criação (REUSE/ADAPT lookup)
- Auditoria de framework (o que existe?)
- Detecção de artefatos deprecated
- Dependência tracking

### 9.4 Aplicação Moreh

Moreh mantém registry próprio de squads gerados. Cliente pode query: "que squads já existem?" → Moreh responde via registry.

---

## 10. Forges — Meta-Squads

5 "fábricas" que criam outros agentes. Moreh está nessa categoria.

### 10.1 Os 5 Forges do Auroq

| Forge | Propósito | Fases | Output |
|-------|-----------|-------|--------|
| **Squad-Forge** | Cria squads multi-agente | 5 (extração → playback → arquitetura → montagem → validação) | Squad AIOS funcional |
| **Mind-Forge** | Cria mentes sintéticas | 4 | Agente consultor |
| **Worker-Forge** | Cria workers | Simplificado | Worker pronto |
| **Clone-Forge** | Clona mentes reais | 11 (coleta → MIUs → DNA → drivers → psicometria → perfil → validação) | Clone 360 |
| **ETLmaker** | Extrai conhecimento bruto em KB | 4 + validação 3-camadas | KB multi-volume |

### 10.2 Padrão comum

Todos Forges seguem:
1. **Setup** (escopo + estrutura)
2. **Extração** (do expert)
3. **Arquitetura/Organização** (decomposição estruturada)
4. **Montagem** (geração de artefatos)
5. **Validação** (gates + aprovação)

### 10.3 Fase crítica: Playback Validation

**Em TODOS os Forges:** Chief apresenta entregável ao expert em NARRATIVA (não YAML) ANTES de construir. Chief nunca inventa.

Isso é RC-15 aplicado sistematicamente.

### 10.4 Moreh — mapeamento pro método 8 fases

Moreh é um **Squad-Forge especializado no método Danilo**. Diferença do Squad-Forge do Auroq:

| Fase do método Danilo | Squad-Forge Auroq | Moreh |
|----------------------|-------------------|-------|
| 1. Problema real | ✅ 8 lentes | ✅ herda |
| 2. Mapear passo a passo | ✅ PUs | ✅ herda |
| 3. Stress test | ❌ | ✅ **autoria** |
| 4. Riscos + soluções | ❌ | ✅ **autoria** |
| 5. Priorização 80/20 | ❌ | ✅ **autoria** |
| 6. Inputs/outputs/quality gates | Parcial | ✅ combo (AIOX schema + Auroq gates) |
| 7. Níveis progressivos | ❌ | ✅ **autoria (diferencial único)** |
| 8. Feedback loop | ❌ | ✅ herda AIOX versioning |

**5 agentes autorais do Moreh:**
- stress-tester (fase 3)
- risk-mapper (fase 4)
- prioritizer (fase 5)
- flow-architect (fase 7)
- loop-instrumenter (fase 8)

### 10.5 Regra meta

**Forges só fazem sentido quando há volume.**

Blueprint: não criar Forge antes de ter **3+ squads operacionais maduros**. Meta-squad antes dos produtos = over-engineering.

Moreh só justifica-se porque Danilo tem **6+ clientes × múltiplos squads/cliente = dezenas de artefatos em 12 meses**.

---

## 11. Migration e Versionamento

Quando squad evolui (v1 → v2), migration gerencia.

### 11.1 Padrão AIOX (`*migrate-squad`)

Já coberto em VOL-04 seção 12. Resumo:

**Detecta:** legacy config.yaml, flat structure, missing fields.

**Corrige:** rename manifest, create dirs, add fields.

**Processo:**
```
1. Analyze → detectar issues
2. Confirm (se não --dry-run)
3. Backup → .backup/pre-migration-{timestamp}/
4. Execute → aplicar actions
5. Validate → squad-validator
6. Report → summary
```

### 11.2 Semantic versioning

Squads seguem semver: `MAJOR.MINOR.PATCH`.

- **MAJOR:** breaking changes (estrutura muda, cliente precisa migrar)
- **MINOR:** feature additions (backward compatible)
- **PATCH:** bug fixes, refinamentos

### 11.3 Aplicação Moreh

Squads gerados pelo Moreh vêm com version no squad.yaml. Cliente atualiza via migration tool quando Moreh atualiza template base.

### 11.4 Rollback

Sempre preservado em `.backup/pre-migration-{timestamp}/`.

---

## 12. Staged Rollout — RC-18

**Insight #8 validado pela indústria:** rollout staged interno → cliente é **best practice**, não scrappy.

### 12.1 Etapas

```
Etapa 1: Internal use (Danilo)
  ↓ validation & iteration
Etapa 2: Limited beta (2-3 clientes)
  ↓ feedback + refinement
Etapa 3: General availability (todos clientes)
```

### 12.2 Por que essa ordem

- **Dogfooding:** Danilo usa primeiro, encontra bugs antes do cliente
- **Reduz risco:** falhas não afetam relação comercial
- **Extrai PUs tácitos:** uso próprio revela micro-decisões que não apareceriam em entrevistas
- **Valida método antes de escalar:** se Moreh funciona pro Danilo primeiro, funciona pros clientes

### 12.3 Answer pra decisão #3 do Moreh

Era pendência: "Cliente do método-forge: só Danilo interno ou self-service pro cliente?"

**Resposta resolvida pela RC-18:** interno primeiro (Danilo dogfooding), cliente depois (staged rollout).

Não é escolha binária — é **ordem temporal**. Sempre interno antes de cliente.

### 12.4 Industry validation

**LangChain 2026 survey:**
- 67% das enterprises >10k funcionários têm agentes em produção
- Larger orgs transicionam mais rápido de pilots pra sistemas duráveis
- Greater investimento em platform teams, security, reliability

**Padrão:** MVP interno → beta limitado → GA. Não skip stages.

---

## 13. State of Agent Engineering 2026

Key findings do LangChain survey (1.340 respostas, Nov/Dec 2025):

### 13.1 Adoção

- **57%** têm agentes em produção (growing from 51% YoY)
- **30.4%** em desenvolvimento ativo
- **67%** das empresas 10k+ em produção vs 50% das <100

### 13.2 Barreiras

| Barreira | % |
|----------|---|
| **Quality** | 33% (top) |
| **Latency** | 20% |
| **Security** (empresas >2k) | 24.9% (2º) |

**Cost não aparece mais no top.** Preços caindo mudou prioridades.

### 13.3 Casos de uso

| Caso | % |
|------|---|
| Customer Service | 26.5% |
| Research & Data Analysis | 24.4% |
| Internal Workflow Automation | 18% |

Em enterprises (10k+): internal productivity é top (26.8%).

### 13.4 Observability (RC-17 validado)

- **89%** têm observability
- **94%** em produção têm observability
- **62%** têm detailed tracing
- **71.5%** em produção têm full tracing

> "Without visibility into how an agent reasons and acts, teams can't reliably debug failures, optimize performance, or build trust."

### 13.5 Evaluation

- **52.4%** rodam offline evals
- **37.3%** rodam online evals
- **44.8%** em produção rodam online evals

Métodos:
- Human review: 59.8%
- LLM-as-judge: 53.3%
- Traditional ML metrics: limitado

### 13.6 Model landscape

- **2/3+** usam GPT
- **75%+** usam múltiplos modelos
- **1/3** investe em infra pra deploy próprio
- **57%** NÃO fazem fine-tuning

Multi-model routing é padrão (confirmando insight #7).

### 13.7 Daily usage

1. **Coding agents** dominam (Claude Code, Cursor, Copilot)
2. **Research & deep research** (ChatGPT, Claude, Perplexity)
3. **Custom agents** em LangChain/LangGraph

### 13.8 Aplicação Moreh

Moreh opera num mundo onde:
- Agentes em produção é mainstream
- Qualidade > custo
- Observability é foundational
- Multi-model é padrão
- Evaluation está amadurecendo

**Moreh deve entregar squads que se encaixam neste padrão industry.**

---

## 14. Lente Autoral Danilo — Método 8 Fases

Contexto autoral que atravessa toda a KaiZen.

### 14.1 Tese central

**Implícito é o obvio ainda não documentado.**

Padrões, decisões e práticas que vivem na cabeça de quem faz, mas não foram extraídos nem formalizados.

Trabalho do Danilo: **documentar e transformar em obvio o que não é obvio** — passo a passo, com stress test, quality gates e feedback loop — até virar sistema que opera com ou sem o expert.

### 14.2 Filosofia

- **Apaixone-se pelo problema, não pela solução.** (Uri Levine)
- **O implícito precisa virar explícito pra ser operável.** Gente talentosa não sabe explicar — Danilo extrai.
- **Simplicidade antes de automação.** Não automatiza lixo.
- **Sistema que evolui > sistema perfeito.** Feedback loop desde dia 1.

### 14.3 As 8 fases

1. **Entender o problema real** (Continuous Discovery, Levine)
2. **Mapear o processo atual passo a passo** (transformar implícito em obvio)
3. **Stress test** (questionar cada etapa)
4. **Mapear riscos + soluções**
5. **Priorizar por impacto × esforço** (80/20)
6. **Definir inputs, outputs e quality gates**
7. **Sistematizar em níveis progressivos** (manual → simplificado → batch → automatizado — **não pular**)
8. **Feedback loop** (sistema melhora com o uso)

### 14.4 Ingredientes operacionais

- **Decomposição granular** (Hormozi): workflows, não cargos
- **Agentes especializados** por workflow, não generalistas
- **Skills markdown** como unidade de ativação
- **Handoffs estruturados**
- **IA como braço** que executa o sistematizado

### 14.5 Distinção competitiva

| Mercado faz | Danilo faz |
|-------------|-----------|
| Automatiza tudo | **Stress test** antes — corta o que não devia existir |
| 100% automático direto | **Níveis progressivos** — manual vira batch vira auto |
| Confia no output | **Quality gates** explícitos entre etapas |
| Sistema congelado | **Feedback loop** desde dia 1 |
| Copia template | Extrai o **implícito específico** do cliente |

### 14.6 Casos comprovados

**Caso 1: Relatórios B2B** (170 clientes):
- N0: impossível → N1: manual 2h/cliente → N2: simplificado 1h → N3: batch 1h pra todos → N4: 100% auto
- Prova: níveis progressivos funcionam

**Caso 2: Conteúdo pra palestras:**
- 3-4 dias → ~5h com qualidade superior
- Prova: "mapear antes de otimizar"

**Caso 3: Mentoria 1:1 → sistema escalável:**
- V1 (1:1) → V2 (diagnóstico antecipado) → V3 (feedback na ferramenta) → bonus (geração de múltiplos ativos)
- Prova: decomposição granular

### 14.7 Bases intelectuais

- **Kahneman** (Rápido & Devagar) — S1 bem-treinado libera S2
- **Greene** (Maestria) — prática deliberada
- **Levine** (Apaixone-se pelo Problema)
- **Cagan** (Inspired) — product management moderno
- **Torres** (Continuous Discovery Habits)
- **Hormozi** (100M series) — workflows granulares

### 14.8 Voice DNA Danilo (pra aplicar em toda KaiZen)

- Casual e direto (tom startupero, 23 anos)
- "ne?", "ta?", "a gente" — marcadores de proximidade
- "Fé" como âncora emocional
- CONCEITO → EXEMPLO → RETORNO AO CONCEITO (estrutura de ensino)
- Vulnerabilidade estratégica (mostra fraqueza antes da transformação)
- "Professor de boteco" — ensina sofisticado com naturalidade de conversa

### 14.9 Diretrizes de escrita

- **Nível de leitura 3ª série** — linguagem simples
- **Voz presente** ("quando você cria", não "está criando")
- **Voz ativa** ("nós carregamos", não "foi carregado")
- **Evitar advérbios** (geralmente verbos ruins)
- **Frases curtas** — uma vírgula máx
- **Linguagem positiva** ("continue", não "não pare")

### 14.10 Aplicação em toda KaiZen

Moreh absorve isso como **lente transversal**. Todo output de squad gerado, toda comunicação com expert, toda KB gerada **segue essas diretrizes**.

---

## 15. Decisões Abertas do Moreh

3 pendências não resolvidas. Moreh documenta, não decide.

### 15.1 Decisão #1: Unidade atômica

**Pendente:** PU do squad-forge (já validado) ou conceito próprio?

**Recomendação inicial:** PU — economiza desenho, aproveita validação existente.

**Trade-offs:**
- PU: reuso direto, menor esforço, herda validação
- Conceito próprio: diferenciação, perfeita aderência ao método 8 fases, mais esforço

**Quando resolver:** início da construção do Moreh.

### 15.2 Decisão #2: Output canônico

**Pendente:** YAML humanizado (estilo forge) vs JSON Schema formal (estilo creator) vs híbrido?

**Afeta:** fase 6 (contratos) e fase 8 (feedback loop / versionamento).

**Trade-offs:**
- YAML: legível, editável, Auroq compatibility
- JSON Schema: validação rigorosa, AIOX compatibility
- Híbrido: YAML interno, JSON exportado — melhor dos dois

**Recomendação da KaiZen:** **híbrido** (YAML autoria, JSON runtime — alinha com insight #3 de storage).

### 15.3 Decisão #3: Cliente do método-forge

**~~Pendente~~ RESOLVIDA:** staged rollout (RC-18) — interno Danilo primeiro, cliente depois. Industry pattern validado.

### 15.4 Decisão #4: Lente dos 5 agentes novos

**Pendente:** stress-tester, risk-mapper, prioritizer, flow-architect, loop-instrumenter são **ferramentas internas** do Danilo ou **entregáveis pro cliente**?

**Afeta TUDO:**
- Entregável: nível de polimento alto, docs extensas, UX cuidadosa
- Interno: scrappy aceitável, foco em funcionalidade

**Recomendação da KaiZen:** seguir staged rollout (RC-18). Etapa 1 = internos scrappy. Etapa 2/3 = polir se entregar ao cliente.

---

## 16. Regras Cardinais Aplicáveis (todas as 18)

Este volume consolida aplicação. Resumo:

| Regra | Consolidação em VOL-10 |
|-------|------------------------|
| RC-01 Zero inferência | Constitution Art. IV "Não inventar" |
| RC-02 Vocabulário do usuário | Natural Language First |
| RC-03 Task-first | Seguido via Constitution + Authority Matrix |
| RC-04 Pipeline unidirecional | Padrão em todos os Forges |
| RC-05 Separação de papéis | Constitution Art. II |
| RC-06 KB primária | Seguido em geração de squads |
| RC-07 Qualidade > velocidade | Constitution Art. V |
| RC-08 Documentar = investir | Constitution Art. III |
| RC-09 REUSE > ADAPT > CREATE | IDS Principle + 6 gates |
| RC-10 Playback antes de construir | Padrão de todos os Forges |
| RC-11 3+ examples + immune | Validado em nuclear structure |
| RC-12 QGs bloqueantes | 5 QGs por Forge |
| RC-13 Cobertura KB 80%+ | Gate em assemble-squad |
| RC-14 Anti-viagem | Constitution + DNA operacional |
| **RC-15 Human-in-loop em specs** | Playback obrigatório + hooks human-in-loop |
| **RC-16 Schema feedback loop** | Self-healing loop em validators |
| **RC-17 Observability dia 1** | CLI First → Observability Second → UI Third |
| **RC-18 Staged rollout** | Resposta pra decisão #3 + industry pattern |

---

## 17. Anti-Patterns

| Anti-pattern | Por que falha |
|--------------|---------------|
| Sem Constitution | Agentes inventam, viagem, inconsistência |
| Constitution "descritiva" (não enforceable) | Texto bonito sem consequência |
| Authority matrix vaga | Conflitos + emulation + caos |
| Emulation ("vou fingir ser outro agente") | Polui contexto, vaza autoridades |
| Comandos `*` como interface primária | Viola Natural Language First. UX ruim |
| Criar sem verificar existência | Viola RC-09 (REUSE > ADAPT > CREATE) |
| Forge antes de 3+ squads maduros | Fábrica antes dos produtos. Over-engineering |
| Skip staged rollout | Vai direto pro cliente. Bugs afetam relação comercial |
| Ignorar state of art 2026 | Reinventa rodas. 57% em produção é sinal |
| Voice DNA Danilo não aplicado | Squad gerado fala genérico. Perde diferencial autoral |
| Níveis progressivos pulados | Viola método Danilo (fase 7). Automatiza lixo |
| Decisões abertas ignoradas | Moreh construído sobre premissas não-validadas |
| Migration sem backup | Perde versão anterior. Sem rollback |

---

## 18. Resumo Executivo (cartão de referência)

**Constitution (6 artigos proposta pra Moreh):**
- I CLI First → Observability Second → UI Third (NON-NEGOTIABLE)
- II Cada um faz o seu (executor ≠ juíza ≠ coordenador) (NON-NEGOTIABLE)
- III Documentar = Investir (MUST)
- IV Não inventar (MUST)
- V Qualidade com Gates Bloqueantes (MUST)
- VI Evolução Incremental (REUSE > ADAPT > CREATE + staged rollout) (SHOULD)

**Agent Authority Matrix:** cada agente tem autoridades exclusivas. Cross-agent = delegation obrigatória.

**Anti-emulation:** agente NUNCA finge ser outro. Rotear, não emular.

**Natural Language First:** interface primária é conversa. Comandos `*` existem mas nunca exigidos.

**REUSE > ADAPT > CREATE (IDS):** 6 gates formais (G1 advisory → G6 hard block). Match >90% = REUSE. 60-89% = ADAPT. <60% = CREATE.

**Entity Registry:** catálogo de artefatos com checksum + adaptability score + lifecycle.

**5 Forges:** Squad-Forge (multi-agente) · Mind-Forge (mentes sintéticas) · Worker-Forge · Clone-Forge · ETLmaker. **Forge só se justifica com 3+ squads maduros.**

**Moreh = Squad-Forge especializado no método Danilo 8 fases.** Herda fases 1, 2, 6, 8. Autora fases 3, 4, 5, 7 (diferencial competitivo).

**Migration/versioning:** semver. `.backup/` sempre preservado. Rollback sempre possível.

**Staged rollout (RC-18):** interno → beta → GA. Resposta pra decisão #3. Industry pattern (não scrappy).

**State 2026:** 57% em produção · Quality > Cost · 89% observability · 75% multi-model · LLM-as-judge 53%. Moreh se encaixa neste landscape.

**Lente Danilo:** tese "implícito em obvio" · 8 fases · níveis progressivos (não pular) · voice DNA casual/direto · diretrizes 3ª série + voz ativa. **Transversal a toda KaiZen.**

**3 decisões abertas do Moreh:** unidade atômica (PU recomendado) · output canônico (híbrido recomendado) · lente dos 5 agentes novos (seguir staged rollout).

**Decisão #3 (cliente do método-forge) RESOLVIDA:** staged rollout.

---

## 19. Fechamento

KaiZen v1 completa. 10 volumes. Moreh tem a base cognitiva pra executar as 8 fases do método e gerar squads de qualidade industry-standard.

**Próximo:** Fase 3 do pipeline ETLmaker — **Integração** (README + REGRAS-CARDINAIS + REPERTORIO + GLOSSARIO + completeness-report). Docs transversais que unificam os 10 volumes num pacote coeso.

---

# APPENDIX v1.1 — Enriquecimento (2026-04-22)

Patches de governança: 5 trade-offs adicionais Auroq×AIOX, padrões AIOX de dry-run/backup/story-traceability, Niche Lock Protocol.

## A. Trade-offs arquiteturais adicionais (TA-04 a TA-08)

Além dos 3 já documentados (rounds iterativos, monolito vs 3 agentes, playback obrigatório vs docs prontos), a re-análise revelou 5 trade-offs adicionais:

### TA-04 — Extraction-Heavy vs Design-Heavy

| Auroq | AIOX |
|-------|------|
| 8 lentes iterativas, N rounds, playback obrigatório | Analisa docs prontos, gera design via recomendações |
| Assume: conhecimento está na cabeça do expert | Assume: docs pré-existentes de qualidade |
| Caro em tempo (2-12h), riqueza máxima em contexto | Rápido (horas), requer inputs bons |
| Vantagem: extrai tacit irreduntível | Vantagem: velocidade |

**Quando cada:** extração de processo autoral (Auroq) · documentação técnica existente (AIOX). Moreh usa Auroq como default (método Danilo é extração-first).

### TA-05 — 3 Agentes vs Monolito

| Auroq | AIOX |
|-------|------|
| Chief + Archaeologist + Smith | Craft (monolito com 10+ tasks) |
| Separação de concerns clara (RC-05) | Coesão máxima, simples |
| Overhead de handoffs entre agentes | Contexto acumula numa persona |

**Quando cada:** multi-expertise (Auroq) · processo linear com skill única (AIOX). Moreh = Auroq (mapeador + arquiteto + construtor são papéis distintos).

### TA-06 — Incremental Rounds vs Upfront Validation

| Auroq | AIOX |
|-------|------|
| Extrai em rounds, valida entre rounds, permite pause/resume | Valida ao final via JSON Schema + validator.js |
| Interativo, adapta baseado em respostas | Determinístico, feedback concentrado |
| Vantagem: captura drift antes de acumular | Vantagem: reprodutibilidade |

Não exclusivos. Moreh combina: incremental na extração, upfront no schema final.

### TA-07 — Process Map First vs Component Templates First

| Auroq | AIOX |
|-------|------|
| PUs → process map → blueprint → squad | Decision → template selection → extend → validate |
| Process-centric | Component-centric |

**Quando cada:** processo único/autoral (Auroq) · combinação de componentes conhecidos (AIOX).

### TA-08 — Bottleneck-Aware vs Uniform Governance

| Auroq | AIOX |
|-------|------|
| Identifica constraint (TOC), torna gate especial | Todos gates têm mesmo peso (blocking: true/false) |
| Governança específica ao contexto | Uniformidade escala |

Moreh adota Auroq (constraints importam).

## B. Dry-Run Pattern (PA-01)

Padrão AIOX reutilizável [Fonte: `squad-creator-migrate.md:32`, `squad-creator-extend.md:222`].

**Regra:** qualquer operação mutativa tem flag `--dry-run` que:
1. Simula a operação sem alterar filesystem
2. Imprime diff / preview do que aconteceria
3. Requer confirmação explícita antes da execução real

**Aplicado ao Moreh:**
- `*compose-squad --dry-run` → mostra estrutura de arquivos que criaria, não cria
- `*migrate-squad --dry-run` → mostra que migrations faria
- `*extend-kb --dry-run` → mostra que arquivos adicionaria

**Default:** se não passar `--dry-run`, operações mutativas EXIGEM confirmação interativa (RC-15).

## C. Backup Strategy (PA-02)

Padrão AIOX [Fonte: `squad-creator-migrate.md:80`].

**Regra:** antes de operações destrutivas (migrate, extend, restructure), criar snapshot em `.backup/pre-{operation}-{timestamp}/`.

```
squads/meu-squad/
├── squad.yaml
├── agents/
├── tasks/
└── .backup/
    ├── pre-migration-20260422T143200/
    │   ├── squad.yaml (cópia)
    │   └── agents/ (cópia)
    └── pre-extend-20260425T091500/
        └── ...
```

**Rollback:**
```bash
# Listar backups disponíveis
ls squads/meu-squad/.backup/

# Restaurar
rm -rf squads/meu-squad/squad.yaml squads/meu-squad/agents
cp -r squads/meu-squad/.backup/pre-migration-20260422T143200/. squads/meu-squad/
```

**Retention:** manter últimos 5 backups por squad, deletar antigos automaticamente. Backups vão pro `.gitignore` (rollback é local, não versionado).

## D. Story Traceability (PA-03)

Padrão AIOX [Fonte: `squad-creator-extend.md:33`, AIOX scripts-README].

**Conceito:** cada componente (task, agent, workflow) carrega metadata vinculando a uma story/sprint de evolução:

```yaml
# No frontmatter da task
---
task: "Escrever headline"
# ...
story_refs:
  - SQS-02  # Story da criação original
  - SQS-04  # Story de adição de voice-DNA
  - SQS-07  # Story de ajuste de critérios
---
```

**Por que importa:**
- Rastreia evolução do componente ao longo do tempo
- Conecta mudança ao contexto da decisão
- Debug facilita ("essa task mudou em SQS-07, o que estava no escopo de SQS-07?")

**Aplicado ao Moreh:** cada squad gerado mantém `stories/` com narrativas breves (nome, data, motivação, componentes afetados). Formato `SQS-NNNN-kebab-name.md`.

## E. Niche Lock Protocol (IC-02)

Detalhado em VOL-11 §12. Aqui a aplicação no governance [Fonte: `knowledge-refs/100M.txt:277-301`].

**Regra:** squad recém-gerado entra em "niche lock" — período mínimo de estabilidade arquitetural pra acumular dados.

```
Niche Lock Parameters:
  min_iterations: 10
  min_duration: 4 semanas
  
  During lock:
    ALLOWED changes: KB content, prompts, checklists
    FORBIDDEN changes: num_agents, role separation, quality gates
  
  Exit lock:
    Trigger: min_iterations reached OR min_duration reached
    Action: retro formal + decisão (manter / adaptar / reconstruir)
```

**Sinais legítimos pra quebrar lock cedo (todos os 3, não um):**
1. Mercado mudou estruturalmente (Market Validation vira RED)
2. Assumption crítica refutada em assumption testing
3. >=10 iterações OU >=4 semanas sem tração

**Alinhamento com anti-pattern existente:** "Forge antes de 3+ squads maduros" já previne over-forge. Niche Lock previne under-iteration.

## F. Atualização das Decisões Abertas do Moreh

A decisão #4 (lente dos 5 agentes novos) ganha novo input com esse appendix.

**Recomendação atualizada:** seguir staged rollout (RC-18) + Niche Lock Protocol combinados:
- Etapa 1 (interno Danilo): 5 agentes internos scrappy, foco em funcionalidade
- Niche Lock de 10 iterações sobre o conjunto inteiro
- Etapa 2 (pós-lock): retro → decisão sobre quais agentes viram entregáveis externos (com polimento) e quais continuam internos

---

## Fim do Appendix VOL-10 v1.1
