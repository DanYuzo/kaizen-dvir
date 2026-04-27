# Checklist — Revisao de fechamento de fase

<!--
Checklist disparado em cada revisao de fechamento de fase do Yotzer
nas fases F1, F2, F3 e F6. Toda entrada em pt-BR segue
`diretrizes-escrita.md`: frases curtas, presente, voz ativa, sem
adverbios. Chief consulta este arquivo antes de fechar a revisao.
-->

## Itens comuns (F1, F2, F3, F6)

- [ ] rastreamento por afirmacao — toda afirmacao do artefato cita fonte verificavel.
- [ ] ausencia de invencao — nenhum fato, numero ou exemplo fora de fonte real.
- [ ] consistencia com ikigai — o artefato se alinha com as 4 dimensoes lidas.
- [ ] fidelidade ao dominio — linguagem e estrutura respeitam o dominio do expert.
- [ ] handoff abaixo de 500 tokens — artefato de handoff cabe no orcamento M3.2.
- [ ] change log atualizado — a rodada entra como linha nova no OST.

## F1 — Objetivo

- [ ] objetivo em um dos 5 tipos — problema, desejo, melhoria, mapeamento, automacao.
- [ ] objetivo mensuravel — a descricao carrega numero ou criterio concreto.
- [ ] outcome-statement.yaml presente na celula gerada.
- [ ] OST com raiz populada — Opportunities, Solutions, Links, Tasks ainda vazios.
- [ ] pausa obrigatoria — F1 e invariante critico e pausa em qualquer modo.

## F2 — Fontes e Exemplos

- [ ] criterios derivados presentes — `derived-criteria.yaml` escrito na celula gerada.
- [ ] kbs/ populado — ao menos uma entrada por modalidade escolhida.
- [ ] exemplos de sucesso persistidos — `kbs/success-examples.md` com 3 ou mais entradas em pt-BR.
- [ ] guarda de ETL aplicada — se o expert pediu KB denso, o WARN saiu em pt-BR.
- [ ] modalidades multi-select respeitadas — expert pode escolher uma, varias ou todas as quatro.
- [ ] pausa obrigatoria — F2 e invariante critico e pausa em qualquer modo.

## F3 — As-is

- [ ] process-map-as-is.yaml presente.
- [ ] mermaid com rotulos em pt-BR embutido no artefato.
- [ ] PUs extraidos de relato do expert, nao inventados.
- [ ] primeiras Opportunities no OST ligadas a pelo menos uma PU.
- [ ] nao-critica — a revisao fecha sozinha em modo automatico quando nao ha pendencia.

## F6 — To-be

- [ ] pre-condicao verificada via handoff: F4 PASS e F5 PASS confirmados.
- [ ] process-map-to-be.yaml presente.
- [ ] mermaid com rotulos em pt-BR embutido no artefato.
- [ ] PUs incorporam filtro de F4 PASS e mitigacoes de F5 PASS.
- [ ] Solutions definitivas no OST ligadas a Opportunities.
- [ ] toda Solution liga a pelo menos uma Opportunity.
- [ ] nao-critica — a revisao fecha sozinha em modo automatico quando nao ha pendencia.
