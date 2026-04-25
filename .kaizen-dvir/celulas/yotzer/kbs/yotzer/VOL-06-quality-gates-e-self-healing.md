# VOL-06 — Quality Gates, Validação e Self-Healing

> **KB:** KaiZen | **Consumer:** Moreh
> **Domínio:** D6 — Quality Gates e Validação
> **Fontes primárias:** `loc-04-squad-forge/tasks/validate-squad`, `loc-04-squad-forge/checklists/*`, `loc-05-squad-creator/tasks/squad-creator-validate`, `loc-05-squad-creator/tasks/squad-creator-analyze`, `ext-04-langchain-state-of-agent-engineering-2026`
> **Regras cardinais principais:** RC-05, RC-12, **RC-15** (playback), **RC-16** (schema feedback), **RC-17** (observability)

---

## 1. O Que Este Volume Ensina

Squad sem quality gates é squad que falha silenciosamente em produção. Gates transformam "acho que tá bom" em decisão auditável.

Moreh aprende aqui:

1. **5 QGs do Squad-Forge** — o que cada um valida, veto conditions
2. **Padrão PASS/CONCERNS/FAIL/WAIVED** — veredictos estruturados
3. **Self-healing loop** — max 3 tentativas, erros voltam pro LLM (RC-16)
4. **QA Loop iterativo** — max 5 ciclos review→fix→re-review
5. **CodeRabbit-style multi-estágio** — auto-correção antes de escalar
6. **Smoke tests** — 3 cenários reais (happy path + decisão + exceção)
7. **squad-validator.js** — validador estrutural automatizado
8. **Blind A/B comparison** — refinamento iterativo
9. **Evals quantitativos** — pass_rate, token_count, time_to_complete
10. **Separação executor/juiz (RC-05)** — inegociável
11. **Human-in-loop (RC-15)** — playback como rule KaiZen-level
12. **Observability desde dia 1 (RC-17)** — não afterthought
13. **LLM-as-judge** — pattern de 53% adoption em 2026

---

## 2. Quality Gates no Squad-Forge (5 gates)

Gates **bloqueantes** entre fases. Se não passa, não avança.

### 2.1 QG-SF-001 — Extraction Completeness (Fase 1 → 2)

**Já coberto em VOL-02.** Resumo:

| Critério | Mínimo |
|----------|--------|
| Total PUs | ≥15 |
| PU-STEPs | ≥5 |
| PU-DECISIONs | ≥2 |
| PU-QUALITY_GATEs | ≥1 |
| PU-DEPENDENCYs | ≥1 |
| Lentes cobertas | ≥6/8 |
| Confiança média | ≥0.7 |
| PUs inferred | <30% |

**Veto conditions:** <5 PUs total · 0 DECISIONs · 0 QUALITY_GATEs · 0 DEPENDENCYs · >50% inferred.

### 2.2 QG-SF-002 — User Validation (Fase 2 → 3)

**Já coberto em VOL-02 seção 8.**

| Critério | Obrigatório |
|----------|-------------|
| Usuário confirmou "esse é meu processo" | Sim |
| Todas correções integradas | Sim |
| Nenhum PU com "usuário discorda" pendente | Sim |

**Veto:** usuário rejeitou · correções pendentes não integradas.

### 2.3 QG-SF-003 — Architecture Coherence (Fase 3 → 4)

**Já coberto em VOL-03 seção 13.**

| Critério | Obrigatório |
|----------|-------------|
| 1-7 agentes com rationale | Sim |
| Cada PU-STEP → 1 task | Sim |
| Cada PU-DECISION → decision point ou gate | Sim |
| Sem dependência circular | Sim |
| Human touchpoints identificados | Sim |
| Bottleneck abordado | Sim |
| kb-plan.md documentado | Sim |

**Veto:** 0 tasks · circular dependency · >50% hybrid · PU-STEP órfão · sem kb-plan.

### 2.4 QG-SF-004 — Nuclear Structure (Fase 4 → 5)

**Já coberto em VOL-04 seção 13.**

Critério primário: `squad-validator.js` PASS (0 errors). Checklist manual como fallback (20+ items).

**Veto:** squad.yaml inválido · task sem 8 campos · validator FAIL · agent sem 3+ examples/triggers · KB cobertura <80%.

### 2.5 QG-SF-005 — Squad Operational (Fase 5 → Produção)

**Gate final.** Valida que squad não só EXISTE como também FUNCIONA.

| Critério | Obrigatório |
|----------|-------------|
| Validação estrutural PASS | Sim |
| 2/3 smoke tests PASS | Sim |
| Usuário aprova squad | Sim |

**Veto:** usuário rejeita ("não funciona") · 0/3 smoke tests · validação estrutural falhou.

---

## 3. Quality Gates no ETLmaker (6 gates)

O ETLmaker (que Moreh usa pra gerar KBs) tem seus próprios gates:

| Gate | O que verifica | Bloqueia se |
|------|---------------|-------------|
| **QG-ETL-000** | Ingestão válida | Fonte ilegível ou <100 palavras |
| **QG-ETL-001** | Compreensão territorial | MAPA incompleto ou <3 domínios |
| **QG-ETL-002** | Plano aprovado | Usuário NÃO aprovou |
| **QG-ETL-003** | Riqueza por volume | <300 linhas ou spot-check falhou |
| **QG-ETL-004** | Integração do pacote | Falta doc transversal ou cross-ref quebrada |
| **QG-ETL-005** | Validação final | Camada 2 FAIL ou Aggregate <90% ou invenções >0 |

**Aplicação em Moreh:** quando Moreh precisa de KB pra um squad (integração ETL em VOL-05), invoca ETLmaker que passa por esses 6 gates.

---

## 4. Padrão PASS / CONCERNS / FAIL / WAIVED

Todo gate retorna um dos 4 veredictos:

| Veredicto | Significado | Ação |
|-----------|-------------|------|
| **PASS** | Todos critérios atendidos | Avança |
| **CONCERNS** | Warnings, não bloqueantes | Avança com logs |
| **FAIL** | Critério crítico violado | Bloqueia, retorna pro executor |
| **WAIVED** | Failed mas expert aprovou override explícito | Avança com warning permanente |

### 4.1 Quando usar WAIVED

Casos específicos onde squad é **aceitável com limitação conhecida**:

- Cliente aceita extração incompleta (QG-SF-001 com <15 PUs)
- Squad MVP sem cobertura 100% de exceções (aceitar versão 1.0)
- Output com warning conhecido de compatibilidade

**Regra:** WAIVED sempre registra **quem aprovou + quando + por quê**. Auditável.

### 4.2 CONCERNS como primeiro aviso

CONCERNS é importante. Warnings acumulam → viram bugs silenciosos. Regra operacional:

- ≤3 CONCERNS por gate = aceitável
- 4-10 CONCERNS = revisar antes de avançar
- >10 CONCERNS = tratar como FAIL funcional

---

## 5. Self-Healing Loop (RC-16)

**Padrão RC-16:** erros de validação voltam pro LLM como input. Max 3 tentativas antes de escalar.

### 5.1 Fluxo

```
1. Executar (gerar squad / task / agent)
   ↓
2. Rodar validator / checker
   ↓
3. Resultado?
   ├─ PASS → próxima fase
   └─ FAIL → iteração de correção

4. Iteração de correção:
   ├─ Ler erros estruturados
   ├─ Gerar fix (LLM recebe erro formatado + código atual)
   ├─ Aplicar fix
   └─ Re-validar (volta pro passo 2)

5. Limite: 3 tentativas
   ├─ Passou: prosseguir
   └─ Não passou: HALT + reportar ao Chief/expert
```

### 5.2 Formato do erro pro LLM

```yaml
validation_error:
  code: "SCHEMA_ERROR"
  path: "squad.yaml#/name"
  severity: "error"
  message: "String 'My Squad' does not match pattern '^[a-z0-9-]+$'"
  current_value: "My Squad"
  suggestion: "Convert to kebab-case: 'my-squad'"
  previous_attempts:
    - attempt: 1
      fix_applied: "MySquad"
      result: "Still invalid"
```

### 5.3 Regras do loop

- **ERRORS bloqueiam** (não avança)
- **WARNINGS logam** (não bloqueiam)
- **Max 3 tentativas** (depois HALT)
- Cada tentativa inclui histórico de tentativas anteriores (pra LLM não repetir fix falhado)

### 5.4 Quando escalar

Após 3 tentativas:

```
1. Reportar ao expert:
   - Lista de erros irresolvidos
   - Fixes tentados
   - Análise do blocker (LLM não consegue resolver sozinho)

2. Opções pro expert:
   - Revisar input (problema é no upstream)
   - Ajustar critério do gate (erro era falso positivo)
   - Aceitar WAIVED (erro conhecido, avança com limitação)
   - Abortar e reiniciar
```

---

## 6. QA Loop Iterativo (max 5)

Pattern do AIOX pra validação semântica (não só estrutural).

### 6.1 Fluxo

```
Output gerado → Validação semântica → FAIL? → Feedback específico
  → Re-execução com feedback → Re-validação → (max 5 iterações)
  → Se ainda FAIL → Escalar pro humano
```

### 6.2 Diferença de self-healing loop

| Self-healing (RC-16) | QA Loop |
|---------------------|---------|
| Validação **estrutural** (schema) | Validação **semântica** (qualidade) |
| Max 3 iterações | Max 5 iterações |
| Automático | Pode ser manual (humano dá feedback) |
| Erros objetivos | Critérios parcialmente subjetivos |

### 6.3 Quando usar cada

- **Self-healing (3x):** squad.yaml inválido, task sem campo, YAML malformado
- **QA Loop (5x):** copy genérico, tom fora do brand, headline fraca

### 6.4 Formato do feedback

```yaml
qa_feedback:
  iteration: 2
  verdict: FAIL
  concerns:
    - "Headline usa 'compre agora' isolado (viola RC-Brand-03)"
    - "Tom agressivo demais pra nicho de saúde mental"
    - "Sem prova social no bullet 3"
  suggestions:
    - "Trocar CTA por 'Veja como funciona' ou similar consultivo"
    - "Suavizar linguagem no parágrafo 2"
    - "Adicionar depoimento curto antes do CTA"
  output_to_preserve:
    - "Estrutura AIDA está boa"
    - "Escolha de palavras no hook funcionou"
```

LLM recebe feedback + código atual + histórico de iterações.

---

## 7. CodeRabbit-Style Multi-Estágio

Pattern do AIOX aplicado ao Moreh. Self-healing em múltiplos estágios de severidade.

### 7.1 Estrutura

```
1. Auto-fix CRITICAL (sempre)
   → Erros que bloqueiam, fix óbvio (ex: typo em field name)
   → LLM corrige sem pedir

2. Auto-fix HIGH (até 2 iterações)
   → Erros significativos (ex: task sem Checklist)
   → LLM tenta 2x, se não conseguir escala

3. Review MEDIUM (humano decide)
   → Issues importantes mas não críticas
   → Humano aprova ou rejeita fix proposto

4. Warning LOW (log only)
   → Sugestões de melhoria
   → Não bloqueia, registra no log
```

### 7.2 Aplicação em Moreh

Ao gerar squad, Moreh roda validator + classifica erros por severidade:

- **CRITICAL:** manifest inválido, sem name/version → auto-fix
- **HIGH:** task sem campo obrigatório → auto-fix (2 tries)
- **MEDIUM:** agent sem 3 output examples → mostrar pro expert, pedir aprovação de exemplos propostos
- **LOW:** nome de arquivo com underscore em vez de hífen → log warning

---

## 8. Smoke Tests — 3 Cenários Reais

Validação da Fase 5 (QG-SF-005). **Não são testes estruturais — testam se squad FUNCIONA.**

### 8.1 Como construir cada cenário

**Regra inegociável:** cenários vêm dos PUs extraídos. Não genéricos. Referenciam passos, decisões e exceções **específicas do processo extraído**.

### 8.2 Cenário 1: Caminho Feliz

Simular fluxo principal sem desvios.

```
=== SMOKE TEST 1: Caminho Feliz ===

Imagina que alguem ativa esse squad e diz:
"{trigger normal do processo — do PU que descreve o inicio}"

O squad faria isso:
1. {Agente X} executa {task Y}: {resultado especifico do PU-STEP}
2. {Agente Z} executa {task W}: {resultado especifico}
3. Quality gate: {criterio real do PU-QUALITY_GATE}
4. Output final: {entregavel real do PU-OUTPUT}

Isso e o que deveria acontecer? Ta correto?
```

### 8.3 Cenário 2: Decisão

Simular bifurcação real do processo — usar PU-DECISION específico.

```
=== SMOKE TEST 2: Decisão ===

E se durante o processo, {condicao real de um PU-DECISION}?

O squad faria:
→ {branch A do PU-DECISION}: {acao especifica}
→ Se fosse o contrario ({condicao oposta}): {branch B}

Esse e o caminho certo?
```

### 8.4 Cenário 3: Exceção

Simular falha real — usar PU-EXCEPTION específico.

```
=== SMOKE TEST 3: Exceção ===

E se {trigger real de um PU-EXCEPTION}?

O squad faria:
→ {response real do PU-EXCEPTION}
→ Severity: {severity do PU-EXCEPTION}

E isso que deveria acontecer?
```

### 8.5 Critério PASS

**2 de 3 cenários PASS** é suficiente pra aprovar gate (com CONCERNS no restante).

0 cenários PASS = FAIL. Voltar pra extração cirúrgica ou ajustar blueprint.

---

## 9. squad-validator.js

Já coberto em VOL-04 seção 9. **Reuso direto.**

### 9.1 Integração com gates

| Fase | Uso |
|------|-----|
| Fase 4 Step 8 | Rodar obrigatório (QG-SF-004) |
| Fase 5 Step 1 | Re-rodar pra confirmar |
| Qualquer momento | `*validate-squad {name}` manual |

### 9.2 Self-healing integrado

```
Tentativa 1: validator → ERRORS
Tentativa 2: LLM corrige → validator → ERRORS residuais
Tentativa 3: LLM corrige → validator → PASS (ou FAIL final)
```

---

## 10. squad-analyzer.js (Cobertura)

Já coberto em VOL-04 seção 10.

**Uso em Moreh:**
- Pós `assemble-squad` (Fase 4): rodar pra ver cobertura
- Se <70%: revisar
- Output formato markdown pode ir pro `ANALYSIS.md` do squad

---

## 11. Blind A/B Comparison (Anthropic Skills)

Pattern pra refinar qualidade ao longo do tempo.

### 11.1 Fluxo

```
1. Gerar output com skill v1 E skill v2
2. Avaliador (humano ou LLM-as-judge) vê ambos sem saber qual é qual
3. Pontuar em dimensões objetivas
4. Vencedor informa próxima iteração da skill
```

### 11.2 Dimensões típicas

| Dimensão | Como medir |
|----------|-----------|
| **Conteúdo** | Completude, profundidade, factualidade |
| **Estrutura** | Organização, hierarquia, clareza |
| **Usabilidade** | Quão facilmente aplicável no mundo real |
| **Aderência à brand voice** | Tom, vocabulário, estilo |
| **Concisão** | Densidade informacional |

### 11.3 Aplicação em Moreh

Quando Moreh versiona um squad (v1 → v2), antes de substituir v1 deve rodar blind A/B em casos reais. v2 só substitui v1 se ganhar consistentemente.

---

## 12. Evals Quantitativos

Métricas mensuráveis, não subjetivas.

### 12.1 Métricas padrão

```markdown
## Métricas

- **pass_rate**: % de assertions que passam (target: >80%)
- **token_count**: eficiência do output (target: <2000 tokens)
- **time_to_complete**: velocidade do processo (target: <3 min)
- **validation_score**: score do validator (target: PASS + ≤3 warnings)
- **coverage**: KB cobertura (target: ≥80%)
- **iteration_count**: quantas iterações até PASS (target: ≤2)
```

### 12.2 Evals em formato de casos de teste

```markdown
| Input | Output Esperado | Assertion |
|-------|----------------|-----------|
| "oferta de R$497 pra yoga" | Headline com PAS | Regex `^Cansad[ao]|Será que você` |
| "headline com teste 3s" | <120 chars | length ≤120 |
| "cliente reclama promessa" | Response com proof | Content contém ["depoimento", "estudo", "dados"] |
```

### 12.3 Regra [RC-05]

**Quem gera NUNCA avalia.** Evals rodam separado do executor.

---

## 13. Separação Executor/Juíza (RC-05)

Constitucional em AIOX e Auroq. Aplicação:

### 13.1 Em squads de Moreh

| Papel | Quem é | O que faz |
|-------|--------|-----------|
| **Executor** | Worker/agent específico (ex: copywriter) | Gera output |
| **Juíza** | Agent diferente (ex: editor) | Valida output |
| **Coordenador** | Chief/orchestrator | Roteia entre executor e juíza |

### 13.2 Viola quando

- Mesmo agente gera copy + valida copy → viés
- Orchestrator executa task quando deveria só coordenar
- Juíza produz output em vez de só avaliar

### 13.3 Implementação

Workflow explicita papéis:

```yaml
phases:
  - phase: 3
    name: "Geração de Copy"
    agent: "@copywriter"           # Executor
    tasks: [write-headline, write-bullets]

  - phase: 4
    name: "Review"
    agent: "@editor"               # Juíza (agente diferente)
    tasks: [review-brand-voice, review-factchecker]
    quality_gate: "QG-COPY-02"
```

---

## 14. Human-in-Loop (RC-15) — Rule KaiZen-Level

Aplicação específica em gates.

### 14.1 Onde é obrigatório

| Mutação | Human-in-loop |
|---------|---------------|
| Playback do processo extraído | **Obrigatório** |
| Aprovação de blueprint de squad | **Obrigatório** |
| Aprovação de squad gerado (Fase 5) | **Obrigatório** |
| Smoke tests | **Obrigatório** |
| WAIVED override de gate | **Obrigatório** |
| Correções durante execução em produção | Recomendado |

### 14.2 Anti prompt-injection

Se squad gerado autoatualiza especificação sem aprovação humana, vulnerável a:
- Prompt injection via input malicioso
- Deriva incremental (squad muda gradualmente pra algo não-desejado)
- Perda de rastreabilidade

**Human-in-loop em toda mutação de specs = defesa.**

### 14.3 Yolo mode (LangChain)

Cliente pode desabilitar human-in-loop em contextos controlados (yolo mode). Mas é override explícito e registrado — não default.

---

## 15. Observability Desde Dia 1 (RC-17)

**Insight #6:** 89% dos times em produção (2026) têm observability. 71% têm full tracing. Não é afterthought — é infraestrutura.

### 15.1 Hierarquia constitucional

```
CLI First → Observability Second → UI Third
```

Ordem importa:
1. Toda funcionalidade é CLI-first (sem UI requirement)
2. Observability implementada antes de UI
3. UI vem por último, só observa

### 15.2 O que rastrear

| Categoria | Específico |
|-----------|-----------|
| **Agent traces** | Inputs, outputs, decisões, tools called |
| **QG results** | PASS/FAIL/WAIVED + critérios falhados |
| **Iteration counts** | Quantas tentativas de self-healing |
| **Error patterns** | Erros recorrentes agrupados |
| **Performance** | Token count, time, cost |
| **Human interactions** | Aprovações, correções, overrides |

### 15.3 Implementação mínima pra MVP

- **Logs estruturados** em JSON (não texto cru)
- **Trace ID** por invocação do squad
- **Spans** por tarefa (task-level tracing)
- **Dashboard básico** (pode ser markdown report, não precisa UI sofisticada)

### 15.4 Benefícios

- Debug: "por que squad falhou?" → ler trace
- Otimização: "onde gasta mais token?" → análise quantitativa
- Confiança: stakeholders veem que sistema é auditável
- Evolução: patterns aparecem, melhorias emergem

### 15.5 Anti-pattern

- Logs só em stdout (perdem após sessão)
- Observability "quando tiver tempo" (nunca tem)
- UI dashboard antes de logs estruturados (putting cart before horse)

---

## 16. LLM-as-Judge

Pattern de 53% adoption em 2026. Usar LLM como juiz.

### 16.1 Quando usar

- Validação semântica subjetiva (qualidade de copy, aderência a brand voice)
- Rubric-based evaluation (critérios definidos)
- Escala sem custo humano alto

### 16.2 Como estruturar

```yaml
judge_prompt: |
  Você é juiz de qualidade de copy.

  Critérios:
  1. Aderência à brand voice (ver voice-dna.md) — peso 40%
  2. Clareza (reading level 3a série) — peso 20%
  3. Acionabilidade (CTA claro) — peso 20%
  4. Ausência de anti-patterns (ver anti-patterns.md) — peso 20%

  Output:
    verdict: PASS | CONCERNS | FAIL
    score: 0.0-1.0
    reasoning: [por cada critério]
    suggestions: [se CONCERNS/FAIL]
```

### 16.3 Regra [RC-05]

LLM-as-judge deve ser **agente separado do executor**. Não usar mesma persona pra gerar e julgar.

### 16.4 Mista (humano + LLM)

25% dos times combinam offline (LLM) + online (humano) review. Pattern maduro.

---

## 17. Métodos de Evaluation (state 2026)

Do survey LangChain:

| Método | Adoção | Uso típico |
|--------|--------|-----------|
| **Human review** | 59.8% | Validação qualitativa final |
| **LLM-as-judge** | 53.3% | Evaluation escalável |
| **Offline evals (test sets)** | 52.4% | Pegar regressões pré-deploy |
| **Online evals (produção)** | 37.3% | Monitorar real-world performance |
| **Traditional ML metrics (ROUGE, BLEU)** | Limitado | Raramente efetivo pra agents |

**Moreh combina:** human review (playback) + LLM-as-judge (brand voice) + offline evals (test cases) + online evals (métricas em produção).

---

## 18. Regras Cardinais Aplicáveis

| Regra | Aplicação em VOL-06 |
|-------|---------------------|
| **RC-05 Separação de papéis** | Executor nunca avalia. Juíza nunca cria |
| **RC-12 Quality gates bloqueantes** | Core deste volume. Gates não são sugestão |
| **RC-15 Human-in-loop em specs** | Playback + aprovação = rule KaiZen-level |
| **RC-16 Schema feedback loop** | Self-healing max 3. Erros voltam pro LLM |
| **RC-17 Observability desde dia 1** | CLI First → Observability Second → UI Third |

---

## 19. Anti-Patterns

| Anti-pattern | Por que falha |
|--------------|---------------|
| Gate sem veto conditions | Qualquer output passa. Zero valor |
| Mesmo agente gera + valida | Viola RC-05. Viés de execução |
| Ignorar WARNINGS sistematicamente | Acumulam. Viram bugs silenciosos |
| Smoke tests genéricos (não do processo real) | Passa mas squad não funciona no uso real |
| Self-healing infinito | Loop infinito. Max 3 é inegociável |
| Skip playback "pra ser ágil" | Viola RC-15. Vulnerável a prompt injection |
| Observability "depois do MVP" | Viola RC-17. Nunca acontece "depois" |
| Eval só no deploy | Pega tarde. Combinar offline + online |
| Qualidade subjetiva ("tá bom") | Não é auditável. Usar evals quantitativos |
| LLM-as-judge com mesma persona do executor | Viés. Juiz DIFERENTE do gerador |
| Gate muito frouxo | Aprovação fake. Valor de gate é bloquear |
| Gate muito rigoroso | Bloqueia tudo. Ninguém usa. Calibrar |

---

## 20. Resumo Executivo (cartão de referência)

**Gates não são sugestão — são bloqueantes (RC-12).**

**5 QGs do Squad-Forge:**
- SF-001: Extraction Completeness (≥15 PUs, 6/8 lentes)
- SF-002: User Validation (playback aprovado)
- SF-003: Architecture Coherence (mapeamento completo)
- SF-004: Nuclear Structure (validator PASS)
- SF-005: Squad Operational (smoke tests 2/3)

**6 QGs do ETLmaker:** ETL-000 a ETL-005 (ingestão → validação final).

**Veredictos:** PASS / CONCERNS (≤3 warnings) / FAIL (bloqueia) / WAIVED (override registrado).

**Self-healing loop (RC-16):** erros voltam pro LLM, max 3 tentativas, depois HALT.

**QA Loop iterativo:** max 5 ciclos pra validação semântica.

**CodeRabbit multi-estágio:** auto-fix CRITICAL/HIGH · review MEDIUM · log LOW.

**Smoke tests:** 3 cenários reais (happy + decisão + exceção) dos PUs extraídos. **2/3 PASS** aprova.

**Separação executor/juíza (RC-05):** mesmo agente NUNCA gera + avalia. Workflow explicita papéis.

**Human-in-loop (RC-15):** playback + aprovação de blueprint + aprovação final. Anti prompt-injection.

**Observability dia 1 (RC-17):** logs estruturados + trace IDs + dashboards básicos. CLI First → Observability Second → UI Third.

**LLM-as-judge:** 53% adoption em 2026. Rubric-based. Agente separado do executor.

**Evals quantitativos:** pass_rate, token_count, time_to_complete, validation_score, coverage, iteration_count.

---

**Próximo volume:** VOL-07 — Memória, Aprendizado e Handoff.

---

# APPENDIX v1.1 — Enriquecimento (2026-04-22)

Patches de validação: Confidence Metrics em QG-SF-001, Exception → Immune System, Playback Artifact template.

## A. Confidence Metrics como critério de QG-SF-001

Padrão implícito no squad-forge [Fonte: `agents/squad-forge/data/pu-classification.yaml:189-191`, `workflows/wf-squad-forge.yaml:141`, `checklists/extraction-completeness.md:13`].

**Enriquecimento dos critérios obrigatórios de QG-SF-001:**

| Critério existente | Enriquecimento v1.1 |
|--------------------|----------------------|
| Total PUs ≥ 15 | + confidence média ≥ 0.7 (já listado, agora explícito como MÉTRICA) |
| Confiança média ≥ 0.7 | + distribuição: 0 PUs com confidence <0.3 |
| PUs inferred < 30% | + de todos inferred, confidence média deve ser >=0.5 |

**Novo critério non-blocking:**
- `stress_test_deletion_rate >= 10%` (de VOL-02 Appendix F)
- Se <10%, CONCERNS + warning "stress test possivelmente insuficiente"

**Novo critério de veto:**
- Média de confidence do subset `inferred=true` <0.4 → FAIL automático
- Implica: se o archaeologist tá inferindo com baixa certeza, rerun obrigatório

## B. PU-EXCEPTION → Immune System Trigger (HO-04)

Padrão implícito [Fonte: `agents/squad-forge/checklists/nuclear-structure-validation.md:42-43`].

**Regra:** todo PU-EXCEPTION extraído vira >=1 trigger na seção IMMUNE SYSTEM do agente responsável pela task afetada.

**Formato do trigger:**

```markdown
## IMMUNE SYSTEM

### Trigger 1: [nome curto da situação de risco]
**Situação:** [condição detectável — ex: "headline <50 chars OR copy sem CTA"]
**Resposta automática:** [ação do agent — ex: "reescrever headline + adicionar CTA antes de entregar"]
**Escalação:** [se resposta falhar — ex: "escala pro copywriter humano"]
**Origem:** [PU-EXCEPTION-XXX do process-map]
```

**Validação em QG-SF-004 (Nuclear Structure):**
- Cada agente precisa >=3 triggers (já existente)
- Enriquecimento v1.1: >=50% dos triggers devem ter campo `origem: PU-EXCEPTION-XXX` (rastreabilidade)
- Triggers inventados (sem origem) são WARNINGS, não bloqueiam mas sinalizam

## C. Playback Artifact Template (reforço RC-15)

Consolidação de RC-15 (human-in-loop), RC-10 (playback antes de construir) e insight de Torres + Elon [Fonte: `knowledge-refs/continuous.txt:49-55`, `knowledge-refs/elon.txt:93-99`].

**Playback não é só etapa. É artifact estruturado.**

Template `playback-artifact.md`:

```markdown
---
playback_id: PB-{squad}-{phase}-{timestamp}
squad: {squad-name}
phase: {phase-name}
extracted_at: {ISO date}
archaeologist: {agent-id}
---

# Playback: {Processo}

## Narrativa
[Prosa fluida descrevendo o processo extraído — não YAML, não lista seca.
Usa primeira pessoa ("você faz X, depois Y") e vocabulário do expert.
Máximo 500 palavras. Leitor deve se reconhecer.]

## Decisões capturadas
1. [Decisão 1 em narrativa — "se X, você faz Y; se Z, faz W"]
2. [Decisão 2]
...

## Exceções capturadas
1. [Quando X acontece, você faz Y]
2. ...

## Gaps conhecidos
- [Onde a extração não chegou — explicitar]

## Inferências do archaeologist (precisam confirmação)
- [Itens com `inferred: true` — confirmar 1 a 1]

---

## Approval Matrix

**Expert validou:**
- [ ] A narrativa reflete meu processo real
- [ ] As decisões estão completas
- [ ] As exceções cobrem o que importa
- [ ] As inferências foram confirmadas ou corrigidas

**Signed off:** {expert-name}
**Date:** {YYYY-MM-DD}
**Signature:** {expert-id-ou-oauth}
```

**Regra:** sem approval matrix signed off, QG-SF-002 FAIL. Signature pode ser texto simples ("aprovado — Danilo, 2026-04-22") mas DEVE existir.

## D. Anti-injection integrado

Playback artifact é também a **barreira anti prompt-injection** citada em RC-15.

**Mecanismo:**
1. Todo mutation de specs (processo extraído, arquitetura proposta, KB gerada) passa por playback artifact
2. Expert lê narrativa + approval matrix
3. Expert assina
4. Signed artifact vira `.auroq/artifacts/` permanente
5. Qualquer tentativa de mudar specs sem novo playback → BLOCK

Prompt injection via input malicioso pode tentar alterar specs — sem playback, a alteração não passa.

---

## Fim do Appendix VOL-06 v1.1
