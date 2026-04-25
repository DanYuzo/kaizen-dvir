# VOL-02 — Extração de Processo (Fase 1 da construção de squad)

> **KB:** KaiZen | **Consumer:** Moreh (squad criador de squads)
> **Domínio:** D2 — Extração de Processo
> **Fontes primárias:** `loc-04-squad-forge/data/extraction-lenses`, `loc-04-squad-forge/data/pu-classification`, `loc-04-squad-forge/agents/process-archaeologist`, `loc-04-squad-forge/tasks/extract-process`, `loc-04-squad-forge/tasks/playback-validate`
> **Regras cardinais principais:** RC-01, RC-02, RC-10, RC-14, **RC-15** (playback obrigatório)

---

## 1. O Que Este Volume Ensina

Extração é **a fase mais pesada** do pipeline de criação de squads. A qualidade de tudo que vem depois depende da profundidade desta fase.

Moreh vai aprender aqui:

1. **Inspiração metodológica** — Goldratt + Ohno + Gawande (como pensar, não frameworks pra impor)
2. **8 Lentes de extração** — cobertura completa do processo em ângulos complementares
3. **Process Units (PUs)** — como transformar conversa em unidades atômicas estruturadas
4. **Rounds iterativos** — R1 exploração → R2 profundidade → R3 precisão → RN cirúrgico
5. **7 técnicas especiais** — "O Basicamente", "5 Whys", "Observador", "Gargalo", etc.
6. **Gap detection** — identificar o que falta entre rounds
7. **Playback validation** — rule KaiZen-level (RC-15) de anti prompt-injection
8. **Regras globais** — conversation, zero inference, gemba, between rounds, completeness
9. **Métricas de sucesso** — QG-SF-001 (o gate bloqueante desta fase)

---

## 2. Por Que Extração É o Gargalo

### 2.1 O problema

Experts e info-produtores fazem coisas extraordinárias **sem saber explicar**. O conhecimento vive no automático — decidem em 3 segundos o que levaria 30 minutos pra articular.

Tentativa ingênua:
```
"Me conta seu processo de X"
→ Usuário dá resposta vaga de 3 parágrafos
→ IA cria squad baseado nisso
→ Squad é genérico e não funciona
```

**Por que falha:**
- Zero profundidade
- Sem validação de que capturou o processo real
- Sem mapeamento de decisões, exceções, qualidade
- Sem identificação de conhecimento tácito (o mais valioso)

### 2.2 A solução

Extração profunda exige:
- **Múltiplos rounds** — processo complexo não sai em 1 conversa
- **Ângulos diferentes** — visão geral ≠ sequência ≠ decisões ≠ exceções
- **Técnicas específicas** — "5 Whys" pra decisões, "Observador" pra tácito
- **Zero inferência** — se parece faltar, PERGUNTA (RC-01)
- **Validação narrativa** — apresentar de volta pro expert e coletar "esse é meu processo" (RC-15)

---

## 3. Inspiração Metodológica (NÃO frameworks impostos)

3 pensadores informam o **método** de extração. **NUNCA** impor o framework deles como conteúdo.

### 3.1 Eliyahu Goldratt — Theory of Constraints

**Princípio:** todo sistema tem um gargalo. Otimizar qualquer outro ponto é ilusão.

**Aplicação em extração:** sempre perguntar:
- "Onde esse processo mais TRAVA?"
- "O que precisa acontecer ANTES?"
- "Qual passo é o mais crítico?"

**Output esperado:** identificação do bottleneck (PU-DEPENDENCY com `bottleneck: true`).

### 3.2 Taiichi Ohno — Toyota Production System / 5 Whys

**Princípio:** a raiz de uma decisão raramente é a primeira razão dada. Perguntar "por que" 5 vezes chega na regra real.

**Aplicação:** quando expert diz "depende":
- Why 1: "Depende de quê?"
- Why 2: "E o que determina isso?"
- Why 3: "E quando isso acontece?"
- Why 4: "E por que esse critério e não outro?"
- Why 5: "Qual é a regra real por trás disso?"

**Output esperado:** PU-DECISION com critério explícito (não "depende").

### 3.3 Atul Gawande — Checklist Manifesto

**Princípio:** complexidade se domina decompondo em passos confiáveis verificáveis.

**Aplicação:** NÃO aceitar "aí eu basicamente faço X". Decompor em ações atômicas que **qualquer agente pode executar**.

**Output esperado:** PU-STEPs atômicos (sem "e" ou "depois" ligando duas ações).

### 3.4 Importante

Esses pensadores informam **O MÉTODO** de extração. O Archaeologist extrai **O PROCESSO DO USUÁRIO**, nunca impõe framework externo. [RC-02 vocabulário do usuário é sagrado]

---

## 4. As 8 Lentes de Extração

Cada processo é explorado por 8 ângulos complementares. **Iterativos** — não sequenciais rígidos. Archaeologist retorna a lentes anteriores conforme nova informação emerge.

### 4.1 Agrupamento em rounds

| Round | Lentes | Objetivo | Duração | Completude esperada |
|-------|--------|----------|---------|---------------------|
| **R1 — Exploração** | L1 + L2 | Esqueleto do processo | 15-30 min | ~50% |
| **R2 — Profundidade** | L3 + L4 + L5 | Processo detalhado | 15-30 min | ~75% |
| **R3 — Precisão** | L6 + L7 + L8 | Processo completo | 10-20 min | ~90% |
| **RN — Cirúrgico** | Gap-driven | Fechar gaps | 5-15 min/round | ≥95% |

### 4.2 L1 — Visão Geral 🦅

**Objetivo:** entender o macro (início, fim, propósito, frequência, contexto).

**Gera PUs:** STEP (parcial), INPUT, OUTPUT.

**Perguntas-chave:**
- Abertura: "Descreve pra mim esse processo como se eu fosse alguém que nunca viu."
- Trigger: "Quando esse processo dispara? O que acontece antes?"
- Endpoint: "Quando você sabe que terminou com sucesso?"
- Contexto: "Com que frequência faz? Quanto tempo leva? Alguém mais participa?"

**Regras:**
- Dar espaço pro usuário descrever livremente
- Não apressar — se divagar, deixar
- Registrar vocabulário que o usuário usa [RC-02]
- Marcar sub-processos pra explorar separado

### 4.3 L2 — Sequência de Passos 📋

**Objetivo:** capturar a sequência linear.

**Gera PUs:** STEP.

**Perguntas-chave:**
- Sequência: "O que você faz PRIMEIRO? E depois?"
- Detalhamento: "Esse passo — quanto tempo leva? Usa que ferramenta?"
- Gaps: "Tem alguma coisa que você faz ENTRE esses dois passos que parece tão natural que quase esquece?"

**Regras:**
- Numerar passos conforme o usuário descreve
- Se pular (do 1 pro 5), perguntar o que tem no meio
- "Basicamente faço X" → APROFUNDAR ("basicamente" esconde passos)
- Marcar decisões mencionadas pra L3

### 4.4 L3 — Decisões 🔀

**Objetivo:** extrair cada IF/THEN, cada "depende", cada bifurcação.

**Gera PUs:** DECISION.

**Perguntas-chave:**
- "Você disse 'depende' — depende de quê exatamente?"
- "Qual critério você usa pra saber se tá bom?"
- "Tem alguma situação onde você PULA esse passo?"
- "Voce tem regra de bolso aqui? 'Se X, SEMPRE faço Y'?"
- "Quando você diz 'bom o suficiente' — o que isso significa em número/prazo/métrica?"

**Regras:**
- Cada "depende" do usuário DEVE virar PU-DECISION com condição explícita
- Se não consegue explicar critério → TACIT (L8)
- Aplicar 5 Whys quando decisão parece arbitrária
- Quantificar sempre que possível

### 4.5 L4 — Exceções e Falhas ⚠️

**Objetivo:** capturar o que dá errado, plano B, casos atípicos.

**Gera PUs:** EXCEPTION.

**Perguntas-chave:**
- "O que acontece quando esse passo dá errado? Qual plano B?"
- "Já teve caso atípico que pegou de surpresa?"
- "Qual o pior cenário possível?"
- "Tem plano de emergência?"
- "Com que frequência esse problema acontece?"

**Regras:**
- Exceções definem processos **maduros** — não pular
- Classificar severidade: blocker / degraded / cosmetic
- Registrar frequência (recorrente vs raro muda design)
- Se usuário diz "nunca dá errado", **desconfiar e insistir gentilmente**

### 4.6 L5 — Inputs e Outputs 📦

**Objetivo:** mapear tudo que entra e sai de cada passo.

**Gera PUs:** INPUT, OUTPUT.

**Perguntas-chave:**
- "Quando começa esse passo, o que já precisa ter em mãos?"
- "Que ferramenta usa aqui?"
- "Tem template que segue?"
- "Que dados consulta?"

**Regras:**
- Cada passo deve ter ≥1 input e ≥1 output identificado
- Ferramentas são dados importantes (automação/substituição)
- Conexões input↔output entre passos = DEPENDENCY
- **Templates do usuário são OURO** — pedir pra descrever/mostrar

### 4.7 L6 — Qualidade ✅

**Objetivo:** extrair critérios implícitos de "bem feito".

**Gera PUs:** QUALITY_GATE.

**Perguntas-chave:**
- "Como você sabe que esse passo ficou BOM?"
- "Se outra pessoa fizesse, o que você checaria?"
- "Qual a diferença entre 'bom o suficiente' e 'excelente'?"
- "Já pegou esse passo MAL FEITO? O que denunciou?"
- "O que NUNCA pode acontecer? Erro imperdoável?"

**Regras:**
- Critérios viram quality gates no squad gerado
- Antipadrões viram veto conditions
- "Bom o suficiente" precisa quantificação

### 4.8 L7 — Dependências 🔗

**Objetivo:** entender o que PRECISA acontecer antes do que.

**Gera PUs:** DEPENDENCY.

**Perguntas-chave:**
- "Pode fazer o passo N antes do N-1?"
- "Quais passos são obrigatoriamente sequenciais?"
- "Onde esse processo mais TRAVA?" (Goldratt)
- "Se pudesse acelerar UM passo, qual faria mais diferença?"
- "Quais passos são independentes? Poderiam ser paralelos?"

**Regras:**
- Gargalo (Goldratt) é informação crítica
- Dependências externas = pontos de handoff humano
- Passos paralelos podem virar agentes distintos
- Construir grafo de dependências: PU-X depends_on PU-Y

### 4.9 L8 — Conhecimento Tácito 🧠

**Objetivo:** extrair o que o usuário faz sem pensar — o mais valioso e mais difícil.

**Gera PUs:** TACIT.

**Perguntas-chave:**
- "Se ensinasse pra alguém do zero, onde essa pessoa ia travar?"
- "Tem coisa que faz no AUTOMÁTICO mas nunca ensinou?"
- "Se alguém te observasse, o que notaria que você mesmo não nota?"
- "Quebra suas próprias regras? Quando? Por quê?"
- "Quando olha pro resultado, o que 'sente' que tá certo antes de analisar?"

**Regras:**
- Tácito é o MAIS DIFÍCIL — paciência é chave
- "Nãosei" → reformular: "Pensa na última vez..."
- "É só experiência" → follow-up: "Experiência DE QUÊ especificamente?"
- Hesitações são pistas — registrar
- Máximo 5 perguntas (qualidade > quantidade)

---

## 5. Process Units (PUs) — Unidade Atômica

Cada informação extraída vira uma **PU atômica** estruturada. 8 tipos.

### 5.1 Campos universais (todo PU)

| Campo | Obrigatório | Descrição |
|-------|-------------|-----------|
| `pu_id` | Sim | Format: `PU-{slug}-{sequence:3d}` (ex: `PU-oferta-003`) |
| `type` | Sim | Um dos 8 tipos |
| `content` | Sim | Descrição atômica |
| `source_lens` | Sim | L1-L8 (qual lente extraiu) |
| `source_round` | Sim | R1, R2, R3, RN |
| `confidence` | Sim | 0.0-1.0 (1.0 = usuário confirmou explicitamente) |
| `inferred` | Sim | boolean — true = não veio diretamente do usuário, precisa confirmação |
| `depends_on` | Não | Lista de PU-IDs que este depende |
| `related_to` | Não | Lista de PU-IDs relacionados |
| `user_confirmed` | Não | boolean — true após playback |
| `notes` | Não | Observações do archaeologist |

### 5.2 Os 8 tipos

#### STEP — Passo concreto executável
```yaml
pu_id: "PU-oferta-003"
type: STEP
content: "Escrever headline da pagina de vendas usando formula PAS (Problem-Agitate-Solution)"
source_lens: L2
source_round: R1
confidence: 0.9
executor_hint: agent
estimated_time: "15min"
tools_used: ["Google Docs", "template-headline.md"]
```

**Regras:** Content deve ser ação concreta (verbo + objeto). Não pode ser vago. **Atômico** — se tem "e" ou "depois" ligando 2 ações, quebrar em 2 PUs.

#### DECISION — Bifurcação com condição e branches
```yaml
pu_id: "PU-oferta-007"
type: DECISION
content: "Decidir se a oferta vai ter garantia ou nao"
condition: "IF ticket > R$500"
branches:
  - "THEN: garantia de 30 dias com reembolso total"
  - "ELSE: garantia de 7 dias padrao"
criteria: "Ticket alto = risco percebido maior = precisa garantia forte"
```

**Regras:** Condition deve ser explícita. ≥2 branches. Criteria vem do usuário (não inventado). "Depende" sem explicação = INVÁLIDO.

#### EXCEPTION — Caso atípico, falha, plano B
```yaml
pu_id: "PU-oferta-012"
type: EXCEPTION
content: "Cliente reclama que a promessa e exagerada"
trigger: "Headline agressiva demais gera expectativa irreal"
response: "Reescrever headline com proof elements, adicionar disclaimer"
severity: degraded      # blocker | degraded | cosmetic
frequency: ocasional    # raro | ocasional | recorrente
```

#### QUALITY_GATE — Critério de qualidade
```yaml
pu_id: "PU-oferta-015"
type: QUALITY_GATE
content: "Validar que a oferta tem todos os 4 elementos da Value Equation"
criteria: "Dream Outcome + Perceived Likelihood + Time Delay + Effort/Sacrifice"
applies_to: ["PU-oferta-003", "PU-oferta-005", "PU-oferta-008"]
blocking: true
```

#### DEPENDENCY — Relação obrigatória entre passos
```yaml
pu_id: "PU-oferta-018"
type: DEPENDENCY
content: "Headline depende da pesquisa de dores do publico"
from_pu: "PU-oferta-001"
to_pu: "PU-oferta-003"
dependency_type: blocking
reason: "Sem pesquisa de dores, headline sera generica"
```

#### INPUT — Material necessário
```yaml
pu_id: "PU-oferta-020"
type: INPUT
content: "Lista de 10 maiores dores do publico-alvo"
consumed_by: "PU-oferta-003"
source: "Pesquisa de mercado (passo anterior)"
format: "Lista em markdown"
```

#### OUTPUT — Entregável produzido
```yaml
pu_id: "PU-oferta-022"
type: OUTPUT
content: "Pagina de vendas completa e revisada"
produced_by: "PU-oferta-010"
consumed_by: ["PU-oferta-011"]
format: "HTML/landing page"
```

#### TACIT — Conhecimento não-articulado
```yaml
pu_id: "PU-oferta-025"
type: TACIT
content: "Quando leio a headline e nao sinto vontade de continuar lendo, sei que ta fraca"
manifestation: "Teste de 3 segundos: se a headline nao prende em 3 segundos, reescreve"
related_steps: ["PU-oferta-003"]
heuristic: "Se EU nao clicaria, o cliente tambem nao"
```

### 5.3 Regras de criação (Archaeologist)

1. **Atomicidade** — se tem "e"/"depois" ligando ações, quebrar em 2 PUs
2. **Zero inference** [RC-01] — NÃO inventar. Parece faltar? PERGUNTAR.
3. **Proveniência** — todo PU tem source_lens + source_round
4. **Confidence** — 1.0 = usuário disse explicitamente. <0.5 = inferido, precisa confirmação
5. **Vocabulário do usuário** [RC-02] — usar os termos dele, não inventar nomenclatura

### 5.4 Regras de rejeição

| Regra | O que é | Ação |
|-------|---------|------|
| PU genérico | "Fazer certo", "entregar qualidade" — qualquer um diria | Rejeitar, pedir detalhe específico |
| PU sem proveniência | Sem source_lens ou source_round | Rejeitar |
| PU duplicado | Mesmo conteúdo já existe | Merge com existente, preservar maior confidence |
| PU composto | "e" ou "depois" ligando ações | Quebrar em 2+ PUs |
| DECISION sem criteria | "Depende" sem explicação | Marcar incompleto, pergunta cirúrgica próximo round |

### 5.5 Thresholds globais

| Métrica | Mínimo |
|---------|--------|
| Total PUs por processo | ≥15 |
| PU-STEPs | ≥5 |
| PU-DECISIONs | ≥2 |
| PU-QUALITY_GATEs | ≥1 |
| PU-DEPENDENCYs | ≥1 |
| % PUs inferred | <30% |
| Rounds completados | ≥2 |

Menos que isso = extração superficial, não passa no QG-SF-001.

---

## 6. Rounds Iterativos

### 6.1 Round 1 — Exploração (L1 + L2)

**Duração:** 15-30 min | **Output:** ~50% completo

Archaeologist pergunta visão geral + sequência. Captura esqueleto.

```
=== ROUND 1: EXPLORACAO ===

Vou comecar entendendo o macro do seu processo e depois os passos.

Me descreve esse processo como se eu fosse alguem que nunca viu.
Comeca com: o que dispara ele? O que acontece primeiro?
```

### 6.2 Round 2 — Profundidade (L3 + L4 + L5)

**Duração:** 15-30 min | **Output:** ~75% completo

Aprofunda cada passo do R1. Aplica técnicas "5 Whys" e "Gemba" (ver seção 7).

### 6.3 Round 3 — Precisão (L6 + L7 + L8)

**Duração:** 10-20 min | **Output:** ~90% completo

Qualidade, dependências, tácito. Exige paciência (L8 é o mais difícil).

### 6.4 Round N — Cirúrgico (gap-driven)

**Duração:** 5-15 min por round | **Output:** ≥95%

Perguntas **específicas** geradas pela gap analysis. Repete até completude ≥95% ou usuário parar.

### 6.5 Gap Analysis entre rounds

Após cada round, Archaeologist analisa PUs existentes:

```yaml
gap_report:
  total_pus: N
  steps_without_decisions: [step_numbers]
  decisions_without_criteria: [pu_ids]
  steps_without_io: [step_numbers]
  steps_without_exceptions: [step_numbers]
  unresolved_inferred: [pu_ids]
  lens_coverage: "X/8"
  completeness_estimate: "0.XX"
  recommendation: "Round N+1 focando em {gaps}"
```

Gaps comuns + perguntas cirúrgicas:

| Gap detectado | Pergunta gerada |
|---------------|------------------|
| Passo sem decisões | "No passo X, tem alguma situação onde faz diferente?" |
| Decisão sem criteria | "Você disse 'depende' no passo X. Depende de quê?" |
| Passo sem I/O | "O que você precisa ter em mãos pra começar passo X?" |
| Exceção não explorada | "O que acontece quando passo X dá errado?" |
| Dependência implícita | "Pode fazer passo X antes do Y?" |
| Tácito referenciado | "Você mencionou que 'sente' quando tá certo. O que exatamente observa?" |

---

## 7. 7 Técnicas Especiais de Extração

Archaeologist tem 7 técnicas treinadas. Moreh deve saber **quando aplicar cada**.

### 7.1 Técnica 1: "O Basicamente"

**Trigger:** usuário diz "basicamente eu faço X".
**Movimento:** "'Basicamente' esconde passos. Me conta o passo a passo dentro desse 'basicamente'."

### 7.2 Técnica 2: "5 Whys" (Ohno)

**Trigger:** usuário diz "depende" ou "às vezes".
**Movimento:** 5 perguntas "por quê" em cascata até chegar na regra real.

### 7.3 Técnica 3: "O Observador" (Tácito)

**Trigger:** usuário não consegue articular.
**Movimento:** "Se alguém te observasse fazendo, o que essa pessoa notaria?" / "Se ensinasse amanhã, onde essa pessoa ia travar?"

### 7.4 Técnica 4: "O Gargalo" (Goldratt)

**Trigger:** qualquer processo (aplicar sempre).
**Movimento:** "Onde trava mais?" / "Se acelerasse UM passo, qual faria mais diferença?"

### 7.5 Técnica 5: "O Decompositor" (Gawande)

**Trigger:** passo parece muito grande.
**Movimento:** "Esse passo tem sub-passos? Me descreve o detalhe." / "Se tivesse que escrever um checklist, o que entraria?"

### 7.6 Técnica 6: "O Cenário"

**Trigger:** usuário está abstrato.
**Movimento:** "Me dá um exemplo real da última vez que fez isso." / "Pensa no último cliente. Como foi esse passo?"

### 7.7 Técnica 7: "O Gemba" (Ohno — Go and See)

**Trigger:** processo envolve ferramentas, telas, ações físicas.
**Movimento:** "Me MOSTRA como faz. Compartilha tela e faz esse passo enquanto observo." / "Manda um print." / "Cola aqui o template que usa."

**Quando ativar especificamente:**
- Usuário descreve passo envolvendo ferramenta (planilha, sistema, app)
- Descrição verbal é genérica ("aí eu preencho lá no sistema")
- Processo tem interface visual (dashboard, formulário, template)
- Handoff entre sistemas ("exporto de X, importo em Y")

**O que observar no gemba:**
- Passos que usuário faz sem perceber (cliques automáticos, atalhos)
- Campos que preenche vs ignora
- Ordem real vs ordem descrita (frequentemente divergem)
- Micro-decisões implícitas na interface

**Regra de ouro Gemba:** "Me contar" captura ~70% do processo. "Me mostrar" captura os 30% que usuário esquece porque faz no automático.

---

## 8. Playback Validation — Rule KaiZen-Level (RC-15)

### 8.1 Por que é KaiZen-level

**Insight #4 (LangChain):** toda mutação de specs exige **human-in-loop** — anti prompt-injection. Nada que afete o comportamento do squad futuro é implementado sem confirmação humana explícita.

Isso eleva playback de "boa prática" a **regra inegociável** (RC-15). Moreh NUNCA avança da extração pra arquitetura sem playback aprovado.

### 8.2 O Protocolo

Após Round N (extração ≥95% completa), Chief (não Archaeologist) assume e executa playback:

1. Ler todos os PUs + gap-report + métricas
2. **Transformar em narrativa legível** (não YAML bruto)
3. Apresentar ao usuário
4. Coletar: "Isso bate? O que tá errado? O que falta?"
5. Integrar correções imediatamente no banco de PUs
6. Re-apresentar trecho afetado se correções significativas
7. **Só avança quando usuário disser "esse é meu processo"**

### 8.3 Formato da narrativa

```
=== SEU PROCESSO: {nome} ===

{descricao em 2-3 frases}

Trigger: {o que inicia}
Duracao estimada: {tempo total}
Total de passos: {N}

─── FLUXO ────────────────────────────

1. {Nome do Passo 1} ({tempo}, {executor_icon})
   {Descricao do que faz}
   Usa: {ferramentas}
   Precisa: {inputs}
   Produz: {outputs}

   ⚡ Decisao: {condicao}
      → Se sim: {branch A}
      → Se nao: {branch B}

   ⚠️ Se der errado: {trigger} → {response}

2. {Nome do Passo 2} ({tempo}, {executor_icon})
   ...

─── QUALITY CHECKS ───────────────────

✅ Apos passo {N}: {criterio}

─── GARGALO ──────────────────────────

🔗 O passo {N} e o mais lento/critico do processo.

─── CONHECIMENTO TACITO ──────────────

🧠 {Heuristica ou intuicao registrada}

─── METRICAS ─────────────────────────

PUs extraidos: {N}
Lentes cobertas: {X}/8
Confianca media: {0.XX}
```

**Legenda de executor icons:**
- 👤 Human (só você faz)
- 🤖 Agent (IA pode fazer)
- 🤝 Hybrid (IA prepara, você revisa)
- ⚙️ Worker (automação)

### 8.4 Loop de correções

```
Usuario aponta erro
  ↓
Identificar PU afetado
  ↓
Atualizar PU (content, confidence → 1.0)
  ↓
Re-apresentar trecho
  ↓
Usuario confirma?
  ├─ SIM → próximo trecho ou finaliza
  └─ NÃO → nova correção (max 5 iterações)
```

Se 5 iterações sem convergência: **pausar, retomar com mente fresca** (anti-fadiga).

### 8.5 QG-SF-002 (Gate do playback)

| Critério | Obrigatório |
|----------|-------------|
| Usuário disse "esse é meu processo" (ou equivalente) | Sim |
| Todas correções integradas | Sim |
| Nenhum PU marcado como "usuário discorda" | Sim |

**Veto conditions:**
- Usuário rejeitou o processo ("não é isso")
- Correções pendentes não integradas

---

## 9. Regras Globais de Extração

### 9.1 Conversation [RC-02]

- Isso NÃO é formulário. É CONVERSA. Adaptar perguntas ao fluxo.
- Máximo **3 perguntas por mensagem** (evitar interrogatório).
- Cada mensagem do archaeologist deve conter **insight**, não só pergunta.
- Se resposta longa: extrair e confirmar entendimento antes de prosseguir.
- **Vocabulário do usuário é sagrado** — usar os termos dele, não inventar nomenclatura.

### 9.2 Zero Inference [RC-01]

- NÃO inferir passos não mencionados.
- Se algo parece faltar, **PERGUNTAR** — não preencher.
- Se precisar especular: marcar `[INFERRED]` com confidence <0.5.
- Tudo não-direto do usuário precisa confirmação.

### 9.3 Gemba

- Quando processo envolve ferramenta/tela/interface: pedir pra **MOSTRAR** ao invés de CONTAR.
- "Me mostra como faz" > "Me conta como faz" — sempre que possível.
- Observar passos feitos sem perceber (cliques automáticos, atalhos).
- Captura os ~30% que usuário esquece porque faz no automático.

### 9.4 Between Rounds

- Entre cada round: analisar PUs e identificar gaps.
- Gerar perguntas cirúrgicas pro próximo round baseadas em gaps.
- Mostrar progresso ao usuário: "Capturei X passos, Y decisões, Z exceções. Faltam..."

### 9.5 Completeness

| Métrica | Mínimo | Ideal |
|---------|--------|-------|
| Total PUs | ≥15 | ≥25 |
| Lentes cobertas | 6/8 | 8/8 |
| Confiança média | ≥0.7 | ≥0.85 |
| Cada passo de L2 com L3 ou L4 explorado | Sim | Sim |
| PU-QUALITY_GATEs | ≥1 | ≥3 |
| PU-DEPENDENCYs | ≥1 | ≥3 |

---

## 10. QG-SF-001 — Gate de Extração

**Bloqueia Fase 1 → Fase 2** (Extração → Playback).

### 10.1 Critérios obrigatórios (BLOCKING)

- [ ] Total PUs ≥ 15
- [ ] PU-STEPs ≥ 5
- [ ] PU-DECISIONs ≥ 2
- [ ] PU-QUALITY_GATEs ≥ 1
- [ ] PU-DEPENDENCYs ≥ 1
- [ ] Lentes cobertas ≥ 6 de 8
- [ ] Confiança média ≥ 0.7
- [ ] PUs inferred < 30% do total

### 10.2 Recomendados (NON-BLOCKING)

- [ ] Total PUs ≥ 25
- [ ] 8/8 lentes cobertas
- [ ] Confiança média ≥ 0.85
- [ ] PUs inferred < 10%
- [ ] Cada passo com ≥1 decisão ou exceção explorada
- [ ] Gargalo (bottleneck) identificado
- [ ] ≥2 PU-TACITs capturados

### 10.3 Veto conditions (AUTO-FAIL)

- PUs total < 5
- Zero PU-DECISIONs
- Zero PU-QUALITY_GATEs
- Zero PU-DEPENDENCYs
- >50% dos PUs inferred

### 10.4 Override do usuário

Usuário pode aceitar extração incompleta **explicitamente** (registra warning + non-blocking override). Moreh avisa, usuário decide.

---

## 11. Técnicas de Extração — Cheat Sheet

Tabela consolidada. Moreh consulta durante extração.

| Sinal do usuário | Técnica | Exemplo de pergunta |
|------------------|---------|---------------------|
| "Basicamente faço X" | O Basicamente | "Me conta o passo a passo dentro desse 'basicamente'" |
| "Depende" / "às vezes" | 5 Whys | "Depende de quê? E o que determina isso?" |
| "Não sei explicar" | O Observador | "Se alguém te observasse, o que notaria?" |
| Descrição abstrata | O Cenário | "Me dá exemplo real da última vez" |
| Passo parece grande | O Decompositor | "Esse passo tem sub-passos?" |
| Envolve ferramenta/tela | O Gemba | "Me MOSTRA. Compartilha a tela." |
| Qualquer processo | O Gargalo | "Onde trava mais?" |
| "Nunca dá errado" | (Desconfiar + insistir) | "Mas já deu problema alguma vez?" |
| "É só experiência" | (Follow-up) | "Experiência DE QUÊ especificamente?" |
| Hesitação/reformulação | (Registrar + explorar) | "Você parou antes. O que veio na cabeça?" |
| Contradição com antes | (Clarificar) | "Antes você disse X, agora Y. Qual é a regra real?" |
| Cansaço aparente | (Pausar) | "Vamos pausar. Retomamos no passo X" |

---

## 12. Anti-Patterns da Extração

| Anti-pattern | Por que falha |
|--------------|---------------|
| Fazer formulário em vez de conversa | Formulário ignora nuance, não extrai tácito |
| Ir direto pra L3/L4 sem L1/L2 | Perde contexto macro, detalhes sem significado |
| Interrogar (>3 perguntas por mensagem) | Cansaço do usuário, respostas superficiais |
| Preencher lacunas sem perguntar | Viola RC-01 (zero inferência) |
| Usar jargão próprio em vez do usuário | Viola RC-02 (vocabulário do usuário) |
| Pular playback | Viola RC-15 (human-in-loop obrigatório) |
| Apresentar YAML no playback | Usuário não lê, não valida |
| Aceitar "nunca dá errado" | Processos maduros têm exceções — insistir |
| Apressar usuário | Extração é iterativa, leva tempo |
| Impor Goldratt/Ohno/Gawande como framework | Esses INFORMAM método, não são conteúdo |
| Confidence alta sem confirmação direta | Mentira estatística — vira fumaça |

---

## 13. Regras Cardinais Aplicáveis Neste Volume

| Regra | Aplicação em VOL-02 |
|-------|---------------------|
| **RC-01 Zero inferência** | Core do método. Se falta, perguntar. |
| **RC-02 Vocabulário do usuário** | Jargão do expert é sagrado. Registrar termos. |
| **RC-10 Playback antes de construir** | Gate obrigatório Fase 1 → Fase 2. |
| **RC-14 Anti-viagem** | Executar dentro do escopo planejado. |
| **RC-15 Human-in-loop em mutações** | Playback KaiZen-level rule. Anti prompt-injection. |

---

## 14. Resumo Executivo (cartão de referência)

**Extração é o gargalo** — qualidade do squad depende da profundidade aqui.

**Inspiração (não framework):** Goldratt (gargalo) · Ohno (5 Whys) · Gawande (decomposição).

**8 Lentes:**
- R1 (Exploração): L1 Visão Geral · L2 Sequência
- R2 (Profundidade): L3 Decisões · L4 Exceções · L5 I/O
- R3 (Precisão): L6 Qualidade · L7 Dependências · L8 Tácito
- RN (Cirúrgico): gap-driven

**8 tipos de PU:** STEP · DECISION · EXCEPTION · QUALITY_GATE · DEPENDENCY · INPUT · OUTPUT · TACIT.

**Thresholds mínimos:** ≥15 PUs · ≥5 STEPs · ≥2 DECISIONs · ≥1 QG · ≥1 DEPENDENCY · 6/8 lentes · confiança ≥0.7 · inferred <30%.

**7 técnicas especiais:** O Basicamente · 5 Whys · O Observador · O Gargalo · O Decompositor · O Cenário · O Gemba.

**Playback é rule KaiZen-level (RC-15):** narrativa legível (não YAML), usuário confirma "esse é meu processo", integrar correções, max 5 iterações.

**QG-SF-001 bloqueia avanço.** Se não passa, não vai pra arquitetura.

**Regra de ouro:** "Me contar" captura 70%. "Me mostrar" (Gemba) captura os 30% automáticos. Sempre que possível, pedir pra mostrar.

---

**Próximo volume:** VOL-03 — Arquitetura e Design de Squads (Fase 2 da construção).

---

# APPENDIX v1.1 — Enriquecimento (2026-04-22)

Patches adicionados via merge v1.1. Origem: re-análise squad-forge + ingestão das 5 refs externas.

## A. Round Structure Fixa de Extração

Padrão implícito no squad-forge Auroq [Fonte: `agents/squad-forge/data/extraction-lenses.yaml:26-47`, `tasks/extract-process.md:51-80`]:

| Round | Lentes | Duração | Objetivo |
|-------|--------|---------|----------|
| **R1** | L1+L2 | 15-30 min | Exploração macro (visão geral + sequência) |
| **R2** | L3+L4+L5 | 15-30 min | Profundidade (decisões + exceções + I/O) |
| **R3** | L6+L7+L8 | 10-20 min | Precisão (qualidade + dependências + tácito) |
| **RN** | gap-driven | 5-15 min | Cirúrgico (preencher gaps específicos detectados) |

**Quando violar a sequência:** processos muito simples (5-10 PUs) podem fundir R1+R2. Processos muito complexos (50+ PUs) expandem R3 em sub-rounds. Mas sempre: R1 antes de R2, R2 antes de R3.

## B. Gap-Driven Questions Protocol

Do forge-chief [Fonte: `agents/squad-forge/agents/forge-chief.md:154-166`]. Entre rounds, archaeologist + chief analisam PUs capturados e detectam gaps. Gaps viram perguntas cirúrgicas pro próximo round, NUNCA assunções preenchidas.

```
Processo:
1. Após round, rodar diagnóstico:
   - Quais PU-STEPs sem PU-DECISION adjacente?
   - Quais passos sem PU-INPUT/OUTPUT?
   - Quais decisões sem branches explicitados?
   - Quais PU-TACIT com confidence <0.6?
   
2. Cada gap vira pergunta:
   "No passo 5 você decide atender primeiro — por qual critério?"
   "No passo 3 você puxa dados — de onde exatamente?"
   
3. Próximo round usa essas perguntas como foco.
4. NÃO inferir resposta. NÃO completar "deve ser X".
```

## C. Confidence Tracking (MP-06)

Todo PU carrega metadata de incerteza [Fonte: `agents/squad-forge/data/pu-classification.yaml:189-191`]:

```yaml
pu_universal_fields:
  confidence: 0.0-1.0    # certeza do archaeologist
  inferred: boolean      # true = não confirmado pelo usuário
  source_lens: L1-L8     # lente que capturou
  source_round: R1-RN    # round que capturou
  user_confirmed: boolean # confirmado no playback?
```

**Regras de threshold:**
- Confidence média >=0.7 (senão, QG-SF-001 FAIL)
- PUs inferred <30% (senão, mais rounds exigidos)
- PUs inferred <50% (senão, veto automático)

Aplicado pra playback: PUs inferred precisam destaque explícito ("isso é suposição minha, confirma?").

## D. 5-Step Musk Algorithm como Stress Test

Protocolo formalizado pra entre extract-process e architect-squad [Fonte: `knowledge-refs/elon.txt:87-129`]. Detalhado em VOL-11 §6. Aqui o enforcement local:

**Quality gate intermediário (SF-001.5):** após extração, rodar 5 steps em ordem:

```
1. Questionar cada PU-STEP com nome de responsável (Musk:95)
2. Deletar >=10% (Musk:108 — se <10%, insuficiente)
3. Simplificar remanescentes
4. Acelerar onde há espera/serialização
5. Só então avaliar executor_hint (automação é PASSO 5)
```

Se nenhum passo foi deletado, QG-SF-001 vira CONCERNS — algo tá sendo automatizado que devia ser removido.

## E. Story-Based Interviewing

Complemento ao Gemba pra casos onde observação não é possível (decisões mentais, julgamento) [Fonte: `knowledge-refs/continuous.txt:430-487`].

**Técnica:** trocar "como você faz X?" por "me conta a última vez que você fez X".

| Pergunta idealizada (fraca) | Story-based (forte) |
|------------------------------|---------------------|
| "Como você prioriza clientes?" | "Me conta o último cliente que priorizou — situação, opções, por que esse" |
| "Como você decide preço?" | "Me conta a última precificação — qual era o produto, o que pesou?" |
| "Como você sabe que tá bom?" | "Conta a última vez que você disse 'tá bom' — o que você viu?" |

Memória específica revela variáveis que pergunta direta esconde.

## F. "Best Part Is No Part" — KPI de deleção

Meta quantitativa no stress test [Fonte: `knowledge-refs/elon.txt:108, 119`].

- **Target:** deletar >=10% dos PU-STEPs na fase de stress test
- **Se <10%:** Musk diz "didn't delete enough" — rodar novamente
- **Meta implícita:** assumir default é deletar, não manter. Ônus da prova é pra quem preserva

Aplicado ao gate: adicionar métrica `stress_test_deletion_rate` aos critérios non-blocking de QG-SF-001. Se >20%, PASS+. Se <10%, WARNING.

---

## Fim do Appendix VOL-02 v1.1
