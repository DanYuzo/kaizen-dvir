# Smoke Test Manual — `/Kaizen:Yotzer` (Gate criterion 2)

> Este documento e em **pt-BR** porque e lido pelo expert (e pelo `@qa`)
> durante a validacao do M8 Gate criterion 2: a ativacao interativa do
> `/Kaizen:Yotzer` em uma sessao real do Claude Code.
>
> O criterio 2 nao pode ser automatizado em CI — uma sessao Claude Code
> interativa nao tem API headless. Os criterios 1 e 3 estao 100%
> automatizados em `tests/m8/integration/test-m8-gate.js`. Este smoke test
> cobre o gap restante de forma reproduzivel e auditavel.

## Status do veredito

| Campo | Preencher apos execucao |
|-------|------------------------|
| Avaliador (`@qa`) | _pendente_ |
| Data | _pendente_ |
| Versao do KaiZen | `1.5.0-rc.0` ou superior |
| Versao do Claude Code | _pendente_ |
| Veredito (PASS / FAIL / BLOCKED) | _pendente_ |
| Comentarios | _pendente_ |

## Pre-requisitos

- Node.js >= 20 instalado.
- Pacote `@DanYuzo/kaizen-dvir` disponivel localmente (este checkout) ou
  publicado no canal de teste.
- Claude Code instalado e autenticado.
- Diretorio limpo disponivel para a fixture.

## Procedimento

### Passo 1 — Materialize a fixture

Execute o setup script a partir da raiz do checkout do KaiZen:

```bash
node tests/m8/integration/smoke-fixture/setup.js
```

O script imprime o caminho absoluto da fixture (algo como
`/tmp/kaizen-m8.7-smoke-XXXXXX`). Anote esse caminho.

**Resultado esperado:**
- Exit code 0.
- Mensagem em pt-BR confirmando "Fixture do smoke test M8.7 materializada com sucesso."
- Caminho da fixture impresso.

### Passo 2 — Abra a fixture no Claude Code

Abra a fixture no Claude Code:

```bash
cd "<caminho-da-fixture>"
# Inicie uma sessao Claude Code apontando para esse diretorio.
# A forma exata depende da sua instalacao do Claude Code (CLI, IDE, etc.).
```

**Resultado esperado:**
- Sessao Claude Code aberta com a fixture como diretorio de trabalho.
- O selector de skills do Claude Code lista `/Kaizen:Yotzer` entre as
  opcoes disponiveis (pode aparecer como `Kaizen:Yotzer` dependendo da UI).

### Passo 3 — Ative o chief

No prompt do Claude Code, digite:

```
/Kaizen:Yotzer
```

**Resultado esperado:**
- O agente `chief` da celula Yotzer responde com seu greeting de boas-vindas
  em pt-BR.
- O greeting referencia os 3 modos de operacao (interativo / automatico /
  hibrido) e/ou pergunta ao expert qual modo usar — exata redacao depende
  da persona em `.kaizen-dvir/celulas/yotzer/agents/chief.md`.
- Cole abaixo o **primeiro turno completo** da resposta como evidencia:

```
[evidencia do greeting do chief — colar aqui]
```

### Passo 4 — Ative um especialista

No prompt do Claude Code, digite:

```
/Kaizen:Yotzer:archaeologist
```

**Resultado esperado:**
- O agente `archaeologist` responde com seu greeting de abertura em pt-BR.
- O greeting identifica o especialista e descreve o que ele faz na fase
  correspondente do metodo de 10 fases.
- Cole abaixo o primeiro turno como evidencia:

```
[evidencia do greeting do archaeologist — colar aqui]
```

### Passo 5 — Verifique pelo menos um sub-skill adicional (amostra)

Repita o passo 4 com pelo menos mais **um** especialista da lista abaixo
(escolha aleatoriamente):

- `/Kaizen:Yotzer:stress-tester`
- `/Kaizen:Yotzer:risk-mapper`
- `/Kaizen:Yotzer:prioritizer`
- `/Kaizen:Yotzer:task-granulator`
- `/Kaizen:Yotzer:contract-builder`
- `/Kaizen:Yotzer:progressive-systemizer`
- `/Kaizen:Yotzer:publisher`

Especialista escolhido: _____________

```
[evidencia do greeting do especialista escolhido — colar aqui]
```

## Bloco de troubleshooting

### Sintoma: o `/Kaizen:Yotzer` nao aparece no selector de skills

**Diagnostico:**
1. Verifique que `<fixture>/.claude/commands/Kaizen/Yotzer.md` existe.
   Se ausente, rode `kaizen init` novamente na fixture ou execute
   `kaizen update`.
2. Verifique que a versao do Claude Code suporta skills aninhadas em
   `.claude/commands/<namespace>/<skill>.md`. A pesquisa de spec foi feita
   em M8.1 (story `M8.1.research-slash-skill-spec.md`) — confirme que a
   versao instalada do Claude Code corresponde ao referenciado.
3. Reinicie a sessao do Claude Code apos o init — alguns clients fazem
   cache do listing de skills.

### Sintoma: skill aparece mas o greeting nao renderiza

**Diagnostico:**
1. Abra `<fixture>/.claude/commands/Kaizen/Yotzer.md` e verifique o
   frontmatter YAML (`---\ndescription: "..."\n---`).
2. Verifique que `<fixture>/.kaizen-dvir/celulas/yotzer/agents/chief.md`
   existe e contem a persona do chief — o body do skill instrui o Claude
   Code a carregar essa persona por referencia.
3. Rode `kaizen doctor --cells` na fixture e verifique se ha AVISO
   apontando algum gap na celula.

### Sintoma: especialista responde com a persona errada

**Diagnostico:**
1. Verifique que o arquivo de persona correspondente existe em
   `<fixture>/.kaizen-dvir/celulas/yotzer/agents/<especialista-id>.md`.
2. O body do skill em `<fixture>/.claude/commands/Kaizen/Yotzer/<id>.md`
   deve referenciar `agents/<id>.md` (caminho relativo POSIX). Se houver
   caminho absoluto vazado (formato pre-M8.7 hotfix), abra issue.

## Limitacao acknowledged

Este smoke test **nao pode** ser automatizado em CI porque uma sessao
Claude Code interativa nao tem API headless. Os testes automatizados em
`tests/m8/integration/test-m8-gate.js` cobrem:

- Gate criterion 1: estrutura de arquivos `.claude/commands/Kaizen/Yotzer*`
- Gate criterion 3: deteccao de skills ausentes via `kaizen doctor --cells`
- Validacao de frontmatter, body, idempotencia, language policy

O smoke test cobre o que falta: o **runtime** do Claude Code carregar e
ativar a skill com o expert real digitando.

## Limpeza

Apos registrar o veredito acima, remova a fixture:

```bash
rm -rf "<caminho-da-fixture>"
```

A fixture vive em `os.tmpdir()`, entao o sistema operacional eventualmente
limpa sozinho — mas remover explicitamente acelera o ciclo.

## Referencias

- Story M8.7 — `docs/kaizen/stories/M8/M8.7.m8-integration-gate-test-suite-and-smoke-fixture.md`
- Epic KZ-M8 — `docs/kaizen/epics/epic-m8-yotzer-activation.md`
- M6.7 gate report — `tests/m6/integration/gate-report.md`
- M8.1 spec research — `docs/kaizen/stories/M8/M8.1.research-slash-skill-spec.md`
- D-v1.5-06 — slash command vs. shell subcommand decision
- AC-025 — `/Kaizen:Yotzer` ativa o chief

## Change Log

- 2026-04-25 — @dev — Smoke fixture documentada conforme story M8.7. Procedimento manual reproduzivel; campos de veredito reservados para `@qa`.
