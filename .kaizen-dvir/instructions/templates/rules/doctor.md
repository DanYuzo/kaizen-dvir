# `kaizen doctor` — Diagnóstico do Projeto

> `kaizen doctor` é a ferramenta de inspeção do projeto KaiZen. Lê o estado do diretório, compara com o canonical do framework instalado e reporta. Esta regra explica quando rodar, o que cada check verifica e como interpretar o output.

## Quando Rodar

| Situação | Comando | Por quê |
|----------|---------|---------|
| Logo após `kaizen init` | `kaizen doctor` | Confirmar que o esqueleto foi escrito corretamente. |
| Antes de começar a sessão de trabalho | `kaizen doctor` | Detectar drift desde o último update — o expert pode ter modificado algo sem perceber. |
| Após `kaizen update` | `kaizen doctor` | Verificar que o update preservou L4 e aplicou L1/L2/L3 conforme política. |
| Quando algo parece quebrado | `kaizen doctor --verbose` | Investigar com detalhe — output mostra hashes esperados vs. atuais. |
| Para verificar células instaladas | `kaizen doctor --cells` | Listar células e confirmar que cada uma tem skill registrada em `.claude/commands/Kaizen/{Cell}.md`. |

## Checks Executados

### Check 1 — Versão Disponível

Lê a versão instalada do framework e compara com a versão mais recente publicada. Se houver minor superior disponível, emite mensagem informativa.

```
INFO  versão instalada: v1.5.0
INFO  versão disponível: v1.6.0
INFO  para atualizar, rode: kaizen update
```

`kaizen doctor` apenas **informa**. Update é sempre acionado manualmente pelo expert (Commandment VI — Human-in-Loop).

### Check 2 — Manifest Drift

Lê `.kaizen-dvir/manifest.json` (registra hashes versionados de cada arquivo do framework no momento do init/update). Calcula o hash atual de cada arquivo e compara.

| Verdict | Significado | Ação sugerida |
|---------|-------------|---------------|
| `OK` | Hashes atuais batem com o manifest. | Nada a fazer. |
| `DRIFT_L1` | Arquivo em L1 foi modificado. **Não deveria acontecer.** | Restaurar via `kaizen update` ou `kaizen rollback`. |
| `DRIFT_L2` | Arquivo em L2 foi modificado. Exceção aceita: `MEMORY.md` por célula. | Para `MEMORY.md`, `OK`. Para outros, restaurar. |
| `DRIFT_L3` | Arquivo em L3 foi modificado. **Esperado** — é a área do expert. | Nenhuma ação. Reportado como `OK` com nota. |
| `MISSING` | Arquivo do manifest não existe no projeto. | Re-rodar `kaizen init` no diretório ou `kaizen update`. |

### Check 3 — Células Sem Skill (`--cells`)

Lista cada célula em `.kaizen-dvir/celulas/{nome}/` e confirma que existe skill registrada em `.claude/commands/Kaizen/{Nome}.md`. Quando uma célula está instalada mas sem skill, emite `WARN`.

```
WARN  célula instalada sem skill registrada: yotzer
      esperado: .claude/commands/Kaizen/Yotzer.md
      sugestão: rode 'kaizen update' ou 'kaizen init' para registrar a skill
```

### Check 4 — Boundary Toggle

Lê `dvir-config.yaml` e reporta o valor de `boundary.frameworkProtection`. Em projeto novo, o esperado é `true`. Contribuidores do framework podem rodar com `false`.

```
OK    boundary.frameworkProtection = true (deny rules ativas)
```

## Como Interpretar o Output

`kaizen doctor` segue um padrão consistente em pt-BR:

```
✔ KaiZen v1.5.0
  Manifest: OK (47/47 arquivos íntegros)
  L3 modificado pelo expert: 2 arquivo(s) — esperado
  Células instaladas: 1 — todas com skill registrada

  Próximas ações sugeridas:
  - nenhuma

```

Quando há findings, eles vêm separados por severidade:

| Marker | Severidade | Significado |
|--------|------------|-------------|
| `✔` | OK | Tudo conforme. |
| `INFO` | INFO | Informativo, não exige ação. |
| `WARN` | WARN | Recomenda ação, não bloqueia operação do framework. |
| `FAIL` | FAIL | Estado inconsistente. Operação do framework pode falhar até correção. |

## Mensagens em pt-BR Orientam Correção

Toda mensagem do `doctor` segue NFR-101 — orienta a correção, não apenas descreve o problema. Exemplo:

```
FAIL  manifest drift detectado em path L1
      arquivo: .kaizen-dvir/dvir/config-loader.js
      hash esperado: a3f...
      hash atual:    9c2...
      ação:          rode 'kaizen update' para restaurar; se você modificou o arquivo
                     intencionalmente, rode 'kaizen rollback' para reverter
```

## Relação com `kaizen update` e `kaizen rollback`

| Comando | Quando usar |
|---------|-------------|
| `kaizen doctor` | Inspecionar o estado. Não muda nada. |
| `kaizen update` | Aplicar nova versão do framework, respeitando política por camada. Sempre manual. |
| `kaizen rollback` | Restaurar último snapshot tirado antes do último update. Idempotente. |

`kaizen doctor` nunca dispara `update` ou `rollback` automaticamente. O expert decide.

## Onde Saber Mais

| Tópico | Path |
|--------|------|
| Camadas e mutabilidade | `.claude/rules/boundary.md` |
| Convenções de log e mensagens | `.kaizen-dvir/commandments.md` § Commandment IV |
| Comandos CLI completos | seção "Comandos CLI" em `.claude/CLAUDE.md` |
