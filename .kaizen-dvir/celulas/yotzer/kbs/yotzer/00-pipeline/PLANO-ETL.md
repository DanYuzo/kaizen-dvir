# ETL Plan — kaizen

## Contexto

- **Fonte:** Múltiplas — arquivos locais (contexto Danilo, método Forge, framework referência, squad Forge Auroq, squad Creator AIOX, blueprint info-produtor) + 4 URLs externas (Lilian Weng + LangChain)
- **Autor(es):** Danilo (contexto), Euriler Jube (Auroq), equipe AIOX, Lilian Weng, LangChain team
- **Tipo:** Misto — documentação de squads + frameworks + research papers + blog posts técnicos
- **Localização:**
  - `arquivos-relevantes/01-contexto-danilo/` — contexto expert (propósito, método, oferta, posicionamento, público, tom, diretrizes)
  - `arquivos-relevantes/02-metodo-forge-exploracao/` — exploração método Forge
  - `arquivos-relevantes/03-framework-referencia/` — framework 7 artefatos
  - `arquivos-relevantes/04-squad-forge-auroq/` — squad Forge Auroq completo
  - `arquivos-relevantes/05-squad-creator-aiox/` — squad Creator AIOX
  - `docs/research/2026-04-15-framework-info-produtor-blueprint.md` — blueprint info-produtor
  - URLs: Lilian Weng (prompt engineering, agents) + LangChain (agent builder memory, state of agent engineering)

## Objetivo

Construir base de conhecimento sobre **melhores práticas de construção de multi-agentes e orquestração de frameworks no Claude Code**, integrando o que já foi descoberto em Auroq (squad-forge) e AIOX (squad-creator), e incorporando aprofundamentos externos. Esta KB será a base de conhecimento do futuro squad criador de squads do Danilo.

## Escopo

- **Território central:** Engenharia de squads/multi-agentes
- **Território lente:** Contexto Danilo como filtro de voz, método e posicionamento
- **Território aprofundamento:** Research externo (prompt engineering, LLM agents, memory, state of agent engineering)

## Modo

Full Pipeline (Fases 0-4)

## Status

- [x] Fase 0: Setup
- [x] Fase 1: Mapeamento Territorial
- [x] Fase 2: Composição Blocada (10/10 volumes)
- [x] Fase 3: Integração (README + REGRAS + REPERTORIO + GLOSSARIO + completeness-report)
- [x] Fase 4: Validação Final — PASS (aggregate 93%, 0 invenções, QG-ETL-005 aprovado)

## Decisões Chave

- **2026-04-21 — Escopo definido:** KB unifica 3 territórios (expert Danilo, squads Auroq+AIOX, research externo). Output vira base do squad criador de squads.
- **2026-04-21 — URLs externas via WebFetch:** 4 artigos (Lilian Weng x2 + LangChain x2) serão ingeridos como .md em sources/.
- **2026-04-21 — Naming confirmado:** KB = **KaiZen** | Consumer squad = **Moreh**. Relação KaiZen ↔ Moreh (KB alimenta squad).
- **2026-04-21 — 8 insights de exploração incorporados** (doc: `business/campanhas/metodo-forge/exploracao.md`): meta-squad + macro orchestrator (Weng), memória procedural+semantic (defer episodic), markdown-first + DB runtime, human-in-loop em specs, schema feedback loop, observability dia 1, multi-model routing per-squad, staged rollout.
- **2026-04-21 — Decisão #3 do método-forge resolvida:** staged rollout interno → cliente (RC-18). As outras 3 decisões (unidade atômica, output canônico, lente dos 5 agentes novos) permanecem abertas e serão documentadas em VOL-10.
- **2026-04-21 — 4 regras cardinais adicionadas (RC-15 a RC-18):** human-in-loop obrigatório, schema feedback loop, observability dia 1, staged rollout.

## Regras de Operação

- RELER ESTE PLANO a cada autocompact
- QUALIDADE > VELOCIDADE
- ZERO invenção
- ZERO perda de conhecimento
- Contradições entre fontes são REGISTRADAS, nunca descartadas

## Log

- 2026-04-21 — @etl-chief: Fase 0 concluída. Estrutura criada, PLANO-ETL e state inicializados.
- 2026-04-21 — @etl-chief: Fase 1a (Ingestão) concluída. 18 fontes em sources/ (4 externas via WebFetch + 14 locais via cp/Read).
- 2026-04-21 — @etl-chief: Fase 1b (Mapeamento Territorial) concluída. MAPA-TERRITORIAL.md produzido: 10 domínios, 14 regras cardinais, backbone de 10 volumes (~4.700-5.850 linhas estimadas). Aguardando aprovação do plano (QG-ETL-002).
- 2026-04-21 — @etl-chief: Fase 1c concluída. Backbone v2 (com 8 insights de exploração + RC-15/16/17/18 adicionadas) aprovado pelo expert. QG-ETL-002 PASS.
- 2026-04-21 — @etl-chief: Fase 2 concluída. 10 volumes compostos em rajada. 7.771 linhas totais (+32% vs estimativa). Todos >=300 linhas (spot-check PASS).
- 2026-04-21 — @etl-chief: Fase 3 concluída. Integração: README.md + REGRAS-CARDINAIS.md (18 regras) + REPERTORIO.md (20 frameworks) + GLOSSARIO.md (110+ termos) + completeness-report.yaml. QG-ETL-004 PASS.
- 2026-04-21 — @etl-chief: Fase 4 concluída. Validação 3 camadas: Camada 1 (spot-check) PASS · Camada 2 (auditoria) PASS (96% aderência, 0 invenções, 0 contradições internas) · Camada 3 (6-passes) PASS (93% aggregate). QG-ETL-005 PASS. **KaiZen v1.0.0 APROVADA PRA PRODUÇÃO.**

---

## Merge v1.1 (2026-04-22 — em curso)

### Contexto do Merge
- **Motivação:** 2 explorações paralelas de enriquecimento
  - Exploração A: re-análise squad-forge + squad-creator com lente meta-pattern
  - Exploração B: ingestão das 5 referências externas que inspiraram os 8 passos (100M.txt, continuous.txt, elon.txt, ai-vision.txt, hooked.txt)
- **Fontes novas:** 5 (em `docs/kaizen/knowledge-refs/`)
- **Re-análises:** 2 acervos já processados na v1.0

### Status do Merge
- [x] Fase 1a: Ingestão (fontes externas em knowledge-refs + re-análises)
- [x] Fase 1b: Mapeamento Territorial — MAPA-ENRIQUECIMENTO-v1.1.md produzido
- [x] Fase 1c: QG-ETL-002 — aprovação do plano pelo usuário (aprovado 2026-04-22: VOL-11 + RC-20/21/22, composição em bloco)
- [x] Fase 2: Composição Blocada — VOL-11 (~780 linhas) + 9 appendix aos VOLs existentes
- [x] Fase 3: Integração — README, REGRAS-CARDINAIS (+3), REPERTORIO (+13 frameworks +12 meta-patterns), GLOSSARIO (+33 termos), completeness-report atualizados
- [x] Fase 4: Validação Final (delta only) — PASS (aggregate 99.6%, 0 invenções, 0 contradições não-resolvidas)

### Delta Estimado
- +1.640-2.000 linhas (VOL-11 novo + patches)
- +28 termos glossário
- +0-6 RCs (RC-19 a RC-24 candidatas — depende aprovação)
- +7 frameworks no REPERTORIO
- 11 volumes totais (10 → 11)

### Log do Merge
- 2026-04-22 — @etl-chief: Exploração A (squad-forge + squad-creator) concluída. 7 meta-patterns + 7 heurísticas + 5 trade-offs + 4 padrões AIOX + 17 termos novos.
- 2026-04-22 — @etl-chief: Exploração B (5 refs externas) concluída. 7 frameworks operacionalizáveis + 8 insights colaterais + 15 termos + 6 RCs candidatas.
- 2026-04-22 — @etl-chief: MAPA-ENRIQUECIMENTO-v1.1.md consolidado. Aguardando aprovação do usuário (QG-ETL-002).
- 2026-04-22 — @etl-chief: Expert aprovou plano — VOL-11 novo, RC-20/21/22 adotadas, RC-19/23/24 rejeitadas (viram frameworks), Role>Workflow>Task>Action topado, composição em bloco. QG-ETL-002 PASS.
- 2026-04-22 — @etl-chief: Fase 2 concluída. VOL-11 (780 linhas) + 9 appendix (VOL-01/02/03/04/05/06/07/08/10 — VOL-09 sem patch) compostos. Spot-check por unidade: todos PASS (>=300 linhas equivalente, fontes citadas, zero invenção).
- 2026-04-22 — @etl-chief: Fase 3 concluída. README + REGRAS-CARDINAIS (+RC-20/21/22) + REPERTORIO (+seção 21 com 13 frameworks + seção 20.4 com 12 meta-patterns) + GLOSSARIO (+33 termos seção v1.1) + completeness-report atualizados. QG-ETL-004 PASS.
- 2026-04-22 — @etl-chief: Iniciando Fase 4 — validação do delta via auditor independente (RC-05).
- 2026-04-22 — @auditor: Fase 4 concluída. Camada 2 PASS (100% fidelity em 12 citações auditadas · zero invenções · zero contradições não-resolvidas) · Camada 3 PASS (aggregate 99.6%: Completeness 100% · Fidelity 100% · Cross-ref 98% · RC integration 100% · Glossary coverage 100%). QG-ETL-005 PASS. **KaiZen v1.1.0 APROVADA PRA PRODUÇÃO.**
- 2026-04-22 — @etl-chief: Merge v1.1 fechado. Delta final: +1 volume (VOL-11), +9 appendix, +3 RCs (20/21/22), +13 frameworks, +12 meta-patterns, +33 termos glossário. Relatório em `validation-report-v1.1.md`.
