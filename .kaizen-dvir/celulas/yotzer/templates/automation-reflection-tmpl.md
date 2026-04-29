# Reflexao de automacao — {nome-da-celula}

<!--
Template materializado pelo publisher na etapa 10 como
`celulas/{nome}/automation-plan.md` (D-v2.0-02 — sempre na raiz, nunca
em `.kaizen-dvir/celulas/`).

Origem: ponto de passagem 10a (flow-architect) → 10b (publisher).
Cada linha da tabela corresponde a uma Tarefa da etapa 8.

Labels em pt-BR. Identificadores de modo em pt-BR layman:
manual | tech | ai (valores fixos, sem traducao adicional).

Coluna Confirmado:
- `sim` — expert confirmou no modo interativo
- `nao` — auto-suposto, expert nao confirmou (modo automatico)

Toda prosa segue `diretrizes-escrita.md`: frases curtas, presente,
voz ativa, sem adverbios.
-->

## Contexto

Esta foto registra como cada Tarefa da celula `{nome-da-celula}`
roda hoje e qual o caminho natural de evolucao. A foto vale para o
momento da publicacao. Pode mudar depois — quando o problema mudar,
volte e ajuste.

Os tres modos:

- **manual** — a Tarefa roda na mao do expert ou de uma pessoa do time.
- **tech** — a Tarefa roda com ajuda de uma ferramenta deterministica.
- **ai** — a Tarefa roda com apoio de modelo que raciocina ou decide.

## Tabela de reflexao

| Tarefa | Classificacao | Plano de evolucao | Confirmado |
|--------|---------------|-------------------|------------|
| {id-tarefa-1} — {nome curto} | manual | hoje manual; quando o volume passar de X por semana, migrar para tech via planilha automatizada | sim |
| {id-tarefa-2} — {nome curto} | tech | hoje tech via importador simples; quando os formatos variarem, avaliar ai para classificar entrada | sim |
| {id-tarefa-3} — {nome curto} | ai | hoje ai com modelo que classifica leads; revisar prompt a cada 30 dias | nao |

<!--
Regras da tabela (validadas pelo checklist
`automation-reflection-completeness.md`):

1. Toda Tarefa da etapa 8 tem uma linha. Sem Tarefa fora da tabela.
2. Coluna Classificacao aceita apenas `manual`, `tech` ou `ai`. Sem
   variacao de grafia, sem outro valor.
3. Coluna Plano de evolucao nao fica vazia. Frase curta em pt-BR.
4. Coluna Confirmado aceita `sim` ou `nao`. Sem outro valor.
5. Linhas com `nao` em Confirmado vem do modo automatico — o
   publisher exibe a marca para o expert revisar.
-->

## Marcas do modo automatico

Quando a celula foi gerada em modo automatico, as classificacoes saem
de uma heuristica. Cada linha com `Confirmado: nao` carrega a nota:

`auto-suposto, expert nao confirmou`

Revise as linhas marcadas como `nao` antes de operar a celula em
volume. Confirme ou troque o modo conforme a realidade.

## Como evoluir

Quando o problema mudar — volume cresceu, qualidade caiu, formato
variou — abra este arquivo e ajuste a linha da Tarefa afetada. A
classificacao e a foto do momento, nao um contrato eterno.

## Referencia de escrita

Toda saida ao expert segue
`arquivos-relevantes/01-contexto-danilo/diretrizes-escrita.md`. Frases
curtas. Presente. Voz ativa. Sem adverbios.
