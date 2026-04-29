---
task_id: phase-1-objective
agent: archaeologist
phase: 1
elicit: true
critical_invariant: true
pre_condition:
  - session_mode_selected: mode-engine.getMode
  - reuse_gate_pre_f1_acknowledged: true
post_condition:
  - outcome_statement_written: outcome-statement.yaml
  - ost_root_populated: OST.md
  - playback_gate_f1_pass: true
api:
  ikigai_reader: [readDimension]
  ost_writer: [writeRoot]
  handoff_engine: [generate, persist]
  playback_gate: [present]
outcome_types:
  - problema
  - desejo
  - melhoria
  - mapeamento
  - automacao
default_outcome_type: melhoria
retro_compat:
  skip_if_outcome_exists: outcome-statement.yaml
---

# F1 — Objetivo (Continuous Discovery + outcome lock)

<!--
Machine frontmatter EN. Corpo pt-BR para o expert.
Archaeologist conduz; chief apresenta Playback; expert julga.
Invariante critico: o Playback Gate pausa em qualquer modo.
-->

## O que esta fase faz

F1 ancora o workflow recorrente que o expert quer sistematizar e melhorar
iteracao a iteracao. Archaeologist roda rodadas de Continuous Discovery
com o expert ate o workflow ficar claro o suficiente para o sistema
operacional comecar a se montar em torno dele. F1 abre a raiz do OST com
o workflow ancorado. Mensurabilidade entra como norte direcional opcional,
nao como pre-requisito.

F1 abre com no maximo duas perguntas obrigatorias: o workflow que o
expert quer sistematizar e como ele funciona hoje. Tudo alem disso e
opcional. Se a celula ja tem `outcome-statement.yaml`, F1 nao
re-executa — chief reconhece F1 como fechada e roteia para `*resume`.

## Pre-condicao

1. Modo de sessao selecionado via `mode-engine.getMode()`. Se nulo,
   archaeologist roteia para `tasks/start.md`.
2. **Retro-compatibilidade — F1 ja fechada.** Antes de qualquer elicit,
   chief verifica se a celula ja tem `outcome-statement.yaml`. Se sim,
   F1 nao re-executa: chief reconhece F1 como fechada, le o handoff em
   `handoffs/f1-to-f2.md` (via `handoff-engine.readLatest`) e roteia o
   expert para `tasks/resume.md`. Esse caminho protege celulas existentes
   (exemplo: `smart-creator-os` com `outcome-statement.yaml` no formato
   antigo `type: automacao`) — F1 nao reabre, F2 retoma do handoff.
3. Reuse Gate pre-F1 executado pelo chief. Se WARN com candidatos,
   expert precisa reconhecer antes de F1 comecar.
4. Leitura do Ikigai completa. Archaeologist chama
   `ikigai-reader.readDimension()` para `o-que-faco`, `quem-sou`,
   `para-quem` e `como-faco` antes do primeiro elicit. Se qualquer
   leitura falhar, F1 bloqueia o primeiro elicit e reporta em pt-BR:
   `ikigai indisponivel. rode "kaizen init" ou crie o arquivo antes de F1.`

## Passos

1. Archaeologist le as quatro dimensoes do Ikigai via
   `ikigai-reader.readDimension()`. Guarda o retorno na memoria de
   trabalho da sessao.

## Step 2 — Bloco de descoberta — metodo unico do expert

Antes de propor a raiz do resultado, faca estas tres perguntas ao expert. Cada pergunta investiga um aspecto que torna o jeito dele unico:

1. `qual etapa do seu processo voce considera nao-negociavel?` — descobre o que ele nunca abre mao
2. `tem alguma forma de fazer que voce nunca ve outras pessoas fazendo?` — descobre o jeito proprio dele
3. `tem etapa que voce gostaria de eliminar do seu processo?` — descobre o que pesa pra ele

Espere a resposta antes de seguir.

**Modo automatico:** o agente pode supor as respostas com base no Ikigai. Antes de seguir, declara em pt-BR: "estou supondo X — confirma? (se nao confirmar, ajuste antes de fechar a etapa)" e registra a suposicao via `ost-writer.appendChangeLog(celulaPath, '@archaeologist', '[SUPOSICAO] descoberta F1: X')`.

3. Archaeologist abre a rodada de Continuous Discovery com **duas
   perguntas obrigatorias** em pt-BR, segundo `diretrizes-escrita.md`:
   - `qual workflow recorrente voce quer sistematizar ou melhorar?`
   - `como voce faz isso hoje? resuma em um paragrafo.`
4. Expert responde. Archaeologist escuta, registra, e repete por
   quantas rodadas forem necessarias ate o workflow ficar claro.
5. **Norte direcional (opcional).** Apos o workflow ancorar,
   archaeologist oferece uma pergunta opcional curta:
   `quer definir um norte para guiar as iteracoes? metrica, prazo, ou marco — opcional.`
   Se o expert quiser, archaeologist captura o norte no formato de
   `outcome-statement.yaml:31-37` com `natureza: norte`. Se o expert
   recusar ou pular, F1 segue. **Norte nao e gate — e contexto.**
6. Archaeologist classifica o workflow em um dos 5 tipos canonicos:
   `problema`, `desejo`, `melhoria` (default), `mapeamento`,
   `automacao`. Se o workflow nao se encaixa em nenhum dos 5 tipos,
   archaeologist usa `melhoria` como fallback. Rejeita apenas se a
   resposta do expert e vazia ou impossivel de classificar como
   workflow recorrente — em pt-BR:
   `descreva o workflow em um dos 5 tipos (problema, desejo, melhoria,
   mapeamento, automacao). reformule em uma frase.`
7. Archaeologist escreve `outcome-statement.yaml` na celula gerada
   com os campos `id`, `type` e `description`. A descricao carrega o
   workflow ancorado (exemplo: `sistematizo o ciclo semanal de
   conteudo no Instagram`). Se o expert ofereceu norte direcional no
   passo 5, archaeologist adiciona o bloco `norte_direcional` ao
   YAML (formato igual ao de `smart-creator-os/outcome-statement.yaml`).
8. Archaeologist chama `ost-writer.writeRoot(celulaPath, outcome)` com
   o workflow ancorado. OST.md abre com a raiz preenchida.
9. Archaeologist gera handoff F1 para F2 via `handoff-engine.generate()`
   + `persist()` com o workflow, os ids e o caminho do OST. O handoff
   fica abaixo de 500 tokens por construcao.
10. Chief apresenta Playback Gate F1 em pt-BR. F1 e invariante critico:
    o gate pausa em modo interativo E em modo automatico. Expert julga.

## Post-condicao

- `outcome-statement.yaml` presente na celula gerada.
- OST.md aberto com raiz preenchida.
- Revisao de fechamento de F1 fechada via `playback-gate.present()` sem
  pendencia.
- Checklist `playback-completeness.md` confere sem pendencia.

## Veto conditions

Archaeologist nao avanca para F2 sem workflow ancorado. Mensurabilidade
nao bloqueia: o norte direcional e opcional, nao gate. Archaeologist
nao inventa tipo novo fora dos cinco. Archaeologist nao pula a leitura
do Ikigai. Archaeologist nao re-executa F1 quando ja existe
`outcome-statement.yaml` na celula — chief detecta e roteia para
`tasks/resume.md` (ver Pre-condicao item 2). Chief nao auto-aprova F1:
o flag `critical_invariant: true` obriga pausa em qualquer modo.
Archaeologist nao propoe a raiz do resultado antes do bloco de descoberta
ser reconhecido pelo expert (ou suposicao auto-mode declarada e registrada
como [SUPOSICAO] no OST).

## pt-BR — exemplos de reject

- `descreva o workflow que voce quer melhorar. uma frase basta.`
- `ikigai indisponivel. rode "kaizen init" ou crie o arquivo antes de F1.`
- `essa celula ja tem outcome-statement.yaml. uso *resume para retomar de onde parou.`

## Referencia de escrita

Toda saida ao expert segue `diretrizes-escrita.md`. Frases curtas.
Presente. Voz ativa. Sem adverbios.
