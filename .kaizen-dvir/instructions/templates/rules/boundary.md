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

## Delimiters do `CLAUDE.md` — Contrato de Merge (CON-007)

`.claude/CLAUDE.md` é o único arquivo L3 que tem **bloco framework-managed embutido**. Os delimiters separam as duas regiões:

```markdown
<!-- KAIZEN:FRAMEWORK:START -->
... conteúdo gerenciado pelo framework, sobrescrito em update ...
<!-- KAIZEN:FRAMEWORK:END -->

<!-- KAIZEN:EXPERT:START -->
... conteúdo livre do expert, preservado em update ...
<!-- KAIZEN:EXPERT:END -->
```

### Contrato byte-exato

Os delimiters `KAIZEN:FRAMEWORK:START/END` e `KAIZEN:EXPERT:START/END` são **contrato byte-exato** do framework. As quatro strings literais — incluindo os espaços dentro do comentário HTML — são tratadas como assinatura imutável dentro de uma linha MAJOR do KaiZen. As quatro linhas exatas são:

```
<!-- KAIZEN:FRAMEWORK:START -->
<!-- KAIZEN:FRAMEWORK:END -->
<!-- KAIZEN:EXPERT:START -->
<!-- KAIZEN:EXPERT:END -->
```

### Comportamento do `kaizen update`

| Região | O que `kaizen update` faz |
|--------|--------------------------|
| Antes de `KAIZEN:FRAMEWORK:START` | Sobrescreve com a versão canônica (cabeçalho gerenciado pelo framework). |
| Entre `KAIZEN:FRAMEWORK:START` e `KAIZEN:FRAMEWORK:END` | **Substitui inteiramente** pelo conteúdo canônico da nova versão. Drift do expert nesta região é descartado. |
| Entre `KAIZEN:FRAMEWORK:END` e `KAIZEN:EXPERT:START` | Sobrescreve com o separador canônico (linha em branco). |
| Entre `KAIZEN:EXPERT:START` e `KAIZEN:EXPERT:END` | **Preserva byte-a-byte** o conteúdo local. Os bytes do expert sobrevivem ao update intactos, mesmo que o framework declare conteúdo diferente nesta região na sua versão canônica. |
| Após `KAIZEN:EXPERT:END` | Sobrescreve com o rodapé canônico (geralmente uma quebra de linha final). |

### Regras de operação

1. **Não edite os quatro comentários HTML.** Quebrar a sintaxe (renomear, remover, duplicar, alterar espaços) faz o próximo `kaizen update` abortar com erro em pt-BR orientando a correção, antes de aplicar qualquer mudança.
2. **Drift dentro do bloco FRAMEWORK não é preservado.** Notas adicionadas no meio dessa seção serão sobrescritas. Use a seção EXPERT para qualquer customização local.
3. **A seção EXPERT é livre.** Markdown, comentários, listas, tabelas, prosa — qualquer conteúdo dentro dos delimiters EXPERT sobrevive ao update sem alteração.
4. **Os delimiters em si vêm do framework.** Mesmo que sua versão local tenha espaços ou variações tolerantes, o pós-update usa as quatro strings literais acima — o framework reescreve as linhas dos delimiters com os bytes oficiais.

### Erros possíveis

`kaizen update` valida os delimiters em ambos os arquivos (local e canônico) antes de tocar disco. Quatro condições produzem `BLOCK` com reproducer pt-BR:

- `missing_delimiters_ours` — algum dos quatro delimiters está ausente no arquivo local
- `malformed_delimiters_ours` — os quatro delimiters existem mas estão fora da ordem canônica
- `missing_delimiters_theirs` — pacote canônico inválido (bug do framework, não do expert)
- `malformed_delimiters_theirs` — pacote canônico inválido (bug do framework, não do expert)

Para corrigir um arquivo local quebrado, restaure os delimiters faltantes ou use `kaizen rollback` para voltar ao último snapshot e tentar de novo.

> Referências: CON-007 (PRD v1.5), D-v1.5-07 (decisão de delimiter-based merge), Story M7.4 (validação cross-milestone do contrato), Story M7.5 (gate de integração que exercita o round-trip).

## Toggle de Proteção

`dvir-config.yaml` carrega o flag `boundary.frameworkProtection`:

| Valor | Efeito |
|-------|--------|
| `true` (padrão em projeto novo) | Deny rules ativas. Tentativas de escrita em L1/L2 são bloqueadas pelo Claude Code antes de chegar ao filesystem. |
| `false` (contribuidores do framework) | Deny rules desativadas. Modo de quem desenvolve o próprio KaiZen. |

## Governança

A camada de cada path é decisão arquitetural travada nas decisões D-v1.1-04 (Framework Boundary original) e D-v1.4-01 (rename `core/` → `dvir/`, `core-config.yaml` → `dvir-config.yaml`). Mudar a camada de um path exige decisão registrada e bump de versão minor do framework. Para detalhes de governança, consulte `.kaizen-dvir/commandments.md` § Commandment II — Authority Boundaries.
