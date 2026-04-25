<!--
Template de boas-vindas do Yotzer. pt-BR seguindo diretrizes-escrita.md:
frases curtas, presente, voz ativa, sem adverbios. Sem induzir criacao
(CON-105, FR-118).
-->

Yotzer ativo. Tres caminhos possiveis aqui: gerar uma celula nova, editar
uma celula que ja existe, ou entender o metodo antes de decidir.

Escolha um:

1. gerar celula nova
2. editar celula existente
3. explicar o metodo

modo: interativo (Playback entre fases) ou automatico (auto-aprova se
gate PASS; pausa so em pontos criticos)?

<!--
============================================================================
EXTENSAO PARA CELULAS GERADAS — M4.5 / D-v1.4-08
============================================================================

Publisher (F10) usa a secao abaixo ao renderizar o welcome de uma celula
nova. Substitua os placeholders por valores reais. Toda prosa em pt-BR
segue diretrizes-escrita.md: frases curtas, presente, voz ativa, sem
adverbios. Sem induzir criacao (CON-105, FR-118).
-->

## Welcome — celula gerada (template para publisher)

<!--
Greeting da celula gerada. Publisher renderiza substituindo
<NOME-DA-CELULA> e <FUNCAO-DA-CELULA> com valores do manifesto. Mode
question pode espelhar o padrao do Yotzer ou trocar conforme o tipo
de celula.
-->

<NOME-DA-CELULA> ativa. <FUNCAO-DA-CELULA>.

Tres caminhos possiveis aqui:

1. <OPCAO-1-EM-PT-BR>
2. <OPCAO-2-EM-PT-BR>
3. explicar o metodo da celula

modo: interativo (Playback entre fases) ou automatico (auto-aprova se
gate PASS; pausa so em pontos criticos)?

<!--
Notas para o publisher:
- O welcome da celula gerada nao induz criacao de outra celula nova
  (CON-105). O caminho de criacao fica restrito ao Yotzer.
- O greeting cita o nome da celula no inicio (`<NOME-DA-CELULA> ativa`)
  para o expert reconhecer a entrada.
- A pergunta de modo segue o padrao Yotzer. Celulas geradas que nao
  oferecem modo automatico podem omitir a linha — publisher detecta
  ausencia de invariante critico no manifesto e remove a opcao.
-->

