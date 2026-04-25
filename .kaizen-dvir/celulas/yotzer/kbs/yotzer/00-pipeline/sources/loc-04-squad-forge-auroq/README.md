# Squad Forge

Extrai processos complexos da sua cabeca e transforma em squads AIOS funcionais. Extracao profunda com 8 lentes iterativas.

## Ativacao

```
/squadForge
```

## Agentes

| Agente | Funcao |
|--------|--------|
| @forge-chief | Orquestrador do pipeline, playback validation |
| @process-archaeologist | Especialista em extracao profunda de processos |
| @forge-smith | Construtor AIOS, transforma processo em squad |

## Pipeline

```
Fase 0: Setup → Fase 1: Extracao → Fase 2: Playback
→ Fase 3: Arquitetura → Fase 4: Montagem → Fase 5: Validacao + Install
```

## Quality Gates

- QG-SF-001: Extraction Completeness (processo extraido com profundidade)
- QG-SF-002: User Validation (playback aprovado pelo dono do processo)
- QG-SF-003: Architecture Coherence (squad bem estruturado)
- QG-SF-004: Nuclear Structure (agents, tasks, workflows validos)
- QG-SF-005: Squad Operational (smoke tests passam)

## Output

Squad completo em `minds/{slug}/04-squad/`:

```
04-squad/
├── agents/      — Agentes do squad
├── tasks/       — Tasks executaveis
├── workflows/   — Pipeline do squad
├── knowledge/   — KB extraida do processo
├── squad.yaml   — Configuracao
└── README.md    — Documentacao
```

## Instalacao

Automatica no final do pipeline (Fase 5):
1. Output copiado para `agents/{slug}/`
2. Skill registrada em `.claude/commands/{slashPrefix}.md`
3. Ativacao imediata via `/{slashPrefix}`

## Dependencias

Nenhuma obrigatoria.
