<!--
Template de boas-vindas do Yotzer. pt-BR seguindo diretrizes-escrita.md:
frases curtas, presente, voz ativa, sem adverbios. Sem induzir criacao
(CON-105, FR-118).

Estrutura inspirada no padrao do agente AIOX `dev` (S4 / EPIC-001):
5 elementos em ordem fixa — banner, linha de papel, narrativa de status,
lista numerada de capacidades em linguagem natural, assinatura.

Strings canonicas (NAO redefinir aqui — fonte unica em
docs/stories/EPIC-001/vocabulary-shift.md, secao "S4 canonical strings"):
- linha_de_papel: Construo o sistema operacional do seu workflow recorrente.
- assinatura:     — Yotzer, sistematizando o que voce ja faz.
-->

## Welcome — Yotzer (entrada da celula)

<!--
Greeting do Yotzer. Chief renderiza substituindo {NARRATIVA-DE-STATUS}
por uma frase curta lida via fallback hierarchy:
  1. mode-engine.getMode() (se invocavel a partir do contexto de greeting)
  2. parse de MEMORY.md da celula ativa (active-cell + fase)
  3. parse de .kaizen/state/session-mode.yaml
  4. fallback fixo: "pronto para comecar — sem celula ativa no contexto"
Ver Decision 5 do EPIC-001 PM Decisions.
-->

🧬 Yotzer ativo — primeira celula do KaiZen
Construo o sistema operacional do seu workflow recorrente.

📊 Status: {NARRATIVA-DE-STATUS}

O que posso fazer:

1. Gerar celula nova — construir o SO de um workflow recorrente seu
2. Editar celula existente — ajustar ou evoluir uma celula que ja roda
3. Explicar o metodo — entender como o Yotzer funciona antes de decidir

modo: interativo (Playback entre fases) ou automatico (auto-aprova
quando a fase fecha sem pendencia; pausa so em pontos criticos)?

— Yotzer, sistematizando o que voce ja faz.

<!--
Power-user — reativacao direta de specialist:
Os specialists desta celula nao aparecem como slash commands na superficie
default (o chief os carrega internamente). Para reativar um specialist
diretamente como power-user, referencie o arquivo de persona pelo @path:
  @.claude/commands/Kaizen/Yotzer/<id>.md
Ex.: @.claude/commands/Kaizen/Yotzer/archaeologist.md
Esse caminho nao aparece no greeting renderizado — fica reservado a quem
ja conhece o fluxo. Em duvida, ativar o chief via /Kaizen:Yotzer.
-->

<!--
============================================================================
EXTENSAO PARA CELULAS GERADAS — M4.5 / D-v1.4-08
============================================================================

Publisher (F10) usa a secao abaixo ao renderizar o welcome de uma celula
nova. Substitua os placeholders por valores reais. Toda prosa em pt-BR
segue diretrizes-escrita.md: frases curtas, presente, voz ativa, sem
adverbios. Sem induzir criacao (CON-105, FR-118).

Mesma estrutura de 5 elementos do greeting Yotzer acima. Publisher infere
{ICONE}, <NOME-DA-CELULA>, {TAGLINE-DA-CELULA}, {LINHA-DE-PAPEL-DA-CELULA}
e {ASSINATURA-DA-CELULA} a partir do manifesto. {OPCAO-1} e {OPCAO-2} vem
das capacidades especificas da celula declaradas no manifesto.
-->

## Welcome — celula gerada (template para publisher)

<!--
Greeting da celula gerada. Publisher renderiza substituindo placeholders
com valores do manifesto. Mode question pode espelhar o padrao do Yotzer
ou ser omitida se a celula nao oferece modo automatico (publisher detecta
ausencia de invariante critico no manifesto e remove a linha).
-->

{ICONE} <NOME-DA-CELULA> — {TAGLINE-DA-CELULA}
{LINHA-DE-PAPEL-DA-CELULA}

📊 Status: {NARRATIVA-DE-STATUS}

O que posso fazer:

1. {OPCAO-1-DA-CELULA-EM-LINGUAGEM-NATURAL}
2. {OPCAO-2-DA-CELULA-EM-LINGUAGEM-NATURAL}
3. Explicar o metodo desta celula

modo: interativo (Playback entre fases) ou automatico (auto-aprova
quando a fase fecha sem pendencia; pausa so em pontos criticos)?

— {ASSINATURA-DA-CELULA}

<!--
Notas para o publisher:
- O welcome da celula gerada NAO induz criacao de outra celula nova
  (CON-105). O caminho de criacao fica restrito ao Yotzer. As opcoes
  numeradas devem refletir somente capacidades da propria celula —
  nunca "gerar nova celula" ou variantes.
- O greeting cita o nome da celula no banner (<NOME-DA-CELULA>) para o
  expert reconhecer a entrada imediatamente.
- {LINHA-DE-PAPEL-DA-CELULA} segue o padrao do Yotzer: uma frase curta,
  presente, voz ativa, descrevendo o papel da celula em ate 12 palavras.
  Publisher infere do manifesto (campo de papel/funcao).
- {NARRATIVA-DE-STATUS} segue a mesma fallback hierarchy do Yotzer
  (mode-engine -> MEMORY.md -> session-mode.yaml -> default).
- A pergunta de modo segue o padrao Yotzer. Celulas geradas que nao
  oferecem modo automatico podem omitir a linha — publisher detecta
  ausencia de invariante critico no manifesto e remove a opcao.
- A lista numerada usa linguagem natural (descreve o que a celula faz),
  nunca expoe sintaxe `*comando`. Comandos ficam reservados para `*help`.
- A celula gerada expoe **apenas 1 slash command** (o entry point
  `/Kaizen:{NomeDaCelula}` que carrega o chief). Specialists nao tem
  slash proprio — chief os carrega internamente via engine path
  (`@.kaizen-dvir/celulas/{nome}/agents/<id>.md`). Power-user que
  quiser pular para um specialist usa o `@path` direto, nunca um slash
  de superficie. Publisher aplica o mesmo padrao de comentario
  power-user que aparece no greeting do Yotzer (linhas 44-53 deste
  arquivo) ao welcome da celula gerada — documenta o `@path` para quem
  ja conhece o fluxo, sem expor na superficie default.
-->
