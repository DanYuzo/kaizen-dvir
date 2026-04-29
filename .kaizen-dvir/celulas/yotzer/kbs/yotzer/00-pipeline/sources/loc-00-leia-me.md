# Arquivos relevantes — Contexto para construir o método-forge

> Pasta montada em 2026-04-15 pra fornecer contexto completo a outra IA que vai construir os workflows do método-forge (gerador próprio baseado nas 8 fases do método autoral do Danilo, reaproveitando partes validadas de squad-forge e squad-creator).

---

## Como usar este pacote

1. Leia primeiro `01-contexto-danilo/` — **quem é o expert, o que ele vende, qual a tese**. Sem isso, nada faz sentido.
2. Leia depois `02-metodo-forge-exploracao/exploracao.md` — **o blueprint do que precisa ser construído**, decisões tomadas, decisões pendentes, mapeamento fase a fase.
3. Use `03-framework-referencia/` — **vocabulário base** (KB, Workflow, Tasks, Rules, Quality Gates, Skill/Agent, Tools). Não é obrigatório seguir, mas é referência útil.
4. Use `04-squad-forge-auroq/` como **biblioteca de componentes validados** das fases 1 e 2 (descoberta e mapeamento). Reutilizar direto quando possível.
5. Use `05-squad-creator-aiox/` como **biblioteca de componentes validados** das fases 6 e 8 (contratos formais e versionamento).

---

## Estrutura das pastas

### 01-contexto-danilo/
Contexto do expert. Quem é, pra quem trabalha, o método, a oferta, o tom de voz.
- `metodo.md` — **CORE.** As 8 fases do método autoral. Tudo parte daqui.
- `oferta.md` — Consultoria Híbrida 60 dias, precificação, visão de produto pós-12m (biblioteca standalone).
- `posicionamento.md` — "Transformo o implícito em obvio". Diferencial competitivo.
- `publico-alvo.md` — Experts/info-produtores, R$20-30k+/mês, aplicadores disciplinados.
- `proposito.md` — Tese que sustenta o trabalho (Kahneman, Greene, Hormozi, Cagan, Torres).
- `tom-de-voz.md` — Como o Danilo comunica.
- `diretrizes-escrita.md` — Regras de escrita (Euriler + Hormozi).

### 02-metodo-forge-exploracao/
Documento vivo da exploração atual.
- `exploracao.md` — **ROADMAP.** Decisão de caminho C (construir próprio), blueprint da arquitetura, mapeamento fase a fase contra squad-forge e squad-creator, 4 decisões pendentes que bloqueiam o próximo passo.

### 03-framework-referencia/
Vocabulário sintetizado (não obrigatório usar, mas útil).
- `framework-7-artefatos.md` — Framework universal de 7 artefatos (KB, Workflow, Tasks, Rules, Quality Gates, Skill/Agent, Tools) sintetizado de Auroq OS, CrewAI, AIOX-Core e Anthropic Skills.

### 04-squad-forge-auroq/
Gerador de squads do Auroq OS. Cobre bem as fases 1 e 2 do método (descoberta e mapeamento). **Reutilizar componentes diretamente.**

- `squad.yaml` — Manifest do squad.
- `README.md` — Visão geral.
- `agents/` — 3 agentes especializados (separação de papéis):
  - `forge-chief.md` — Coordenador e juiz de playback.
  - `process-archaeologist.md` — Extrator (aplica 8 lentes).
  - `forge-smith.md` — Construtor.
- `data/` — Knowledge base:
  - `extraction-lenses.yaml` — **8 lentes iterativas** (reuso direto na fase 1 do método-forge).
  - `pu-classification.yaml` — Taxonomia de Process Units.
  - `executor-mapping-guide.yaml` — Mapeamento PU → executor.
  - `forge-kb.md` — KB interna do forge.
- `templates/` — Reuso direto:
  - `process-map-tmpl.yaml` — Template de mapa de processo (fase 2).
  - `pu-tmpl.yaml` — Template de Process Unit (unidade atômica).
  - `squad-blueprint-tmpl.yaml` — Blueprint do squad final.
- `tasks/` — Fluxo operacional:
  - `start.md` — Entrada.
  - `extract-process.md` — Extração (fase 1-2 do método).
  - `playback-validate.md` — **Playback gate com o expert** (crítico, manter).
  - `architect-squad.md` — Arquitetura.
  - `assemble-squad.md` — Montagem.
  - `validate-squad.md` — Validação final.
- `workflows/wf-squad-forge.yaml` — Workflow completo do forge.
- `checklists/` — 5 quality gates comportamentais:
  - `extraction-completeness.md` — ≥15 PUs, ≥6/8 lentes, confiança ≥0.7.
  - `user-validation.md` — Playback com expert.
  - `architecture-coherence.md` — Coerência arquitetural.
  - `nuclear-structure-validation.md` — Validação estrutural nuclear.
  - `squad-operational.md` — Smoke tests (2/3).

### 05-squad-creator-aiox/
Gerador de squads do AIOX-core. Forte em estrutura formal, schema validation e versionamento. **Reutilizar para fase 6 (contratos) e fase 8 (feedback loop/versionamento).**

- `squad-creator.md` — Agente principal (monolítico, 10+ tasks).
- `scripts-README.md` — Explica os 9 scripts JS (loader, validator, generator, designer, analyzer, extender, migrator, downloader, publisher). Scripts completos ficaram de fora por tamanho — buscar em `aiox-core/.aiox-core/development/scripts/squad/` se precisar.
- `schemas/` — **Reuso direto na fase 6:**
  - `squad-schema.json` — Schema formal do squad (contrato estrutural).
  - `squad-design-schema.json` — Schema da fase de design.
- `tasks/` — Tasks do agente (10 tasks):
  - `squad-creator-design.md` — Design a partir de docs.
  - `squad-creator-create.md` — Criação.
  - `squad-creator-validate.md` — Validação.
  - `squad-creator-analyze.md` — Análise.
  - `squad-creator-extend.md` — Extensão.
  - `squad-creator-migrate.md` — **Migração entre versões** (útil pra fase 8).
  - `squad-creator-publish.md` — Publicação (distribuição).
  - `squad-creator-download.md`, `squad-creator-list.md`, `squad-creator-sync-*.md` — Utilitários.
- `squad-template-skeleton/` — Template base de squad (estrutura que o creator gera).

---

## O que NÃO está aqui (e por quê)

- **Scripts JS do squad-creator** (squad-validator.js, squad-loader.js, etc.) — 7K+ linhas. Pesados demais pra contexto. Se a IA precisar inspecionar, buscar em `aiox-core/.aiox-core/development/scripts/squad/`.
- **Identidade/história/valores do Danilo** — secundários pra construção de workflows. Focamos no método, oferta, posicionamento, público, propósito, tom.
- **Outros agentes do AIOX** (aiox-master, analyst, architect, dev, qa, etc.) — não são relevantes pra método-forge. Método-forge tem autoria própria.
- **Outros forges do Auroq** (clone-forge, mind-forge, worker-forge) — decisão foi usar só squad-forge como referência.

---

## Decisões pendentes que a IA precisa saber

Ao construir os workflows, saiba que estas 4 perguntas **ainda não foram respondidas** e afetam o design:

1. **Unidade atômica:** PU (reuso do forge) ou conceito próprio?
2. **Output canônico:** YAML (forge-style), JSON Schema (creator-style) ou híbrido?
3. **Cliente do método-forge:** uso interno do Danilo ou self-service pro cliente da consultoria?
4. **Lente dos 5 agentes novos** (stress-tester, risk-mapper, prioritizer, flow-architect, loop-instrumenter): ferramentas internas ou entregáveis pro cliente?

A IA pode propor respostas e levar pro Danilo validar.

---

## Mapeamento rápido: fase do método → origem dos componentes

| Fase do método | Origem | Status |
|---|---|---|
| 1. Entender o problema real | squad-forge (8 lentes, 5 Whys, TOC) | Reuso direto |
| 2. Mapear passo a passo | squad-forge (PUs, dependency graph, process-map-tmpl) | Reuso direto |
| 3. Stress test | **NOVO** (autoria Danilo) | Construir |
| 4. Riscos + soluções | **NOVO** (autoria Danilo) | Construir (inspiração: error codes do creator) |
| 5. Priorização 80/20 | **NOVO** (autoria Danilo) | Construir |
| 6. Inputs/outputs/quality gates | squad-creator (schemas) + squad-forge (gates comportamentais) | Híbrido |
| 7. Níveis progressivos (manual→batch→auto) | **NOVO** (autoria Danilo, diferencial mais único) | Construir |
| 8. Feedback loop | squad-creator (migration/versioning) | Adaptar |
