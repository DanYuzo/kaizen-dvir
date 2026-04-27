# KaiZen

> Meta-framework que orquestra células — agentes, processos e conhecimento — para experts de marketing e vendas operarem com IA como parceira de execução.

[![npm version](https://img.shields.io/npm/v/kaizen-dvir.svg)](https://www.npmjs.com/package/kaizen-dvir)
[![license](https://img.shields.io/npm/l/kaizen-dvir.svg)](LICENSE)

## O que é

KaiZen é um framework de fundação. Ele dá a estrutura — Framework Boundary, Commandments, sistema de células, Ikigai como contexto-base — pra você construir, ativar e versionar agentes que executam o seu método.

Pensa nele como o "sistema operacional" sobre o qual seus processos rodam. O CLI cuida de inicializar, atualizar e diagnosticar; você foca em construir o que importa pro seu negócio.

## Instalação

```bash
npx kaizen-dvir init
```

Roda dentro de uma pasta vazia (ou na raiz de um projeto novo). O comando cria toda a estrutura do KaiZen no diretório atual.

Requisitos: **Node.js 20+**.

## Atualizando

`init` é a primeira instalação. Para subir uma versão nova do framework no projeto que já está rodando, use `update`:

```bash
npx kaizen-dvir@latest update
```

O `update` aplica a política em camadas (L1/L2 atualizam, L3 faz merge inteligente, L4 é seu — fica intocado) e preserva o seu trabalho. Antes de qualquer mutação, ele cria um snapshot que dá pra reverter via `kaizen rollback`. Se o projeto ainda nem foi inicializado, rode `init` primeiro.

## Comandos

```bash
npx kaizen-dvir <comando>
```

| Comando | Status | O que faz |
|---|---|---|
| `init` | ✅ Disponível | Inicializa um projeto KaiZen na pasta atual |
| `doctor` | ✅ Disponível | Diagnostica saúde do projeto (hooks, gates, memory, cells, promotion) |
| `update` | ✅ Disponível | Atualiza o framework no projeto aplicando política em camadas |
| `update --dry-run` | ✅ Disponível | Simula update sem escrever em disco |
| `update --continue` | ✅ Disponível | Retoma update interrompido por conflito |
| `rollback` | ✅ Disponível | Restaura o último snapshot do framework |
| `rollback --list` | ✅ Disponível | Lista snapshots disponíveis |
| `Kaizen:Yotzer publish <id>` | ✅ Disponível | Publica célula gerada pelo Yotzer |
| `Kaizen:Yotzer resume <id>` | ✅ Disponível | Retoma trabalho a partir do último handoff |
| `Kaizen:Yotzer validate <id>` | ✅ Disponível | Valida trabalho antes de publicar |
| `install` | 🚧 Planejado (M4) | Instala uma célula no projeto |

Use `--help` em qualquer comando pra ver flags e exemplos:

```bash
npx kaizen-dvir --help
npx kaizen-dvir doctor --help
```

## O que `init` cria

Depois de rodar `npx kaizen-dvir init`, sua pasta fica assim:

```
seu-projeto/
├── .kaizen-dvir/         # L1/L2 — framework (não modificar)
│   ├── commandments.md   # Princípios inegociáveis
│   ├── dvir-config.yaml  # Configuração do framework
│   ├── dvir/             # Núcleo determinístico
│   ├── celulas/          # Células instaladas
│   ├── instructions/     # Templates extend-only
│   ├── infra/            # Infraestrutura
│   └── refs/             # Referências do framework
├── .claude/              # L3 — configuração do projeto
│   ├── settings.json     # Framework Boundary (deny rules L1/L2)
│   ├── rules/            # Regras de comportamento
│   └── commands/         # Slash commands
├── refs/ikigai/          # L4 — contexto-base do expert
│   ├── quem-sou.md       # Identidade
│   ├── o-que-faco.md     # Método
│   ├── para-quem.md      # Público
│   └── como-faco.md      # Processo
├── .kaizen/              # Runtime (gitignored)
├── bin/                  # CLI local
└── package.json
```

A primeira coisa a fazer depois do `init` é preencher os 4 arquivos em `refs/ikigai/`. Eles são o contexto-base que toda célula vai consultar.

## Conceitos

| Conceito | O que é |
|---|---|
| **Célula** | Unidade modular do KaiZen — um conjunto de agentes, tasks, workflows e KBs que entrega uma capacidade específica |
| **Commandments** | Princípios inegociáveis do framework. Versionados em `.kaizen-dvir/commandments.md` |
| **Framework Boundary** | Sistema de 4 camadas (L1/L2/L3/L4) que separa código do framework do trabalho do projeto. Reforçado por `deny rules` no Claude Code |
| **Ikigai** | Contexto-base do expert (quem é, o que faz, pra quem, como faz). Toda célula consome esse contexto |
| **DVIR** | Núcleo determinístico do framework — config, schemas, update logic |
| **Yotzer** | Célula geradora — fabrica novas células a partir do método do expert |

## Filosofia

Repertório + IA = Resultado. O expert manda e julga. A IA executa.

KaiZen materializa três capacidades:
- **Pensar com IA** — decisões, planos, estratégias
- **Fazer com IA** — execução colaborativa
- **Lembrar com IA** — todo aprendizado consolida no sistema

Documentação completa do método: veja `.kaizen-dvir/commandments.md` depois do `init`.

## Status

Versão atual: **v1.5.0** (Marco M6 — Distribution & Update).

Roadmap macro:
- M1-M3 — Fundação, Boundary, Doctor ✅
- M4 — Install de células 🚧
- M5 — Promotion engine ✅
- M6 — Distribuição via npm + Update ✅
- M7 — Templates expandidos ✅
- M8 — Doctor avançado ✅

## Suporte

- **Issues:** https://github.com/DanYuzo/kaizen-dvir/issues
- **Repositório:** https://github.com/DanYuzo/kaizen-dvir

## Licença

MIT — veja [LICENSE](LICENSE).

---

KaiZen é mantido por [@DanYuzo](https://github.com/DanYuzo).
