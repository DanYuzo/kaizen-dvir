# OST — Opportunity Solution Tree

<!--
Template do OST. Raiz preenchida em F1. Opportunities crescem em F3 e F5.
Solutions emergem em F5 e consolidam em F6. MVP e roadmap marcados em F7.
Tasks ligam em F8 e finalizam em F10. Change Log append-only.
Toda escrita passa por `agents/_shared/ost-writer.js`.
-->

## Outcome

<!--
Raiz do OST. Preenchida em F1. Formato: id, tipo (problema, desejo,
melhoria, mapeamento, automacao), descricao mensuravel. Exemplo:
"id: OUT-NNN tipo: melhoria descricao: reduzo em N% o tempo de X".
-->

- raiz ainda nao preenchida.

## Opportunities

<!--
Lista append-only. Cada Opportunity liga a pelo menos uma PU do As-is
(F3) ou do mapa de risco (F5). Formato: id, descricao curta, PUs
referenciadas. Exemplo:
"id: OPP-NNN descricao: gargalo na coleta pus: PU-NNN, PU-NNN".
-->

- lista vazia. F3 adiciona as primeiras Opportunities. F5 adiciona as residuais.

## Solutions

<!--
Lista append-only. Cada Solution liga a uma Opportunity. Formato: id,
descricao, opportunity referenciada. Links vivem na lista "Links".
Exemplo:
"id: SOL-NNN descricao: trocar coleta manual por importador origem: F6".
-->

- lista vazia. F5 adiciona primeiras Solutions. F6 consolida Solutions definitivas.

## Links

<!--
Lista append-only de vinculos entre Solutions e Opportunities. Cada link
e uma linha independente. Formato: "SOL-NNN resolve OPP-NNN".
-->

- sem links ainda.

## Tasks

<!--
Tasks ligam a Solutions em F8. Formato: id, descricao, solution referenciada.
Exemplo: "id: TASK-NNN descricao: instalar importador solution: SOL-NNN".
-->

- lista vazia. F8 liga Tasks a Solutions.

## Change Log

<!--
Historico append-only. Linhas anteriores nunca mudam.
Formato: `- [data ISO] — [autor] — [mudanca]`.
Exemplo: "data ISO @archaeologist abriu OST em F1".
-->

- sem entradas ainda.
