---
task_id: resume
agent: chief
elicit: true
preconditions:
  - handoff_exists_for: chief
postconditions:
  - phase_state_restored: true
api:
  handoff_engine: [readLatest]
note: "full CLI subcommand /Kaizen:Yotzer resume {work-id} chega em M4.6"
---

# Resume — retomar trabalho a partir do ultimo handoff

<!--
Machine EN. Corpo pt-BR.
-->

## O que esta task faz

Le o ultimo handoff destinado ao chief. Reconstitui o estado da fase.
Pede confirmacao ao expert antes de continuar.

## Passos

1. Chief chama `handoff-engine.readLatest("chief")`.
2. Se retorno for null, chief informa ao expert: "nao encontrei handoff
   recente para a celula. use `*novo` para iniciar."
3. Se handoff existe, chief apresenta ao expert:
   - fase atual
   - proxima acao
   - decisoes registradas
   - arquivos modificados
   - blockers ativos
4. Chief pergunta: "retomo desta fase?" em pt-BR.
5. Em caso de confirmacao, chief roteia para o especialista mapeado.

## Contrato de status

A fase atual vem do campo `work_context.phase` do ultimo handoff para
`to: chief`. Mesmo padrao que `tasks/status.md` usa.

## Veto conditions

Sem handoff valido, chief recusa continuar. Sem confirmacao do expert,
chief pausa.
