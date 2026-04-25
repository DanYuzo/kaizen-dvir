# Framework Universal de 7 Artefatos para Processos de Negocio

> Referencia para criar qualquer processo operacional (marketing, vendas, modelo de negocio, etc.)
> usando agentes IA no Claude Code ou Cowork.
>
> Sintetizado a partir de 4 frameworks: Auroq OS, CrewAI, AIOX-Core e Anthropic Skills.

---

## Visao Geral

Todo processo de negocio — independente do dominio — e composto por 7 artefatos organizados em 4 camadas:

```
CONHECIMENTO ─── ① KB (metodo + exemplos de referencia)

PROCESSO ──────── ② Workflow
                  ③ Tasks (com output_format embutido)

QUALIDADE ─────── ④ Rules (constraints pre-execucao)
                  ⑤ Quality Gates (validacao pos-execucao)

EXECUCAO ──────── ⑥ Skill/Agent
                  ⑦ Tools
```

Cada processo novo segue esse esqueleto. A profundidade varia com a complexidade. A estrutura nao.

---

## ① KB — Knowledge Base

**Pergunta:** "O que eu preciso saber para fazer isso bem?"

### Estrutura

```markdown
# KB: [Nome do Processo]

## Metodo
Framework, principios, etapas, fundamentacao.
O "como" do seu repertorio neste dominio.

## Contexto do Dominio
Publico-alvo, mercado, particularidades da area.
Informacoes que mudam de cliente para cliente.

## Exemplos de Referencia
2-3 outputs reais excelentes com:
- Input original
- Output completo
- Analise do porque e bom (o que faz funcionar)
```

### Melhores Praticas (extraidas dos 4 frameworks)

**Do Auroq OS — Organizacao em 3 camadas:**
O Exocortex organiza conhecimento em quem voce e / o que voce faz / conhecimento tecnico. Para KBs de processo, adapte:
- Camada 1: O metodo (framework, principios)
- Camada 2: O contexto (publico, mercado, restricoes)
- Camada 3: Os exemplos (outputs reais com analise)

**Dos Skills Anthropic — Progressive disclosure:**
Nao carregue toda a KB de uma vez. Estruture em niveis:
- Nivel 1: Resumo do metodo (~100 palavras) — sempre disponivel
- Nivel 2: Metodo completo (~500 linhas) — quando o processo ativa
- Nivel 3: Exemplos detalhados e referencias — sob demanda

Para isso, use arquivos separados referenciados no SKILL.md:
```markdown
## Referencias adicionais
- Para exemplos completos, veja [exemplos.md](exemplos.md)
- Para o metodo detalhado, veja [metodo-completo.md](metodo-completo.md)
```

**Do CrewAI — Knowledge Sources com RAG:**
Se o volume de conhecimento for grande (muitos exemplos, muitos clientes), considere usar embeddings e busca semantica via Knowledge Sources do CrewAI. Para volumes menores, arquivos markdown referenciados sao suficientes.

**Do AIOX — Technical Preferences:**
Documente preferencias do expert/cliente separadamente da KB de metodo:
```markdown
## Preferencias
- Tom: consultivo, nunca agressivo
- Formato preferido: bullet points > paragrafos longos
- Vocabulario: usar "investimento" em vez de "custo"
```

### Anti-patterns
- KB generica demais (copiar artigo da internet sem tratar)
- KB sem exemplos (metodo sem referencia concreta de output)
- KB desatualizada (metodo evoluiu mas KB nao reflete)
- KB gigante num arquivo so (sem progressive disclosure)

---

## ② Workflow

**Pergunta:** "Qual a sequencia do inicio ao fim?"

### Estrutura

```markdown
# Workflow: [Nome do Processo]

## Objetivo
Uma frase: o que este workflow produz no final.

## Fases
1. [Fase 1] — descricao curta
2. [Fase 2] — descricao curta
3. [Fase N] — descricao curta

## Sequencia Detalhada

### Fase 1: [Nome]
- **Input:** O que recebe (dados, briefing, output anterior)
- **Quem executa:** Skill/Agent responsavel
- **Tasks:** Lista de tasks desta fase
- **Output:** O que produz
- **Ponto de decisao:** [Se houver] Condicao → caminho A ou B
- **Interacao humana:** [Se houver] O que o humano precisa fazer/aprovar

### Fase 2: [Nome]
...

## Condicoes de Branching
- SE [condicao] → pular para fase X
- SE [condicao] → repetir fase Y (max N vezes)

## Escalation
- SE task trava por mais de [tempo] → notificar expert
- SE quality gate falha [N] vezes → escalar para revisao humana
```

### Melhores Praticas

**Do AIOX — Complexity-driven routing:**
Nem todo input precisa do workflow completo. Use scoring de complexidade:
```
SIMPLES (score ≤3):  Fases 1, 3, 5 (pula intermediarias)
PADRAO (4-7):        Todas as fases
COMPLEXO (≥8):       Todas + ciclo de revisao extra
```
Dimensoes para scoring: escopo, integracao com externos, conhecimento necessario, risco.

**Do CrewAI — Dual paradigma (Crews + Flows):**
- Use **sequencia linear** para processos previsiveis (script de vendas, carrossel)
- Use **event-driven** para processos com muita ramificacao (lead scoring, nurturing)
- O decorator `@router` do CrewAI permite branching dinamico baseado no output do step anterior

**Do Auroq — Pontos de interacao humana explicitos:**
Cada fase deve declarar explicitamente se o humano precisa:
- Aprovar antes de prosseguir (gate)
- Fornecer input (dados, briefing, escolha)
- Apenas ser notificado (informativo)
- Nada (totalmente autonomo)

**Dos Skills — Workflow como prosa narrativa:**
Para processos simples (3-5 steps), o workflow pode viver dentro do SKILL.md como instrucoes sequenciais. Nao precisa de YAML formal. O modelo entende prosa bem o suficiente.

### Anti-patterns
- Workflow sem pontos de decisao (assume caminho feliz sempre)
- Workflow sem escalation (o que acontece quando trava?)
- Workflow que nao declara interacao humana (o humano nao sabe quando agir)
- Over-engineering: YAML complexo para processo de 3 steps

---

## ③ Tasks

**Pergunta:** "O que exatamente precisa ser feito neste passo?"

### Estrutura

```markdown
# Task: [Nome da Task]

## Objetivo
Uma frase: o que esta task produz.

## Input
- [campo]: [tipo] — [origem] — [obrigatorio?]
- [campo]: [tipo] — [origem] — [obrigatorio?]

## Instrucao
Passos detalhados do que fazer com o input.
1. ...
2. ...
3. ...

## Output Format
[Template embutido — como o resultado deve parecer]

```
[Exemplo do formato do output esperado]
```

## Criterio de Conclusao
- [ ] [Condicao 1 que precisa ser verdade]
- [ ] [Condicao 2 que precisa ser verdade]

## Modo de Execucao
- Autonomo: Claude executa sem intervencao
- Co-piloto: Claude faz, humano revisa cada step
- Delegado: Humano direciona, Claude auxilia
```

### Melhores Praticas

**Do CrewAI — Expected output como campo obrigatorio:**
Toda task precisa de um `expected_output` claro. Nao e opcional. E o que mais impacta a qualidade do resultado:
```python
# CrewAI faz isso nativamente:
Task(
    description="Criar script de vendas para curso de yoga",
    expected_output="Script de 800-1200 palavras com gancho, problema, solucao, prova social e CTA",
    agent=sales_agent
)
```
No formato markdown, isso vira a secao "Output Format" com template concreto.

**Do AIOX — 3 modos de execucao:**
- **YOLO** (0-1 prompts): Autonomo com logging. Para tasks repetitivas ja validadas.
- **Interativo** (5-10 prompts): Checkpoints educativos. Para tasks em desenvolvimento.
- **Pre-Flight** (15+ prompts): Planejamento completo antes. Para tasks de alto risco.

Declare o modo na task. Isso muda como o agente se comporta.

**Do AIOX — Pre e post conditions:**
```markdown
## Pre-conditions
- [ ] Input recebido e validado
- [ ] KB carregada no contexto
- [ ] Rules injetadas

## Post-conditions
- [ ] Output gerado no formato esperado
- [ ] Criterios de conclusao atendidos
- [ ] Nenhuma rule violada
```

**Do CrewAI — Context como pipeline:**
O output de uma task alimenta a proxima via `context`. Defina explicitamente:
```markdown
## Input
- briefing: texto — fornecido pelo humano — obrigatorio
- pesquisa_lead: texto — output da Task "Pesquisar Lead" — obrigatorio
```

**Dos Skills — Output format inline vs referenciado:**
- Se o template e curto (< 20 linhas): embutir na task
- Se o template e longo ou reutilizavel: referenciar arquivo separado

### Anti-patterns
- Task sem output format (o modelo inventa o formato)
- Task sem criterio de conclusao (nunca se sabe quando terminou)
- Task que mistura execucao com validacao (quem faz nao deve avaliar)
- Task com input vago ("recebe as informacoes necessarias")

---

## ④ Rules

**Pergunta:** "O que NUNCA fazer durante a execucao?"

### Estrutura

```markdown
# Rules: [Nome do Processo]

## Constraints do Dominio
Regras legais, eticas, de marca que NUNCA podem ser violadas.
- NUNCA [constraint 1]
- NUNCA [constraint 2]

## Anti-patterns
Erros comuns que o modelo tende a cometer neste dominio.
- NAO [anti-pattern 1] — Porque: [explicacao]
- NAO [anti-pattern 2] — Porque: [explicacao]

## Limites de Escopo
O que esta FORA do escopo deste processo.
- Este processo NAO [acao fora de escopo]
- Se [condicao], PARAR e perguntar ao humano

## Tom e Linguagem
- Usar: [palavras, estilo, tom]
- Evitar: [palavras proibidas, estilos inadequados]
- Tom geral: [descricao do tom]
```

### Melhores Praticas

**Do Auroq — Constitution como inspiracao:**
Crie "artigos constitucionais" para cada dominio do negocio:
```markdown
## Artigos (inegociaveis)
I. Nunca prometer resultados financeiros especificos
II. Nunca mencionar concorrentes por nome em copy
III. Todo claim precisa de evidencia ou qualificador ("pode", "tende a")
IV. Tom sempre consultivo — nunca agressivo ou manipulativo
```

**Do CrewAI — Guardrails programaticos:**
Para rules criticas, considere guardrails que bloqueiam automaticamente:
```python
# CrewAI permite guardrails como funcoes:
def no_financial_promises(output: TaskOutput) -> tuple[bool, str]:
    forbidden = ["garanto", "100%", "resultado certo", "R$"]
    for word in forbidden:
        if word.lower() in output.raw.lower():
            return False, f"Output contem claim proibido: '{word}'"
    return True, output.raw
```

**Dos Skills — Explique o "porque":**
Nao escreva so "NUNCA faca X". Explique por que. O modelo raciocina melhor quando entende a razao:
```markdown
- NUNCA use "compre agora" como CTA isolado
  Porque: CTAs imperativos sem contexto geram resistencia.
  Melhor: "Veja como funciona" ou "Converse com um consultor"
```

**Do Auroq — Anti-viagem:**
Inclua uma rule explicita anti-escopo:
```markdown
## Anti-viagem
- Executar DENTRO do escopo planejado
- Se perceber necessidade de mudar escopo: PARAR e perguntar
- Nao adicionar features, melhorias ou conteudo nao solicitado
- Nao gerar dados, numeros ou fatos sem fonte verificada
```

### Anti-patterns
- Rules sem explicacao (modelo segue cegamente, sem entender edge cases)
- Rules demais (> 15 rules dilui importancia — priorize as criticas)
- Rules contraditorias ("seja conciso" + "inclua todos os detalhes")
- Rules que deviam ser quality gates (validacao pos-execucao, nao constraint pre)

---

## ⑤ Quality Gates

**Pergunta:** "O resultado esta bom?"

### Estrutura

```markdown
# Quality Gate: [Nome do Processo]

## Criterios de Aceitacao
O que precisa ser verdade para o output ser aceito.
- [ ] [Criterio 1]
- [ ] [Criterio 2]
- [ ] [Criterio N]

## Checklist de Validacao
Itens especificos para verificar no output.
- [ ] [Item de verificacao 1]
- [ ] [Item de verificacao 2]

## Guardrails Automaticos
Validacoes que podem ser automatizadas.
- Schema: [formato esperado — JSON, markdown sections, etc.]
- Tamanho: [min-max palavras/caracteres]
- Presenca: [elementos obrigatorios no output]

## Evals (Casos de Teste)
| Input | Output Esperado | Assertion |
|-------|----------------|-----------|
| [caso 1] | [resultado esperado] | [como verificar] |
| [caso 2] | [resultado esperado] | [como verificar] |

## Veredicto
- PASS: Output atende todos os criterios. Prosseguir.
- REVISAO: Output quase bom. Feedback especifico + retry (max 3x).
- FAIL: Output inadequado. Escalar para revisao humana.
```

### Melhores Praticas

**Do AIOX — Separacao executor/juiz:**
Quem produz o output NUNCA deve ser quem avalia. Isso e constitutional no AIOX e Auroq:
- Executor: gera o output
- Juiz: valida contra quality gate
- Se a mesma skill/agent faz os dois, crie um step separado de validacao

**Do AIOX — QA Loop iterativo:**
Nao aprove ou reprove de uma vez. Use um loop:
```
Output gerado → Validacao → FAIL → Feedback especifico
→ Re-execucao com feedback → Re-validacao → (max 3-5 iteracoes)
→ Se ainda FAIL → Escalar para humano
```

**Dos Skills — Blind comparison (A/B):**
Para refinar qualidade ao longo do tempo, use avaliacao cega:
1. Gere output com skill v1 E skill v2
2. Avaliador ve ambos sem saber qual e qual
3. Pontua em dimensoes (conteudo, estrutura, usabilidade)
4. Vencedor informa proxima iteracao da skill

**Do CrewAI — Guardrails com retry automatico:**
```python
# Guardrail que re-executa a task se falhar:
Task(
    description="...",
    guardrail=check_quality,      # funcao de validacao
    guardrail_max_retries=3       # tenta 3x antes de escalar
)
```
No formato markdown, simule com instrucoes explicitas de retry no workflow.

**Dos Skills — Evals quantitativos:**
Defina metricas mensuráveis, nao so subjetivas:
```markdown
## Metricas
- pass_rate: % de assertions que passam (target: > 80%)
- token_count: eficiencia do output (target: < 2000 tokens)
- time_to_complete: velocidade do processo (target: < 3 min)
```

### Anti-patterns
- Quality gate subjetivo demais ("o output e bom?" — bom como?)
- Quality gate sem feedback para retry (FAIL sem dizer o que consertar)
- Quality gate que aprova tudo (criterios frouxos demais)
- Quality gate no final apenas (deveria ter gates intermediarios em workflows longos)

---

## ⑥ Skill/Agent

**Pergunta:** "Quem executa e com qual expertise?"

### Quando usar Skill vs Agent

| Situacao | Skill | Agent |
|----------|-------|-------|
| Processo one-shot (gerar script, criar post) | ✅ | Overkill |
| Processo recorrente com consistencia de estilo | Pode | ✅ |
| Interacao continua com usuario | ❌ | ✅ |
| Multiplos processos sob mesmo "papel" | ❌ | ✅ (1 agent, N skills) |
| Entrega para cliente nao-tecnico via Cowork | ✅ | Overkill |
| Orquestracao complexa entre multiplos agentes | ❌ | ✅ |

### Estrutura de uma Skill (formato SKILL.md)

```yaml
---
name: nome-da-skill
description: Quando usar esta skill e o que ela faz. Front-load o caso de uso principal.
---

# [Nome da Skill]

## Contexto
Breve descricao do dominio e do que esta skill faz.

## Instrucoes
Passos que o Claude segue quando esta skill e ativada.
1. ...
2. ...

## Formato do Output
[Template ou descricao do formato esperado]

## Dicas
- [Dica 1 sobre como produzir melhor resultado]
- [Dica 2]

## Referencias adicionais
- Para exemplos, veja [exemplos.md](exemplos.md)
- Para o metodo completo, veja [kb.md](kb.md)
```

### Estrutura de um Agent (formato subagent .md)

```yaml
---
name: nome-do-agent
description: Quando delegar para este agent e o que ele faz.
tools: Read, Grep, Glob, Bash, Edit, Write
model: sonnet
memory: project
---

Voce e [nome], especialista em [dominio].

## Sua Expertise
[Descricao do repertorio e capacidades]

## Como Voce Trabalha
[Principios operacionais, tom, estilo]

## Comandos Disponiveis
- *help — Mostrar comandos
- *[comando1] — [descricao]
- *[comando2] — [descricao]

## O Que Voce NAO Faz
[Limites claros de escopo e autoridade]
```

### Melhores Praticas

**Dos Skills — SKILL.md < 500 linhas:**
Mantenha o SKILL.md focado. Mova referencia detalhada para arquivos separados.
O modelo recebe o SKILL.md inteiro no contexto — cada linha conta.

**Do Auroq — Persona em 6 niveis (para agents complexos):**
1. Identity: nome, papel, expertise
2. Operational: principios, frameworks, comandos
3. Voice DNA: vocabulario, metaforas, tom
4. Quality: exemplos de output, anti-patterns
5. Credibility: autoridade no dominio
6. Integration: de quem recebe, para quem entrega

Nem todo agent precisa dos 6. Use niveis 1-2 para agents simples, todos para agents core.

**Do AIOX — Permissoes explicitas por agent:**
Defina o que o agent PODE e NAO PODE fazer:
```yaml
# O que pode:
tools: Read, Grep, Glob, Bash, Edit, Write

# O que nao pode (use disallowedTools):
disallowedTools: Agent
```

**Do CrewAI — Agent leve quando possivel:**
Nem todo agent precisa de 800 linhas. Os 3 campos do CrewAI (role + goal + backstory) sao suficientes para muitos casos. Complexifique so quando necessario.

### Anti-patterns
- Agent com persona mas sem instrucoes operacionais (sabe quem e, nao sabe o que fazer)
- Skill sem description clara (Claude nao sabe quando ativar)
- Agent que faz tudo (violacao de separacao de papeis)
- Skill com 1000+ linhas sem progressive disclosure

---

## ⑦ Tools

**Pergunta:** "O que preciso para executar no mundo real?"

### Estrutura

```markdown
# Tools: [Nome do Processo]

## Ferramentas Necessarias

| Tool | Tipo | Para que | Obrigatorio? |
|------|------|----------|-------------|
| [nome] | [MCP/API/Script/Manual] | [funcao no processo] | Sim/Nao |

## Configuracao

### [Tool 1]
- Tipo: MCP Server / API / Script
- Setup: [como configurar]
- Permissoes: [o que precisa de acesso]

### [Tool 2]
...

## Alternativas
Se [tool X] nao estiver disponivel, usar [alternativa] com [ajustes].
```

### Melhores Praticas

**Do Auroq — MCP Governance:**
- Preferir ferramentas nativas do Claude (Read, Write, Edit, Grep, Glob) sobre MCP
- MCP para integracoes externas: browser, APIs, bancos de dados
- Gestao de MCP e exclusiva — nao misturar com execucao de tasks

**Do CrewAI — 80+ tools pre-construidos:**
Antes de criar tool custom, verificar se ja existe:
- Web: BraveSearch, Firecrawl, Spider
- Dados: CSV, JSON, PDF search
- Automacao: Zapier, Composio
- AI: DALL-E, vision tools

**Do Cowork — 38+ connectors nativos:**
Para processos que rodam no Cowork, usar connectors nativos:
- CRM: HubSpot, Salesforce, Close
- Email: Gmail, Outlook
- Produtividade: Google Drive, Notion, Slack
- Design: Figma, Canva
- Dados: Snowflake, BigQuery

**Dos Skills — Scripts como tools:**
Skills podem incluir scripts executaveis que Claude roda:
```
my-skill/
├── SKILL.md
└── scripts/
    ├── validate.py      # Validacao automatica
    ├── generate.sh      # Geracao de assets
    └── format.py        # Formatacao de output
```

### Anti-patterns
- Processo que depende de tool nao documentada (falha sem explicacao)
- Tool manual em processo que deveria ser automatico
- Excesso de MCPs quando ferramentas nativas resolvem

---

## Como Usar Este Framework

### Para criar um novo processo:

1. **Comece pela KB** — Qual e o metodo? Qual conhecimento o agente precisa?
2. **Defina o Workflow** — Quais fases, em que ordem, onde o humano entra?
3. **Quebre em Tasks** — Cada fase tem quais passos atomicos?
4. **Escreva as Rules** — O que nao pode acontecer?
5. **Monte os Quality Gates** — Como valido que ficou bom?
6. **Crie a Skill/Agent** — Quem executa? (skill simples ou agent com persona)
7. **Liste as Tools** — O que precisa para funcionar no mundo real?

### Hierarquia de verificacao (REUSE > ADAPT > CREATE):

Antes de criar qualquer artefato:
1. **REUSE** — Ja existe algo pronto? Use direto.
2. **ADAPT** — Existe algo parecido? Adapte.
3. **CREATE** — Nao existe nada? Crie e documente para reuso futuro.

### Profundidade por complexidade:

| Complexidade | KB | Workflow | Tasks | Rules | Q.Gates | Skill/Agent | Tools |
|-------------|-----|----------|-------|-------|---------|-------------|-------|
| Simples | 1 pagina | 3 fases | 3-5 tasks | 5 rules | Checklist simples | Skill (1 SKILL.md) | 0-2 |
| Medio | 2-3 paginas | 5 fases | 5-10 tasks | 10 rules | Checklist + evals | Skill com references | 2-5 |
| Complexo | KB + refs | 7+ fases + branching | 10+ tasks | 15 rules | QA loop + evals | Agent com persona | 5+ |

---

*Framework v1.0 — Sintetizado de Auroq OS, CrewAI, AIOX-Core e Anthropic Skills*
