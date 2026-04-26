'use strict';

// CLAUDE.md scaffold body — KaiZen v1.5 (M7.2)
//
// This module is the source of truth for the comprehensive `.claude/CLAUDE.md`
// scaffold written by `kaizen init` (consumed by `bin/kaizen-init.js` via
// `INLINE_TEMPLATES['.claude/CLAUDE.md']`). It also exports the framework
// section content (the bytes between the `KAIZEN:FRAMEWORK:START` and
// `KAIZEN:FRAMEWORK:END` HTML comments) for cross-milestone consumption by
// the M6.5 legacy CLAUDE.md migration script (`v1.4-to-v1.5.js`).
//
// Consumers — DO NOT rename without updating both:
//   - bin/kaizen-init.js (INLINE_TEMPLATES wiring — story M7.3)
//   - .kaizen-dvir/dvir/migrations/v1.4-to-v1.5.js (M6.5 cross-milestone)
//
// Language policy (D-v1.4-06):
//   - This file is machine instructions: comments and identifiers are EN.
//   - The exported scaffold body is user-facing: every byte is pt-BR.
//   - Delimiter markers themselves (HTML comments) are byte-exact contract
//     bytes per CON-007 — neither EN nor pt-BR, just the literal contract.
//
// Delimiter contract (CON-007):
//   The four delimiter markers are emitted byte-for-byte as written below.
//   `kaizen update` (M6) replaces only the content between
//   `<!-- KAIZEN:FRAMEWORK:START -->` and `<!-- KAIZEN:FRAMEWORK:END -->`,
//   and preserves the content between `<!-- KAIZEN:EXPERT:START -->` and
//   `<!-- KAIZEN:EXPERT:END -->` byte-for-byte. Story M7.4 validates this
//   round-trip; story M7.5 ships the integration gate test.
//
// Source traceability (Commandment III — No Invention):
//   - All paths reflect v1.4 renames (D-v1.4-01): .kaizen-dvir/dvir/,
//     .kaizen-dvir/instructions/, .kaizen-dvir/celulas/, dvir-config.yaml.
//   - All commands listed are part of the v1.5 CLI surface enumerated in
//     PRD v1.5 § Comandos: init, doctor, update, rollback, install. The
//     init/doctor/install handlers exist in bin/kaizen.js today; update
//     and rollback are M6 deliverables documented in PRD v1.5.
//   - Commandments I-VII text matches .kaizen-dvir/commandments.md v1.4.0.
//   - Hooks and gates listed match the M2/M3 deliverables documented in
//     PRD v1.4 § Hooks and Gates.

const KAIZEN_FRAMEWORK_SECTION_CONTENT = [
  '<!--',
  '  ATENÇÃO: não editar manualmente — esta seção é sobrescrita por `kaizen update`.',
  '  Edits sobrevivem apenas dentro do bloco KAIZEN:EXPERT logo abaixo.',
  '-->',
  '',
  '## 1. Identidade do Projeto',
  '',
  'Este projeto usa o framework **KaiZen v1.x**. KaiZen é um Sistema Operacional de IA para experts: transforma o Claude Code em centro de comando do negócio, com células orquestradas, hooks de contexto e gates de qualidade automáticos.',
  '',
  'Objetivo do framework: operacionalizar o Claude Code como ambiente único onde o expert pensa, decide e executa, com memória persistente e sem perda de contexto entre sessões.',
  '',
  'O Claude Code é o harness — a interface técnica. O KaiZen é o sistema operacional que roda em cima dele: define quem responde, com que repertório, sob quais regras, e onde o resultado fica guardado.',
  '',
  'Governança suprema: `.kaizen-dvir/commandments.md` (lei do framework, 7 artigos).',
  '',
  '## 2. Commandments',
  '',
  'Os 7 Commandments são lei. Toda célula, sub-agente, task e workflow se submete a eles. Documento completo: `.kaizen-dvir/commandments.md`.',
  '',
  '| # | Commandment | Resumo |',
  '|---|-------------|--------|',
  '| I | CLI First | A CLI é a fonte da verdade. Observability observa, UI gerencia pontos. Ordem imutável: CLI > Observability > UI. |',
  '| II | Authority Boundaries | Cada célula opera dentro do escopo declarado em `celula.yaml`. Operações fora do escopo delegam para quem tem autoridade. |',
  '| III | No Invention | Agentes não inventam dados, requisitos ou features. Tudo rastreia a fonte verificável. Lacuna vira pergunta, nunca palpite. |',
  '| IV | Quality First | Quality gates bloqueiam saída fora do critério. Quem executa nunca se auto-valida. Self-Healing permite até 2 iterações antes de escalar. |',
  '| V | Documentação Contínua | Trabalho não documentado morre. Atualização contínua, change log append-only, memória por célula. |',
  '| VI | Human-in-Loop | Decisões críticas exigem confirmação explícita do expert. Playback Gate antecede builds caros. Ambiguidade vira pergunta. |',
  '| VII | Evolução Incremental | REUSAR > ADAPTAR > CRIAR. Sistema cresce por camadas, nunca volta do zero. |',
  '',
  '## 3. Framework Boundary (L1-L4)',
  '',
  'O framework separa artefatos por mutabilidade. Deny rules em `.claude/settings.json` reforçam L1/L2 deterministicamente. Detalhes em `.claude/rules/boundary.md`.',
  '',
  '| Camada | Mutabilidade | Paths | Notas |',
  '|--------|--------------|-------|-------|',
  '| **L1** Framework Dvir | Nunca modificar | `.kaizen-dvir/dvir/`, `.kaizen-dvir/commandments.md` | Núcleo protegido. Bloqueado por deny rules. |',
  '| **L2** Framework Instructions | Nunca modificar (exceto `MEMORY.md`) | `.kaizen-dvir/instructions/`, `.kaizen-dvir/celulas/{nome}/` (estrutura) | Templates extend-only. `MEMORY.md` por célula tem exceção runtime. |',
  '| **L3** Project Config | Mutável pelo expert | `.claude/CLAUDE.md` (área expert), `.claude/rules/`, `dvir-config.yaml` | Customização preservada nos updates. |',
  '| **L4** Project Runtime | Sempre modificar | `refs/`, `.kaizen/`, dados do expert | Trabalho do expert. Sem restrição. |',
  '',
  'Toggle em `dvir-config.yaml` → `boundary.frameworkProtection: true|false` controla se as deny rules ficam ativas.',
  '',
  '## 4. Vocabulário Essencial',
  '',
  'Distinção fundamental entre **Célula** e **Agente** (D-v1.5-08). Detalhes em `.claude/rules/cells.md`.',
  '',
  '| Termo | Definição |',
  '|-------|-----------|',
  '| **Célula** | Grupo orquestrado de múltiplos agentes em tiers, unidade de distribuição e instalação, ativada via slash command `/Kaizen:{Nome}`. Exemplo: Yotzer (9 agentes em 3 tiers). |',
  '| **Agente** | Unidade individual com persona, expertise e responsabilidades próprias. Componente interno de uma célula. Acessado via roteamento `*comando` da célula ou via sub-skill `/Kaizen:{Nome}:{agente}`. |',
  '| **Sub-agente** | Sinônimo de agente quando se quer destacar que opera dentro de uma célula. |',
  '| **Workflow** | Sequência de fases dentro de uma célula. Cada fase chama um ou mais agentes e produz handoff. |',
  '| **Task** | Unidade executável dentro de uma fase. Tem inputs, outputs, gates declarados. |',
  '',
  'Célula é unidade de distribuição. Agente é componente. Nunca trate agente como unidade instalável.',
  '',
  'Esta distinção separa o KaiZen das linhagens AIOX/Auroq, onde "agente" às vezes era usado como sinônimo de pacote distribuído. Aqui, o pacote é a célula; o agente vive dentro dela.',
  '',
  '## 5. DVIR (o Engine)',
  '',
  'DVIR é o motor do framework: hooks, gates, manifests, migrations, reporters. Não edite diretamente — é L1.',
  '',
  '| Path | O que vive ali |',
  '|------|----------------|',
  '| `.kaizen-dvir/dvir/` | Lógica do engine (hooks, gates, memory, doctor, migrations) |',
  '| `.kaizen-dvir/dvir-config.yaml` | Configuração do projeto (paths, toggles, CLI) |',
  '| `.kaizen-dvir/manifest.json` | Inventário canônico instalado pelo `kaizen init` |',
  '| `.kaizen-dvir/celulas/` | Células instaladas (Yotzer já vem com o framework) |',
  '| `.kaizen-dvir/instructions/` | Templates extend-only consumidos por células |',
  '',
  '## 6. Lifecycle de Célula',
  '',
  'Toda célula nasce, é publicada e ativada. O fluxo é fixo:',
  '',
  '1. **Yotzer cria** — slash command `/Kaizen:Yotzer` abre o workflow interativo de 10 fases. Yotzer é a célula que cria células.',
  '2. **Publish** — `kaizen Kaizen:Yotzer publish <work-id>` materializa os artefatos em `.kaizen-dvir/celulas/{nome}/` e registra versão `1.0.0` no `CHANGELOG.md`.',
  '3. **Activate** — após publish, a célula fica disponível via `/Kaizen:{Nome}` e seus agentes via `/Kaizen:{Nome}:{agente}`.',
  '',
  'Detalhes do workflow Yotzer em `.claude/rules/yotzer.md` e da anatomia de célula em `.claude/rules/cells.md`.',
  '',
  '## 7. Comandos CLI',
  '',
  'A CLI é a fonte da verdade (Commandment I). Toda operação tem comando equivalente em terminal.',
  '',
  '| Comando | Descrição |',
  '|---------|-----------|',
  '| `kaizen init` | Inicializa o framework no diretório atual. Cria estrutura, scaffolds e `.claude/`. |',
  '| `kaizen doctor` | Diagnostica o projeto: hooks, gates, memória, células, candidatos de promoção. |',
  '| `kaizen update` | Atualiza o framework in-place preservando edits do expert (delimiter merge em CLAUDE.md, 3-way merge em `.claude/rules/`). |',
  '| `kaizen rollback` | Restaura o último snapshot criado antes de `kaizen update`. |',
  '| `kaizen install` | Instala célula de terceiros a partir de pacote (catálogo de células). |',
  '| `kaizen Kaizen:Yotzer publish <id>` | Publica célula gerada pelo Yotzer. |',
  '| `kaizen Kaizen:Yotzer resume <id>` | Retoma trabalho do Yotzer a partir do último handoff. |',
  '| `kaizen Kaizen:Yotzer validate <id>` | Valida célula antes de publicar (Schema Gate, OST, invariantes). |',
  '',
  'Quando rodar `kaizen doctor` e como interpretar a saída: `.claude/rules/doctor.md`.',
  '',
  '## 8. Hooks e Gates',
  '',
  'Hooks injetam contexto e protegem operações. Gates validam qualidade antes de avançar. Implementação em `.kaizen-dvir/dvir/hooks/` e `.kaizen-dvir/dvir/gates/`.',
  '',
  '**Hooks ativos:**',
  '',
  '- `UserPromptSubmit` — injeta camadas de contexto (Commandments, rules, célula ativa, ikigai) a cada prompt.',
  '- `PreCompact` — salva estado em handoff antes da compactação automática do Claude Code.',
  '- `PreToolUse` — gate de autoridade inline: valida se a operação está no escopo da célula ativa.',
  '',
  '**Gates ativos:**',
  '',
  '- **Quality Gate** — bloqueia output que falha critérios objetivos (verdict: PASS, CONCERNS, FAIL, WAIVED).',
  '- **Schema Gate** — valida `manifest.json` e `celula.yaml` contra schema declarado.',
  '- **Authority Gate** — verifica autoridade da célula ativa antes da operação.',
  '- **Reuse Gate** — checa se já existe artefato reusável antes de permitir CREATE (Commandment VII).',
  '- **Playback Gate** — apresenta narrativa antes de build caro (Commandment VI).',
  '',
  '## 9. Git Conventions',
  '',
  'Commits seguem o formato `{tipo}: {o que aconteceu}`. Detalhes em `.claude/rules/commit-conventions.md`.',
  '',
  'Tipos aceitos: `progresso`, `decisão`, `processo`, `célula`, `conhecimento`, `fix`, `setup`, `commandments`.',
  '',
  'Push para `main` e abertura de PRs são operações exclusivas da célula `@devops` ou da autoridade designada no `celula.yaml` (Commandment II — Authority Boundaries). Nenhuma outra célula faz push direto.',
  '',
  '## 10. Como Estender',
  '',
  'Três caminhos para crescer o sistema sem quebrar o framework:',
  '',
  '1. **Criar nova célula via Yotzer.** Ative `/Kaizen:Yotzer`, percorra as 10 fases, rode `kaizen Kaizen:Yotzer validate <id>` e depois `publish`. A célula nasce em `.kaizen-dvir/celulas/{nome}/` com manifest, agentes, workflows e CHANGELOG.',
  '2. **Customizar L3.** Edite a área expert deste arquivo (o bloco entre os comments `EXPERT` no fim deste documento), arquivos em `.claude/rules/*.md`, e `dvir-config.yaml`. Tudo aqui é preservado nos updates.',
  '3. **Contribuir para o framework.** Mesmo workflow do Yotzer, mas a célula resultante vai para o catálogo público. PR via `@devops`.',
  '',
  'Antes de criar qualquer artefato, valide REUSAR > ADAPTAR > CRIAR (Commandment VII). Já existe célula que resolve? Use. Existe parecida? Adapte. Nenhuma resolve? Crie e documente para reuso.',
  '',
  'Cada extensão deve nascer dentro de uma das três rotas acima. Edits diretos em L1/L2 (`.kaizen-dvir/dvir/`, `.kaizen-dvir/instructions/`) violam o boundary e são bloqueados pelas deny rules — extender é diferente de modificar o núcleo.',
].join('\n');

const CLAUDE_MD_SCAFFOLD = [
  '# CLAUDE.md — Projeto KaiZen v1.x',
  '',
  'Este arquivo é a ponte entre o Claude Code (o harness) e o framework KaiZen instalado neste projeto. Ele descreve a identidade do projeto, os Commandments, o modelo de camadas, o vocabulário essencial, o engine DVIR, o lifecycle de célula, a CLI, os hooks e gates, as convenções git e como estender o sistema. Use `.claude/rules/*.md` para detalhes profundos por tema.',
  '',
  '<!-- KAIZEN:FRAMEWORK:START -->',
  KAIZEN_FRAMEWORK_SECTION_CONTENT,
  '<!-- KAIZEN:FRAMEWORK:END -->',
  '',
  '<!-- KAIZEN:EXPERT:START -->',
  '<!--',
  '  Área livre do expert. Edite à vontade abaixo desta linha — esta seção é L3',
  '  mutável e preservada byte-a-byte por `kaizen update`. Adicione contexto do',
  '  seu projeto, células ativas, projetos em andamento, atalhos pessoais.',
  '-->',
  '',
  '',
  '<!-- KAIZEN:EXPERT:END -->',
  '',
].join('\n');

module.exports = {
  CLAUDE_MD_SCAFFOLD: CLAUDE_MD_SCAFFOLD,
  KAIZEN_FRAMEWORK_SECTION_CONTENT: KAIZEN_FRAMEWORK_SECTION_CONTENT,
};

// --- Change Log -----------------------------------------------------------
// 2026-04-25 — @dev (Dex) — M7.2: authored CLAUDE.md scaffold body in pt-BR
//   covering all 10 FR-049 sections (Identidade, Commandments, Framework
//   Boundary, Vocabulário, DVIR, Lifecycle de Célula, Comandos CLI, Hooks
//   e Gates, Git Conventions, Como Estender). Wrapped in CON-007 delimiters
//   (KAIZEN:FRAMEWORK:START/END preceding KAIZEN:EXPERT:START/END). Exposed
//   KAIZEN_FRAMEWORK_SECTION_CONTENT as named CommonJS export for M6.5
//   migration consumption. Wiring into bin/kaizen-init.js is M7.3.
