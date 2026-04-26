# Procedimento Smoke Test M8.7 — `@qa` checklist

> Documento em **pt-BR** — lido pelo expert e pelo `@qa` durante a
> validacao manual do M8 Gate criterion 2.

Este documento e a versao operacional do smoke test, com checklist
estruturado de verificacao. O documento companheiro
`tests/m8/MANUAL-SMOKE-TEST.md` traz a versao narrativa para o expert.
Use o procedimento aqui durante a execucao do gate; cole evidencia em
`MANUAL-SMOKE-TEST.md` apos o veredito.

## Checklist de execucao

### A — Setup

- [ ] Node.js >= 20 instalado (`node --version`)
- [ ] Claude Code instalado e autenticado
- [ ] Checkout do KaiZen disponivel localmente
- [ ] Diretorio de trabalho atual = raiz do checkout

### B — Materializacao da fixture

- [ ] Executou `node tests/m8/integration/smoke-fixture/setup.js`
- [ ] Exit code = 0
- [ ] Mensagem "Fixture do smoke test M8.7 materializada com sucesso." impressa
- [ ] Caminho da fixture anotado: `_______________________________`

### C — Verificacao estrutural (sem Claude Code)

- [ ] `<fixture>/.claude/commands/Kaizen/Yotzer.md` existe
- [ ] `<fixture>/.claude/commands/Kaizen/Yotzer/` contem 9 arquivos `.md`
- [ ] Os 9 arquivos sao: `archaeologist.md`, `chief.md`, `contract-builder.md`,
      `prioritizer.md`, `progressive-systemizer.md`, `publisher.md`,
      `risk-mapper.md`, `stress-tester.md`, `task-granulator.md`
- [ ] Cada `.md` abre com frontmatter `---\ndescription: "..."\n---`
- [ ] Body do `Yotzer.md` contem a frase "distinto desta skill interativa"

### D — Ativacao do chief (`/Kaizen:Yotzer`)

- [ ] Sessao Claude Code aberta na fixture
- [ ] `/Kaizen:Yotzer` aparece no selector de skills
- [ ] Digitou `/Kaizen:Yotzer` no prompt
- [ ] Resposta gerada em **pt-BR**
- [ ] Persona do chief carregada (greeting referencia o papel de
      coordenador da celula Yotzer)

### E — Ativacao de especialistas (`/Kaizen:Yotzer:<id>`)

- [ ] Digitou `/Kaizen:Yotzer:archaeologist`
- [ ] Persona do `archaeologist` carregou e respondeu em pt-BR
- [ ] Digitou `/Kaizen:Yotzer:<outro-especialista>` (escolha aleatoria)
      — especialista escolhido: `_______________`
- [ ] Persona do segundo especialista carregou e respondeu em pt-BR

### F — Limpeza

- [ ] Evidencia colada em `tests/m8/MANUAL-SMOKE-TEST.md`
- [ ] Veredito registrado em `tests/m8/MANUAL-SMOKE-TEST.md`
- [ ] Fixture removida (`rm -rf <fixture>`)

## Tabela de veredito

| Item | Status | Observacao |
|------|--------|-----------|
| A — Setup | __ / 4 | |
| B — Materializacao | __ / 4 | |
| C — Verificacao estrutural | __ / 6 | |
| D — Ativacao do chief | __ / 5 | |
| E — Especialistas | __ / 4 | |
| F — Limpeza | __ / 3 | |

**Total preenchido: __ / 26**

**Veredito final:** `[ ] PASS  [ ] FAIL  [ ] BLOCKED`

**Avaliador:** ___________________________  
**Data:** ____ / ____ / ______  
**Versao Claude Code:** ___________________________

## Criterios de veredito

| Veredito | Quando emitir |
|----------|--------------|
| **PASS** | Todos os 26 items checados, evidencia colada, sem falhas. |
| **FAIL**  | Pelo menos um item de D ou E falhou — Gate criterion 2 reprovado. |
| **BLOCKED** | Setup (A/B) falhou ou Claude Code nao consegue carregar a fixture — investigar antes de re-executar. |

## Escalacao

- Falha em D (chief nao carrega) → re-execute `kaizen init` na fixture e
  rode novamente. Se persistir, abra issue marcando M8.3 (init) e M8.2
  (registry helper).
- Falha em E (especialista errado) → verificar se o sub-skill referencia
  `agents/<id>.md` (relativo) e nao um caminho absoluto. Se vazar
  absoluto, abrir issue marcando regressao do M8.7 hotfix.
- Falha em C (estrutura) → bloqueia o gate. Re-executar M8.3 e M8.6 e
  re-rodar este procedimento.

## Change Log

- 2026-04-25 — @dev — Procedimento criado conforme story M8.7.
