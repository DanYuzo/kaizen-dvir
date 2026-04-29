# KaiZen — Knowledge Base

> **Base cognitiva do Moreh** — o squad criador de squads do Danilo.
> Melhores práticas de construção de multi-agentes e orquestração de frameworks no Claude Code, integrando Auroq (squad-forge) + AIOX (squad-creator) + research externo, com a lente autoral do método Danilo 8 fases.
>
> **v1.1 (2026-04-22):** merge incorporou 2 explorações de enriquecimento — re-análise de squad-forge/squad-creator (7 meta-patterns + 7 heurísticas operacionais) e ingestão das 5 referências que inspiraram o método Danilo (Hormozi 100M + Torres + Musk/Clear + Hormozi AI Vision + Eyal). Adicionado VOL-11 "Descoberta, Oferta e Engajamento" + 9 appendix nos VOLs 1-10 + 3 regras cardinais novas (RC-20/21/22).

---

## Sumário Executivo

A **KaiZen** unifica três territórios que viviam separados:

1. **Squads validados** — `squad-forge-auroq` (Euriler) + `squad-creator-aiox` (Synkra). Complementares: Auroq forte em **extração de processo implícito**, AIOX forte em **estrutura formal e contratos**.
2. **Research externo de ponta** — Lilian Weng (prompt engineering + LLM agents) + LangChain (agent builder memory + state of agent engineering 2026).
3. **Lente autoral Danilo** — 8 fases do método ("implícito em obvio"), tom casual, diretrizes de escrita (Euriler + Hormozi).

### Consumer

**Moreh** = meta-forge autoral que executa as 8 fases do método Danilo pra criar squads operacionais pro Danilo + clientes da Consultoria Híbrida 60d.

**Relação:** KaiZen ↔ Moreh (KB alimenta squad; squad consome e executa).

### Escopo MVP

- **Memória:** Procedural + Semantic (Episodic deferido → roadmap)
- **Storage:** Markdown-first pra autoria, DB runtime (virtual filesystem)
- **Rollout:** Staged — interno Danilo primeiro, cliente depois

---

## Estrutura da KB

```
agents/etlmaker/kbs/kaizen/
├── README.md                          ← este arquivo
├── REGRAS-CARDINAIS.md                ← 21 regras inegociáveis (18 v1.0 + 3 v1.1)
├── REPERTORIO.md                      ← frameworks + padrões consolidados
├── GLOSSARIO.md                       ← vocabulário técnico expandido
├── VOL-01-fundamentos-e-arquitetura.md                    (+ Appendix v1.1)
├── VOL-02-extracao-de-processo.md                         (+ Appendix v1.1)
├── VOL-03-arquitetura-e-design-de-squads.md               (+ Appendix v1.1)
├── VOL-04-estrutura-nuclear-e-contratos.md                (+ Appendix v1.1)
├── VOL-05-kb-como-cerebro.md                              (+ Appendix v1.1)
├── VOL-06-quality-gates-e-self-healing.md                 (+ Appendix v1.1)
├── VOL-07-memoria-aprendizado-e-handoff.md                (+ Appendix v1.1)
├── VOL-08-orquestracao-e-sistema-nervoso.md               (+ Appendix v1.1)
├── VOL-09-padroes-de-ia.md
├── VOL-10-governance-evolucao-meta-squads.md              (+ Appendix v1.1)
├── VOL-11-descoberta-oferta-engajamento.md                ← NOVO v1.1
└── 00-pipeline/                       ← artefatos de processo (ETL)
    ├── PLANO-ETL.md                   ← atualizado com log do merge v1.1
    ├── MAPA-TERRITORIAL.md
    ├── MAPA-ENRIQUECIMENTO-v1.1.md    ← NOVO v1.1
    ├── .state.json
    ├── sources/                       ← 18 fontes originais + 5 refs novas em docs/kaizen/knowledge-refs/
    └── completeness-report.yaml
```

---

## Como Moreh Consome

### Sequência de leitura recomendada

| Ordem | Volume | Quando ler |
|-------|--------|------------|
| 1º | VOL-01 | Boot do Moreh — fundamentos |
| 2º | VOL-11 | Antes de extrair — validar mercado, mapear oportunidade, desenhar oferta |
| 3º | VOL-02 | Quando for extrair processo (Fase 1 do método) |
| 4º | VOL-03 | Quando for arquitetar squad (Fase 2) |
| 5º | VOL-04 | Quando for montar estrutura nuclear (Fase 3) |
| 6º | VOL-05 | Quando for compor KB do squad |
| 7º | VOL-06 | Quando for validar + aplicar gates |
| 8º | VOL-07 | Quando for configurar memória do squad |
| 9º | VOL-08 | Quando for orquestrar agentes |
| 10º | VOL-09 | Referência de padrões de IA (reasoning/prompting/tool use) |
| 11º | VOL-10 | Governance + decisões abertas do Moreh |
| 12º | VOL-11 (re-leitura) | Após launch — hook model, variable reward, trio pattern pra sustentar adoção |

### Mapeamento pro método Danilo 8 fases

| Fase do método | Volumes relevantes |
|---------------|-------------------|
| 1. Entender o problema real | VOL-11 §2 (Market Validation) + VOL-02 |
| 2. Mapear passo a passo | VOL-11 §3-§4 (Opportunity-Solution Tree + Assumption Testing) + VOL-02, VOL-03 + VOL-02 Appendix (Story-Based Interviewing) |
| 3. Stress test | VOL-11 §6 (5-Step Musk Algorithm) + VOL-02 Appendix (KPI deleção) + VOL-06 + VOL-10 (decisão #4 aberta) |
| 4. Riscos + soluções | VOL-03 (immune system), VOL-06, VOL-03 Appendix (executor hint refinement) |
| 5. Priorização 80/20 | VOL-11 §5 (Value Equation) + VOL-10 (decisão #4 aberta) |
| 6. Inputs/outputs/quality gates | VOL-04 (schema) + VOL-04 Appendix (Guarantee as Risk Reversal) + VOL-06 |
| 7. Níveis progressivos | VOL-11 §7-§8 (Workflow Decomposition + Skill Markdown Pipeline) + VOL-10 (RC-18) |
| 8. Feedback loop | VOL-11 §9-§10 (Hook Model + Variable Reward) + VOL-11 §11 (Trio Pattern, RC-20) + VOL-06 + VOL-08 Appendix |

---

## Domínios Cobertos

| # | Domínio | Volume principal |
|---|---------|------------------|
| D1 | Fundamentos e Arquitetura | VOL-01 |
| D2 | Extração de Processo | VOL-02 |
| D3 | Arquitetura e Design de Squads | VOL-03 |
| D4 | Estrutura Nuclear e Contratos | VOL-04 |
| D5 | Knowledge Base como Cérebro | VOL-05 |
| D6 | Quality Gates e Self-Healing | VOL-06 |
| D7 | Memória, Aprendizado e Handoff | VOL-07 |
| D8 | Orquestração e Sistema Nervoso | VOL-08 |
| D9 | Padrões de IA (Reasoning + Prompting + Tool Use) | VOL-09 |
| D10 | Governance, Evolução e Meta-Squads | VOL-10 |
| **D11** | **Descoberta, Oferta e Engajamento** (upstream + downstream) | **VOL-11** |

---

## Métricas do Pacote

| Métrica | v1.0 | v1.1 |
|---------|------|------|
| Volumes | 10 | 11 |
| Linhas totais (aprox.) | 7.771 | ~9.500-10.000 (com appendix + VOL-11) |
| Fontes ingeridas | 18 | 23 (18 originais + 5 refs externas) |
| Regras cardinais | 18 | 21 (RC-20, RC-21, RC-22 novas) |
| Domínios cobertos | 10 | 11 |
| Frameworks referenciados | 19+ | 26+ |
| Termos no glossário | 50+ | 78+ |

---

## Insights-Chave da Exploração (incorporados)

### v1.0 (8 insights iniciais)
1. **Hierarquia meta-squad + macro orchestrator** é padrão validado (Weng) — KaiZen ↔ Moreh confirmado
2. **Memória em tiers** — procedural + semantic no MVP, episodic deferido
3. **Markdown-first + DB runtime** — virtual filesystem (LangChain)
4. **Human-in-loop em toda mutação de specs** — anti prompt-injection (RC-15)
5. **Schema validation com feedback loop pro LLM** — squad-validator.js como fase 6 do Moreh (RC-16)
6. **Observability desde dia 1** — CLI First → Observability Second → UI Third (RC-17)
7. **Multi-model routing per-squad** — Haiku extrai, Opus gera (75%+ adoption)
8. **Staged rollout** — interno → cliente é industry pattern (RC-18)

### v1.1 (enriquecimento — 7 meta-patterns + 7 frameworks)

**Meta-patterns do squad-forge/squad-creator:**
9. **Complexity Routing** — 3 modos (simple/standard/complex) adaptam rounds/agentes/tempo
10. **Bottleneck → Quality Gate** — constraint vira gate bloqueante obrigatório
11. **State Persistence + Resumability** — `.state.json` + `*resume` (pipeline pausável)
12. **Dual Mapping PU → Task + KB** — cada PU alimenta 2 destinos simultâneos
13. **Executor Hint Refinement** — 4 tipos (agent/human/hybrid/worker), >50% hybrid = redesign
14. **Confidence + Inferred tracking** — incerteza rastreada por PU, thresholds 0.7/30%/50%
15. **Handoff Artifact Protocol** — YAML ~379 tokens preserva contexto entre agents

**Frameworks externos (5 refs):**
16. **Market Validation Checklist** — mercado > oferta > persuasão (Hormozi)
17. **Opportunity-Solution Tree** — outcome → opps → solutions → tests (Torres)
18. **Assumption Testing Canvas** — testar barato antes de construir caro (Torres)
19. **5-Step Musk Algorithm** — question → delete → simplify → accelerate → automate (sequencial)
20. **Workflow Decomposition 4 níveis** — Role > Workflow > Task > Action (Hormozi AI Vision, RC-21)
21. **Hook Model** — trigger → action → variable reward → investment (Eyal)
22. **Trio Pattern** — executor + validator + researcher em cadência semanal (Torres, RC-20)

---

## Decisões Abertas do Moreh

Documentadas em VOL-10 seção 15:

1. **Unidade atômica:** PU (recomendado) ou conceito próprio?
2. **Output canônico:** YAML humanizado vs JSON Schema vs híbrido (recomendado)?
3. ~~**Cliente do método-forge:** interno ou self-service?~~ **RESOLVIDA** — staged rollout (RC-18)
4. **Lente dos 5 agentes novos** (stress-tester, risk-mapper, prioritizer, flow-architect, loop-instrumenter): internos ou entregáveis?

---

## Proveniência

Autoridades principais:

- **Euriler Jube** (Auroq OS) — extração + squad-forge + companion pattern
- **AIOX team (Synkra)** — squad-creator + JSON Schema + validators
- **Lilian Weng** (OpenAI) — prompt engineering + LLM agents components
- **LangChain team** — memory frameworks + state of agent engineering
- **Danilo Yuzo** — método 8 fases + lente autoral + diretrizes de escrita

**Anti-plágio:** KB **sintetiza, organiza e conecta** — não copia literal. Cada parágrafo traceable. Citações quando literal.

---

## Versão

- **v1.0.0** — 2026-04-21 — base aprovada (10 volumes, 18 RCs, 93% aggregate, 0 invenções)
- **v1.1.0** — 2026-04-22 — merge de enriquecimento (11 volumes, 21 RCs, +7 frameworks, VOL-11 novo + 9 appendix)
- **Pipeline:** ETLmaker v3.0
- **Status:** v1.1.0 compôs Fase 2 e Fase 3 — aguardando validação final (Camada 2 + Camada 3 do delta)

---

## Próximos Passos

1. Fase 4 do ETL: validação 3 camadas (spot-check por volume + auditoria + 6-passes estatísticos)
2. Squad Moreh usa KaiZen como base cognitiva
3. Staged rollout: uso interno pelo Danilo → beta com 2-3 clientes → GA

---

**"Conhecimento disperso é conhecimento perdido. Aqui está organizado, operável, evoluível."**
