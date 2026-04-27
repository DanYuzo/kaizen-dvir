# Checklist — PU Reduction Justified

<!--
Checklist disparado pelo Quality Gate F4 antes de emitir PASS. Toda
entrada em pt-BR segue `diretrizes-escrita.md`: frases curtas, presente,
voz ativa, sem adverbios. Chief consulta este arquivo antes de fechar
o veredito da fase F4.
-->

## Invocacao

- [ ] disparado pela checagem da fase 4 antes de fechar.
- [ ] chief consulta este checklist como ultimo passo da fase 4.
- [ ] expert ve o resultado item por item em pt-BR.

## Rastreabilidade do corte

- [ ] cada PU cortada tem nome de quem decidiu o corte.
- [ ] cada PU cortada tem motivo registrado em pt-BR.
- [ ] cada PU cortada tem descricao do que quebra se removida.
- [ ] cada PU cortada carrega data do corte.
- [ ] cada PU cortada vira linha em `cut-log.yaml`.
- [ ] nenhuma PU cortada aparece sem rastreabilidade no `cut-log.yaml`.

## Meta de corte

- [ ] meta de ≥10% de corte sobre as PUs do As-is atingida, OU
- [ ] decisao do expert de seguir mesmo assim registrada com
      `approved_by: expert` e razao.
- [ ] a fase nao para apenas por meta nao atingida — descreve a
      situacao ao expert e oferece escolha (aprofundar Deletar ou
      seguir mesmo assim).

## Ordem Musk

- [ ] ordem Musk respeitada em todas as iteracoes.
- [ ] passos seguidos: Questionar → Deletar → Simplificar → Acelerar →
      Automatizar.
- [ ] reordenacao detectada pausa a fase com pedido de voltar ao passo
      correto antes da checagem chegar aqui.

## OST poda

- [ ] cada Opportunity ligada a PU cortada recebe linha de remocao no
      `OST.md`.
- [ ] cada remocao no OST referencia o `cut-log.yaml`.
- [ ] o OST nao apaga a Opportunity — registra remocao auditavel.

## Automatizar conceitual

- [ ] o passo Automatizar produz prosa conceitual.
- [ ] nenhum artefato concreto de automacao sai de F4.
- [ ] artefato concreto detectado surge ao expert com pergunta:
      descrever a oportunidade em prosa por enquanto e mover a
      automacao real para a fase 10 (publisher)?
