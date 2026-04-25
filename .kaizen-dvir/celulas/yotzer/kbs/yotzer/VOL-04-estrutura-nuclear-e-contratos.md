# VOL-04 — Estrutura Nuclear e Contratos (Fase 3 da construção)

> **KB:** KaiZen | **Consumer:** Moreh
> **Domínio:** D4 — Estrutura Nuclear e Contratos
> **Fontes primárias:** `loc-05-squad-creator/schemas/squad-schema`, `loc-05-squad-creator/schemas/squad-design-schema`, `loc-05-squad-creator/tasks/squad-creator-create`, `loc-04-squad-forge/tasks/assemble-squad`, `loc-04-squad-forge/checklists/nuclear-structure-validation`
> **Regras cardinais principais:** RC-03, RC-06, **RC-16** (schema feedback loop)

---

## 1. O Que Este Volume Ensina

Após a arquitetura (VOL-03), Moreh tem blueprint. Agora precisa **gerar artefatos AIOS** que passem em validação automatizada.

Moreh aprende aqui:

1. **squad.yaml** — manifest obrigatório (AIOX + Auroq convergem)
2. **TASK-FORMAT-SPECIFICATION-V1** — 8 campos que toda task tem
3. **Agent format** — frontmatter + seções obrigatórias
4. **JSON Schema validation** — squad-schema.json + AJV
5. **Schema feedback loop (RC-16)** — erros voltam pro LLM, max 3 retries
6. **3 templates** — basic, etl, agent-only
7. **Directory task-first** — estrutura de diretórios inegociável
8. **squad-validator.js** — motor de validação reaproveitável
9. **Config inheritance** — extend/override/none
10. **Tooling** — loaders, validators, generators, analyzers

---

## 2. squad.yaml — Manifest

O coração do squad. **NUNCA** usar `config.yaml` (deprecated). Sempre `squad.yaml`.

### 2.1 Campos obrigatórios

```yaml
name: "squad-name"        # kebab-case, 2-50 chars
version: "1.0.0"          # semver X.Y.Z
```

Sem esses dois, squad-validator.js retorna FAIL imediato.

### 2.2 Estrutura completa (AIOX schema)

```yaml
name: squad-name
version: "1.0.0"
short-title: "Squad Title"           # max 100 chars
description: "..."                   # max 500 chars
author: "Autor"
license: MIT                         # MIT | Apache-2.0 | ISC | GPL-3.0 | UNLICENSED
slashPrefix: "squad"                 # kebab-case, pra /squad-comando

aiox:
  minVersion: "2.1.0"
  type: squad

requires:
  node: ">=18.0.0"
  aiox: ">=2.0.0"

tags:
  - tag1
  - tag2

components:                          # Task-first: tasks são primárias
  tasks:
    - task-1.md
    - task-2.md
  agents:
    - agent-1.md
  workflows:
    - wf-name.yaml
  checklists:
    - checklist-1.md
  templates:
    - template-1.md
  tools:
    - tool-1.js
  scripts:
    - script-1.js

config:
  extends: extend                    # extend | override | none
  coding-standards: config/coding-standards.md
  tech-stack: config/tech-stack.md
  source-tree: config/source-tree.md

dependencies:
  node: []                           # npm packages
  python: []                         # pip packages
  squads: []                         # other squads this depends on

mcps: {}                             # MCP server configs
integration: {}                      # Integration configs
```

### 2.3 Estrutura Auroq (variante)

Mesma estrutura base + campos específicos:

```yaml
title: "Squad Title"
pattern_prefix: "PF"                 # 2-3 letras pra IDs
target_user: "Quem usa"

tiers:                               # Hierarquia explícita
  orchestrator:
    - chief-agent
  tier_1:
    - agent-2
    - agent-3

pipeline:
  estimated_time: "2-12 horas"
  resumable: true
  state_file: ".state.json"
  phases:
    - phase: 0
      name: "Setup"
      task: start
      agent: chief
      blocking: false
      duration: "3-5min"

quality_gates:
  - id: "QG-{PREFIX}-01"
    name: "Gate Name"
    phase: 1
    transition: "X -> Y"
    blocking: true
    criteria: "..."
    veto: "..."

output:
  base_path: "agents/{slug}/"
  directories:
    - "01-extraction/"
    - "02-process-map/"
```

### 2.4 Validação por regex

Schema enforce:

| Campo | Regex |
|-------|-------|
| `name` | `^[a-z0-9-]+$` (kebab-case) |
| `version` | `^\d+\.\d+\.\d+$` (semver) |
| `slashPrefix` | `^[a-z0-9-]+$` |

**Moreh deve validar antes de gerar.** Se cliente der nome "My Squad", converter pra `my-squad`.

---

## 3. TASK-FORMAT-SPECIFICATION-V1

**8 campos obrigatórios** em toda task gerada. Sem exceção.

### 3.1 Estrutura obrigatória

```yaml
---
task: "Nome da Task"                          # Nome descritivo
responsavel: "@agent-id"                      # Quem executa
responsavel_type: "agent|human|hybrid|worker" # Tipo de executor
atomic_layer: "task"                          # Sempre "task"
Entrada: |
  {Inputs detalhados — do PU-INPUT}
Saida: |
  {Outputs detalhados — do PU-OUTPUT}
Checklist:
  - "{critério 1 — de PU-QUALITY_GATE}"
  - "{critério 2}"
execution_type: "deterministic|semantic|interactive"
---

# Task: {Nome}

## Executive Summary
{O que esta task faz}

## Steps

### Step 1: {Nome}
{Derivado de PU-STEP}

### Step 2: {Nome}
...

## Error Handling
{Derivado de PU-EXCEPTIONs}
```

### 3.2 Mapeamento execution_type

| execution_type | responsavel_type | Caso |
|---------------|-----------------|------|
| **deterministic** | worker | Input fixo → output fixo. Sem IA. Ex: enviar email quando pagamento confirmado |
| **semantic** | agent | Requer capacidade generativa (escrita, análise). Ex: gerar copy |
| **interactive** | human ou hybrid | Requer humano no loop. Ex: aprovação, revisão |

### 3.3 Task `start.md` especial

Toda squad tem task `start.md` como entry point:

```yaml
---
task: "Start"
responsavel: "@{chief-agent-id}"
responsavel_type: "agent"
atomic_layer: "task"
Entrada: "Ativação do squad pelo usuário"
Saida: "Squad ativo, greeting exibido, pronto pra operar"
Checklist:
  - "Chief ativo"
  - "Greeting exibido"
  - "Primeiro comando executado"
execution_type: "interactive"
---

# Task: Start — Entry Point do Squad

...
```

### 3.4 Regras

- **Entrada** e **Saída** podem ser multi-linha (pipe |)
- **Checklist** tem ≥1 item
- **responsavel** sempre com `@` prefix
- **atomic_layer** sempre `"task"` (não inventar outros valores)
- Nome do arquivo = kebab-case do task name

---

## 4. Agent Format

Cada agente é arquivo `.md` em `agents/`.

### 4.1 Opções de frontmatter

**Opção 1 — Frontmatter YAML:**

```yaml
---
name: agent-id
description: Brief description
version: 1.0.0
---

# Agent: {Name}
...
```

**Opção 2 — Heading markdown com ID:**

```markdown
# Agent: agent-id

**ID:** agent-id
**Tier:** Orchestrator | Tier 1 | Tier 2
**Version:** 1.0.0
```

Ambos válidos. Auroq prefere opção 2, AIOX prefere opção 1.

### 4.2 Seções obrigatórias

```markdown
## IDENTIDADE
### Propósito
### Domínio de Expertise
### Personalidade (Voice DNA)
### Estilo de Comunicação

## RESPONSABILIDADES CORE
### {Responsabilidade 1}
### {Responsabilidade 2}

## OUTPUT EXAMPLES (mínimo 3)
### Exemplo 1: {happy path}
### Exemplo 2: {decisão}
### Exemplo 3: {exceção}

## IMMUNE SYSTEM
| Trigger | Resposta Automática |
|---------|-------------------|
| ... | ... |

## COMMANDS
| Comando | Descrição |
|---------|-----------|
| `*help` | Mostrar comandos |

## STRICT RULES
### NUNCA:
### SEMPRE:
```

### 4.3 Seções opcionais por tier

| Seção | Tier 1 | Orchestrator | Tier 2 |
|-------|--------|--------------|--------|
| HANDOFF PROTOCOL | ✅ | ✅ | Raro |
| ERROR HANDLING | ✅ | ✅ | ✅ |
| VERSION HISTORY | ✅ | ✅ | ✅ |
| INTEGRATION | ✅ | ✅ | ✅ |
| COORDENAÇÃO DE PROJETOS | Opcional | ✅ | Não |

### 4.4 Regras [RC-11]

- **Mínimo 3 output examples** (happy path + decisão + exceção)
- **Mínimo 3 immune system triggers**
- Todos extraídos do processo real (não inventados) [RC-02]
- Nome do arquivo = kebab-case

---

## 5. JSON Schema Validation

AIOX tem `squad-schema.json` (JSON Schema draft-07) que valida squad.yaml estruturalmente.

### 5.1 O que o schema valida

**Required fields:**
- `name` (kebab-case, 2-50 chars)
- `version` (semver)

**Pattern validation:**
- `name` → `^[a-z0-9-]+$`
- `version` → `^\d+\.\d+\.\d+$`
- `slashPrefix` → `^[a-z0-9-]+$`

**Enum validation:**
- `license` → [MIT, Apache-2.0, ISC, GPL-3.0, UNLICENSED]
- `aiox.type` → ["squad"]
- `config.extends` → [extend, override, none]

**Structural validation:**
- `components` é object com arrays
- `dependencies` é object com node/python/squads
- `requires` tem node/aiox version strings

### 5.2 Uso via AJV (JavaScript)

```javascript
const Ajv = require('ajv');
const schema = require('./squad-schema.json');
const ajv = new Ajv();
const validate = ajv.compile(schema);

const manifest = loadYaml('squad.yaml');
const valid = validate(manifest);

if (!valid) {
  console.error(validate.errors);
}
```

### 5.3 squad-design-schema.json

Schema separado para **blueprints gerados por `*design-squad`**:

```yaml
squad:
  name: squad-name
  domain: domain-name
analysis:
  entities: []
  workflows: []
  integrations: []
  stakeholders: []
recommendations:
  agents:
    - id: agent-id
      role: "..."
      confidence: 0.92
  tasks:
    - name: task-name
      agent: agent-id
      entrada: []
      saida: []
      confidence: 0.88
  template: basic | etl | agent-only | custom
  config_mode: extend | override | none
metadata:
  created_at: "ISO 8601"
  overall_confidence: 0.87
```

Moreh pode usar esse schema quando gera blueprints (fase intermediária antes de criar squad completo).

---

## 6. Schema Feedback Loop — RC-16

**Insight #5 (LangChain + AIOX):** schemas sozinhos não bastam. **Erros voltam pro LLM como input** pra correção. Max 3 iterações antes de escalar.

### 6.1 Por que é KaiZen-level rule

Validação estrutural estática é insuficiente. LLMs cometem erros de schema repetidamente — sem loop de correção, output malformado chega em produção. Com loop, squad gerado tem qualidade estrutural garantida.

### 6.2 Self-healing loop

```
Tentativa 1: Rodar validator
  → Se PASS: prosseguir
  → Se ERRORS: ler erros, corrigir artefatos

Tentativa 2: Re-rodar validator
  → Se PASS: prosseguir
  → Se ERRORS: corrigir novamente

Tentativa 3: Re-rodar validator
  → Se PASS: prosseguir
  → Se ERRORS: HALT — reportar ao Chief com lista de erros irresolvidos
```

### 6.3 Regras

- **ERRORS são BLOQUEANTES** — não avança até resolver
- **WARNINGS são non-blocking** — logar no report, não bloquear
- **Max 3 tentativas** de self-healing antes de escalar
- Erro formatado pro LLM = mensagem + path + suggestion + fix anterior falhado (se houver)

### 6.4 Formato do erro pro LLM

```yaml
validation_error:
  code: "SCHEMA_ERROR"
  path: "squad.yaml#/name"
  message: "String 'My Squad' does not match pattern '^[a-z0-9-]+$'"
  current_value: "My Squad"
  suggestion: "Convert to kebab-case: 'my-squad'"
  previous_attempts: []
```

LLM recebe isso, gera fix, re-validator. Se passa, segue. Se falha, nova iteração.

---

## 7. Três Templates

AIOX oferece 3 templates base pro `*create-squad`:

### 7.1 basic

```
./squads/my-squad/
├── squad.yaml              # Minimal manifest
├── README.md
├── config/
│   ├── coding-standards.md
│   ├── tech-stack.md
│   └── source-tree.md
├── agents/
│   └── example-agent.md
├── tasks/
│   └── example-agent-task.md
├── checklists/
│   └── .gitkeep
├── workflows/
│   └── .gitkeep
├── templates/
│   └── .gitkeep
├── tools/
│   └── .gitkeep
├── scripts/
│   └── .gitkeep
└── data/
    └── .gitkeep
```

**Quando usar:** squad simples, 1 agente, 1-2 tasks.

### 7.2 etl

```
./squads/my-etl-squad/
├── squad.yaml
├── agents/
│   ├── extractor.md
│   └── transformer.md
├── tasks/
│   ├── extract.md
│   ├── transform.md
│   └── load.md
├── workflows/
│   └── wf-etl.yaml
├── scripts/
│   └── pipeline.js
└── data/
    └── schemas/
```

**Quando usar:** processamento de dados, ETL-maker style (como ETLmaker do Auroq).

### 7.3 agent-only

```
./squads/my-agent-squad/
├── squad.yaml              # Components só com agents
├── agents/
│   ├── agent-1.md
│   └── agent-2.md
└── README.md
```

**Quando usar:** consultores/minds, sem pipeline estruturado.

### 7.4 custom

Moreh pode gerar template custom quando processo do expert não encaixa. Mas cada custom = precedente. Documentar.

---

## 8. Directory Structure — Task-First

Estrutura **inegociável** [RC-03]. Task-first architecture.

### 8.1 Diretórios obrigatórios

```
./squads/{squad-name}/
├── squad.yaml              # OBRIGATÓRIO
├── README.md               # OBRIGATÓRIO
├── agents/                 # OBRIGATÓRIO (>=1 agente)
├── tasks/                  # OBRIGATÓRIO (>=1 task)
```

### 8.2 Diretórios opcionais

```
├── workflows/              # Se tem workflow formal
├── checklists/             # Se tem QGs
├── templates/              # Se tem output templates
├── tools/                  # Se usa scripts custom
├── scripts/                # Se usa scripts utilitários
├── data/                   # Se tem KB ou schemas
├── config/                 # Se extende/override core config
```

### 8.3 Convenções de nomenclatura

| Tipo | Convenção |
|------|-----------|
| Arquivos .md (tasks/agents) | kebab-case (ex: `create-oferta.md`) |
| Arquivos .yaml | kebab-case |
| Nome do squad | kebab-case (squad.yaml `name`) |
| `slashPrefix` | kebab-case (pra `/comando`) |
| IDs internos | kebab-case |

### 8.4 Config inheritance

```yaml
config:
  extends: extend | override | none
```

| Modo | Efeito |
|------|--------|
| **extend** | Adiciona rules do squad às rules do core | Use quando squad ENRIQUECE o framework |
| **override** | Substitui rules do core pelas do squad | Use quando squad tem padrão próprio divergente |
| **none** | Ignora config do core | Use quando squad é standalone |

**SQS-10 (Project Config Reference):** quando projeto tem `docs/framework/`, squad referencia em vez de copiar:

```yaml
config:
  extends: extend
  coding-standards: ../../docs/framework/CODING-STANDARDS.md   # reference
  # OU:
  coding-standards: config/coding-standards.md                  # local copy
```

---

## 9. squad-validator.js

Motor de validação central (855 linhas, 94.5% coverage). **Reuso direto** pelo Moreh.

### 9.1 O que valida

| Check | Descrição |
|-------|-----------|
| **Manifest** | squad.yaml contra JSON Schema (name, version, tiers, tasks, workflows) |
| **Estrutura** | Diretórios obrigatórios (agents/, tasks/) |
| **Tasks** | Cada .md tem TASK-FORMAT-SPEC-V1 (8 campos no frontmatter) |
| **Agents** | Cada .md tem frontmatter ou heading com ID |
| **Workflows** | YAML válido com sequence, references cruzadas |
| **Integridade** | Tudo que squad.yaml referencia existe no filesystem |
| **Config references** | Paths em squad.yaml resolvem corretamente (local + project-level) |

### 9.2 Como rodar

```bash
# Auroq path
node .auroq-core/development/scripts/squad/squad-validator.js minds/{slug}/04-squad/

# AIOX path
node .aiox-core/development/scripts/squad/squad-validator.js ./squads/{name}/
```

### 9.3 Resultado

```
Validating squad: ./squads/my-squad/

Errors: 0
Warnings: 2
  - [MISSING_DIRECTORY]: Expected directory not found: workflows/
    Suggestion: mkdir workflows (task-first recommends tasks/ and agents/)
  - [TASK_MISSING_FIELD] (my-task.md): Task missing recommended field: Checklist
    Suggestion: Add "Checklist:" to my-task.md

Result: VALID (with warnings)
```

### 9.4 Error codes

| Code | Severidade | Descrição |
|------|-----------|-----------|
| `MANIFEST_NOT_FOUND` | Error | Sem squad.yaml nem config.yaml |
| `YAML_PARSE_ERROR` | Error | YAML inválido |
| `SCHEMA_ERROR` | Error | Não bate JSON Schema |
| `FILE_NOT_FOUND` | Error | Arquivo referenciado não existe |
| `DEPRECATED_MANIFEST` | Warning | Usando config.yaml |
| `MISSING_DIRECTORY` | Warning | Dir esperado faltando |
| `NO_TASKS` | Warning | Sem tasks em tasks/ |
| `TASK_MISSING_FIELD` | Warning | Task sem campo recomendado |
| `AGENT_INVALID_FORMAT` | Warning | Agent pode não seguir formato |
| `INVALID_NAMING` | Warning | Filename não é kebab-case |

### 9.5 Integração com self-healing

Moreh integra validator com loop (RC-16):

```
1. Gerar squad (assemble-squad Step 2-7)
2. Rodar validator (Step 8)
3. Se ERRORS > 0:
   - Ler cada erro
   - Gerar fix (LLM recebe erro estruturado)
   - Aplicar fix
   - Re-rodar validator
4. Máximo 3 tentativas
5. Se ainda ERROR: HALT + reportar ao expert
6. WARNINGS: logar, não bloquear
```

---

## 10. squad-analyzer.js (Opcional, Recomendado)

Gera métricas de cobertura e sugestões de melhoria.

```bash
node .aiox-core/development/scripts/squad/squad-analyzer.js ./squads/{name}/
```

### 10.1 Output

```
=== Squad Analysis: my-squad ===

Overview
  Name: my-squad
  Version: 1.0.0
  Author: Expert Name
  License: MIT
  AIOX Min Version: 2.1.0

Components
  Agents (3)
    chief.md
    researcher.md
    copywriter.md
  Tasks (7)
    start.md
    research.md
    ...
  Workflows (1)
  Checklists (2)
  Templates (0) [empty]
  Tools (0) [empty]

Coverage
  Agents: █████████░ 90% (3/3 with tasks)
  Tasks: ████████░░ 85% (6/7 valid format)
  Config: ██████░░░░ 60% (has readme, missing tech-stack)
  Docs: ████░░░░░░ 40% (needs more examples)

Suggestions
  1. [high] Add tasks for copywriter (currently has only 1)
  2. [medium] Create workflows for common sequences
  3. [low] Add checklists for validation

Next: *extend-squad my-squad
```

### 10.2 Uso pelo Moreh

Após `assemble-squad` (Fase 4), rodar analyzer. Se cobertura <70%, revisar.

---

## 11. squad-loader.js

Utilitário pra carregar squads.

### 11.1 API

```javascript
const { SquadLoader } = require('./.aiox-core/development/scripts/squad');

const loader = new SquadLoader({
  squadsPath: './squads',
  verbose: false
});

// Resolver squad por nome
const { path, manifestPath } = await loader.resolve('my-squad');

// Carregar manifest
const manifest = await loader.loadManifest('./squads/my-squad');

// Listar squads locais
const squads = await loader.listLocal();
```

### 11.2 Error handling

```javascript
try {
  await loader.resolve('non-existent');
} catch (error) {
  if (error instanceof SquadLoaderError) {
    console.error(`[${error.code}]: ${error.message}`);
    console.log(`Suggestion: ${error.suggestion}`);
  }
}
```

| Code | Suggestion |
|------|-----------|
| `SQUAD_NOT_FOUND` | Create squad with `*create-squad {name}` |
| `MANIFEST_NOT_FOUND` | Create squad.yaml in squad directory |
| `YAML_PARSE_ERROR` | Check YAML syntax with linter |
| `PERMISSION_DENIED` | `chmod 644 {path}` |

---

## 12. Squad Migration

Quando squad existe em formato legado (config.yaml, sem aiox.type, etc.), usar `*migrate-squad`:

```bash
# Preview (não modifica)
*migrate-squad ./squads/legacy --dry-run

# Migrar (com backup automático em .backup/)
*migrate-squad ./squads/legacy
```

### 12.1 O que detecta e corrige

| Pattern legacy | Ação automática |
|----------------|-----------------|
| `config.yaml` | Rename → `squad.yaml` |
| Flat structure sem tasks/, agents/ | Criar dirs |
| Missing `aiox.type` | Adicionar `aiox.type: squad` |
| Missing `aiox.minVersion` | Adicionar `aiox.minVersion: 2.1.0` |
| Missing `name` | Inferir do diretório |
| Missing `version` | Adicionar `1.0.0` |

### 12.2 Fluxo

```
1. Analyze → detectar issues
2. Confirm (se não --dry-run) → user aprovação
3. Backup → copiar tudo pra .backup/pre-migration-{timestamp}/
4. Execute → aplicar actions
5. Validate → rodar squad-validator
6. Report → summary
```

### 12.3 Rollback

```bash
# Listar backups
ls ./squads/my-squad/.backup/

# Restaurar
rm -rf ./squads/my-squad/squad.yaml ./squads/my-squad/tasks ./squads/my-squad/agents
cp -r ./squads/my-squad/.backup/pre-migration-{timestamp}/. ./squads/my-squad/
```

---

## 13. QG-SF-004 — Nuclear Structure

Gate bloqueante da Fase 3 (Montagem).

### 13.1 Método primário

`squad-validator.js` PASS (0 errors).

### 13.2 Checklist manual (fallback se script indisponível)

**Manifest:**
- [ ] `squad.yaml` existe (NÃO `config.yaml`)
- [ ] `name` presente e kebab-case
- [ ] `version` presente e semver (X.Y.Z)
- [ ] `description` presente
- [ ] `tiers` com ≥1 agente
- [ ] `tasks` com ≥1 task
- [ ] Todos os arquivos referenciados existem

**Diretórios:**
- [ ] `agents/` com ≥1 `.md`
- [ ] `tasks/` com ≥1 `.md`
- [ ] `workflows/` (se definido no config)

**Tasks (TASK-FORMAT-SPEC-V1):**
- [ ] Campo `task`
- [ ] Campo `responsavel`
- [ ] Campo `responsavel_type`
- [ ] Campo `atomic_layer` = "task"
- [ ] Campo `Entrada`
- [ ] Campo `Saida`
- [ ] Campo `Checklist` (≥1 item)
- [ ] Campo `execution_type`

**Agents:**
- [ ] Frontmatter YAML ou heading com ID
- [ ] Seção IDENTIDADE com Propósito
- [ ] Seção RESPONSABILIDADES
- [ ] Seção OUTPUT EXAMPLES (≥3)
- [ ] Seção IMMUNE SYSTEM (≥3 triggers)
- [ ] Filename kebab-case

**Workflow:**
- [ ] YAML válido
- [ ] Campo `phases` com ≥1 fase
- [ ] Cada fase tem `name`, `tasks`, `agent`
- [ ] Fluxo unidirecional (sem loops)
- [ ] Quality gates existem no config

**Coerência:**
- [ ] Cada agente referenciado em tasks existe em agents/
- [ ] Cada task no workflow existe em tasks/
- [ ] Sem dependência circular
- [ ] Sem agente órfão (sem tasks atribuídas)

### 13.3 Veto conditions

- squad.yaml inválido (name ou version faltando)
- Task sem 8 campos obrigatórios
- squad-validator.js FAIL em checks mandatórios
- Agent sem 3+ output examples
- Agent sem 3+ immune triggers
- KB cobertura <80% (ver VOL-05)

---

## 14. Regras Cardinais Aplicáveis

| Regra | Aplicação em VOL-04 |
|-------|---------------------|
| **RC-03 Task-first** | Estrutura de diretórios inegociável. Tasks primárias |
| **RC-06 KB primária** | Gate inclui kb-plan.md. Squad operacional sem KB = FAIL |
| **RC-11 3+ examples + immune** | Validação obrigatória no nuclear gate |
| **RC-16 Schema feedback loop** | Self-healing loop max 3 tentativas |

---

## 15. Anti-Patterns

| Anti-pattern | Por que falha |
|--------------|---------------|
| Usar `config.yaml` | Deprecated. Migrator força squad.yaml |
| Name "My Squad" (camelCase ou space) | Não bate regex. Schema FAIL |
| Version "1.0" (sem patch) | Não bate semver. Schema FAIL |
| Task sem 1 dos 8 campos | FAIL no validator |
| Agent sem output examples | Viola RC-11. Performa pior |
| Agent sem immune system | Viola RC-11. Vulnerável a prompts maliciosos |
| Modificar L1/L2 framework | Viola boundary (VOL-01) |
| Ignorar WARNINGS | Acumulam, viram bugs silenciosos |
| Skip validator "vai funcionar" | Não passa em prod. Aplicar RC-16 sempre |
| Dependência circular entre tasks | Workflow quebra. VETO automático |

---

## 16. Resumo Executivo (cartão de referência)

**Fase 3 gera artefatos AIOS a partir do blueprint (VOL-03).**

**squad.yaml:** obrigatório `name` (kebab-case) + `version` (semver). Nunca usar config.yaml.

**Task-format (8 campos):** task, responsavel, responsavel_type, atomic_layer, Entrada, Saida, Checklist, execution_type.

**Agent format:** frontmatter ou heading + IDENTIDADE + RESPONSABILIDADES + 3+ OUTPUT EXAMPLES + 3+ IMMUNE SYSTEM + COMMANDS + STRICT RULES.

**Schema feedback loop (RC-16):** erros voltam pro LLM, max 3 tentativas antes de escalar. ERRORS bloqueiam, WARNINGS logam.

**3 templates:** basic (simples) · etl (pipelines de dados) · agent-only (consultores). Custom = precedente.

**Config inheritance:** extend (adiciona rules) · override (substitui) · none (standalone).

**squad-validator.js:** motor reusável. Valida manifest + estrutura + tasks + agents + workflows + integridade.

**squad-analyzer.js:** métricas de cobertura + sugestões. Opcional mas recomendado.

**squad-loader.js:** API pra resolver/carregar squads programaticamente.

**QG-SF-004 bloqueia.** Vetos: squad.yaml inválido, task sem 8 campos, validator FAIL, agent sem 3+ examples/triggers, KB cobertura <80%.

---

**Próximo volume:** VOL-05 — Knowledge Base como Cérebro do Squad.

---

# APPENDIX v1.1 — Enriquecimento (2026-04-22)

Patches de contratos: Guarantee as Risk Reversal (SLA em squad contract), Skill Markdown como estágio formal (RC-22 adotada).

## A. Guarantee as Risk Reversal em Squad Contract (IC-06)

Padrão de oferta aplicado a squad [Fonte: `knowledge-refs/100M.txt` bloco garantias, detalhado em VOL-11 §14].

**Princípio:** percepção de risco é preço. Garantias transferem risco do expert/cliente pro squad, aumentando valor percebido sem mudar a construção.

**Cláusulas "guarantee-like" no squad.yaml (ou config.yaml):**

```yaml
# squad.yaml enriquecido v1.1
name: meu-squad
version: 1.2.0
# ...

guarantees:
  uptime:
    description: "Self-healing automático em falha não-fatal"
    sla: "<=2 falhas em 10 execuções"
    trigger: "auto-retry até 3x, depois escala"
  
  rollback:
    description: "Versão anterior sempre disponível via backup"
    sla: "rollback <=5 min"
    trigger: "2 reprovações seguidas em QG"
  
  error_recovery:
    description: "Erro crítico resolve rápido ou escala"
    sla: "resolução <4h"
    trigger: "error code CRITICAL_*"
  
  preview_before_commit:
    description: "Mutações sempre têm dry-run + approval"
    sla: "zero mutations sem signed playback"
    trigger: "qualquer operação mutativa"
```

**Validação em QG-SF-004:** squad operacional (não consultivo) DEVE ter pelo menos 2 guarantees declaradas. Sem guarantees, squad é "vende confia", não oferta formal.

## B. Skill Markdown como estágio formal (RC-22 adotada)

Padrão Hormozi AI-Vision [Fonte: `knowledge-refs/ai-vision.txt:194-207`]. Detalhado em VOL-11 §8.

**RC-22:** Conhecimento de processo é formalizado em 3 estágios progressivos. NÃO se pula estágio.

```
Estágio 1: Markdown file (SOP em linguagem natural)
              ↓  testar manual
Estágio 2: Skill markdown (markdown + prompt + exemplos testados)
              ↓  integrar
Estágio 3: Agent include (skill carregada no agente)
```

**Formato operacional do estágio 2 (Skill Markdown):**

```markdown
---
skill_name: {nome}
version: {semver}
tested_cases: N
---

# Skill: {Nome}

## Trigger
[Quando invocar essa skill]

## Input expected
[Campos obrigatórios + opcionais]

## Process (observable behavior)
1. [Action 1 — ~30s]
2. [Action 2]
3. ...

## Output format
[Estrutura exata do output]

## Tested examples
### Exemplo 1 — happy path
Input: ...
Output: ...

### Exemplo 2 — edge case
Input: ...
Output: ...

## Known failures
- [Caso X falha quando...]
```

**Regra:** skill não é criada — é PRODUZIDA iterativamente. Cada nova falha detectada vira update no skill. Só vira agent include depois de N testes (mínimo 10) com output consistente.

**Anti-pattern:** skill inventada sem iteração de testes. Detectável porque `tested_cases: 0` no frontmatter.

## C. Human quality control entre estágios (alinhado com RC-15)

Hormozi enfatiza [Fonte: `knowledge-refs/ai-vision.txt:209`]: "there's a lot of human quality control you need to implement in between each role/stage".

**Aplicado:** checkpoints explícitos de qualidade entre estágios 1→2 e 2→3:

| Transição | Checkpoint | Quem valida |
|-----------|------------|-------------|
| Markdown → Skill | "Roda manual 3x com output comparável?" | Expert |
| Skill → Agent | "Skill tested_cases >= 10 com PASS rate >= 80%?" | Validator agente |

Sem checkpoints passados, não avança de estágio. RC-15 (human-in-loop) é mecanismo concreto dessa validação.

---

## Fim do Appendix VOL-04 v1.1
