# Coerencia dos niveis progressivos (F10 — sub-agente a)

<!--
Checklist em pt-BR consumido por progressive-systemizer no F10.
Roda antes do handoff F10a→F10b. Toda prosa segue
diretrizes-escrita.md: frases curtas, presente, voz ativa, sem
adverbios.

Quality Gate F10a integra este checklist como criterio critico:
falha em qualquer item dispara FAIL.
-->

## Como usar este checklist

Progressive-systemizer roda este checklist apos escrever o plano de
quatro tiers por Task MVP. Cada item devolve PASS ou FAIL. Qualquer
FAIL bloqueia o handoff ao publisher e devolve o plano ao expert para
ajuste.

## 1. Quatro niveis declarados por Task MVP

- [ ] Toda Task MVP carrega quatro tiers no plano.
- [ ] Nenhum tier omitido. Sem placeholder vazio.

**Falha pt-BR:** `Task <id> tem <N> tiers. cada Task MVP precisa de
manual, simplificado, batch e automatizado.`

## 2. Ordem manual → simplificado → batch → automatizado

- [ ] A ordem segue manual, simplificado, batch, automatizado.
- [ ] Nenhum tier acima sem o anterior validado.
- [ ] Sem inversao de ordem. Sem mistura de degraus.

**Falha pt-BR:** `Task <id> com tiers fora de ordem. ordem fixa: manual,
simplificado, batch, automatizado.`

## 3. Aprendizado esperado documentado por nivel

- [ ] Cada tier carrega `expected_learning` em pt-BR.
- [ ] Cada `expected_learning` descreve o que o expert valida.
- [ ] Nenhum campo vazio ou generico.

**Falha pt-BR:** `Task <id> tier <N> sem expected_learning. cada tier
precisa do campo preenchido.`

## 4. Racional ligando tier <N> ao tier <N-1>

- [ ] Cada tier (excluindo manual) carrega `rationale` em pt-BR.
- [ ] Cada `rationale` cita o aprendizado do tier anterior.
- [ ] Nenhum tier superior justificado por especulacao.

**Falha pt-BR:** `Task <id> tier <N> sem rationale ligando ao tier
<N-1>. ligue ao aprendizado do tier anterior.`

## 5. Hook Model com quatro componentes instrumentados

- [ ] Plano marca o ponto que ancora Trigger.
- [ ] Plano marca o ponto que ancora Action.
- [ ] Plano marca o ponto que ancora Variable Reward.
- [ ] Plano marca o ponto que ancora Investment.

**Falha pt-BR:** `Hook Model incompleto: <componente> sem ponto de
aprendizado ancorado. publisher exige os quatro componentes.`

## 6. CLI com `/Kaizen:{Nome}` + `*comandos` mapeados

- [ ] Plano declara o slash command da celula gerada.
- [ ] Plano lista os `*comandos` internos (start, status, modo, etc.).
- [ ] Cada comando aponta para uma task valida.

**Falha pt-BR:** `CLI da celula incompleto: <campo> ausente. publisher
configura /Kaizen:<Nome> + *comandos antes de publicar.`

## 7. Waiver explicito quando aplicavel

- [ ] Pulo de tier registrado com `waiver_rationale` em pt-BR.
- [ ] Waiver assinado pelo expert com data ISO.

**Falha pt-BR:** `pulo de tier sem waiver. registre waiver_rationale
em pt-BR para o expert assumir o risco.`

## Quality Gate F10a — integracao

Falha em qualquer item dispara Quality Gate F10a FAIL.
Progressive-systemizer bloqueia o handoff ao publisher. Chief
apresenta a falha ao expert em pt-BR. Plano volta para ajuste.

PASS em todos os itens libera o handoff F10a→F10b. Publisher
instrumenta o Hook Model, configura o CLI e segue para os quatro
validadores de pre-publicacao.

## Referencia de escrita

Toda saida ao expert segue
`arquivos-relevantes/01-contexto-danilo/diretrizes-escrita.md`. Frases
curtas. Presente. Voz ativa. Sem adverbios.
