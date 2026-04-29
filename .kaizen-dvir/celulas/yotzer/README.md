# Yotzer — geradora de celulas

<!--
Documento pt-BR. Expert le isto. Sem induzir criacao (CON-105).
-->

Yotzer e a primeira celula (um pacote pronto que cuida de um workflow recorrente seu de ponta a ponta) do KaiZen. Yotzer gera celulas novas em 10 etapas organizadas em 3 Atos.

## O que o Yotzer faz

Yotzer acompanha o expert da ideia solta ate a celula publicada. Chief
orquestra. Especialistas executam. Expert julga. Cada fase termina em um
gate auditavel.

## Como ativar

```
/Kaizen:Yotzer
```

Chief abre a sessao. Apresenta tres caminhos.

## Tres caminhos possiveis

1. **gerar celula nova** — inicia as 10 fases desde F1.
2. **editar celula existente** — entra em modo de edicao sobre uma celula
   ja criada.
3. **explicar o metodo** — apresenta as 10 fases antes de decidir.

## Comandos de navegacao

| Comando | Acao |
|---------|------|
| `*novo` | inicia geracao nova |
| `*editar` | entra em modo de edicao |
| `*metodo` | explica o metodo das 10 fases |
| `*modo` | alterna modo interativo ou automatico |
| `*resume` | retoma a partir do ultimo ponto de passagem |
| `*status` | relata fase atual e ultimo veredito |

## O metodo

Ver `tasks/explain-method.md` para a descricao completa das 10 fases em 3
Atos.

## Etapas que sempre pausam

F1, F2 e F10 sempre pausam. Mesmo em modo automatico, chief aguarda
julgamento do expert nessas etapas.

## Onde ficam as celulas que voce gera

Celulas que voce gera vao pra `celulas/` no seu projeto. Se voce e
contribuidor do framework e quer entregar a celula junto com o framework,
mova a pasta manualmente depois pra `.kaizen-dvir/celulas/`.

## Governanca

Yotzer respeita L2 (extend-only). A unica excecao de escrita no runtime e
`MEMORY.md`, gerida por `memory-writer.js`. Celulas geradas pelo Yotzer
chegam em `celulas/{nome}/` (L4, sempre mutavel).
