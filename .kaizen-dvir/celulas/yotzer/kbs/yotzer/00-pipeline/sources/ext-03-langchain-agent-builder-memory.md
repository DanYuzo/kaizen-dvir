# How We Built Agent Builder's Memory — LangChain

**Fonte:** https://www.langchain.com/conceptual-guides/how-we-built-agent-builders-memory
**Autor:** LangChain team
**Tipo:** Artigo conceitual / post técnico

---

## Introdução

LangChain lançou **LangSmith Agent Builder**, plataforma no-code de construção de agentes que prioriza **memória como feature central**. Este artigo detalha o racional, implementação técnica e learnings.

## O que é LangSmith Agent Builder

Solução web hosted pra usuários não-técnicos criarem agentes especializados em workflows específicos. Construído em cima do **Deep Agents harness**, permite automação de tarefas tipo assistência de email e suporte a documentação.

### Por que memória foi priorizada

Diferente de ferramentas AI general-purpose, agentes do LangSmith lidam com tarefas repetitivas onde "lições de uma sessão transferem pra outra numa taxa muito maior". Usuários sem memória enfrentariam UX ruim, tendo que re-explicar constantemente.

---

## Framework de Memória: definição COALA

Time adotou o modelo de 3 categorias do paper COALA:

- **Procedural:** regras aplicadas pra determinar comportamento do agente
- **Semantic:** fatos sobre o mundo
- **Episodic:** sequências de ações passadas do agente

---

## Arquitetura Técnica

### Filesystem-Based Memory

Memória representada como **arquivos**, explorando o princípio: "modelos são bons em usar filesystems". Evita exigências de ferramentas especializadas.

**Arquivos padrão da indústria:**
- `AGENTS.md` — set de instruções core
- **Agent skills** — instruções de tarefas especializadas
- **Subagent definitions** (formato Claude Code)
- `tools.json` — acesso a MCP servers (formato custom permitindo tool subsetting)

### Implementação de Storage

Arquivos de memória armazenados em **PostgreSQL** e expostos como **virtual filesystem** (não filesystem real). Abordagem mantém operações "mais fáceis e eficientes do ponto de vista de infra" enquanto explora capacidades filesystem dos LLMs.

---

## Memória na Prática: LinkedIn Recruiter Agent

Exemplo interno real demonstra a estrutura:
- `AGENTS.md` — instruções core
- `subagents/linkedin_search_worker` — subagente pra sourcing de candidatos
- `tools.json` — acesso a LinkedIn search tool
- 3 arquivos adicionais representando job descriptions, atualizados via interações

## Workflow de Edição de Memória (exemplo)

**Padrão de aprendizado progressivo:**

Prompt inicial: "Summarize meeting notes."

- **Semana 1 feedback** → agente atualiza AGENTS.md com preferências de formatação (bullets vs parágrafos)
- **Semana 2 feedback** → agente adiciona extração de action items
- **Mês 3 resultado** → AGENTS.md evoluído pra guide abrangente incluindo:
  - Format specifications
  - Meeting type handling (engineering, planning, customer)
  - Participant information
  - Edge case handling

A especificação "se construiu através de correções, não através de documentação upfront".

---

## Key Learnings

### Complexidade do Prompting

O aspecto mais desafiador foi prompting. Questões que exigiram solução:
- Quando lembrar/esquecer?
- Colocação correta de arquivos (skills vs AGENTS.md)
- Manter schemas de arquivo válidos

Um membro do time trabalhava full-time **só** no prompting de memória.

### Validação de Arquivos

Agentes às vezes geravam arquivos inválidos. Solução: validação de schema explícita, jogar erros de volta pro LLM ao invés de commitar malformed.

### Agent Compaction Issues

Agentes eram eficientes em **adicionar informação**, mas **"não compactavam"** learnings. Listavam vendors específicos a evitar ao invés de generalizar pra "cold outreach rejection".

### Human-in-the-Loop Obrigatório

Todas edições de memória exigiam aprovação humana explícita, principalmente pra minimizar vetores de ataque via prompt injection. "Yolo mode" opcional permite bypass.

---

## Capacidades Habilitadas

### No-Code Experience
Markdown e JSON providenciam alternativas familiares e escaláveis a DSLs, reduzindo carga cognitiva pra usuários technically-lite.

### Better Agent Iteration
Memória acelera ciclos de construção. Feedback em natural language atualiza comportamento do agente sem mudança manual de config.

### Portabilidade
Convenções de arquivo padrão permitem **migração de agente entre harnesses**: Deep Agents CLI, Claude Code, OpenCode.

---

## Future Directions

### Episodic Memory
Componente COALA faltante. Vai ser adicionado expondo conversas anteriores como arquivos acessíveis.

### Background Memory Processes
Processos diários planejados pra refletir sobre conversas e generalizar learnings que o agente perdeu em real-time.

### `/remember` Command
Prompt explícito pra agente refletir e atualizar memória. Formalizado a partir de práticas observadas.

### Semantic Search
Melhoria além de `glob` e `grep` filesystem searching.

### Hierarchical Memory Levels
Atualmente só agent-specific. Planejado: níveis user-level e organization-level via diretórios expostos.

---

## Conclusão

O sistema demonstra como **representar conhecimento do agente como estrutura filesystem-like** permite construção de agentes no-code prática e escalável, mantendo acessibilidade pra não-técnicos.

---

## Takeaways pra KB

1. **Memória como feature central** (não afterthought) muda UX de agentes que rodam tarefas repetitivas
2. **Modelo COALA:** Procedural + Semantic + Episodic — taxonomia útil
3. **Filesystem-based memory:** LLMs são bons em filesystems, aproveitar
4. **Postgres + virtual FS:** backend efetivo, mantém capacidade LLM
5. **Arquivos padrão:** `AGENTS.md`, skills, subagent definitions (Claude Code format), `tools.json`
6. **Self-improvement via correções** supera documentação upfront
7. **Prompting de memória é caro** (um full-timer)
8. **Schema validation obrigatória** — erros voltam ao LLM
9. **Agentes adicionam mas não compactam** — compactação é fronteira
10. **Human-in-the-loop** pra edits previne prompt injection
11. **Portabilidade cross-harness** via convenções padrão
