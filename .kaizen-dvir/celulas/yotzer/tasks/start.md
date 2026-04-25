---
task_id: start
agent: chief
elicit: true
preconditions:
  - cell_active: yotzer
postconditions:
  - session_mode_written: .kaizen/state/session-mode.yaml
api:
  mode_engine: [promptSessionStart, selectMode]
---

# Start — abertura de sessao Yotzer

<!--
Machine frontmatter EN. Corpo pt-BR para o expert.
Chief renderiza a mensagem de boas-vindas e a pergunta de modo.
-->

## O que esta task faz

Abre a sessao Yotzer. Apresenta tres caminhos. Pergunta o modo.

## Passos

1. Chief carrega `templates/welcome-message-tmpl.md`.
2. Chief apresenta a mensagem ao expert em pt-BR.
3. Chief oferece tres opcoes:
   - **1. gerar celula nova** — inicia as 10 fases.
   - **2. editar celula existente** — entra em modo de edicao.
   - **3. explicar o metodo** — apresenta o metodo antes de decidir.
4. Chief pergunta o modo ao expert: **interativo** (Playback entre fases) ou
   **automatico** (auto-aprova se gate PASS; pausa so em invariantes criticos).
5. Chief chama `mode-engine.selectMode(escolha)` para persistir a escolha em
   `.kaizen/state/session-mode.yaml`.
6. Chief roteia conforme a opcao escolhida.

## Veto conditions

Chief nao inicia as fases sem resposta do expert. Chief nao assume modo
padrao. O expert escolhe.

## pt-BR — texto ao expert

Ver `templates/welcome-message-tmpl.md`. Chief lembra o expert que o modo
pode mudar a qualquer momento via `*modo interativo` ou `*modo auto`.
