# Language Policy — pt-BR para Expert, EN para Máquina

> O KaiZen usa duas línguas com fronteira clara. Esta regra define qual conteúdo é **machine-facing** (EN) e qual é **user-facing** (pt-BR), com exemplos concretos de cada categoria.

## Princípio

| Categoria | Língua | Por quê |
|-----------|--------|---------|
| **Machine-facing** — instruções para o framework, IA ou outro sistema | **Inglês** | Termos técnicos consistentes, alinhamento com convenções de software, menos ambiguidade em prompts e código. |
| **User-facing** — conteúdo lido pelo expert humano | **Português brasileiro** | O expert opera em pt-BR. Mensagens, documentação operacional e templates devem ser nativos. |

Qualquer string user-facing renderizada em inglês é violação do Commandment IV (Quality First) e emite `FAIL` no Quality Gate.

## O Que é Machine-Facing (EN)

| Tipo de conteúdo | Exemplos |
|------------------|----------|
| Epics e stories | `docs/kaizen/epics/*.md`, `docs/kaizen/stories/*.md` |
| Acceptance criteria, technical notes, deliverable lists | Conteúdo de cada story |
| Código JavaScript e seus comentários | `bin/*.js`, `.kaizen-dvir/dvir/*.js` |
| Configuração YAML — chaves e estrutura | `dvir-config.yaml`, `celula.yaml` (chaves), `manifest.json` |
| Mensagens de commit | `feat: add X`, `fix: resolve Y` |
| Identificadores e nomes técnicos | `agent_id`, `celula_id`, `INLINE_TEMPLATES` |
| Output de teste e logs estruturados | Test runner, log JSON |
| Nomes de paths e arquivos | `.kaizen-dvir/`, `celula.yaml` |

## O Que é User-Facing (pt-BR)

| Tipo de conteúdo | Exemplos |
|------------------|----------|
| Bridge document | `.claude/CLAUDE.md` (entre os delimiters) |
| Rule files | `.claude/rules/*.md` (como este arquivo) |
| Commandments | `.kaizen-dvir/commandments.md` |
| Mensagens da CLI | `kaizen init`, `kaizen doctor`, `kaizen update`, `kaizen rollback` (toda mensagem que aparece no terminal para o expert) |
| Mensagens de erro | "Diretório não está limpo para executar 'kaizen init'." |
| Templates user-facing | `.kaizen-dvir/instructions/templates/memory-tmpl.md` |
| Conteúdo dos sub-agentes ao falar com o expert | Greetings, perguntas, resumos, Playback Gate |
| Output final de uma célula | Documentos, copy, planos entregues ao expert |
| Valores YAML que aparecem ao expert | `description`, `name` apresentável de uma célula |

## Exceções e Casos de Borda

### Path e Identificadores em Texto pt-BR

Paths (`.kaizen-dvir/celulas/`), comandos (`kaizen update`), e nomes de variável (`COPY_MANIFEST`) **podem aparecer dentro de texto pt-BR** — são identificadores técnicos, não prosa. O critério é: se substituir por sinônimo em pt-BR muda o significado, é identificador e fica como está.

Exemplo válido em texto user-facing:
> Rode `kaizen doctor --cells` para listar as células instaladas.

### Comentários em Arquivos User-Facing

Comentários HTML dentro de templates pt-BR (`<!-- -->`) **devem ser em pt-BR**. Eles são lidos pelo expert.

Exemplo válido:
```markdown
<!-- Edite livremente abaixo — esta área é L3 mutável e preservada nos updates. -->
```

Exemplo inválido (mesmo template):
```markdown
<!-- Edit freely below - this is an L3 mutable area preserved across updates. -->
```

### Frontmatter YAML em Arquivos pt-BR

Frontmatter de epics e stories (machine-facing) é EN mesmo quando o documento da story discute conteúdo pt-BR. Frontmatter de templates user-facing (que vão para o expert) é pt-BR.

## Verificação

| Check | Como rodar |
|-------|------------|
| Inspeção visual | Abrir o arquivo e ler. Se a prosa não soa natural em pt-BR, há violação. |
| Audit automatizado | Test `tests/m7/test-language-policy-audit.js` (M7.5) compara densidade de stop-words pt-BR vs. EN em cada arquivo user-facing. |
| Pre-commit | Quality Gate emite `FAIL` se detectar parágrafo em inglês em path user-facing. |

## Diretrizes de Escrita

Conteúdo user-facing segue `diretrizes-escrita.md` (FR-040):

- Frases curtas — uma vírgula no máximo. Se tem duas, cortar ou fazer duas frases.
- Voz ativa — "Yotzer cria a célula" e não "A célula é criada pelo Yotzer".
- Voz presente — "quando você roda" e não "quando você está rodando".
- Nível de leitura simples — linguagem direta, conceitos acessíveis.
- Sem floreios — remover palavra que não muda o significado.

## Onde Saber Mais

| Tópico | Path |
|--------|------|
| Diretrizes de escrita completa | `refs/ikigai/diretrizes-escrita.md` (quando disponível) |
| Política de qualidade | `.kaizen-dvir/commandments.md` § Commandment IV |
| Decisão original | PRD v1.4 § D-v1.4-06 (Language Policy) |
