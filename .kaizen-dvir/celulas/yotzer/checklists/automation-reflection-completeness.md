# Completude da reflexao de automacao (etapa 10 — sub-agente a)

<!--
Checklist em pt-BR consumido por flow-architect na etapa 10.
Roda antes do ponto de passagem F10a→F10b. Toda prosa segue
diretrizes-escrita.md: frases curtas, presente, voz ativa, sem
adverbios.

Quality Gate F10a integra este checklist como criterio critico:
falha em qualquer item dispara FAIL.

Substitui o checklist anterior do sub-agente a (removido em M9.6
conforme D-v2.0-03 + AC-17 da story M9.6).
-->

## Como usar este checklist

Flow-architect roda este checklist apos consolidar a reflexao de
todas as Tarefas. Cada item devolve aceito ou pendente. Qualquer
pendencia bloqueia o ponto de passagem ao publisher e devolve a
reflexao para o expert ajustar.

## 1. Cobertura — uma linha por Tarefa da etapa 8

- [ ] Toda Tarefa que saiu da etapa 8 aparece na tabela de reflexao.
- [ ] Nenhuma Tarefa da etapa 8 fica sem linha.
- [ ] Nenhuma linha da tabela faz referencia a Tarefa que nao existe na etapa 8.

**Pendencia pt-BR ao expert:** `a Tarefa <id> da etapa 8 ainda nao
tem linha na reflexao. cada Tarefa precisa de classificacao e plano
de evolucao antes da celula publicar.`

## 2. Classificacao valida — manual, tech ou ai

- [ ] Cada linha tem o campo `Classificacao` preenchido.
- [ ] O valor da `Classificacao` e exatamente um entre `manual`, `tech` ou `ai`.
- [ ] Sem variacao de grafia, sem traducao livre, sem outro valor.

**Pendencia pt-BR ao expert:** `a Tarefa <id> esta com classificacao
`<valor>`. o campo aceita apenas manual, tech ou ai.`

## 3. Plano de evolucao em pt-BR — frase nao vazia

- [ ] Cada linha tem o campo `Plano de evolucao` preenchido em pt-BR.
- [ ] O plano nao esta vazio.
- [ ] O plano descreve um caminho natural em uma frase curta — sem jargao tecnico que o expert leigo nao reconheca.

**Pendencia pt-BR ao expert:** `a Tarefa <id> esta classificada como
`<modo>` mas o plano de evolucao esta vazio. escreva uma frase em
pt-BR descrevendo o caminho natural — pode ser bem simples.`

## 4. Confirmado — sim ou nao, sem nulo

- [ ] Cada linha tem o campo `Confirmado` preenchido.
- [ ] O valor e exatamente `sim` ou `nao`. Sem nulo, sem outro valor.
- [ ] Em modo interativo, espera-se `sim` apos o expert confirmar a Tarefa.
- [ ] Em modo automatico, espera-se `nao` (auto-suposto, expert nao confirmou).

**Pendencia pt-BR ao expert:** `a Tarefa <id> esta com Confirmado
`<valor>`. o campo aceita apenas sim ou nao. revise antes de seguir.`

## 5. Modo automatico — marca de auto-suposto visivel

- [ ] Toda linha com `Confirmado: nao` carrega a nota `auto-suposto, expert nao confirmou` no documento ou no ponto de passagem.
- [ ] Publisher renderiza a marca no `automation-plan.md` para o expert revisar na pausa final da etapa 10.

**Pendencia pt-BR ao expert:** `a Tarefa <id> esta como Confirmado:
nao mas a marca `auto-suposto, expert nao confirmou` nao aparece no
ponto de passagem. flow-architect precisa marcar para o publisher
exibir.`

## 6. Linguagem leiga em todo o documento

- [ ] Nenhuma celula da tabela usa termo tecnico do framework sem explicar (sem `tier`, `handoff schema`, `meta-celula`, `invariante critico`).
- [ ] Plano de evolucao escreve em pt-BR claro, frases curtas, voz ativa.
- [ ] Quando o plano cita ferramenta ou modelo, explica em uma palavra o papel ("planilha automatizada", "modelo que classifica leads").

**Pendencia pt-BR ao expert:** `a linha da Tarefa <id> usa termo
`<termo>` que o leitor leigo pode nao entender. troque por linguagem
clara ou explique em uma palavra.`

## 7. Foto do momento — nao contrato eterno

- [ ] O documento tem secao ou nota que deixa claro que a classificacao pode mudar depois.
- [ ] Nenhum trecho apresenta a classificacao como contrato fechado ou definitivo.

**Pendencia pt-BR ao expert:** `a reflexao precisa deixar claro que
a foto vale para o momento. adicione a nota de mutabilidade antes
de fechar.`

## Checagem da etapa 10a — integracao

Pendencia em qualquer item bloqueia a etapa. Flow-architect bloqueia
o ponto de passagem ao publisher. Chief apresenta a pendencia ao
expert em pt-BR. A reflexao volta para ajuste.

Quando todos os itens conferem, o ponto de passagem F10a→F10b sai com
o campo `automation_classifications`. Publisher escreve o
`automation-plan.md` em `celulas/{nome}/`, instrumenta os outros
componentes e segue para os quatro validadores de pre-publicacao.

## Referencia de escrita

Toda saida ao expert segue
`arquivos-relevantes/01-contexto-danilo/diretrizes-escrita.md`. Frases
curtas. Presente. Voz ativa. Sem adverbios.
