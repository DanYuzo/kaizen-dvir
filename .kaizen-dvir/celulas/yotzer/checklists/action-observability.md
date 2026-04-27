# Checklist — Action Observability

<!--
Checklist disparado pelo Quality Gate F8 antes de emitir PASS. Toda
entrada em pt-BR segue `diretrizes-escrita.md`: frases curtas,
presente, voz ativa, sem adverbios. Chief consulta este arquivo antes
de fechar o veredito da fase F8. Origem: AC-108B, AC-117, AC-119,
D-v1.3-04, FR-108.
-->

## Invocacao

- [ ] disparado pela checagem da fase 8 antes de fechar.
- [ ] chief consulta este checklist como ultimo passo da fase 8.
- [ ] expert ve o resultado item por item em pt-BR.

## Comportamento observavel

- [ ] toda Action descreve comportamento observavel por terceiro.
- [ ] nenhum adjetivo inferencial ("seja carismatico", "mostre
      confianca").
- [ ] cada Action passa o teste do observador externo: aceita ou
      pendente por inspecao direta.
- [ ] forma aceita: "levante o tom de voz", "aumente 20% a velocidade",
      "pause 2 segundos antes de revelar o preco".
- [ ] forma pendente: adjetivos sem verbo concreto.

## Granularidade

- [ ] cada Task carrega entre 1 e 7 Actions.
- [ ] Task com mais de 7 Actions vira split em duas Tasks OU extracao
      de skill reusavel.
- [ ] split registra duas Tasks ligadas a mesma Solution.
- [ ] skill extraida tem forma registrada em pt-BR para reuso futuro.
- [ ] Task com 8 ou mais Actions sem tratamento dispara FAIL e pausa a
      fase com pedido de split ou skill extraida.

## Actions inline (AC-119, D-v1.3-04)

- [ ] cada Task carrega Actions na secao `## Actions` do markdown.
- [ ] nenhum arquivo `action-*.md` foi emitido em runtime.
- [ ] tentativa de emitir `action-*.md` pausa a fase com pedido de
      mover as Actions inline (citando AC-119 e D-v1.3-04).
- [ ] publisher (M4.5) revalida ausencia de `action-*.md` na
      publicacao.

## OST — fechamento da cadeia (AC-117)

- [ ] toda Task liga a exatamente uma Solution no `OST.md`.
- [ ] Task sem Solution ligada dispara FAIL e pausa a fase com pedido de
      ligar antes de fechar.
- [ ] mesma Solution pode ter mais de uma Task filha.
- [ ] cadeia Outcome -> Opportunity -> Solution -> Task fica
      auditavel apos F8.
- [ ] a escrita usa `ost-writer.appendChangeLog` — append-only no
      `OST.md`.

## RC-21

- [ ] hierarquia respeitada: Role > Workflow > Task > Action.
- [ ] Task tem escopo de 5 a 10 minutos para um sub-agente.
- [ ] Action tem escopo de cerca de 30 segundos.
- [ ] Task carrega `pu_pai`, `solution_id`, `executor_hint`,
      `estimated_effort`.

## Granularizacao concentrada em F8

- [ ] F3, F5 e F7 nao quebram passo do processo em sub-tarefas.
- [ ] F8 e a unica fase onde a quebra acontece (consolidacao v1.2).
- [ ] tentativa de quebrar fora de F8 pausa a fase com pedido de
      reabrir sem dividir (citando `D-v1.2-03`).
