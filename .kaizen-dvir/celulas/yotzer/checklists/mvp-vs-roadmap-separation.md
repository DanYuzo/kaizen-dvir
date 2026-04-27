# Checklist — MVP vs Roadmap Separation

<!--
Checklist disparado pelo Quality Gate F7 antes de emitir PASS. Toda
entrada em pt-BR segue `diretrizes-escrita.md`: frases curtas,
presente, voz ativa, sem adverbios. Chief consulta este arquivo antes
de fechar o veredito da fase F7. Origem: AC-108A, FR-105.
-->

## Invocacao

- [ ] disparado pela checagem da fase 7 antes de fechar.
- [ ] chief consulta este checklist como ultimo passo da fase 7.
- [ ] expert ve o resultado item por item em pt-BR.

## ICE por PU

- [ ] cada PU sobrevivente do To-be tem rationale ICE registrado.
- [ ] cada rationale ICE carrega Impact, Confidence e Ease em pt-BR.
- [ ] cada nota ICE acompanha razao curta — nao fica so numero.
- [ ] nenhum item entra no MVP ou no roadmap sem rationale ICE.

## Bloco MVP essencial

- [ ] `mvp-backlog.yaml` presente na celula gerada.
- [ ] cada item do MVP responde "sem isto a celula nao cumpre o
      Outcome".
- [ ] cada item do MVP tem justificativa em pt-BR ao lado da nota
      ICE.
- [ ] desbloqueio de maior alavancagem identificado em
      `sequence_starts_with`.
- [ ] sequencia do MVP comeca pelo desbloqueio identificado.

## Bloco Roadmap de enriquecimento

- [ ] `roadmap.yaml` presente na celula gerada.
- [ ] cada item do roadmap responde "isto amplia, nao bloqueia".
- [ ] cada item do roadmap tem justificativa em pt-BR ao lado da nota
      ICE.
- [ ] cada item do roadmap traz ordem sugerida de entrada.

## Marcacao no OST

- [ ] cada Solution consolidada em F6 recebe marca `mvp` ou
      `roadmap` em F7.
- [ ] a marca registra ao lado da Solution o rationale ICE em pt-BR.
- [ ] nenhuma Solution fica sem marca apos F7.
- [ ] a escrita usa `ost-writer.appendChangeLog` — append-only no
      `OST.md`.

## Fronteira de blocos

- [ ] nenhum item aparece nos dois blocos ao mesmo tempo.
- [ ] item duplicado entre blocos pausa a fase com pedido de escolher
      um bloco so.
- [ ] cada PU sobrevivente fica em um bloco so.

## Quebra de passo do processo bloqueada

- [ ] F7 nao quebra passo do processo em sub-Tasks.
- [ ] tentativa de quebrar pausa a fase com pedido de reabrir sem
      dividir (citando `D-v1.2-03`).
- [ ] a quebra acontece na fase 8 (task-granulator).
