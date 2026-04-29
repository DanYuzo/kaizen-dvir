# Método-Forge — Exploração Inicial

> **Status:** Descoberta / Blueprint (ainda não é projeto ativo no cockpit)
> **Iniciado:** 2026-04-15
> **Decisão tomada:** Caminho C — construir gerador próprio reaproveitando partes validadas de squad-forge e squad-creator
> **Próxima retomada:** Decidir as 4 perguntas pendentes (ver seção final)

---

## Contexto

Danilo tem método autoral de 8 fases (`docs/knowledge/expert-business/metodologia/metodo.md`) que é o coração da oferta (Consultoria Híbrida de 60 dias). A intenção é ter um gerador de squads/agentes que **execute literalmente as 8 fases**, ao invés de adotar gerador externo genérico.

### Por que Caminho C (construir próprio)

Análise comparativa entre squad-forge (Auroq OS) e squad-creator (aiox-core) mostrou que **nenhum dos dois cobre o método completo**:

| Fase do método | squad-forge | squad-creator |
|---|---|---|
| 1. Entender o problema real | Sim forte (8 lentes, 5 Whys, playback) | Não — assume doc pronta |
| 2. Mapear passo a passo | Sim forte (PUs, dependency graph) | Parcial — extrai de docs |
| 3. Stress test | **Não** | **Não** |
| 4. Riscos + soluções | **Não** | **Não** |
| 5. Priorização impacto × esforço | **Não** | **Não** |
| 6. Inputs/outputs/quality gates | Parcial (gates comportamentais) | Parcial (schema estrutural) |
| 7. Níveis progressivos | **Não** | **Não** |
| 8. Feedback loop | **Não** | **Não** |

As fases ausentes (3, 4, 5, 7, 8) são **exatamente o diferencial competitivo** listado em `posicionamento.md` e `metodo.md`. Adotar gerador externo apaga o diferencial.

---

## Blueprint do método-forge

### Mapeamento fase a fase

| Fase | O que é próprio | O que aproveitar | Origem |
|---|---|---|---|
| **1. Problema real** | Tese "apaixone-se pelo problema" | 8 lentes iterativas (L1-L8) + rounds graduais (R1-R4 com % de confiança) + 5 Whys/TOC/Checklist | forge (reuso direto) |
| **2. Mapear passo a passo** | "Transformar implícito em obvio" | Process Units (PUs) como unidade atômica + dependency graph + playback com expert | forge (reuso direto) |
| **3. Stress test** | **Diferencial** — cortar antes de otimizar | Padrão de guardrails programáticos (função valida cada PU) | creator (inspiração) |
| **4. Riscos + soluções** | **Diferencial** — por etapa | Estrutura de error codes como taxonomia de falhas | creator (inspiração) |
| **5. Priorização 80/20** | **Diferencial** — impacto × esforço | Scoring de complexidade (AIOX usa 3 dimensões: escopo, integração, conhecimento) | creator (inspiração) |
| **6. Inputs/outputs/quality gates** | Contratos explícitos entre etapas | JSON Schema formal (creator) + quality gates comportamentais (forge) — **combo** | ambos |
| **7. Níveis progressivos** | **Diferencial mais único** — manual→simplificado→batch→auto | 3 templates (basic/etl/agent-only) como referência de progressão estrutural | creator (inspiração) |
| **8. Feedback loop** | **Diferencial** — evolui com uso | Versionamento v1/v2 + migration scripts | creator (reuso direto) |

### Reaproveitamento concreto

**Do squad-forge (código/template que pode ser adaptado):**
- `process-map-tmpl.yaml` — template de mapeamento. Fase 2.
- `pu-tmpl.yaml` — estrutura de Process Unit. Fase 2.
- 3 agentes separados (chief/archaeologist/smith) — padrão de separação de papéis.
- `.state.json` — pausabilidade entre fases.
- Playback gate — user-in-loop validation.

**Do squad-creator (código/template que pode ser adaptado):**
- `squad-schema.json` + AJV — validação formal pra fase 6.
- `squad-validator.js` (855 linhas) — motor de validação reaproveitável.
- `squad-loader.js` — referência de qualidade (94.5% coverage).
- Error codes estruturados — taxonomia pra fase 4.
- Migration scripts — padrão pra fase 8 (feedback loop precisa de versionamento).

### Arquitetura proposta

```
método-forge/
├── fase-1-discovery/        ← herda 8 lentes do forge
├── fase-2-process-map/      ← herda PUs + dep-graph do forge
├── fase-3-stress-test/      ← NOVO (diferencial)
├── fase-4-risk-map/         ← NOVO (diferencial)
├── fase-5-prioritizer/      ← NOVO (diferencial)
├── fase-6-contracts/        ← combo: schema (creator) + gates (forge)
├── fase-7-progressive/      ← NOVO (diferencial) — manual/simpl/batch/auto
├── fase-8-feedback-loop/    ← herda versionamento do creator
├── agents/
│   ├── method-chief             ← padrão forge-chief
│   ├── archaeologist            ← reuso direto do forge
│   ├── stress-tester            ← NOVO
│   ├── risk-mapper              ← NOVO
│   ├── prioritizer              ← NOVO
│   ├── contract-builder         ← híbrido
│   ├── flow-architect   ← NOVO
│   └── loop-instrumenter        ← NOVO
└── shared/
    ├── schemas/                 ← de creator
    ├── validators/              ← de creator
    └── templates/               ← misto
```

---

## Decisões pendentes (bloqueiam próximo passo)

Ao retomar, decidir estas 4 perguntas **antes** de começar construção:

### 1. Unidade atômica
- PU do squad-forge (já validado) ou conceito próprio?
- **Recomendação inicial:** PU — economiza desenho e aproveita validação existente.

### 2. Output canônico
- YAML humanizado (estilo forge)?
- JSON Schema formal (estilo creator)?
- Híbrido (YAML interno, JSON exportado)?
- **Afeta:** fase 6 (contratos) e fase 8 (feedback loop / versionamento).

### 3. Cliente do método-forge
- Só Danilo usa internamente na consultoria?
- Ou o cliente da consultoria também roda partes (self-service)?
- **Afeta:** nível de polimento, UX, documentação necessária.

### 4. Lente dos 5 agentes novos (fases 3, 4, 5, 7, 8)
- São **ferramentas internas** do Danilo (uso próprio na consultoria)?
- Ou são **entregáveis pro cliente** (parte do método proprietário personalizado que fica com ele)?
- **Afeta tudo:** se é entregável, nível de polimento sobe muito. Se é interno, pode ser scrappy.

---

## Raciocínio pró-Caminho C (pra não esquecer)

1. **Meta-coerência narrativa:** método vende "extrair implícito" → squad-forge faz isso → mas só extrai, não executa o método completo. Construir o método-forge completo materializa o diferencial inteiro.
2. **Volume justifica investimento:** meta 12 meses = 6+ clientes × múltiplos squads por cliente = dezenas de artefatos. Ponte entre geradores pagaria, mas construir próprio paga mais.
3. **Biblioteca reutilizável é visão declarada:** `oferta.md` lista biblioteca de agentes standalone como destino pós-12m. Método-forge é o motor dessa biblioteca.
4. **Fases 3, 4, 5, 7, 8 são autoria:** não faria sentido pedir emprestado o que é seu.

---

## Próximo passo quando retomar

1. Reler este doc + `metodo.md` + `oferta.md` pra reaquecer contexto
2. Responder as 4 decisões pendentes
3. Decidir se vira projeto ativo no cockpit (com tracker) ou continua em exploração
4. Se virar ativo: priorizar quais fases construir primeiro (provavelmente 1, 2, 6 — reaproveitáveis diretos — pra destravar; depois 3, 4, 5, 7, 8 — autoria)

---

## Arquivos de referência

- `docs/knowledge/expert-business/metodologia/metodo.md` — as 8 fases
- `docs/knowledge/expert-business/produto/oferta.md` — contexto da consultoria e visão de produto
- `docs/knowledge/expert-business/posicionamento.md` — diferencial competitivo
- `docs/knowledge/biblioteca-pmi/framework-7-artefatos.md` — referência de vocabulário (não obrigatório usar)
- `agents/squad-forge/` — para extrair PU tmpl, process-map tmpl, 8 lentes, playback gate
- `aiox-core/` — para extrair schema, validator, error codes, migration scripts
