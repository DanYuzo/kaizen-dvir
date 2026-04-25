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
ultimo gate: {gate_id} — {veredito}
pendentes: {lista}
```

## Veto conditions

Sem logs e sem handoff, chief informa: "nenhuma sessao ativa encontrada."
