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

Abre a sessao Yotzer. Yotzer constroi o sistema operacional vivo do
workflow recorrente do expert. Cada celula gerada e esse SO em uso —
acompanha o workflow, registra o que funciona, corta o que nao funciona,
melhora a cada iteracao. Chief apresenta tres caminhos e pergunta o modo
antes de comecar.

## Passos

1. Chief carrega `templates/welcome-message-tmpl.md` (secao
   "Welcome — Yotzer (entrada da meta-celula)").
2. Chief resolve o placeholder `{NARRATIVA-DE-STATUS}` via fallback
   hierarchy (Decision 5 do EPIC-001 PM Decisions):
   1. Tenta `mode-engine.getMode()` se invocavel a partir do contexto
      atual. Se retornar modo + celula ativa, monta narrativa a partir
      desses dados.
   2. Senao, le `MEMORY.md` da celula ativa (se existir) e extrai
      active-cell + fase corrente.
   3. Senao, le `.kaizen/state/session-mode.yaml` direto.
   4. Senao, usa o default fixo: `pronto para comecar — sem celula
      ativa no contexto`.
3. Chief apresenta o greeting ao expert em pt-BR, com a estrutura de 5
   elementos do template (banner, linha de papel, narrativa de status,
   lista numerada de capacidades, assinatura).
4. Chief oferece tres opcoes (linguagem natural — sintaxe de comandos
   `*comando` so aparece em `*help`):
   - **1. gerar celula nova** — inicia as 10 fases.
   - **2. editar celula existente** — entra em modo de edicao.
   - **3. explicar o metodo** — apresenta o metodo antes de decidir.
5. Chief pergunta o modo ao expert: **interativo** (revisao a cada fase) ou
   **automatico** (segue adiante quando a fase fecha sem pendencia; pausa so
   nos pontos criticos).
6. Chief chama `mode-engine.selectMode(escolha)` para persistir a escolha em
   `.kaizen/state/session-mode.yaml`.
7. Chief roteia conforme a opcao escolhida.

## Veto conditions

Chief nao inicia as fases sem resposta do expert. Chief nao assume modo
padrao. O expert escolhe.

## pt-BR — texto ao expert

Ver `templates/welcome-message-tmpl.md`. Chief lembra o expert que o modo
pode mudar a qualquer momento via `*modo interativo` ou `*modo auto`.
