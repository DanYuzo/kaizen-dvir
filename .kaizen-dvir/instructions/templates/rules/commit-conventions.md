# Convenções de Commit — KaiZen

> No KaiZen, commit não é só sobre código. É **checkpoint do trabalho do expert**. Esta regra define o formato de commit, os tipos aceitos e a autoridade de push.

## Filosofia

Cada commit registra o que aconteceu — uma decisão, um avanço, um aprendizado, um ajuste. A mensagem do commit conta a história do negócio, não apenas o que mudou nos arquivos.

> "Commit é o botão salvar do sistema."

Quanto mais frequente, menos se perde quando algo dá errado. Push para o remoto é backup automático.

## Formato

```
{tipo}: {descrição curta do que aconteceu}

{detalhes opcionais — uma ou duas linhas explicando o porquê}
```

| Parte | Regra |
|-------|-------|
| `tipo` | Um dos sete tipos da tabela abaixo. |
| `descrição` | Frase curta em pt-BR descrevendo o que mudou no negócio ou no framework. |
| `detalhes` | Opcional. Use quando o "porquê" não é óbvio na descrição. |

## Tipos Aceitos

| Tipo | Quando usar | Exemplo |
|------|-------------|---------|
| `progresso` | Avançou em projeto, story, fase de célula. | `progresso: M7.1 — seis seed templates de .claude/rules/ prontos` |
| `decisao` | Tomou decisão estratégica registrada. | `decisao: distribuição via GitHub Packages como canal primário (D-v1.5-01)` |
| `processo` | Documentou, criou ou melhorou processo, SOP, workflow. | `processo: Yotzer ganha fase 5 (stress-test)` |
| `celula` | Criou, atualizou ou refatorou célula. | `celula: archaeologist agora consulta KBs do Ikigai` |
| `conhecimento` | Adicionou ou tratou material no Ikigai ou em KB de célula. | `conhecimento: ETL de 9 volumes de exemplos de copy` |
| `fix` | Corrigiu bug, gap ou inconsistência. | `fix: kaizen doctor reportava L3 como DRIFT em vez de OK` |
| `setup` | Configuração, infraestrutura, CI/CD, dependência. | `setup: workflow de publish para GitHub Packages` |

## Anti-Padrões

| Errado | Certo |
|--------|-------|
| `update files` | `progresso: M4.2 — fase 2 do Yotzer com archaeologist completo` |
| `fix bug` | `fix: kaizen init criava .kaizen/ mesmo quando já existia` |
| `chore: lint` | (use `setup` ou `fix` conforme o caso, com descrição específica) |
| Commit em inglês | Commits são machine-facing — devem ser em **inglês** quando a mensagem é técnica (refator, fix, build). Use pt-BR quando o commit registra evento de negócio (`progresso`, `decisao`, `celula`). |

**Nota sobre língua:** mensagens de commit técnicas (mudança em código) são EN; mensagens de commit que registram evento de negócio (decisão estratégica, novo processo, marco de projeto) podem ser pt-BR. Em caso de dúvida, escreva em inglês — é o padrão de fallback.

## Quality Gates Antes do Commit

Commandment IV exige que `npm run lint`, `npm run typecheck` e `npm test` passem antes do commit. Quality gates falhos = commit que não deveria existir.

```bash
npm run lint && npm run typecheck && npm test
```

Quando todos passam, o commit é seguro. Quando falham, corrija antes de commitar.

## Quem Faz Push

A autoridade de `git push` é **exclusiva** da célula de operações designada (em ambientes que rodam AIOX, isso é `@devops`; em projetos KaiZen puros, é a célula de operações instalada pelo expert). Outras células rodam `git add`, `git commit`, `git status`, `git diff`, `git log` localmente — mas delegam o push.

Esta separação rastreia ao Commandment II — Authority Boundaries:

> Cada célula tem autoridades exclusivas declaradas. Operações fora do escopo delegam para quem detém a autoridade. Ninguém executa o que não é seu.

## Branches

| Branch | Uso |
|--------|-----|
| `main` | Branch principal. Sempre verde. |
| `feat/*` | Features novas. Merge via PR. |
| `fix/*` | Correções pontuais. |
| `docs/*` | Mudanças apenas em documentação. |

Strategy de branch é decisão local do expert — esta regra registra a convenção comum, não impõe.

## Referência a Story

Quando o commit traceia a uma story, inclua o ID da story no final da descrição:

```
progresso: M7.1 seed rule templates prontos [Story KZ-M7.1]
```

Isso permite reconstrução do histórico via `git log --grep` e dá rastreabilidade auditável (Commandment III + Commandment V).

## Onde Saber Mais

| Tópico | Path |
|--------|------|
| Princípios de qualidade | `.kaizen-dvir/commandments.md` § Commandment IV |
| Documentação contínua | `.kaizen-dvir/commandments.md` § Commandment V |
| Authority Boundaries | `.kaizen-dvir/commandments.md` § Commandment II |
| Política de update | `.claude/rules/boundary.md` |
