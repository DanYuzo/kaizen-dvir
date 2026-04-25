# VOL-05 — Knowledge Base como Cérebro do Squad

> **KB:** KaiZen | **Consumer:** Moreh
> **Domínio:** D5 — Knowledge Base como Cérebro
> **Fontes primárias:** `loc-04-squad-forge/data/forge-kb`, `loc-04-squad-forge/tasks/assemble-squad` (Step 6), `loc-03-framework-7-artefatos` (seção KB)
> **Regras cardinais principais:** **RC-06** (KB primária), RC-13 (cobertura 80%)

---

## 1. O Que Este Volume Ensina

Moreh pode gerar um squad **estruturalmente correto** que **não funciona operacionalmente**. Diferença: KB rasa vs KB rica.

Moreh aprende aqui:

1. **Por que KB é artefato primário** — não arquivo de suporte
2. **Anti-padrão histórico** que Moreh deve evitar
3. **6 seções essenciais** de uma KB rica
4. **Template completo** de KB operacional
5. **ETL integration** — como incorporar output do ETLmaker
6. **3 tipos de KB** por tipo de squad (operacional/analítico/criativo/dev)
7. **Progressive disclosure** — padrão Anthropic Skills
8. **3 camadas de contexto** — quem/como/o que
9. **Skill vs Agent** — quando usar cada abordagem
10. **Cobertura 80%** — validação obrigatória

---

## 2. KB Como Artefato Primário

### 2.1 Regra de ouro [RC-06]

**KB é o cérebro do squad, não arquivo de suporte.**

Pra squads operacionais (tráfego, conteúdo, vendas, processos de negócio), a KB é o que faz o squad funcionar ou não. Tasks definem O QUE fazer; KB define **COMO fazer com profundidade**.

### 2.2 Inversão mental crítica

**Abordagem ingênua:**
```
Task: "gerar copy de headline"
  → agente recebe
  → agente improvisa baseado em conhecimento geral
  → output genérico
```

**Abordagem KB-first:**
```
Task: "gerar copy de headline"
  → agente recebe
  → agente consulta KB com:
     - 5 regras cardinais de copy
     - 3 protocolos (PAS, 4U, AIDA com exemplos)
     - Decision tree (quando usar cada fórmula)
     - Tabela: nicho → vocabulário
     - 6 exemplos reais de headlines que funcionaram
     - Anti-padrões (o que NUNCA fazer)
  → output específico, fundamentado
```

**Diferença:** squad com KB rica conhece o **ofício**. Sem KB, conhece só o **formato**.

### 2.3 Quando KB é dispensável

| Situação | KB dispensável? |
|----------|-----------------|
| Processo 100% mecânico (worker) | Sim — execução determinística |
| Processo dev/técnico (CI/CD, code review) | Parcial — moderada |
| Processo operacional (tráfego, conteúdo) | **NÃO** — exige profundidade |
| Processo analítico (pesquisa, auditoria) | **NÃO** — exige frameworks |
| Processo criativo (roteiros, copy) | **NÃO** — exige referências, voice DNA |

---

## 3. Anti-Padrão Histórico (a evitar)

**Observação real do squad-forge:**

> ETL produz 3.000+ linhas de conhecimento rico. Squad building comprime pra 150 linhas de skeleton. Resultado: squad não sabe operar.

### 3.1 O problema

Moreh recebe blueprint com 24 PUs. Quando chega em gerar KB, tentação é:
1. "Vou fazer um resumo executivo"
2. Comprimir tudo em 5 seções de 1 parágrafo cada
3. Squad gerado tem KB de 150 linhas "clean"
4. Agente não sabe operar — viola RC-06

### 3.2 A solução

**Profundidade > brevidade.** KB rasa = squad burro.

Regras:
- **Preservar exemplos concretos** (números, cenários, casos reais)
- **Preservar analogias e metáforas** do usuário — são ferramentas de ensino que ajudam o LLM
- **Tabelas de referência obrigatórias** quando processo tem decisões por cenário
- **Decision trees obrigatórias** quando processo tem bifurcações complexas
- **Anti-padrões tão importantes quanto padrões** — documentar O QUE NÃO FAZER

### 3.3 Métrica

KB do squad = **subconjunto RICO do ETL**, não resumo raso. Se ETL tem 3.000 linhas e KB tem 300, cada linha da KB deve conter conteúdo denso do ETL.

---

## 4. 6 Seções Essenciais da KB

Moreh gera KB com **6 seções** obrigatórias. Algumas podem ser vazias em squad simples, mas todas devem estar presentes.

### 4.1 Regras Cardinais

Top 5-10 regras inegociáveis do processo, ranqueadas por importância.

**Cada regra tem:**
- Enunciado (1 frase imperativa)
- Contexto (por que existe)
- Exemplo (como aplica na prática)
- Anti-padrão (o que viola)

**Exemplo:**

```markdown
## Regras Cardinais

### RC-CP-01: Nunca prometer resultado específico sem evidência

**Contexto:** Legal + ético. Claims vazios geram processo e perdem credibilidade.

**Exemplo aplicando:**
"Pode aumentar suas vendas em 30%" → viola
"Alunos anteriores tiveram aumento médio de 30% (ver depoimentos)" → OK

**Anti-padrão:**
"Garanto que você vai faturar R$10k em 30 dias" → proibido, qualquer nicho.
```

### 4.2 Protocolos Operacionais

Procedimentos passo-a-passo pra cada operação core.

**Cada protocolo tem:**
- Nome + propósito
- Pré-condições
- Passos numerados (com sub-passos se necessário)
- Output esperado (formato específico)
- Exemplos reais

**Exemplo:**

```markdown
## Protocolo: Escrever Headline PAS

**Propósito:** Headline que captura atenção em 3 segundos.

**Pré-condições:**
- Pesquisa de 10 dores do público disponível
- Posicionamento da oferta definido

**Passos:**
1. **Problema** — articular a dor em 1 frase curta
   - Vocabulário do usuário [RC-02]
   - Específica, não genérica
2. **Agitar** — amplificar consequência
   - 1 frase curta
   - Evitar floreio [Diretrizes Danilo]
3. **Solução** — prometer transformação
   - Voz presente [Diretrizes Danilo]
   - Com qualificador (pode, tende)

**Output esperado:** 1 headline de 80-120 chars.

**Exemplos reais:**

Headline 1 (yoga online):
"Cansada de pagar academia e nunca aparecer? (aprende yoga em 15min/dia)"
- P: "Cansada de pagar academia"
- A: "e nunca aparecer"
- S: "aprende yoga em 15min/dia"

Headline 2 (consultoria B2B):
"Seu processo de vendas vive na cabeça do SDR sênior? (documenta em 60 dias)"
```

### 4.3 Decision Trees

Árvores de decisão derivadas de PU-DECISIONs complexas.

**Formato visual (texto) com branches claros:**

```markdown
## Decision Tree: Quando oferecer garantia estendida

```
Ticket > R$500?
├── SIM → Oferecer 30 dias
│   ├── Nicho tem alta aversão a risco? (saúde, finanças)
│   │   ├── SIM → 60 dias sem perguntas
│   │   └── NÃO → 30 dias padrão
│   └── Default: 30 dias
└── NÃO → 7 dias padrão
    └── Exceção: se mercado concorrente oferece mais, empatar
```

**Critérios:**
- "Alta aversão a risco": nicho onde cliente sente medo físico/financeiro
- "Mercado concorrente": 3+ ofertas similares com garantia maior
```

### 4.4 Tabelas de Referência

Lookup tables: cenário → ação → timing → observação.

**Obrigatórias quando processo tem decisões por cenário.**

**Exemplo:**

```markdown
## Tabela: Cenário de Lançamento → Timing de Email

| Cenário | Dia lançamento | Email | Foco |
|---------|---------------|-------|------|
| Pré-carrinho aberto | D-7 | Email 1 | Problema |
| Carrinho aberto | D+0 | Email 2 | Oferta + urgência |
| Carrinho D+2 | D+2 | Email 3 | Objeções |
| Carrinho D+5 | D+5 | Email 4 | Prova social |
| Última chamada | D+6 | Email 5 | Escassez real |
| Pós-carrinho | D+7 | Email 6 | Liquidação (se aplica) |
```

### 4.5 Troubleshooting (Exceções e Recuperação)

Falhas conhecidas + diagnóstico + resolução. Derivado de PU-EXCEPTIONs.

**Formato:**

```markdown
## Troubleshooting

### Falha: Headline não passa no teste de 3 segundos

**Diagnóstico:**
- Muito longa (>120 chars)
- Vocabulário inflado/genérico
- Sem conexão emocional com dor

**Resolução:**
1. Cortar pela metade — forçar concisão
2. Substituir adjetivos por números/especificidades
3. Reescrever a partir da dor (não da solução)

**Prevenção:** aplicar teste 3s ANTES de finalizar, não depois.

### Falha: Cliente reclama de promessa exagerada

**Diagnóstico:**
- Headline com claim sem proof
- Copy usa "garantido" sem disclaimer

**Resolução:**
1. Adicionar proof elements (depoimentos, dados)
2. Qualificar claim ("pode", "tende a")
3. Adicionar disclaimer legal se nicho regulado

**Severity:** degraded (retrabalho)
**Frequência:** ocasional
```

### 4.6 Glossário

Termos do domínio no vocabulário do usuário [RC-02]. Inclui:
- Jargão específico do nicho
- Abreviações internas
- Nomes de ferramentas/templates que o usuário usa

**Formato:**

```markdown
## Glossário

| Termo | Definição operacional |
|-------|---------------------|
| **PAS** | Problem-Agitate-Solution. Fórmula de copy em 3 movimentos |
| **Value Equation (VE)** | Framework Hormozi: Dream Outcome × Likelihood / (Time Delay × Effort) |
| **Teste de 3 segundos** | Se headline não prende em 3s de leitura, reescreve |
| **Cliente ancorado** | Lead que já consome conteúdo mas ainda não comprou |
| **Carrinho aberto** | Janela de 7 dias onde oferta está disponível |
| **Swipe file** | Coleção de referências de copy do dono |
```

### 4.7 Analogias e Exemplos (opcional, mas recomendado)

Metáforas, exemplos práticos, casos reais. **Preserva a voz do autor/instrutor** quando aplicável.

**Exemplo:**

```markdown
## Analogias do Autor

**"Copy é conversa de WhatsApp, não redação escolar"**

O cliente não quer ler seu texto — ele está rolando o feed. Se parece texto de escola, passa reto. Se parece WhatsApp de amigo, lê.

Aplicação:
- Frases curtas
- "ne?" e "ta?" quando couber
- Voz ativa sempre
- Exemplos concretos antes de conceitos

**"Valor percebido > valor real"** (Hormozi)

Cliente não paga pelo que VOCÊ entrega — paga pelo que ELE percebe que está recebendo. Todo esforço de articulação vale.
```

---

## 5. Template Completo de KB Rica

```markdown
# {Squad Name} — Knowledge Base

## Regras Cardinais
{Top 5-10 regras inegociáveis, ranqueadas por importância}
{Cada regra: enunciado + contexto + exemplo + anti-padrão}

## Protocolos Operacionais
{Procedimentos passo-a-passo pra cada operação core}
{Decision trees com condições e branches}
{Tabelas de referência (cenário → ação)}

## Decision Trees
{Árvores derivadas de PU-DECISIONs}
{Formato visual (texto) com branches claros}

## Tabelas de Referência
{Lookup tables: cenário → ação → timing → observação}
{Métricas e benchmarks}

## Exceções e Troubleshooting
{Falhas conhecidas + diagnóstico + resolução}
{Derivado de PU-EXCEPTIONs}

## Glossário
{Termos do domínio no vocabulário do usuário}

## Analogias e Exemplos (opcional)
{Metáforas, exemplos práticos, casos reais}
{Preserva a voz do autor/instrutor}
```

---

## 6. ETL Integration

Quando domínio já tem output do ETLmaker, Moreh **DEVE** incorporar.

### 6.1 Checar existência

```bash
# Antes de compor KB, verificar se já existe ETL
ls docs/knowledge/expert-business/*{slug}*/ 2>/dev/null
ls agents/etlmaker/kbs/*{slug}*/ 2>/dev/null
```

### 6.2 Se ETL existir

1. **Ler os volumes do ETL** (VOL-01, VOL-02, etc.)
2. **Extrair conteúdo operacional relevante** pro escopo do squad
3. **Preservar profundidade** — exemplos, tabelas, decision trees
4. **Manter proveniência** `[Fonte:]` quando disponível
5. **KB do squad = subconjunto RICO do ETL**, não resumo raso

### 6.3 Se ETL não existir

1. **Compor KB a partir dos PUs** extraídos (assemble-squad Step 6c)
2. **Garantir profundidade proporcional** ao tipo de squad

### 6.4 Mapeamento PU → Seção da KB

Cada tipo de PU alimenta uma seção específica:

| PU Type | Seção na KB | O que capturar |
|---------|-------------|----------------|
| STEP (operacional) | Protocolos / Procedimentos | O COMO detalhado, não só O QUE |
| DECISION | Decision Trees / Regras | Condições, branches, critérios com exemplos |
| EXCEPTION | Exceções e Troubleshooting | Falhas, causas, respostas, planos B |
| QUALITY_GATE | Critérios de Qualidade | Métricas, thresholds, checklists de validação |
| TACIT | Regras Cardinais / Heurísticas | Conhecimento implícito tornado explícito |
| INPUT/OUTPUT | Glossário / Referências | Definições, formatos, exemplos |

---

## 7. Classificação de Squads por Tipo de KB

Profundidade da KB varia por tipo de squad.

| Tipo de Squad | Exemplos | KB esperada | Profundidade |
|---------------|----------|-------------|--------------|
| **Operacional** | Tráfego, conteúdo, vendas, atendimento | Rica | Protocolos + decision trees + tabelas + regras cardinais + exemplos |
| **Dev/Técnico** | CI/CD, code review, testes | Moderada | Padrões + convenções + checklists |
| **Analítico** | Pesquisa, diagnóstico, auditoria | Rica | Frameworks + critérios + benchmarks + heurísticas |
| **Criativo** | Roteiros, design, copy | Rica | Templates + referências + voice DNA + anti-padrões |

**Moreh classifica o squad sendo criado antes de compor a KB.** Se operacional/analítico/criativo: skeleton de 3 seções NÃO é aceitável.

---

## 8. 3 Camadas de Contexto (Auroq)

Skill = Claude + KB + persona + regras. A KB se estrutura em 3 camadas de contexto:

| Camada | Pergunta | Vem de |
|--------|----------|--------|
| **"Quem"** | Pra quem trabalha? | `docs/knowledge/expert-mind/` — propósito, identidade, assessments |
| **"Como"** | O que sabe fazer? | `docs/knowledge/expert-business/` — posicionamento, metodologia, produto + biblioteca tratada |
| **"O Que"** | O que tá rolando agora? | `business/campanhas/` — contexto ativo |

### 8.1 Aplicação na KB do squad

Quando Moreh gera KB, incorpora contexto das 3 camadas:

```markdown
## Contexto do Domínio

### Quem
{Extrato de expert-mind — propósito e identidade do expert}

### Como
{Metodologia, frameworks, posicionamento do expert}

### O Que
{Campanhas ativas, contexto do momento}
```

### 8.2 Regra de escopo

KB do squad puxa **só o relevante** das 3 camadas. Não copia tudo. Ex: squad de copy usa tom de voz + metodologia de copy, não precisa de assessments psicométricos.

---

## 9. Progressive Disclosure (Anthropic Skills)

Não carregar toda a KB de uma vez. Estruturar em níveis.

### 9.1 3 níveis

| Nível | Conteúdo | Carregamento |
|-------|----------|--------------|
| **Nível 1** | Resumo do método (~100 palavras) | Sempre disponível |
| **Nível 2** | Método completo (~500 linhas) | Quando processo ativa |
| **Nível 3** | Exemplos detalhados e referências | Sob demanda |

### 9.2 Implementação

**SKILL.md curto** referenciando arquivos detalhados:

```markdown
---
name: copy-squad
description: Squad de copy pra lançamentos
---

# Copy Squad

## Resumo (nível 1)
Squad de 3 agentes (researcher + copywriter + editor) pra criar
copy de lançamentos com metodologia PAS + Value Equation.

## Método completo
Ver [metodo-completo.md](data/metodo-completo.md)

## Exemplos detalhados
Ver [exemplos.md](data/exemplos.md)

## Referências
Ver [referencias.md](data/referencias.md)
```

### 9.3 Regra

**SKILL.md < 500 linhas.** Se ultrapassa, aplicar progressive disclosure. Cada linha do SKILL.md entra no contexto do modelo — espaço é caro.

---

## 10. CrewAI Knowledge Sources (se volume grande)

Quando KB é muito grande (muitos exemplos, muitos clientes), considerar:

- **Embeddings + busca semântica** via Knowledge Sources do CrewAI
- Volumes menores: arquivos markdown referenciados são suficientes

### 10.1 Trigger de migração

| Volume | Abordagem |
|--------|-----------|
| < 5.000 linhas total | Markdown referenciado |
| 5.000-50.000 linhas | Markdown + indexação |
| > 50.000 linhas | Embeddings + RAG |

---

## 11. Preferências do Expert/Cliente (separar da KB de método)

Do AIOX — Technical Preferences pattern. Documentar preferências separadamente:

```markdown
## Preferências

- **Tom:** consultivo, nunca agressivo
- **Formato preferido:** bullet points > parágrafos longos
- **Vocabulário:** usar "investimento" em vez de "custo"
- **CTAs proibidos:** "compre agora", "garantido 100%"
- **Emojis:** evitar no body, usar só em CTAs quando couber
```

**Por que separar:** preferências mudam com o tempo/cliente. Método é estável. Mistura dificulta evolução.

---

## 12. Gate de Cobertura da KB [RC-13]

**Na Fase 4 (assemble-squad, Step 6d), ANTES de prosseguir pro validator:**

### 12.1 Checklist obrigatório

- [ ] Cada **PU-TACIT** representado na KB (regras cardinais ou heurísticas)
- [ ] Cada **PU-DECISION** com ≥2 branches tem decision tree na KB
- [ ] Cada **PU-STEP operacional** tem protocolo detalhado (não só mencionado na task)
- [ ] Cada **PU-EXCEPTION crítica** tem troubleshooting na KB
- [ ] **Se ETL existe:** conteúdo operacional do ETL está incorporado (não resumido)
- [ ] KB tem **pelo menos 1 tabela de referência** (cenário → ação)
- [ ] KB usa **vocabulário do usuário** (não termos inventados)

### 12.2 Thresholds

- **Cobertura < 80% = HALT.** Não avança até completar.
- Cobertura ≥80% → prosseguir pro validator
- Cobertura 100% → ideal, raro alcançar

### 12.3 Mensurar cobertura

```
Cobertura = (PU-TACITs na KB + PU-DECISIONs com tree + PU-STEPs operacionais com protocolo + PU-EXCEPTIONs com troubleshooting) / (total de PUs que deveriam estar na KB)
```

Se score <80%, identificar PUs faltantes e completar.

---

## 13. Skill vs Agent Revisited

Já coberto em VOL-01, mas aqui no contexto de KB:

| Situação | Skill | Agent |
|----------|-------|-------|
| Processo one-shot com KB simples | ✅ SKILL.md com method inline | — |
| Processo recorrente com KB rica | ✅ SKILL.md + refs | — |
| Persona contínua + múltiplas KBs | — | ✅ Agent com N skills |
| KB muito grande (>5k linhas) | Skill com progressive disclosure | — |

**Skills têm KB embutida. Agents carregam skills (e suas KBs).**

---

## 14. Exemplo Real — KB de Squad de Tráfego

Caso de referência. Moreh consulta quando gera squad operacional rico.

### 14.1 Estrutura

```
squads/trafego-arcane/data/
├── squad-kb.md                    # Entry point (nível 1 + 2)
├── protocolos/
│   ├── escalar-campanha.md       # Protocolo: quando/como escalar
│   ├── trading-orcamento.md      # Trading horário de orçamento
│   └── kill-criativo.md          # Quando matar criativo
├── decision-trees/
│   ├── escala-agressiva.md       # Árvore: quando ser agressivo
│   └── nicho-vs-orcamento.md     # Árvore: alocar por nicho
├── tabelas/
│   ├── metricas-por-estagio.md   # CPM/CPC/CTR por estágio
│   └── benchmarks-nicho.md       # Benchmarks por nicho
├── regras-cardinais.md           # Top 10 regras
├── troubleshooting.md            # Falhas + resolução
├── glossario.md
└── voice-dna.md                  # Tom do expert (Euriler)
```

### 14.2 Exemplo de regra cardinal

```markdown
### RC-Traf-03: Escala 20-50% por dia, nunca >100%

**Contexto:** Algoritmo Meta precisa de "digestão" pra expandir audiência.
Escala >100% forca reset, CPM dobra.

**Aplicação:**
- Campanha com CPA estável 3+ dias → escalar 30%
- Campanha com CPA caindo → escalar 50%
- Campanha com CPA instável → manter

**Anti-padrão:**
"Funcionou bem hoje, vou dobrar o budget" → viola. Reset iminente.

**Exceção:** lançamento com deadline imperdível — aceitar reset como custo.
```

Isso é **operacional** — squad de tráfego ler isso sabe agir.

---

## 15. Regras Cardinais Aplicáveis

| Regra | Aplicação em VOL-05 |
|-------|---------------------|
| **RC-02 Vocabulário do usuário** | KB preserva termos do expert. Glossário usa jargão dele |
| **RC-06 KB primária** | Tudo deste volume |
| **RC-13 Cobertura 80%+** | Gate obrigatório antes do validator |

---

## 16. Anti-Patterns

| Anti-pattern | Por que falha |
|--------------|---------------|
| KB skeleton de 150 linhas | Viola RC-06. Squad operacional burro |
| Resumo executivo no lugar de protocolos | Perde profundidade, vira genérico |
| Copiar artigo da internet sem tratar | KB genérica, sem voice do expert |
| KB sem exemplos | Método sem referência = LLM improvisa |
| KB desatualizada | Método evoluiu, KB não reflete |
| KB gigante num arquivo só (>2k linhas sem refs) | Viola progressive disclosure |
| Ignorar ETL existente e recompor do zero | Desperdício + inconsistência |
| Inventar termos em vez de usar do expert | Viola RC-02 |
| KB genérica pra múltiplos clientes | Perde diferencial específico |
| Misturar método com preferências do cliente | Dificulta evolução |

---

## 17. Resumo Executivo (cartão de referência)

**KB é cérebro do squad (RC-06).** Tasks definem O QUE, KB define COMO com profundidade.

**6 seções essenciais:**
1. Regras Cardinais (top 5-10)
2. Protocolos Operacionais
3. Decision Trees
4. Tabelas de Referência
5. Troubleshooting
6. Glossário
(+ opcional: Analogias)

**Anti-padrão a evitar:** comprimir ETL de 3k linhas em skeleton de 150. Preservar profundidade.

**Mapeamento PU → KB:**
- STEP operacional → Protocolo
- DECISION → Decision tree
- EXCEPTION → Troubleshooting
- QUALITY_GATE → Critérios
- TACIT → Regra cardinal
- INPUT/OUTPUT → Glossário

**3 camadas de contexto:** Quem (expert-mind) · Como (expert-business) · O Que (campanhas).

**Progressive disclosure (Anthropic):** SKILL.md <500 linhas. Nível 2 e 3 em arquivos referenciados.

**Classificação por tipo:** operacional/analítico/criativo exigem KB rica. Dev/técnico = moderada. Worker = dispensável.

**ETL Integration:** se existir, incorporar profundidade (não resumir). Proveniência `[Fonte:]`.

**Gate de cobertura ≥80% (RC-13).** Cada TACIT representado, DECISION tem tree, STEP operacional tem protocolo, EXCEPTION tem troubleshooting. <80% = HALT.

**Skill vs Agent:** Skills têm KB embutida. Agents carregam N skills (e suas KBs). KB >5k linhas → considerar embeddings + RAG.

---

**Próximo volume:** VOL-06 — Quality Gates, Validação e Self-Healing.

---

# APPENDIX v1.1 — Enriquecimento (2026-04-22)

Patches de KB: Dual Mapping do lado KB (complemento VOL-03 Appendix B), KB evolui pós-launch (RC-20 adotada).

## A. Dual Mapping PU → KB (metade do MP-04)

O outro lado do dual mapping já documentado em VOL-03 Appendix B [Fonte: `agents/squad-forge/tasks/architect-squad.md:63`, `data/forge-kb.md`].

**Regra:** ao mapear PU-STEPs em tasks (VOL-03), o mesmo PU alimenta seção específica da KB em paralelo.

**Mapping canônico PU → KB section:**

| Tipo de PU | Destino KB |
|-----------|------------|
| PU-STEP operacional | Protocolo detalhado (§4 VOL-05) |
| PU-DECISION (≥2 branches) | Decision tree (§5 VOL-05) |
| PU-EXCEPTION crítica | Troubleshooting (§6 VOL-05) |
| PU-QUALITY_GATE | Critérios do gate (§4 VOL-05) |
| PU-DEPENDENCY | Seção de pré-requisitos |
| PU-TACIT | Regra cardinal ou heurística (§3 VOL-05) |
| PU-INPUT / PU-OUTPUT | Glossário + formato esperado (§8 VOL-05) |

**Gate de cobertura (já existente):** >=80% dos PUs mapeados em KB. Com enriquecimento v1.1: distribuir obrigatoriamente por tipo (não basta 80% agregado se todos forem do mesmo tipo).

**Distribuição mínima:**
- 100% dos PU-TACIT → regras cardinais/heurísticas (obrigatório)
- 100% dos PU-DECISION multi-branch → decision trees (obrigatório)
- 80% dos PU-STEP operacionais → protocolos (mínimo)
- 100% dos PU-EXCEPTION críticas → troubleshooting (obrigatório)

## B. KB evolui pós-launch (RC-20 adotada)

Alinhamento com Torres — discovery não para com launch [Fonte: `knowledge-refs/continuous.txt:55-119`]. Detalhado em VOL-11 §11 (Trio Pattern).

**Princípio:** KB não é artefato congelado no momento da composição do squad. É repositório vivo alimentado por uso contínuo.

**Mecanismos de evolução pós-launch:**

### B.1 Trio Sync semanal (→ KB)

Do Trio Pattern (VOL-08 Appendix D). Cadência semanal gera outputs que alimentam KB:

```
[Trio Sync semanal — 15-20 min]
Executor: O que rodou, onde travou
Validator: Onde reprovou, por quê
Researcher: Patterns observados

Output pra KB:
- Novo troubleshooting entry (se falha recorrente)
- Nova regra (se pattern consolidado ≥3 semanas)
- Update em decision tree (se cenário não-coberto apareceu)
- Update em glossário (se termo novo virou recorrente)
```

### B.2 Diff de KB por release

Cada semver do squad (ex: 1.2.0 → 1.3.0) deve ter changelog de KB:

```markdown
# KB-CHANGELOG.md

## 1.3.0 (2026-05-15)

### Added
- Troubleshooting: "Cliente cancela no D+2" (origem: trio sync 2026-05-10)
- Decision tree: "Quando escalar CPA acima de 30%" (origem: pattern de 4 semanas)

### Modified
- Regra cardinal RC-Traf-03 revisada (thresholds ajustados de 50% → 40%)

### Deprecated
- Protocolo "envio manual de leads" (substituído por automação em 1.2)
```

### B.3 KB staleness detection

Método pra detectar KB congelada:

```
KB health score:
  last_update < 30 dias    = GREEN  (evoluindo)
  30-90 dias sem update    = YELLOW (slowing)
  >90 dias sem update      = RED    (congelada, squad pode estar decaindo)
```

Squad com KB RED por >60 dias → pedir retro formal (pode estar obsoleto).

## C. Preferências do expert/cliente separadas do método

Já mencionado em VOL-05 §11. Enriquecimento v1.1: formalizar como estágio separado.

**Regra:** arquivo `preferences.md` ao lado de `squad-kb.md`, NÃO dentro. Razão: método é estável, preferências mudam com contexto.

```
squads/meu-squad/
├── data/
│   ├── squad-kb.md         # Método (estável)
│   ├── preferences.md      # Preferências expert (mutável)
│   └── voice-dna.md        # Se aplica
```

Quando squad é replicado pra outro expert, `preferences.md` é re-escrito, `squad-kb.md` permanece.

---

## Fim do Appendix VOL-05 v1.1
