---
task_id: edit-celula
agent: chief
elicit: true
preconditions:
  - target_cell_exists: true
postconditions:
  - edit_mode_active: true
api:
  mode_engine: [getMode]
---

# Editar celula — modo de edicao

<!--
Machine EN. Corpo pt-BR.
-->

## O que esta task faz

Entra em modo de edicao sobre uma celula existente.

## Passos

1. Chief pergunta ao expert qual celula editar.
2. Chief busca a celula em `celulas/{nome}/` (L4, mutavel) ou
   `.kaizen-dvir/celulas/{nome}/` (L2, extend-only).
3. Quando o alvo esta em L2, chief exige `frameworkProtection: false` e
   apresenta um aviso pt-BR ao expert sobre o risco de mexer em artefato
   protegido (CON-005, CON-102).
4. Chief carrega o manifesto da celula alvo e o MEMORY.md.
5. Chief pergunta ao expert qual fase revisitar.
6. Chief executa a fase escolhida com o especialista mapeado.

## Veto conditions

Chief bloqueia edicao em L2 quando `frameworkProtection` esta ativo.
Chief nunca remove registros de CHANGELOG.md.
