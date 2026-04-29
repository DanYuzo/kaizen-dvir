---
task_id: status
agent: chief
elicit: false
side_effects: none
api:
  handoff_engine: [readLatest]
  mode_engine: [getMode]
---

# Status — relatorio de estado da celula

<!--
Machine EN. Corpo pt-BR. Apenas leitura.
-->

## O que esta task faz

Relata fase atual, ultimo veredito de gate, modo ativo e gates pendentes.

## Passos

1. Chief chama `handoff-engine.readLatest("chief")` para derivar a fase
   atual (mesmo contrato que `tasks/resume.md`).
2. Chief chama `mode-engine.getMode()` para o modo ativo.
3. Chief consulta `.kaizen/logs/gate-verdicts/` para o ultimo veredito.
4. Chief lista Playback Gates pendentes se houver.
5. Chief apresenta o relatorio ao expert em pt-BR.

## Formato do relatorio

```
celula: yotzer
fase: {fase atual}
modo: {interativo|automatico}
ultimo gate: {gate_id} -- {veredito}
pendentes: {lista}
```

## Veto conditions

Sem logs e sem handoff, chief informa: "nenhuma sessao ativa encontrada."

## Step 6 -- Mapa visual do progresso (renderizado apos o bloco texto)

Apos apresentar os campos `celula`, `fase`, `modo`, `ultimo gate`, `pendentes`, renderiza tambem o mapa visual ASCII das 10 etapas agrupadas por Ato. Os nomes leigos das etapas vem de `tasks/explain-method.md` (M9.1). A flag de etapa-que-sempre-pausa vem de `workflows/wf-yotzer-generate-celula.yaml` (`critical_invariant: true` em F1, F2, F10).

Tokens (canonicos -- definidos em `templates/workflow-progress-tmpl.md`):

- Etapas normais: `[V]` feito, `[>]` atual, `[ ]` pendente
- Etapas que sempre pausam (F1, F2, F10): `[!V]` feito, `[!>]` atual, `[! ]` pendente

### Fixture F3 ativa

```
Ato 1: Descoberta
  [!V] F1 -- {nome leigo F1}
  [!V] F2 -- {nome leigo F2}
  [>]  F3 -- {nome leigo F3}

Ato 2: Refinamento
  [ ] F4 -- {nome leigo F4}
  [ ] F5 -- {nome leigo F5}
  [ ] F6 -- {nome leigo F6}
  [ ] F7 -- {nome leigo F7}

Ato 3: Construcao
  [ ] F8 -- {nome leigo F8}
  [ ] F9 -- {nome leigo F9}
  [! ] F10 -- {nome leigo F10}
```

### Fixture F8 ativa

```
Ato 1: Descoberta
  [!V] F1 -- {nome leigo F1}
  [!V] F2 -- {nome leigo F2}
  [V]  F3 -- {nome leigo F3}

Ato 2: Refinamento
  [V] F4 -- {nome leigo F4}
  [V] F5 -- {nome leigo F5}
  [V] F6 -- {nome leigo F6}
  [V] F7 -- {nome leigo F7}

Ato 3: Construcao
  [>] F8 -- {nome leigo F8}
  [ ] F9 -- {nome leigo F9}
  [! ] F10 -- {nome leigo F10}
```

### Sessao vazia

Se `handoff-engine.readLatest("chief")` nao encontrar registro, ainda renderiza o mapa com todas as etapas pendentes:

```
nenhuma sessao ativa encontrada.

Ato 1: Descoberta
  [! ] F1 -- {nome leigo F1}
  [! ] F2 -- {nome leigo F2}
  [ ]  F3 -- {nome leigo F3}

Ato 2: Refinamento
  [ ] F4 -- {nome leigo F4}
  [ ] F5 -- {nome leigo F5}
  [ ] F6 -- {nome leigo F6}
  [ ] F7 -- {nome leigo F7}

Ato 3: Construcao
  [ ] F8 -- {nome leigo F8}
  [ ] F9 -- {nome leigo F9}
  [! ] F10 -- {nome leigo F10}
```

ASCII-only: nada de cores ANSI, nada de unicode box-drawing, nada de emoji. Compativel com Windows CMD, Windows Terminal, Linux, macOS.
