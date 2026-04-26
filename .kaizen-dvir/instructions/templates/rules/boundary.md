# Framework Boundary — Camadas L1 a L4

> Mapa de mutabilidade do KaiZen. Cada path do projeto pertence a uma das quatro camadas. A camada define quem pode editar, o que `kaizen update` faz com o arquivo e como o expert deve interagir com ele.

## Tabela de Camadas

| Camada | Mutabilidade | Paths principais | O que `kaizen update` faz |
|--------|--------------|------------------|---------------------------|
| **L1** Framework Dvir | Nunca editar | `.kaizen-dvir/dvir/`, `.kaizen-dvir/commandments.md`, `bin/` | Sempre sobrescreve. Edits do expert nesta camada são reportados como warn e perdidos. |
| **L2** Framework Instructions | Nunca editar | `.kaizen-dvir/instructions/`, `.kaizen-dvir/celulas/`, `.kaizen-dvir/infra/` | Sempre sobrescreve, com **uma exceção**: `.kaizen-dvir/celulas/*/MEMORY.md` é preservado. |
| **L3** Project Config | Mutável (com cuidado) | `.claude/`, `dvir-config.yaml` | 3-way merge. Conflito gera arquivos `.ours` / `.theirs` e exige `kaizen update --continue`. |
| **L4** Project Runtime | Sempre mutável | `celulas/`, `refs/`, `.kaizen/` | Nunca toca. Update lê para checagem mas nunca escreve. |

## Princípios

1. **L1 e L2 são responsabilidade do framework.** O expert não deveria precisar editar nada lá. Deny rules em `.claude/settings.json` reforçam essa separação deterministicamente.
2. **L3 é a área de configuração do expert.** É onde o expert ajusta como o framework opera no projeto dele — preferências, regras locais, entradas customizadas em `CLAUDE.md`.
3. **L4 é o trabalho do expert.** Células criadas, identidade do projeto em `refs/ikigai/`, logs e snapshots em `.kaizen/`. O framework jamais sobrescreve nada aqui.

## Exceção — `MEMORY.md` por Célula

`.kaizen-dvir/celulas/{celula}/MEMORY.md` está em path nominalmente L2 mas tem **exceção explícita de escrita em runtime**. Sub-agentes da célula escrevem aprendizados em modo append-only durante a execução. `kaizen update` preserva o conteúdo desse arquivo entre versões.

A exceção rastreia ao Commandment V (Documentação Contínua, prática 3 — Memória por célula). Nenhum outro path em L2 tem comportamento equivalente.

## Delimiters do `CLAUDE.md`

`.claude/CLAUDE.md` é o único arquivo L3 que tem **bloco framework-managed embutido**. Os delimiters separam as duas regiões:

```markdown
<!-- KAIZEN:FRAMEWORK:START -->
... conteúdo gerenciado pelo framework, sobrescrito em update ...
<!-- KAIZEN:FRAMEWORK:END -->

<!-- KAIZEN:EXPERT:START -->
... conteúdo livre do expert, preservado em update ...
<!-- KAIZEN:EXPERT:END -->
```

Os delimiters `KAIZEN:FRAMEWORK:START/END` e `KAIZEN:EXPERT:START/END` são contratos do framework. `kaizen update` substitui apenas conteúdo entre `KAIZEN:FRAMEWORK:*` e preserva tudo entre `KAIZEN:EXPERT:*`. Não edite estes comments manualmente — quebrar a sintaxe abortará o próximo update com erro orientando a correção.

## Toggle de Proteção

`dvir-config.yaml` carrega o flag `boundary.frameworkProtection`:

| Valor | Efeito |
|-------|--------|
| `true` (padrão em projeto novo) | Deny rules ativas. Tentativas de escrita em L1/L2 são bloqueadas pelo Claude Code antes de chegar ao filesystem. |
| `false` (contribuidores do framework) | Deny rules desativadas. Modo de quem desenvolve o próprio KaiZen. |

## Governança

A camada de cada path é decisão arquitetural travada nas decisões D-v1.1-04 (Framework Boundary original) e D-v1.4-01 (rename `core/` → `dvir/`, `core-config.yaml` → `dvir-config.yaml`). Mudar a camada de um path exige decisão registrada e bump de versão minor do framework. Para detalhes de governança, consulte `.kaizen-dvir/commandments.md` § Commandment II — Authority Boundaries.
