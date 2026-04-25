# MAPA-ENRIQUECIMENTO — KaiZen v1.1 (Merge)

> **Gerado por:** @etl-chief (Fase 1b — Mapeamento Territorial de Enriquecimento)
> **Data:** 2026-04-22
> **KB:** kaizen (v1.0.0 em produção — 10 volumes, 7.771 linhas, 93% aggregate)
> **Modo:** Merge (ingestão nova + re-análise)
> **Consumer:** Moreh — squad criador de squads

---

## 1. Metadata do Merge

| Campo | Valor |
|-------|-------|
| Versão base | KaiZen v1.0.0 (aprovada 2026-04-21) |
| Versão alvo | KaiZen v1.1.0 |
| Motivação | Duas explorações de enriquecimento em paralelo: (A) re-análise de squad-forge + squad-creator com lente meta-pattern, (B) ingestão dirigida das 5 referências que inspiraram o método Danilo |
| Tipo de merge | Híbrido — patches cirúrgicos aos VOLs existentes + 1 volume novo (VOL-11) |
| Fontes processadas nesta fase | 2 (re-análise) + 5 (novas externas) = 7 |
| Estimativa delta | +1.200-1.500 linhas, +28 termos glossário, +4-6 RCs candidatas, +7 frameworks |

---

## 2. Resumo Executivo

A re-análise de squad-forge + squad-creator revelou **invisibilidades estruturais** na KaiZen v1.0 — patterns operacionais que estão no código/docs mas não migraram pros volumes. As 5 referências externas (Hormozi 100M, Torres Continuous Discovery, Musk/Clear, Hormozi+Juergens AI Vision, Eyal Hooked) trouxeram **frameworks upstream** do método Danilo — o que vem ANTES de extrair processo (validação de mercado, descoberta de oportunidade, design de oferta) e DEPOIS de entregar squad (engajamento, habit formation, adoção).

**Síntese:**
- Exploração A preenche gaps OPERACIONAIS (como o Moreh deve EXECUTAR)
- Exploração B preenche gaps CONCEITUAIS (por que o Moreh existe e como se sustenta em produção)

Juntas, elevam a KB de "manual de construção" pra "teoria operacional completa do método".

**Anti-objetivo do merge:** não re-escrever VOLs existentes. Patches cirúrgicos + 1 volume novo que consolide o upstream e downstream do método.

---

## 3. Descobertas Consolidadas

### 3.1 Meta-patterns ainda não capturados (Exploração A)

| # | Pattern | Fonte | Volume destino |
|---|---------|-------|----------------|
| MP-01 | **Complexity Routing** — 3 modos (simple/standard/complex) ajustam rounds, agentes esperados, tempo | `squad-forge/workflows/wf-squad-forge.yaml:285-300` | VOL-02 ou VOL-08 (patch) |
| MP-02 | **Bottleneck → Quality Gate** — constraint identificado (TOC) vira obrigatoriamente gate bloqueante | `squad-forge/agents/forge-smith.md:120`, `templates/squad-blueprint-tmpl.yaml:94` | VOL-03 + VOL-06 (patch) |
| MP-03 | **State Persistence + Resumability** — `.state.json`, `*resume` entre sessões | `squad-forge/agents/forge-chief.md:69-89`, `squad.yaml:resumable: true` | VOL-08 (patch) |
| MP-04 | **Dual Mapping PU → Task + KB** — cada PU alimenta 2 destinos em paralelo | `squad-forge/tasks/architect-squad.md:63` | VOL-03 + VOL-05 (patch) |
| MP-05 | **Executor Hint Refinement** — human/agent/hybrid/worker → decisão arquitetural + regra "50% hybrid = redesign" | `squad-forge/data/pu-classification.yaml:18`, `executor-mapping-guide.yaml` | VOL-03 (patch) |
| MP-06 | **Confidence + Inferred Flag** — rastreabilidade de incerteza, threshold >=0.7, gates em 30%/50% | `squad-forge/data/pu-classification.yaml:189-191` | VOL-02 + VOL-06 (patch) |
| MP-07 | **Handoff Artifact Protocol** — YAML compacto ~379 tokens estruturado | `squad-forge/agents/forge-chief.md:207-234` | VOL-07 + VOL-08 (patch) |

### 3.2 Heurísticas operacionais implícitas (Exploração A)

| # | Heurística | Fonte | Destino |
|---|-----------|-------|---------|
| HO-01 | Round Structure Fixa: R1 (L1+L2, 15-30min) → R2 (L3+L4+L5, 15-30min) → R3 (L6+L7+L8, 10-20min) → RN (cirúrgico) | `extraction-lenses.yaml:26-47` | VOL-02 (patch) |
| HO-02 | PU-STEP:Task = 1:1 estrito — 0 ou 2+ é erro de decomposição na extração | `architect-squad.md:6`, `squad-blueprint-tmpl.yaml:102` | VOL-03 (patch) |
| HO-03 | Decision Tree Materialization — DECISION binária+fluxo → gate; multi-ramo+conteúdo → fields+instruction | `architect-squad.md:65` | VOL-03 (patch) |
| HO-04 | PU-EXCEPTION → Immune System Trigger (>=3 triggers por agente) | `nuclear-structure-validation.md:42-43` | VOL-06 (patch) |
| HO-05 | Modos de Interação: Deterministic / Semantic / Interactive | `architect-squad.md:49` | VOL-03 (patch) |
| HO-06 | Confidence média >=0.7 OU <30% inferred — senão, Fase 1 falha | `wf-squad-forge.yaml:141`, `extraction-completeness.md:13` | VOL-06 (patch) |
| HO-07 | Gap-Driven Questions — gaps viram perguntas cirúrgicas pro próximo round, não assunções | `forge-chief.md:154-166` + RC-01 | VOL-02 (patch) |

### 3.3 Trade-offs arquiteturais adicionais (Exploração A)

| # | Eixo | Auroq | AIOX |
|---|------|-------|------|
| TA-04 | Foco | Extraction-Heavy (cara, rica em contexto) | Design-Heavy (rápida, requer docs) |
| TA-05 | Composição | 3 agentes (chief/archaeologist/smith) | 1 agente monolito (Craft, 10 tasks) |
| TA-06 | Validação | Incremental rounds + playback | Upfront via JSON Schema + validator.js |
| TA-07 | Ordem de trabalho | Process Map First (PUs → map → blueprint → squad) | Component Templates First (decision → template → extend → validate) |
| TA-08 | Governança | Bottleneck-aware (TOC) | Uniform gates (blocking: true/false) |

Destino: VOL-10 (patch — adicionar aos 3 trade-offs já documentados).

### 3.4 Padrões AIOX ainda não documentados (Exploração A)

| # | Pattern | Fonte | Destino |
|---|---------|-------|---------|
| PA-01 | **Dry-Run Pattern** — `--dry-run` antes de operações mutativas | `squad-creator-migrate.md:32`, `squad-creator-extend.md:222` | VOL-10 (patch) |
| PA-02 | **Backup Strategy** — `.backup/pre-migration-{timestamp}/` + restore commands | `squad-creator-migrate.md:80` | VOL-10 (patch) |
| PA-03 | **Story Traceability** — linkagem SQS-XX entre tasks/agents/workflows | `squad-creator-extend.md:33` | VOL-10 (patch) |
| PA-04 | **Greenfield Detection** — `gitStatus=false` → oferecer `*environment-bootstrap` | `squad-creator.md:24-25` | VOL-01 (patch) |

### 3.5 Frameworks operacionalizáveis (Exploração B)

| # | Framework | Fonte | Destino |
|---|-----------|-------|---------|
| FW-01 | **Grand Slam Offer + Value Equation** — `[(Dream × Likelihood × Time) - Effort] / Price` | `100M.txt:104-113, 385-390` | VOL-11 novo (seção Oferta) |
| FW-02 | **Opportunity-Solution Tree** — Outcome → Opportunities → Solutions → Assumption Tests | `continuous.txt:193-260` | VOL-11 novo (seção Descoberta) |
| FW-03 | **Assumption Testing Canvas** — assumption/test/evidence/script/criteria | `continuous.txt:431-487` | VOL-11 novo (seção Descoberta) |
| FW-04 | **5-Step Musk Algorithm** — Question → Delete (>10% readd) → Simplify → Accelerate → Automate (sequencial, não pular) | `elon.txt:88-129` | VOL-02 (patch) + VOL-11 (seção Stress Test) |
| FW-05 | **Workflow Decomposition** — Role → Workflow (SOP, 30min) → Task (atomic, 30s) | `ai-vision.txt:2-10, 192-204` | VOL-01 (patch) + VOL-03 (patch) |
| FW-06 | **Hook Model** — Trigger → Action → Variable Reward → Investment | `hooked.txt:74-124, 262-345` | VOL-11 novo (seção Engajamento) |
| FW-07 | **Variable Reward Schedule** — VR/VI/FR/FI (intermittent reinforcement) | `hooked.txt:94-102, 177-181` | VOL-11 novo (seção Engajamento) |

### 3.6 Insights colaterais — Exploração B (o que o guia não previu)

| # | Insight | Fonte | Destino |
|---|---------|-------|---------|
| IC-01 | **Mercado > Oferta > Persuasão** — validar mercado starving ANTES de desenhar squad | `100M.txt:272-276` | VOL-01 (patch) + VOL-11 (seção Market Validation) |
| IC-02 | **Niche Commitment + Resilience** — lock-in period (3 meses ou 10 iterações) contra pivot prematuro | `100M.txt:277-301` | VOL-10 ou VOL-11 |
| IC-03 | **Playback como Anti-Injection** — artifact estruturado (narrativa + approval matrix), não só etapa | `continuous.txt:49-55`, `elon.txt:93-99` | VOL-06 (patch — reforçar RC-15) |
| IC-04 | **Trio Pattern** — product/design/tech (ou executor/validator/researcher) — colaboração contínua, semanal | `continuous.txt:119-128` | VOL-08 ou VOL-11 |
| IC-05 | **"The Best Part Is No Part"** — stress test tem meta quantitativa de deleção (>10% readd rate) | `elon.txt:108, 119` | VOL-02 (patch) |
| IC-06 | **Guarantee as Risk Reversal** — SLA/refund/warranty redesenha percepção de valor; aplicável a squad contracts | `100M.txt:435, 704` | VOL-04 (patch) |
| IC-07 | **Variable Reward = Craving** — feedback loop precisa variabilidade, não linearidade | `hooked.txt:94-102` | VOL-11 (seção Engajamento) |
| IC-08 | **Story-Based Interviewing** — "tell me about last time" >> "do you usually" | `continuous.txt:430-487` | VOL-02 (patch) |

---

## 4. Regras Cardinais Candidatas (RC-19 a RC-24)

Todas a serem validadas com o usuário antes de adotar.

| # | Regra candidata | Justificativa | Origem |
|---|-----------------|---------------|--------|
| **RC-19** | **Market Validation Before Offer Design.** Antes de desenhar squad, validar se problema é percebido, tem budget, é targetável e mercado não encolhe. | Hormozi: "starving market > great offer" — squad brilhante em mercado morto é desperdício | `100M.txt:272-276` |
| **RC-20** | **KB evolui pós-launch.** Não é estática — continuous discovery alimenta KB viva com findings pós-entrega. | Torres: discovery não para com launch | `continuous.txt:55-119` |
| **RC-21** | **Hierarquia Role > Workflow > Task > Action.** Reconciliar task-first (KaiZen) com workflow-first (Hormozi AI-Vision). Task virou ambíguo — explicitar 4 níveis. | Hormozi AI-Vision + contradição construtiva com RC-03 atual | `ai-vision.txt:2-10, 192-204` |
| **RC-22** | **KB → Skill → Agent Pipeline.** Conhecimento é codificado em 3 estágios progressivos (markdown bruto → skill formatada → agent ativado). | Hormozi AI-Vision: progressive formalization | `ai-vision.txt:200-202` |
| **RC-23** | **Every Output Has Hook Design.** Cada output de squad tem trigger explícito + variable reward + investment phase — não é só entrega. | Eyal: sem hook, habit morre | `hooked.txt:74-124` |
| **RC-24** | **Squad Engagement via Variable Reward Cadence.** Feedback loops não-lineares (VR/VI schedules) sustentam adoção; linearidade mata hábito. | Eyal: variable reward cria craving | `hooked.txt:94-102` |

**Decisão pendente com usuário:** adotar todas 6? Algumas? Reclassificar como SHOULD em vez de MUST?

---

## 5. Backbone do Merge — Plano de Composição

### 5.1 VOL-11 novo (proposta): "Descoberta, Oferta e Engajamento"

Consolida o upstream (antes da construção) e downstream (depois da entrega) do método Danilo. Os 10 VOLs atuais cobrem a construção. VOL-11 cobre o que envelopa a construção.

**Linhas estimadas:** 700-850

**Seções:**
1. **Market Validation Checklist** — pain real? budget? targetable? non-shrinking? (IC-01 + RC-19)
2. **Opportunity-Solution Tree** — artefato visual + workflow (FW-02)
3. **Assumption Testing Canvas** — registry por squad (FW-03)
4. **Grand Slam Offer + Value Equation** — squad é oferta; valor quantificado (FW-01)
5. **5-Step Musk Algorithm aplicado** — stress test formalizado com sequenciamento e KPI de deleção (FW-04 + IC-05)
6. **Workflow Decomposition** — Role → Workflow → Task → Action; reconciliação com task-first (FW-05 + RC-21)
7. **Hook Model aplicado ao Moreh** — design de trigger/action/reward/investment por output (FW-06 + RC-23)
8. **Variable Reward Schedule** — cadência de reforço intermitente (FW-07 + RC-24)
9. **Trio Pattern** — executor/validator/researcher — continuous discovery pós-launch (IC-04 + RC-20)
10. **Niche Lock Protocol** — lock-in period contra pivots prematuros (IC-02)
11. **Story-Based Interviewing Protocol** — técnica de captura em Passo 2 (IC-08)
12. **Guarantee as Risk Reversal** — SLA/warranty em squad contracts (IC-06)

### 5.2 Patches aos VOLs existentes

| Vol | Patches propostos | Delta estimado |
|-----|-------------------|---------------|
| **VOL-01** | Greenfield Detection (PA-04); Workflow Decomposition nível Role>Workflow>Task>Action (FW-05); Mercado > Oferta > Persuasão (IC-01) | +80-100 linhas |
| **VOL-02** | Round Structure Fixa (HO-01); Gap-Driven Questions (HO-07); Confidence Tracking (MP-06); 5-Step Musk no Stress Test (FW-04); "Best Part Is No Part" KPI (IC-05); Story-Based Interviewing (IC-08) | +150-180 linhas |
| **VOL-03** | Bottleneck → Quality Gate (MP-02); Dual Mapping PU→Task+KB (MP-04); Executor Hint Refinement (MP-05); PU-STEP:Task 1:1 (HO-02); Decision Tree Materialization (HO-03); Modos de Interação (HO-05) | +180-200 linhas |
| **VOL-04** | Guarantee as SLA em Contract (IC-06); Skill Markdown como estágio formal (RC-22) | +60-80 linhas |
| **VOL-05** | Dual Mapping do lado KB (MP-04 — metade já em VOL-03); KB evolui pós-launch (RC-20) | +50-70 linhas |
| **VOL-06** | Confidence Metrics em QG-SF-001 (MP-06 + HO-06); PU-EXCEPTION → Immune System (HO-04); Playback Artifact template (IC-03 — reforço RC-15) | +100-120 linhas |
| **VOL-07** | Handoff Artifact Protocol estruturado (MP-07 — metade em VOL-08) | +50-70 linhas |
| **VOL-08** | State Persistence + Resumability (MP-03); Complexity Routing (MP-01); Handoff Artifact Protocol (MP-07 — metade em VOL-07); Trio Pattern (IC-04) | +150-180 linhas |
| **VOL-09** | (sem patches propostos — domínio autossuficiente) | 0 |
| **VOL-10** | Trade-offs adicionais TA-04 a TA-08 (re-análise); Dry-Run Pattern (PA-01); Backup Strategy (PA-02); Story Traceability (PA-03); Niche Lock (IC-02) | +120-150 linhas |

**Total patches:** +940-1.150 linhas
**Total com VOL-11:** +1.640-2.000 linhas

### 5.3 Atualizações em documentos transversais

| Documento | Delta |
|-----------|-------|
| **GLOSSARIO.md** | +28 termos (17 exploração A + 15 exploração B - 4 duplicações) |
| **REGRAS-CARDINAIS.md** | +0 a +6 RCs (depende da aprovação — RC-19 a RC-24) |
| **REPERTORIO.md** | +7 frameworks (FW-01 a FW-07) |
| **README.md** | Atualização de volumes (10→11), contagem de RCs, número de termos, resumo |
| **completeness-report.yaml** | Re-computar — coverage delta, PU-TACIT adicionais, cross-ref |

---

## 6. Mapeamento Fonte → Volume (Merge)

| Fonte | Volumes afetados | Papel |
|-------|------------------|-------|
| Re-análise squad-forge | VOL-02, 03, 06, 08, 10 (patches) | Primária |
| Re-análise squad-creator | VOL-01, 10 (patches) | Primária |
| `100M.txt` (Hormozi) | VOL-11 (primária), VOL-01 + VOL-04 (patch), VOL-10 (RC-19) | Primária VOL-11, enriquec. demais |
| `continuous.txt` (Torres) | VOL-11 (primária), VOL-02 (patch), VOL-08 (trio) | Primária VOL-11, enriquec. demais |
| `elon.txt` (Musk/Clear) | VOL-11 (stress test), VOL-02 (patch) | Dividida |
| `ai-vision.txt` (Hormozi+Juergens) | VOL-11 (workflow decomposition), VOL-01 + VOL-03 (patch) | Dividida |
| `hooked.txt` (Eyal) | VOL-11 (primária — seções Hook + Variable Reward) | Primária VOL-11 |

---

## 7. Proveniência (Citação)

Mantém o padrão da v1.0:
- Citação literal → `[Fonte: knowledge-refs/100M.txt:104-113]`
- Paráfrase → `[Baseado em: continuous.txt]`
- Síntese multi-fonte → `[Síntese: 100M + continuous + forge-chief]`
- Lente Danilo → `[Lente: loc-01-danilo-metodo]`

---

## 8. Gaps Conhecidos (do próprio merge)

- **Episodic memory** continua deferida — Hook Model (RC-23) sugere que pode ser antecipada, mas sem source concreto de implementação, fica no roadmap
- **Multi-model routing per-squad** (RC-07 atual) não ganhou nova fonte — mantém como descrito em VOL-08
- **Constitution enforcement mechanism** — ambas explorações confirmam que é tópico aberto; não resolve nesse merge
- **IDS Principle aplicado a squads** (RC-09) — continua sem implementação de referência em ambos acervos

---

## 9. Contradições Detectadas (Merge)

| # | Contradição | Resolução proposta |
|---|-------------|-------------------|
| C-01 | **Task-first (RC-03) vs Role>Workflow>Task>Action (FW-05/RC-21)** | Não é contradição, é hierarquia. RC-03 diz "tasks são primárias" em SQUAD level. RC-21 acrescenta que tasks existem DENTRO de workflows DENTRO de roles. Os 2 níveis superiores (role, workflow) são abstrações de organização, o nível task continua primário na execução |
| C-02 | **Qualidade > Velocidade (RC-07) vs "land offer fast" (Hormozi)** | Não é contradição. Hormozi fala do MVP de oferta comercial — rodar rápido no mercado. KaiZen fala de construção de squad — blocante. São fases diferentes do mesmo projeto |
| C-03 | **Auroq incremental vs AIOX upfront (TA-06)** | Já registrada como trade-off, mantém. VOL-10 amplia |

---

## 10. Quality Gates deste Merge

| Gate | O que verifica | Status atual |
|------|---------------|--------------|
| QG-ETL-001 | Compreensão territorial do enriquecimento | **PASS** — 7 meta-patterns + 7 heurísticas + 7 frameworks + 8 insights + 6 RCs candidatas mapeadas |
| **QG-ETL-002** | Plano aprovado pelo usuário | **PENDING** — este documento + resumo no chat aguardam aprovação |
| QG-ETL-003 | Riqueza por volume (composicao) | Será aplicado por unidade durante Fase 2 |
| QG-ETL-004 | Integração do pacote | Fase 3 |
| QG-ETL-005 | Validação final | Fase 4 |

---

## 11. Próximo passo

Apresentar resumo + plano ao usuário. Aguardar aprovação (ou ajustes) antes de compor.

**Decisões pendentes de aprovação:**
1. Criar VOL-11 novo "Descoberta, Oferta e Engajamento" ou distribuir conteúdo entre VOLs existentes?
2. Aprovar quais das 6 RCs candidatas (RC-19 a RC-24)?
3. Adotar reconciliação "Role > Workflow > Task > Action" como RC-21 ou manter task-first puro?
4. Patches cirúrgicos aprovados em bloco ou revisar VOL a VOL?

---

## Fim do MAPA-ENRIQUECIMENTO
