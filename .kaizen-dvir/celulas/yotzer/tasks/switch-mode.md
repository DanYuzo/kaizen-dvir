---
task_id: switch-mode
agent: chief
elicit: false
preconditions:
  - session_mode_exists: .kaizen/state/session-mode.yaml
postconditions:
  - mode_switched: true
  - audit_log_entry: gate-verdicts
api:
  mode_engine: [switchMode]
commands_routed:
  - "*modo interativo"
  - "*modo auto"
---

# Switch mode — alternar modo operacional

<!--
Machine EN. Corpo pt-BR. Delega a M3.4 mode-engine.
-->

## O que esta task faz

Alterna entre modo interativo e modo automatico. Registra a mudanca no log
de auditoria.

## Passos

1. Chief recebe o comando `*modo interativo` ou `*modo auto`.
2. Chief chama `mode-engine.switchMode(target)`.
3. Mode-engine persiste a mudanca em `.kaizen/state/session-mode.yaml`.
4. Mode-engine grava entrada `mode_switch` em
   `.kaizen/logs/gate-verdicts/`.
5. Chief confirma ao expert em pt-BR: "modo agora e {modo}. vale a partir
   desta fase."

## Veto conditions

Target invalido levanta erro. Apenas "interativo" e "automatico" (com
atalhos "i", "a", "auto") sao aceitos.

## pt-BR — mensagem padrao

`mudanca de modo registrada: {modo}. vigora a partir desta fase.`
