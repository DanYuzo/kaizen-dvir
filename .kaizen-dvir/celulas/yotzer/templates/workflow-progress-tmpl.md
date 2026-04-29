---
template_id: workflow-progress-tmpl
language_policy:
  machine: "EN — this frontmatter, token table headers, machine identifiers"
  user_facing: "pt-BR — rendered ASCII map labels and Act names"
canonical_tokens:
  normal:
    done: "[V]"
    current: "[>]"
    pending: "[ ]"
  critical_invariant:
    done: "[!V]"
    current: "[!>]"
    pending: "[! ]"
critical_invariant_phases: [1, 2, 10]
acts:
  - id: 1
    label: "Ato 1: Descoberta"
    phases: [1, 2, 3]
  - id: 2
    label: "Ato 2: Refinamento"
    phases: [4, 5, 6, 7]
  - id: 3
    label: "Ato 3: Construcao"
    phases: [8, 9, 10]
phase_labels_source: "tasks/explain-method.md (M9.1 output) — DO NOT HARDCODE; derive at runtime"
phase_metadata_source: "workflows/wf-yotzer-generate-celula.yaml — Act grouping and critical_invariant flag"
---

# Canonical workflow progress map — Yotzer

<!--
Machine EN no frontmatter. Corpo pt-BR. Este template e a fonte unica de
verdade do formato ASCII usado por `tasks/status.md` e pelo cabecalho
de fase de `agents/chief.md`. Qualquer divergencia entre as duas
superficies de render quebra o teste anti-drift
`tests/m9/m9-3/test-token-set-canonical.js` (AC-08).

ASCII puro (Option C, ratificada como default por OQ-01). Sem ANSI,
sem unicode complexo, sem emoji. Compativel com Windows CMD, Windows
Terminal, Linux e macOS.
-->

## Conjunto canonico de tokens

Cada um dos seis estados tem um token unico. Tokens normais marcam
fases comuns. Tokens com prefixo `!` marcam invariantes criticos
(F1, F2, F10 — fases que sempre pausam mesmo em modo automatico).

| Estado | Fase normal | Invariante critico |
|--------|-------------|---------------------|
| Concluida | `[V]` | `[!V]` |
| Atual | `[>]` | `[!>]` |
| Pendente | `[ ]` | `[! ]` |

**Regra anti-drift:** o conjunto exato `{[V], [>], [ ], [!V], [!>], [! ]}` aparece como union dos tokens emitidos por qualquer render que use este template. Diferenca simetrica nao vazia contra esse conjunto e FAIL no `test-token-set-canonical.js`.

## Agrupamento por ato

O metodo Yotzer organiza as 10 fases em 3 atos. O ato e atribuido pela
posicao da fase no `wf-yotzer-generate-celula.yaml`:

| Ato | Rotulo pt-BR | Fases |
|-----|--------------|-------|
| 1 | `Ato 1: Descoberta` | F1, F2, F3 |
| 2 | `Ato 2: Refinamento` | F4, F5, F6, F7 |
| 3 | `Ato 3: Construcao` | F8, F9, F10 |

Os rotulos de ato em pt-BR sao fixos. Os nomes curtos das fases vem
de `tasks/explain-method.md` (M9.1) — render NUNCA inventa nome de
fase.

## Forma do mapa completo (10 fases)

Bloco renderizado pelo `*status` apos o relatorio plain-text. Tres
linhas, uma por ato, indentadas para leitura rapida:

```
Ato 1: Descoberta
  [!V] F1 Objetivo            [!V] F2 Fontes e exemplos    [>] F3 Teste de estresse

Ato 2: Refinamento
  [ ] F4 Mapa de risco        [ ] F5 Priorizacao           [ ] F6 Granulacao de etapas    [ ] F7 Contratos

Ato 3: Construcao
  [ ] F8 Sistematizacao prog. [ ] F9 Revisao de integracao [! ] F10 Publicacao
```

Render real preenche os tokens conforme estado. Os nomes das fases
saem de `explain-method.md` em runtime (nao hardcode).

## Forma do cabecalho de fase (chief, antes de delegar)

Bloco compacto de tres linhas (AC-10 — NAO re-renderiza o mapa
inteiro). Renderizado por chief antes de passar a fase ao
sub-agente:

```
Fase {N}/10 -- {nome curto da fase em pt-BR}
Ato {A}: {rotulo do ato}
{marcador} {flag}
```

Onde:

- `{N}` e o numero da fase (1 a 10).
- `{nome curto}` vem de `explain-method.md` (M9.1), por numero de fase.
- `{A}` e o numero do ato (1, 2 ou 3) derivado do yaml.
- `{rotulo do ato}` e `Descoberta`, `Refinamento` ou `Construcao`.
- `{marcador}` e `[!>]` para invariante critico atual ou `[>]` para fase atual normal.
- `{flag}` e `Invariante critico — sempre pausa` para F1/F2/F10, ou `Fase regular` para as demais.

Exemplo (fase 4 ativa, regular):

```
Fase 4/10 -- Mapa de risco
Ato 2: Refinamento
[>] Fase regular
```

Exemplo (fase 1 ativa, invariante critico):

```
Fase 1/10 -- Objetivo
Ato 1: Descoberta
[!>] Invariante critico -- sempre pausa
```

## Sessao vazia

Quando nao existe handoff nem log, o `*status` renderiza primeiro a
linha `nenhuma sessao ativa encontrada.` e em seguida o mapa com
todas as 10 fases em estado pendente (tokens `[ ]` para regulares e
`[! ]` para invariantes criticos F1, F2, F10).

## Garantia de compatibilidade

- Sem cores ANSI.
- Sem caracteres unicode (sem `✓`, sem `→`, sem caixas `─│┌┐└┘`).
- Apenas codigos ASCII 32 a 126.
- Render funciona em Windows CMD com code page 437 ou 850; Windows Terminal; Linux; macOS.

## Resiliencia a trocas de agente

A lista de agentes por fase NAO e hardcoded neste template. Render
deriva a lista de agentes de `wf-yotzer-generate-celula.yaml` em
runtime. Quando o agente da fase 10 for trocado, o render acompanha
sem patch adicional.
