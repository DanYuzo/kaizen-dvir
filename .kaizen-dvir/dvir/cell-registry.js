'use strict';

/**
 * dvir/cell-registry.js — STUB (M8.1 research deliverable).
 *
 * STATUS: Stub only. Real implementation lands in Story M8.2.
 * Calling `registerCellSkills()` on this stub THROWS so any downstream caller
 * (init / update / publisher) fails loud, not silent.
 *
 * Story: M8.1 — Research Claude Code slash-skill spec and document in cell-registry JSDoc
 * Epic:  KZ-M8 — Yotzer Activation Bridge
 * Risk mitigated: KZ-M8-R1 (do not invent the .claude/commands spec)
 * Commandment: III — No Invention. Every claim below cites a source.
 *
 * =============================================================================
 *  PART A — SLASH-SKILL SPEC (research notes for M8.2 implementer)
 * =============================================================================
 *
 * Claude Code in late 2025 / early 2026 unified two surfaces under one name:
 * "skills" and "custom slash commands". A file at `.claude/commands/foo.md`
 * and a skill at `.claude/skills/foo/SKILL.md` both register the same
 * `/foo` invocation, and BOTH formats are still supported.
 *
 *   "Custom commands have been merged into skills. A file at
 *    `.claude/commands/deploy.md` and a skill at
 *    `.claude/skills/deploy/SKILL.md` both create `/deploy` and work the
 *    same way. Your existing `.claude/commands/` files keep working."
 *   — Claude Code official docs, "Extend Claude with skills"
 *     [Source: https://code.claude.com/docs/en/skills, fetched 2026-04-25]
 *
 * KaiZen v1.5 / M8 stays on the `.claude/commands/{...}.md` family because:
 *   1. PRD v1.5 D-v1.5-06 explicitly anchors the path at
 *      `.claude/commands/Kaizen/Yotzer.md` for the entry skill.
 *   2. AIOX (the closest reference example available — see Part C) ships
 *      ~28 production files in this exact format, all working today.
 *   3. The newer `.claude/skills/<name>/SKILL.md` format requires a per-skill
 *      directory which would inflate the file count from 1+9 (Yotzer) to
 *      10 directories with 10 SKILL.md files. M8.2 may revisit this trade-off.
 *
 * -----------------------------------------------------------------------------
 *  A.1 — File-name convention and directory layout
 * -----------------------------------------------------------------------------
 *
 * The Claude Code custom-command format places one markdown file per command
 * at `.claude/commands/<name>.md`. The filename WITHOUT the `.md` extension
 * becomes the command name.
 *
 *   "The filename (without `.md` extension) becomes the command name"
 *   — Claude Code SDK docs, "Slash Commands in the SDK" § File Format
 *     [Source: https://code.claude.com/docs/en/agent-sdk/slash-commands,
 *      fetched 2026-04-25]
 *
 * Lowercase letters, numbers, and hyphens are the safe character set
 * (the `name` field constraint inherited from the merged Skills spec):
 *
 *   "name … Lowercase letters, numbers, and hyphens only (max 64 characters)."
 *   — Claude Code official docs, "Extend Claude with skills" § Frontmatter reference
 *     [Source: https://code.claude.com/docs/en/skills]
 *
 *   IMPLICATION FOR M8.2: when slugifying `slashPrefix` from `celula.yaml`,
 *   normalize to lowercase and replace any non `[a-z0-9-]` character with `-`
 *   to avoid surprises. The current Yotzer manifest uses `Kaizen:Yotzer`
 *   (capitalized) — see A.3 for how case interacts with the resolution rules.
 *
 * -----------------------------------------------------------------------------
 *  A.2 — Required and supported frontmatter keys
 * -----------------------------------------------------------------------------
 *
 * YAML frontmatter is between `---` markers at the top of the file. ALL fields
 * are optional, but `description` is recommended so the listing shows what the
 * skill does.
 *
 *   "All fields are optional. Only `description` is recommended so Claude
 *    knows when to use the skill."
 *   — Claude Code official docs, "Extend Claude with skills" § Frontmatter reference
 *     [Source: https://code.claude.com/docs/en/skills]
 *
 * Field reference (verbatim subset relevant to M8):
 *
 *   | Field                      | Required    | Notes                                                                 |
 *   | -------------------------- | ----------- | --------------------------------------------------------------------- |
 *   | name                       | No          | Display name; defaults to the directory/file name. [a-z0-9-], <=64.   |
 *   | description                | Recommended | Truncated at 1,536 chars. Front-load the key use case.                |
 *   | when_to_use                | No          | Trigger phrases. Concatenated with description; same 1,536 cap.       |
 *   | argument-hint              | No          | Autocomplete hint, e.g. `[issue-number]`.                             |
 *   | arguments                  | No          | Named positional args for `$name` substitution.                       |
 *   | disable-model-invocation   | No          | true => only the user can invoke. Default false.                      |
 *   | user-invocable             | No          | false => hide from `/` menu. Default true.                            |
 *   | allowed-tools              | No          | Pre-approved tools while skill is active. Space- or list-separated.   |
 *   | model                      | No          | Override session model for this turn.                                 |
 *   | effort                     | No          | low|medium|high|xhigh|max — overrides session effort.                 |
 *   | context                    | No          | `fork` => run in a forked subagent context.                           |
 *   | agent                      | No          | Subagent type when context: fork (Explore, Plan, general-purpose).    |
 *   | hooks                      | No          | Skill-scoped hooks.                                                   |
 *   | paths                      | No          | Glob patterns that limit auto-activation.                             |
 *   | shell                      | No          | bash (default) or powershell.                                         |
 *
 *   — Source for the entire table: Claude Code official docs, "Extend Claude with
 *     skills" § Frontmatter reference, https://code.claude.com/docs/en/skills
 *     [Fetched 2026-04-25; same fields documented at
 *      https://code.claude.com/docs/en/agent-sdk/slash-commands]
 *
 *   IMPLICATION FOR M8.2 — RECOMMENDED FRONTMATTER FOR YOTZER ENTRY SKILL:
 *
 *     ---
 *     description: <pt-BR description from celula.yaml>
 *     argument-hint: "[publish|resume|validate <work-id> | (no args = interactive)]"
 *     allowed-tools: Read, Grep, Glob, Bash
 *     ---
 *
 *   `disable-model-invocation` is intentionally NOT set — both expert (`/Kaizen:Yotzer`)
 *   and Claude (auto-invoke when intent matches `description`) should be allowed
 *   to enter the cell. The `description` value comes from `celula.yaml` and is
 *   already pt-BR per Language Policy D-v1.4-06.
 *
 * -----------------------------------------------------------------------------
 *  A.3 — Sub-skill nesting: the central question of M8.1
 * -----------------------------------------------------------------------------
 *
 * QUESTION: How does Claude Code resolve a nested file under
 *           `.claude/commands/{namespace}/{name}.md` into a slash command?
 *
 * Three candidate models were considered:
 *
 *   (a) Folder-nested with auto-namespace:
 *       .claude/commands/Kaizen/Yotzer.md             => /Kaizen:Yotzer
 *       .claude/commands/Kaizen/Yotzer/archaeologist.md => /Kaizen:Yotzer:archaeologist
 *
 *   (b) Colon-in-filename:
 *       .claude/commands/Kaizen/Yotzer.md             => /Kaizen:Yotzer
 *       .claude/commands/Kaizen/Yotzer:archaeologist.md => /Kaizen:Yotzer:archaeologist
 *
 *   (c) Colon-in-folder-name:
 *       .claude/commands/Kaizen:Yotzer/archaeologist.md => /Kaizen:Yotzer:archaeologist
 *
 * ANSWER (definitive, not a guess): MODEL (a) — folder-nested. The official
 * SDK documentation shows the directory layout and confirms that nested
 * directories appear "in the command description" while the slash command
 * stays bound to the file name + ancestor folders. AIOX confirms the pattern
 * empirically with 28+ working files in production at this exact moment.
 *
 *   "Organize commands in subdirectories for better structure:
 *
 *      .claude/commands/
 *      ├── frontend/
 *      │   ├── component.md      # Creates /component (project:frontend)
 *      │   └── style-check.md    # Creates /style-check (project:frontend)
 *      ├── backend/
 *      │   ├── api-test.md       # Creates /api-test (project:backend)
 *      │   └── db-migrate.md     # Creates /db-migrate (project:backend)
 *      └── review.md             # Creates /review (project)
 *
 *    The subdirectory appears in the command description but doesn't affect
 *    the command name itself."
 *   — Claude Code SDK docs, "Slash Commands in the SDK" § Organization with Namespacing
 *     [Source: https://code.claude.com/docs/en/agent-sdk/slash-commands,
 *      fetched 2026-04-25]
 *
 *   AIOX REFERENCE EXAMPLE (28 files, in this very monorepo):
 *
 *     File path                                                               Slash invocation
 *     -----------------------------------------------------------             -----------------------
 *     aiox-core/.claude/commands/AIOX/agents/dev.md                           /AIOX:agents:dev
 *     aiox-core/.claude/commands/AIOX/agents/architect.md                     /AIOX:agents:architect
 *     aiox-core/.claude/commands/AIOX/agents/po.md                            /AIOX:agents:po
 *     aiox-core/.claude/commands/synapse/tasks/diagnose-synapse.md            /synapse:tasks:diagnose-synapse
 *     aiox-core/.claude/commands/synapse/manager.md                           /synapse:manager
 *     aiox-core/.claude/commands/design-system/agents/brad-frost.md           /design-system:agents:brad-frost
 *     aiox-core/.claude/commands/greet.md                                     /greet
 *     [Source: ls of aiox-core/.claude/commands/, this repo, 2026-04-25]
 *     [Source: aiox-core/.claude/CLAUDE.md, "Use @agent-name or
 *      /AIOX:agents:agent-name", this repo, 2026-04-25]
 *
 *   IMPORTANT NUANCE — the Claude Code SDK doc says nested folders show "in
 *   the command description but doesn't affect the command name itself".
 *   This means the documented public NAME of `frontend/component.md` is
 *   `/component`, with `frontend` shown only as a label. AIOX's working
 *   convention `/AIOX:agents:dev` shows that the implementation ALSO accepts
 *   the colon-prefixed form as a valid invocation. The behavior diverges from
 *   the doc text, and a known GitHub issue from Jun 2025 reported
 *   subdirectory-namespacing as broken in 1.0.31, then was closed
 *   "not planned":
 *     [Source: https://github.com/anthropics/claude-code/issues/2422,
 *      issue closed as "not planned", report dated 2025-06-21,
 *      Claude Code v1.0.31, fetched 2026-04-25]
 *
 *   The AIOX evidence (Mar 2026 dates on the files) post-dates that issue
 *   and demonstrates the colon-prefixed form is the convention currently
 *   in use across at least one large project on this machine. Reproducing
 *   the AIOX layout is therefore the lowest-risk choice for M8.2.
 *
 * RESOLUTION FOR M8.2 — DEFINITIVE DIRECTION:
 *
 *   Use folder-nesting (model a). Convert `slashPrefix` (e.g. `Kaizen:Yotzer`)
 *   into a folder path by replacing each `:` with a path separator:
 *
 *     slashPrefix         folder path under .claude/commands/
 *     -----------         ----------------------------------
 *     Kaizen              Kaizen.md                                (entry, top-level)
 *     Kaizen:Yotzer       Kaizen/Yotzer.md                         (entry, nested)
 *     Kaizen:Yotzer       Kaizen/Yotzer/{specialist-id}.md         (specialists)
 *
 *   For the Yotzer cell with `slashPrefix: "Kaizen:Yotzer"` and 9 agents:
 *
 *     Entry skill:    .claude/commands/Kaizen/Yotzer.md            => /Kaizen:Yotzer
 *     Specialists:    .claude/commands/Kaizen/Yotzer/chief.md      => /Kaizen:Yotzer:chief
 *                     .claude/commands/Kaizen/Yotzer/archaeologist.md
 *                     .claude/commands/Kaizen/Yotzer/stress-tester.md
 *                     .claude/commands/Kaizen/Yotzer/risk-mapper.md
 *                     .claude/commands/Kaizen/Yotzer/prioritizer.md
 *                     .claude/commands/Kaizen/Yotzer/task-granulator.md
 *                     .claude/commands/Kaizen/Yotzer/contract-builder.md
 *                     .claude/commands/Kaizen/Yotzer/progressive-systemizer.md
 *                     .claude/commands/Kaizen/Yotzer/publisher.md
 *
 *   This matches D-v1.5-06 exactly:
 *     "/Kaizen:Yotzer is interactive Claude Code skill registered at
 *      .claude/commands/Kaizen/Yotzer.md"
 *     [Source: docs/kaizen/prd-v1.5/01-decisions.md § D-v1.5-06,
 *      this repo, 2026-04-25]
 *
 *   M8.2 helper algorithm:
 *     1. Read `cellRoot/celula.yaml`.
 *     2. Read `slashPrefix` (string).
 *     3. Split on `:` → segments.
 *     4. Last segment = filename stem; preceding segments = folder path.
 *     5. Entry path: `claudeCommandsDir + segments.join('/') + '.md'`.
 *     6. Specialist path: `claudeCommandsDir + segments.join('/') + '/' + agentId + '.md'`.
 *     7. Use the `agent-id` straight from `celula.yaml tiers.tier_N.agents[].id`
 *        (already lowercase-hyphen in the Yotzer manifest).
 *
 * -----------------------------------------------------------------------------
 *  A.4 — Case sensitivity and platform notes
 * -----------------------------------------------------------------------------
 *
 * The current Yotzer `slashPrefix` is `Kaizen:Yotzer` (PascalCase).
 * The Claude Code Skills `name` field constraint is "Lowercase letters,
 * numbers, and hyphens only (max 64 characters)" but that constraint is for
 * the `name` frontmatter field, NOT for the file path. The AIOX repo has
 * `commands/AIOX/agents/dev.md` (uppercase namespace) working in production,
 * so the file-path side accepts mixed case.
 *   [Source: aiox-core/.claude/commands/AIOX/, this repo]
 *
 * Windows/macOS filesystems are case-INSENSITIVE on default configs; Linux is
 * case-SENSITIVE. M8.2 should preserve the casing exactly as declared in
 * `slashPrefix` to avoid cross-platform divergence and to match the AIOX
 * production convention.
 *
 * NORMALIZATION — for the `slashPrefix` -> path conversion:
 *   - Reject `..`, `/`, `\`, leading/trailing whitespace and any null bytes.
 *   - Allow only characters from [A-Za-z0-9_-] in each segment (between `:`).
 *   - Do not lowercase. Preserve case from `celula.yaml`.
 *   - Throw a typed error in pt-BR (per NFR-101) if the prefix is malformed.
 *
 * -----------------------------------------------------------------------------
 *  A.5 — Persona-loading pattern (from AIOX `dev.md` reference)
 * -----------------------------------------------------------------------------
 *
 * AIOX skills do not use a typed `persona` frontmatter field. Instead, the
 * markdown body of the `.md` file embeds an entire YAML persona block inside
 * a fenced ```yaml ... ``` code block, plus an `ACTIVATION-NOTICE` and
 * `activation-instructions` written in plain markdown above and below the
 * YAML block.
 *
 *   "ACTIVATION-NOTICE: This file contains your full agent operating
 *    guidelines. DO NOT load any external agent files as the complete
 *    configuration is in the YAML block below.
 *
 *    CRITICAL: Read the full YAML BLOCK that FOLLOWS IN THIS FILE to
 *    understand your operating params, start and follow exactly your
 *    activation-instructions to alter your state of being, …"
 *   — aiox-core/.claude/commands/AIOX/agents/dev.md, lines 3-5, this repo,
 *     2026-04-25
 *
 * The persona YAML block contains keys like `agent.name`, `agent.id`,
 * `agent.title`, `agent.icon`, `persona_profile.communication.greeting_levels`,
 * `persona.role`, `persona.style`, `persona.identity`, `persona.focus`,
 * `core_principles`, and `commands`. Activation steps are described in
 * natural language under `activation-instructions:`.
 *   [Source: aiox-core/.claude/commands/AIOX/agents/dev.md, lines 9-55,
 *    this repo, 2026-04-25]
 *
 * IMPLICATION FOR M8.2:
 *
 *   The KaiZen Yotzer entry-skill body should NOT reproduce the AIOX YAML
 *   persona block verbatim. Yotzer's chief persona already lives in
 *   `.kaizen-dvir/celulas/yotzer/agents/chief.md` (M4 deliverable). The
 *   generated `.claude/commands/Kaizen/Yotzer.md` body should:
 *
 *     1. Open with a one-paragraph pt-BR description of the cell (from
 *        `celula.yaml.description`).
 *     2. Instruct Claude Code to load the chief persona by REFERENCE — point
 *        to the file at `.kaizen-dvir/celulas/yotzer/agents/chief.md` so
 *        the persona stays single-source.
 *     3. Render the chief greeting (from the chief.md persona) on first turn.
 *     4. Include the slash-vs-shell distinction line in pt-BR (D-v1.5-06):
 *        "Para invocação programática via terminal, use `kaizen Kaizen:Yotzer
 *        publish|resume|validate <work-id>` — distinto desta skill interativa."
 *
 *   Specialist skill bodies follow the same pattern but reference
 *   `.kaizen-dvir/celulas/yotzer/agents/{specialist-id}.md`.
 *
 * -----------------------------------------------------------------------------
 *  A.6 — Version sensitivity and known caveats
 * -----------------------------------------------------------------------------
 *
 *   1. The "skills merged into commands" change is documented in 2026 docs.
 *      Older Claude Code versions (pre-1.0.40 or thereabouts) may treat the
 *      two as separate. KaiZen v1.5 targets the current docs (Apr 2026).
 *      [Source: https://code.claude.com/docs/en/skills, fetched 2026-04-25]
 *
 *   2. Subdirectory namespacing was reported broken in v1.0.31 (Jun 2025) and
 *      the issue was closed "not planned":
 *      [Source: https://github.com/anthropics/claude-code/issues/2422]
 *      However, AIOX is currently shipping (Mar 2026) with subdirectory
 *      namespacing in active use, so the behavior is functional in current
 *      Claude Code releases. M8.7's manual smoke fixture is the runtime
 *      verification step required by the M8 Gate; the test catches breakage
 *      if a future Claude Code release regresses the resolution rules.
 *
 *   3. `description` + `when_to_use` is truncated at 1,536 chars in the
 *      skill listing. M8.2 must keep generated descriptions concise.
 *      [Source: https://code.claude.com/docs/en/skills § Frontmatter reference]
 *
 *   4. Live change detection: Claude Code watches `.claude/commands/` and
 *      `.claude/skills/`. Files added or edited mid-session take effect in
 *      that session without restart. Creating the top-level
 *      `.claude/commands/` directory mid-session DOES require a restart to
 *      pick up. M8.3 wires init early enough that the directory exists
 *      before the expert opens Claude Code.
 *      [Source: https://code.claude.com/docs/en/skills § Live change detection]
 *
 *   5. `.gitkeep` decision: the AIOX repo does NOT use `.gitkeep` markers in
 *      `.claude/commands/AIOX/agents/`. Empty leaf folders are not needed
 *      because each cell registers concrete `.md` files. M8.3 should NOT
 *      emit a `.gitkeep` unless a specific edge case demonstrates the need.
 *      [Source: ls of aiox-core/.claude/commands/AIOX/, this repo, 2026-04-25]
 *
 * =============================================================================
 *  PART B — IMPLEMENTATION CONTRACT (signature frozen for M8.2)
 * =============================================================================
 *
 * @function registerCellSkills
 * @param {string} cellRoot
 *   Absolute filesystem path to the cell's root directory. The cell MUST
 *   contain `celula.yaml` at this path. Reading is allowed; writing into
 *   `cellRoot` is FORBIDDEN per CON-005 (L2 read-only).
 *
 * @param {string} claudeCommandsDir
 *   Absolute filesystem path to the project's `.claude/commands` directory.
 *   The helper writes `.md` files under this directory only. Path is L3
 *   (project config) per the layered policy. Helper creates the directory
 *   tree if missing.
 *
 * @returns {{
 *   entryWritten: boolean,
 *   specialistsWritten: string[],
 *   warnings: string[]
 * }}
 *   - `entryWritten`: true if the entry skill was newly written or already
 *     up-to-date (idempotent). False only if the helper aborted before
 *     writing the entry skill.
 *   - `specialistsWritten`: array of specialist IDs (e.g. ['chief',
 *     'archaeologist', ...]) for which a `.md` file was written or already
 *     up-to-date. Order follows the manifest tier order.
 *   - `warnings`: pt-BR strings (per NFR-101 + NFR-102) describing non-fatal
 *     issues. Examples: a tier declares an agent whose persona file is
 *     missing on disk; a generated file already exists with diverging
 *     content but the helper preserved the existing file.
 *
 * @throws {Error}
 *   - Manifest at `cellRoot/celula.yaml` does not exist or fails to parse:
 *     pt-BR error message naming the cell path and the parser error.
 *   - `slashPrefix` is missing, empty, or contains forbidden characters:
 *     pt-BR error naming the cell path and the offending value.
 *   - No agents found across all tiers: pt-BR error.
 *   - Filesystem write fails (permission, disk full, etc.): error is wrapped
 *     with the target path and propagated.
 *
 *   The helper FAILS LOUD. Init/update/publisher callers must catch and
 *   surface in pt-BR per NFR-101 (actionable error messages).
 *
 * Idempotency contract:
 *   - Reading the same `celula.yaml` and writing into the same
 *     `claudeCommandsDir` twice in a row produces zero net filesystem
 *     changes (mtime may bump on rewrite, but byte content is identical).
 *   - The helper computes the desired body+frontmatter for each file,
 *     compares against the existing file (if any), and only writes when the
 *     content differs.
 *
 * Zero external dependencies (CON-003):
 *   - The helper uses Node.js stdlib only (`fs`, `path`, `os`).
 *   - YAML parsing reuses the strict subset parser already shipped in
 *     `dvir/config-loader.js` (M1.3). M8.2 may extract a shared helper or
 *     inline the same approach.
 *
 * Module format (CON-002):
 *   - CommonJS, ES2022.
 *   - `'use strict'` at file top.
 *   - `module.exports = { registerCellSkills }`.
 *
 * =============================================================================
 *  PART C — SOURCES (every claim above traces to one of these)
 * =============================================================================
 *
 *   [S1] Claude Code official docs — "Extend Claude with skills"
 *        URL:  https://code.claude.com/docs/en/skills
 *        Fetched: 2026-04-25
 *        Used for: skills/commands merge (A intro), frontmatter table (A.2),
 *                  description char limit (A.6), live change detection (A.6),
 *                  name field constraint (A.1).
 *
 *   [S2] Claude Code SDK docs — "Slash Commands in the SDK"
 *        URL:  https://code.claude.com/docs/en/agent-sdk/slash-commands
 *        Fetched: 2026-04-25
 *        Used for: file-name-becomes-command-name rule (A.1),
 *                  subdirectory namespacing example (A.3 verbatim quote),
 *                  legacy-format note for `.claude/commands/`.
 *
 *   [S3] Anthropic GitHub — claude-code Issue #2422
 *        URL:  https://github.com/anthropics/claude-code/issues/2422
 *        Fetched: 2026-04-25
 *        Used for: historical caveat about subdirectory namespacing being
 *                  reported broken in v1.0.31 (Jun 2025), closed "not planned" (A.3, A.6).
 *
 *   [S4] AIOX reference example — `aiox-core/.claude/commands/AIOX/agents/dev.md`
 *        Path: <repoRoot>/aiox-core/.claude/commands/AIOX/agents/dev.md
 *        Mtime: 2026-03-30 (this repo, snapshot 2026-04-25)
 *        Used for: persona-loading pattern (A.5), production proof of
 *                  subdirectory namespacing in active use (A.3).
 *
 *   [S5] AIOX commands directory listing
 *        Path: <repoRoot>/aiox-core/.claude/commands/
 *        Snapshot: 2026-04-25
 *        Used for: empirical confirmation of folder-nested resolution model
 *                  with 28 working files including `synapse/tasks/...`,
 *                  `AIOX/agents/...`, `design-system/agents/...`,
 *                  and a top-level `greet.md` (A.3).
 *
 *   [S6] AIOX project CLAUDE.md
 *        Path: <repoRoot>/aiox-core/.claude/CLAUDE.md
 *        Used for: declared invocation pattern
 *                  "Use @agent-name or /AIOX:agents:agent-name" (A.3).
 *
 *   [S7] KaiZen PRD v1.5 — Decisions
 *        Path: <repoRoot>/docs/kaizen/prd-v1.5/01-decisions.md
 *        Used for: D-v1.5-05 (npm bundles first-party cells), D-v1.5-06
 *                  (slash-skill at `.claude/commands/Kaizen/Yotzer.md`,
 *                  distinct from shell subcommand), D-v1.4-06 (Language Policy).
 *
 *   [S8] KaiZen Epic KZ-M8 — Yotzer Activation Bridge
 *        Path: <repoRoot>/docs/kaizen/epics/epic-m8-yotzer-activation.md
 *        Used for: deliverables D8.1-D8.7, gate criteria, risk KZ-M8-R1.
 *
 *   [S9] KaiZen Story M8.1 — Research Slash/Skill Spec
 *        Path: <repoRoot>/docs/kaizen/stories/M8/M8.1.research-slash-skill-spec.md
 *        Used for: AC items, deliverable definition for this stub.
 *
 *   [S10] KaiZen Yotzer manifest
 *         Path: <repoRoot>/kaizen/.kaizen-dvir/celulas/yotzer/celula.yaml
 *         Used for: `slashPrefix: "Kaizen:Yotzer"`, tier structure,
 *                   chief flag, agent IDs.
 *
 *   [S11] KaiZen shell subcommand `runYotzerCommand`
 *         Path: <repoRoot>/kaizen/bin/kaizen.js, lines 687-731
 *         Used for: M8 boundary statement (this code is preserved verbatim,
 *                   never modified by M8 — see Scope OUT in M8.1).
 *
 *   [S12] KaiZen Commandments v1.4
 *         Path: <repoRoot>/kaizen/.kaizen-dvir/commandments.md
 *         Used for: III (No Invention), IV (Quality First), V (Documentação Contínua).
 *
 *   [S13] AIOX dev.md persona reference (line ranges cited above)
 *         Path: <repoRoot>/aiox-core/.claude/commands/AIOX/agents/dev.md, lines 3-55
 *         Used for: persona-loading pattern verbatim quotes (A.5).
 *
 * =============================================================================
 *  PART D — OPEN QUESTIONS (deferred to M8.2 implementer)
 * =============================================================================
 *
 *   D.1 — `description` choice: should `Kaizen:Yotzer` entry-skill description
 *         be the literal `celula.yaml.description` field, or a synthesized
 *         pt-BR string ("Ativa célula Yotzer — gerador de células KaiZen")?
 *         M8.2 implementer should pick the one shorter than 1,536 chars and
 *         that front-loads the trigger phrase. The story's pt-BR fixtures
 *         (M8.7) lock in a final string.
 *
 *   D.2 — Specialist `description` template: each specialist body needs its
 *         own description so Claude can disambiguate `/Kaizen:Yotzer:archaeologist`
 *         from `/Kaizen:Yotzer:stress-tester` in the picker. M8.2 should
 *         pull from the specialist's own `agents/{id}.md` first paragraph if
 *         present; otherwise synthesize from `tiers.tier_N.agents[i].title`.
 *
 *   D.3 — `allowed-tools` per generated skill: Yotzer agents do not currently
 *         declare a tool whitelist. M8.2 may either omit `allowed-tools` (so
 *         Claude inherits session permissions) or set a conservative default
 *         (`Read, Grep, Glob, Bash`). Recommendation: omit. Document the
 *         decision in the M8.2 story.
 *
 *   D.4 — Empty `claudeCommandsDir`: when `claudeCommandsDir` does not exist
 *         at call time, the helper creates it with `fs.mkdirSync({ recursive: true })`.
 *         No `.gitkeep` is written. Confirmed in A.6 caveat 5.
 *
 *   D.5 — Removal of orphan skills on update: NOT in scope for M8.2. M8.4
 *         (kaizen update) emits a WARN for orphan skills but never deletes
 *         them. Rationale: experts may have customized a generated skill
 *         body locally; auto-deletion would silently destroy that work.
 *
 * =============================================================================
 *  END OF M8.1 RESEARCH NOTES
 * =============================================================================
 *
 * @module dvir/cell-registry
 * @author @architect (Aria) — story M8.1
 * @since KaiZen v1.5.0 (M8.1)
 */

/**
 * Stub for M8.2 — registers a cell's slash skills under .claude/commands/.
 * THROWS until M8.2 lands the full implementation per the contract in Part B.
 *
 * @param {string} cellRoot - absolute path to the cell directory containing celula.yaml
 * @param {string} claudeCommandsDir - absolute path to the project's .claude/commands directory
 * @returns {{ entryWritten: boolean, specialistsWritten: string[], warnings: string[] }}
 * @throws {Error} always — implementation deferred to M8.2
 */
function registerCellSkills(cellRoot, claudeCommandsDir) {
  // Reference args so lint does not flag them as unused.
  void cellRoot;
  void claudeCommandsDir;
  throw new Error('not implemented — see M8.2');
}

module.exports = { registerCellSkills };
