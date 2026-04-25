# REGRAS CARDINAIS — KaiZen

> 21 regras inegociáveis que atravessam toda a KB. Moreh deve conhecer e respeitar TODAS.
>
> **v1.1 (2026-04-22):** adicionadas RC-20, RC-21, RC-22 (oriundas do merge com 5 refs externas).
> RC-19 original (Market Validation) e RC-23/24 (Hook Design / Variable Reward) foram propostas mas NÃO adotadas — conteúdo permanece como frameworks operacionais em VOL-11 (§2, §9, §10) sem status de regra cardinal. Numeração do intervalo mantida pra rastreabilidade do histórico.

---

## Hierarquia de Severidade

| Severity | Comportamento |
|----------|--------------|
| **NON-NEGOTIABLE** | Violação = HALT. Sem override possível |
| **MUST** | Violação = FAIL. Override possível com WAIVED + aprovação explícita |
| **SHOULD** | Violação = WARNING. Registrar mas não bloquear |

---

## As 18 Regras

### Fundamentais (do processo extraído)

#### RC-01 — Zero Inferência
**Severity:** NON-NEGOTIABLE

**Regra:** Se parece faltar, PERGUNTAR. Não preencher com suposições.

**Contexto:** Agentes que inventam produzem output não-auditável. Cliente descobre tarde. Confiança quebra.

**Aplicação:** durante extração, se Archaeologist não tem info, pergunta. Nunca completa lacunas.

**Anti-pattern:** "Vou assumir que..." seguido de invenção.

**Fonte:** process-archaeologist + Constitution Art. IV

---

#### RC-02 — Vocabulário do Usuário É Sagrado
**Severity:** MUST

**Regra:** Usar os termos do expert, nunca inventar nomenclatura.

**Contexto:** Expert tem vocabulário próprio do domínio. Traduzir pra jargão técnico destrói transferência de conhecimento.

**Aplicação:** KB usa termos do expert. Glossário documenta o jargão real.

**Anti-pattern:** renomear "criativo" pra "ad asset" sem autorização.

**Fonte:** extraction-lenses + tom-de-voz Danilo

---

#### RC-03 — Task-First Architecture
**Severity:** NON-NEGOTIABLE

**Regra:** Tasks são primárias. Agentes executam tasks.

**Contexto:** Agent-first leva a improvisação. Task-first garante contratos.

**Aplicação:** primeiro listar tasks, depois atribuir agentes.

**Anti-pattern:** criar agente com "capabilities" sem tasks explícitas.

**Fonte:** squad-schema AIOX + Auroq

---

#### RC-04 — Pipeline Unidirecional
**Severity:** MUST

**Regra:** Workflows não voltam. Decisões são upstream. Revisões acontecem dentro de fases, não entre fases.

**Contexto:** Ciclos voltados quebram garantias de progresso. Pedro Valerio (creator): "processo que permite erro é processo quebrado".

**Aplicação:** workflow YAML sem loops entre fases. Self-healing loop DENTRO de fase (não entre).

**Anti-pattern:** "se Fase 4 falhar, volta pra Fase 2".

**Fonte:** Pedro Valerio (creator) + squad-forge

---

#### RC-05 — Separação de Papéis
**Severity:** NON-NEGOTIABLE

**Regra:** Executor ≠ Juíza ≠ Coordenador. NUNCA o mesmo agente faz dois.

**Contexto:** Viés de execução compromete julgamento. Coordenador que executa vira micromanager.

**Aplicação:**
- Coordenador orquestra, não executa
- Executor faz, não valida
- Juíza valida, não cria

**Anti-pattern:** forge-chief executando task de extração em vez de delegar pro archaeologist.

**Fonte:** AIOX constitutional + Auroq Art. II

---

#### RC-06 — KB É Artefato Primário
**Severity:** MUST

**Regra:** Knowledge Base é o cérebro do squad, não arquivo de suporte. Squad operacional sem KB rica = squad burro.

**Contexto:** Compressão agressiva de ETL pra skeleton leva a squads incompetentes.

**Aplicação:** 6 seções essenciais (regras, protocolos, decision trees, tabelas, troubleshooting, glossário). ETL integration quando existe.

**Anti-pattern:** KB de 150 linhas quando ETL tem 3.000. Compressão perdeu profundidade.

**Fonte:** forge-kb + assemble-squad Step 6

---

#### RC-07 — Qualidade > Velocidade, Sempre
**Severity:** MUST

**Regra:** Pipeline blocado, não one-shot. Qualidade não se negocia por agilidade.

**Contexto:** Método Danilo: "não automatizar lixo". Simplicidade antes de automação.

**Aplicação:** quality gates bloqueantes. Apressar = FAIL invisível em produção.

**Anti-pattern:** "vamos pular o playback pra ser ágil".

**Fonte:** Método Danilo + Constitution Auroq Art. V

---

#### RC-08 — Documentar = Investir
**Severity:** MUST

**Regra:** O que não é documentado morre. Seis triggers obrigatórios de salvamento.

**Contexto:** Decisões não registradas são retrabalho garantido. Padrões não salvos são insights perdidos.

**Aplicação:** 6 triggers (decisão tomada, projeto progrediu, conhecimento criado, padrão detectado, sessão encerrando, autocompact iminente).

**Anti-pattern:** "depois eu documento" (nunca documenta).

**Fonte:** CLAUDE.md DNA + Constitution Auroq Art. III

---

#### RC-09 — REUSE > ADAPT > CREATE
**Severity:** MUST

**Regra:** Antes de criar qualquer artefato, verificar se já existe.

**Contexto:** Sistema fica rico com uso (reuso), não com proliferação (criação). IDS Principle.

**Aplicação:** 3 gates mentais (REUSE → ADAPT → CREATE). 6 gates formais (G1-G6).

**Anti-pattern:** criar 15º template quando 3 similares já existem.

**Fonte:** IDS Principle + Constitution Auroq Art. VI

---

### Qualidade e Validação

#### RC-10 — Playback Antes de Construir
**Severity:** MUST

**Regra:** Apresentar processo em narrativa (não YAML) e coletar aprovação explícita do usuário ANTES de construir squad.

**Contexto:** Squad construído sobre processo não-validado = retrabalho garantido ou pior (squad errado em produção).

**Aplicação:** QG-SF-002 bloqueia. Chief apresenta narrativa, expert confirma "esse é meu processo".

**Anti-pattern:** pular playback "pra ser ágil".

**Fonte:** playback-validate + Chief forge

---

#### RC-11 — 3+ Output Examples + 3+ Immune Triggers por Agente
**Severity:** MUST

**Regra:** Todo agente gerado deve ter mínimo 3 output examples (happy path + decisão + exceção) + mínimo 3 immune system triggers. Extraídos do processo real, não inventados.

**Contexto:** LLMs sem referência concreta improvisam. Agente sem immune system é vulnerável a prompts maliciosos.

**Aplicação:** assemble-squad Step 3 (agents) + nuclear-structure-validation.

**Anti-pattern:** agente com persona linda, zero exemplos, zero immune.

**Fonte:** assemble-squad + nuclear-structure-validation

---

#### RC-12 — Quality Gates São Bloqueantes
**Severity:** MUST

**Regra:** Se gate não passa, não avança. (Exceção: override explícito WAIVED + registro.)

**Contexto:** Gate que só "sugere" é valor zero. Valor está em bloquear.

**Aplicação:** 5 QGs do squad-forge (SF-001 a 005) + 6 QGs do ETLmaker (ETL-000 a 005).

**Anti-pattern:** gate "passou com observações" sem registrar veto conditions.

**Fonte:** squad-forge QGs + AIOX self-healing

---

#### RC-13 — Cobertura de KB Mínima 80%
**Severity:** MUST

**Regra:** Cada PU-TACIT representado na KB. Cada PU-DECISION com ≥2 branches tem decision tree. Cada PU-STEP operacional tem protocolo detalhado. Cada PU-EXCEPTION crítica tem troubleshooting.

**Contexto:** KB <80% = squad não sabe operar em situações que o processo prevê.

**Aplicação:** assemble-squad Step 6d (checklist). Cobertura <80% = HALT.

**Anti-pattern:** 20 PU-TACITs, 3 aparecem na KB. "80% da info tá nas tasks" ≠ 80% na KB.

**Fonte:** assemble-squad Step 6d

---

#### RC-14 — Anti-Viagem
**Severity:** MUST

**Regra:** Executar dentro do escopo planejado. Mudar plano só com aprovação explícita.

**Contexto:** Agentes que "melhoram" escopo inventam features não solicitadas. Cliente não pediu, não paga, não quer.

**Aplicação:** documento de trabalho é a coleira. Fora do escopo = PARAR e perguntar.

**Anti-pattern:** "achei que seria melhor adicionar X..." sem pedir.

**Fonte:** DNA operacional + Constitution Auroq

---

### Insights pós-exploração

#### RC-15 — Human-in-Loop Obrigatório em Toda Mutação de Specs
**Severity:** NON-NEGOTIABLE (KaiZen-level)

**Regra:** Toda mutação de specs exige aprovação humana explícita. Playback não é etapa — é rule KaiZen-level.

**Contexto:** Anti prompt-injection. Previne deriva incremental. Garante rastreabilidade.

**Aplicação:**
- Playback do processo extraído
- Aprovação de blueprint de squad
- Aprovação de squad gerado (Fase 5)
- Smoke tests
- WAIVED override de gate
- Updates de AGENTS.md / MEMORY.md

**Anti-pattern:** squad auto-atualiza AGENTS.md sem aprovação. Prompt injection entra.

**Fonte:** LangChain Memory (insight #4)

---

#### RC-16 — Schema Validation Com Feedback Loop pro LLM
**Severity:** MUST

**Regra:** Erros de validação voltam como input pro LLM corrigir. Max 3 iterações antes de escalar.

**Contexto:** Validação estática sozinha é insuficiente. Feedback loop permite self-healing.

**Aplicação:**
- squad-validator.js integrado com retry loop
- Erros formatados estruturados (code, path, message, suggestion, previous_attempts)
- Max 3 tentativas → HALT + escalar

**Anti-pattern:** validator FAIL → abortar imediatamente, sem dar chance de fix.

**Fonte:** LangChain + AIOX (insight #5)

---

#### RC-17 — Observability Desde Dia 1
**Severity:** MUST

**Regra:** Tracing + logs estruturados + dashboards desde o MVP. Não é afterthought.

**Contexto:** 89% das empresas em produção têm observability (LangChain 2026). Hierarquia constitucional: **CLI First → Observability Second → UI Third**.

**Aplicação:**
- Logs estruturados em JSON
- Trace ID por invocação
- Spans por task
- Dashboard básico (pode ser markdown report)

**Anti-pattern:** "vamos adicionar observability depois do MVP" (nunca adiciona).

**Fonte:** LangChain 2026 (insight #6)

---

#### RC-18 — Staged Rollout
**Severity:** SHOULD

**Regra:** Interno → Beta limitado → General Availability. Industry pattern, não scrappy.

**Contexto:** Larger enterprises transicionam mais rápido com staged rollouts. Dogfooding primeiro reduz risco, extrai PUs tácitos que não apareceriam em entrevistas.

**Aplicação:**
- Etapa 1: Danilo usa internamente, valida, ajusta
- Etapa 2: beta com 2-3 clientes selecionados
- Etapa 3: GA pra todos

**Anti-pattern:** skip stages. Ir direto pra cliente. Bug afeta relação comercial.

**Fonte:** LangChain 2026 (insight #8)

---

### RC-20 — KB Evolui Pós-Launch
**Severity:** MUST

**Regra:** KB não é artefato congelado no momento da composição do squad. É repositório vivo alimentado por uso contínuo. Trio Sync semanal gera updates em protocolos, decision trees, troubleshooting e glossário.

**Contexto:** Teresa Torres mostra que discovery não para com launch. Squad com KB congelada decai — o mundo muda, o expert aprende, casos edge aparecem. Sem evolução, squad fica obsoleto em meses.

**Aplicação:**
- Cadência semanal obrigatória: Trio Sync (Executor + Validator + Researcher)
- Output do sync: entradas novas em KB via KB-CHANGELOG.md
- KB health score: last_update <30d GREEN, 30-90d YELLOW, >90d RED
- Squad com KB RED por >60 dias → retro formal

**Anti-pattern:** KB escrita uma vez, nunca tocada. "Vamos atualizar quando precisar" (nunca precisa até explodir).

**Fonte:** Torres — Continuous Discovery Habits [`knowledge-refs/continuous.txt:55-119`]

---

### RC-21 — Hierarquia Role > Workflow > Task > Action
**Severity:** MUST

**Regra:** Taxonomia de 4 níveis. Role (abstração organizacional) > Workflow (SOP completo) > Task (unidade de execução do squad — continua primária conforme RC-03) > Action (ação atômica observável ~30s).

**Contexto:** Hormozi (AI Vision) mostra que pensar em cargos gera automação ruim. Pensar em workflows gera decomposição correta. Reconcilia com RC-03 (task-first) sem contradição — tasks continuam primárias, mas existem dentro de workflows dentro de roles; actions existem dentro de tasks.

**Aplicação:**
- Extração captura no nível Role/Workflow (big picture) primeiro
- Arquitetura mapeia pra Task (unidade do squad)
- Task tem Actions listadas em instruction (executável, observable behavior)
- Task com >5-7 Actions → decompor em 2 Tasks OU Actions viram skill (RC-22)

**Anti-pattern:** "preciso de um agente Editor" (pensar em role, pular pra agente). Correto: "preciso de agente que faça Workflow X, que tem Tasks A, B, C".

**Fonte:** Hormozi + Eva Juergens AI Vision [`knowledge-refs/ai-vision.txt:2-10, 192-204`]

---

### RC-22 — KB → Skill → Agent Pipeline
**Severity:** MUST

**Regra:** Conhecimento é formalizado em 3 estágios sequenciais: Markdown (SOP em linguagem natural) → Skill Markdown (markdown + prompt + exemplos testados) → Agent Include (skill carregada em agente). NÃO se pula estágio.

**Contexto:** Hormozi mostra pipeline de progressive formalization. Cada estágio revela problemas que o próximo não resolveria. Pular do markdown bruto direto pra agente incluído gera falhas silenciosas em produção.

**Aplicação:**
- Moreh produz estágio 1 (markdown bruto) durante extract-process
- Refina pra estágio 2 (skill testada 10+ vezes) durante assemble-squad
- Integra em agente (estágio 3) só depois de PASS rate >=80% em testes

**Anti-pattern:** skill inventada sem iteração (`tested_cases: 0` no frontmatter). Invariavelmente quebra em casos reais.

**Fonte:** Hormozi AI Vision [`knowledge-refs/ai-vision.txt:194-207`]

---

## Mapa de Aplicação por Volume

| Regra | Volumes principais |
|-------|-------------------|
| RC-01 Zero inferência | VOL-02, VOL-03, VOL-10 |
| RC-02 Vocabulário usuário | VOL-02, VOL-03, VOL-05 |
| RC-03 Task-first | VOL-01, VOL-03, VOL-04 |
| RC-04 Pipeline unidirecional | VOL-03, VOL-06, VOL-08 |
| RC-05 Separação de papéis | VOL-01, VOL-03, VOL-06 |
| RC-06 KB primária | VOL-04, VOL-05 |
| RC-07 Qualidade > velocidade | VOL-06, VOL-08, VOL-10 |
| RC-08 Documentar = investir | VOL-07, VOL-08, VOL-10 |
| RC-09 REUSE > ADAPT > CREATE | VOL-10 |
| RC-10 Playback antes de construir | VOL-02, VOL-06 |
| RC-11 3+ examples + immune | VOL-03, VOL-04 |
| RC-12 QGs bloqueantes | VOL-06 |
| RC-13 Cobertura KB 80%+ | VOL-05, VOL-06 |
| RC-14 Anti-viagem | VOL-02, VOL-06, VOL-10 |
| RC-15 Human-in-loop em specs | VOL-02, VOL-06, VOL-10 |
| RC-16 Schema feedback loop | VOL-04, VOL-06 |
| RC-17 Observability dia 1 | VOL-06, VOL-08 |
| RC-18 Staged rollout | VOL-10 |
| **RC-20 KB evolui pós-launch** | VOL-05 Appendix, VOL-08 Appendix, VOL-11 §11 |
| **RC-21 Role > Workflow > Task > Action** | VOL-01 Appendix, VOL-03 Appendix, VOL-11 §7 |
| **RC-22 KB → Skill → Agent Pipeline** | VOL-04 Appendix, VOL-11 §8 |

---

## Enforcement

As 18 regras entram em vigor via:

1. **SYNAPSE L0 Constitution** — injeção automática em cada prompt
2. **Quality Gates** — checam aderência entre fases
3. **Hooks PreToolUse** — bloqueiam ações que violam
4. **STRICT RULES de cada agente** — referenciam regras aplicáveis
5. **Immune System** — triggers automáticos pra desvios

Moreh ativa automaticamente todas essas camadas quando gera squads.

---

## Contradições Registradas

Nenhuma regra contradiz outra. Potenciais tensões resolvidas:

| Tensão | Resolução |
|--------|-----------|
| RC-04 (unidirecional) vs rounds iterativos (VOL-02) | Rounds são dentro de fase. Workflow macro é unidirecional |
| RC-07 (qualidade) vs RC-18 (staged rollout) | Staged rollout É qualidade — dogfooding evita bugs em produção |
| RC-09 (REUSE) vs autoria do Moreh | Autoria é Criação necessária (Gate 3). Fases 3/4/5/7 são únicas |
| RC-11 (3+ examples) vs agentes simples | Agentes simples vão ter examples curtos, não ausentes |

---

## Override Protocol

Violação intencional requer WAIVED formal:

```yaml
waived_override:
  rule_id: "RC-13"
  violation: "KB cobertura 65%"
  reason: "MVP com escopo reduzido. Coberta completa vem na v1.1"
  approved_by: "danilo-yuzo"
  approved_at: "2026-04-21T14:30:00Z"
  review_date: "2026-05-21"  # quando revisar
  auditable: true
```

Registrado permanentemente. Não some.
