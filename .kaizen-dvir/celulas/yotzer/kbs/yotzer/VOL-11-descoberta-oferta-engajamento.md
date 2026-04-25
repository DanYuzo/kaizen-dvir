# VOL-11 — Descoberta, Oferta e Engajamento

> **Volume:** 11 de 11 (adicionado no merge v1.1 — 2026-04-22)
> **Foco:** o que envelopa a construção — upstream (validação de mercado + descoberta de oportunidade + stress test) e downstream (oferta, engajamento, adoção)
> **Consumer:** Moreh (squad criador de squads)
> **Relação com outros volumes:** VOLs 1-10 cobrem como CONSTRUIR um squad. VOL-11 cobre o que vem ANTES (problema certo, oportunidade validada, oferta desenhada) e DEPOIS (adoção, habit, iteração contínua).

---

## 1. Por que esse volume existe

Os 10 volumes anteriores ensinam o Moreh a construir um squad com precisão cirúrgica — extrair processo, desenhar arquitetura, compor contratos, montar KB, validar em camadas. O que eles NÃO cobrem:

- Como saber se o problema é real e se o mercado está pronto
- Como mapear oportunidades antes de escolher uma
- Como testar suposições sem construir primeiro
- Como eliminar o desnecessário antes de automatizar
- Como desenhar o squad como OFERTA (não como artefato técnico)
- Como garantir que o squad será usado de fato (não só entregue)

Cinco referências moldaram esse volume — cada uma entregando uma peça que faltava no método. Esse é o território do "tá bom?" antes do "faz" e do "continuou usando?" depois do "tá pronto".

| Peça que faltava | Quem resolve | Fonte |
|------------------|--------------|-------|
| Validar mercado antes de construir | Alex Hormozi (100M Leads) | `knowledge-refs/100M.txt` |
| Mapear oportunidade estruturadamente | Teresa Torres (Continuous Discovery Habits) | `knowledge-refs/continuous.txt` |
| Eliminar antes de otimizar | Elon Musk via James Clear | `knowledge-refs/elon.txt` |
| Decompor em granularidade correta | Alex Hormozi + Eva Juergens (AI Vision) | `knowledge-refs/ai-vision.txt` |
| Desenhar pra formar hábito | Nir Eyal (Hooked) | `knowledge-refs/hooked.txt` |

**Princípio central:** construção sem descoberta é desperdício caro. Entrega sem engajamento é museu. Esse volume fecha os dois buracos.

---

## 2. Market Validation Checklist — o mercado tá pronto?

Antes do Moreh extrair qualquer processo, precisa saber se o problema que o squad vai resolver existe de verdade. Hormozi formaliza uma hierarquia que inverte a intuição do construtor técnico.

### 2.1 A hierarquia que muda tudo

> "Starving Crowd (market) > Offer Strength > Persuasion Skills" [Fonte: 100M.txt:273]

Traduzindo: mercado faminto > oferta forte > habilidade de persuasão. Um rating "ótimo" em um nível mais alto anula deficiências nos níveis abaixo. Um rating "ruim" em um nível alto trava tudo, mesmo com excelência nos níveis seguintes.

Aplicado ao Moreh: squad brilhante pra resolver problema que ninguém tem = museu. Squad mediano pra resolver dor aguda + frequente = roi imediato.

### 2.2 Os 4 indicadores de mercado viável

Hormozi identifica 4 critérios pra avaliar um mercado [Fonte: 100M.txt:251-264]:

| Indicador | O que verificar | Pergunta do Moreh |
|-----------|----------------|-------------------|
| **Dor massiva** | "They must not want, but desperately need, what I am offering" [100M.txt:252] | O processo manual atual gera desperdício, retrabalho, frustração recorrente? |
| **Poder de compra** | "Your audience needs to be able to afford the service" [100M.txt:258] | Quem sofre a dor tem autonomia/budget pra adotar squad? |
| **Fácil de alcançar** | "I look for easy-to-target markets" [100M.txt:261] | Os usuários do squad estão identificáveis e reuníveis? |
| **Em crescimento** | "Growing markets are like a tailwind" [100M.txt:263] | O contexto onde o squad atua está expandindo ou encolhendo? |

### 2.3 Checklist operacional — pré-extração

Antes de ativar o process-archaeologist do Moreh, rodar esse filtro:

```
[ ] Dor real? (não idealização)
    — Quantas vezes por semana alguém reclama disso?
    — Qual o custo (tempo/dinheiro/moral) da dor hoje?

[ ] Budget? (não "seria legal se")
    — Quem paga a conta do status quo hoje?
    — Esse pagador conhece o tamanho do desperdício?

[ ] Alcançável? (não "universo todo")
    — Lista finita de pessoas que vão usar?
    — Canais pra levar o squad até eles?

[ ] Crescente? (não "saturado")
    — O contexto vai ter mais ou menos desse tipo de trabalho nos próximos 6 meses?
    — Tecnologia, regulação ou demanda mudando a favor?
```

**Regra do Hormozi:** em mercado "normal" dá pra ganhar bem; em mercado "ruim" nada funciona [Fonte: 100M.txt:271-272]. Se algum indicador tá no vermelho, discutir com o expert antes de seguir.

### 2.4 Sinal de veto

> "The Pro Tip: The point of good writing is for the reader to understand. The point of good persuasion is for the prospect to feel understood." [Fonte: 100M.txt:255]

Se o expert não consegue descrever a dor nas próprias palavras de quem sente, Moreh pausa. Dor mal-articulada gera squad mal-direcionado.

---

## 3. Opportunity-Solution Tree — o mapa antes do caminho

Teresa Torres resolveu um problema que atormenta todo time de produto: como decidir o que construir quando várias opções fazem sentido. O Opportunity-Solution Tree (OST) é o artefato visual que liga outcome desejado a soluções testáveis.

### 3.1 A estrutura

> "An Opportunity Solution Tree: Outcome → Opportunity → Opportunity → ... → Solution → Assumption Test" [Fonte: continuous.txt:170-188]

```
             OUTCOME (valor pro negócio)
              /        |        \
     Oportunidade  Oportunidade  Oportunidade
       /    \         /   \          /   \
     Sol.  Sol.    Sol. Sol.      Sol. Sol.
      |     |       |    |         |    |
    Test  Test    Test  Test    Test  Test
```

**Outcome:** mudança de comportamento/estado que o negócio quer (não feature, não output)
**Opportunity:** "customer needs, pain points, and desires that, if addressed, would drive your desired outcome" [Fonte: continuous.txt:192]
**Solution:** hipótese de como endereçar a oportunidade
**Assumption Test:** teste pequeno pra validar a solução sem construir completo

### 3.2 Por que não pular direto pra solução

Torres aponta os 4 vilões da decisão [Fonte: continuous.txt:229]:

1. Olhar muito estreito pro problema
2. Buscar evidência que confirma crença (confirmation bias)
3. Decidir pela emoção do momento
4. Excesso de confiança

O OST combate os 4 ao forçar "compare and contrast" em vez de "whether or not" [Fonte: continuous.txt:236]. Em vez de "devemos construir X?", a pergunta vira "qual dessas 3 oportunidades endereça melhor o outcome?".

### 3.3 Aplicação no Moreh

Antes do extract-process, o expert precisa ter clareza do OUTCOME. Moreh pergunta:

```
"Se esse squad funcionar perfeitamente daqui 3 meses,
 o que muda no seu negócio/vida?"
```

A resposta é o outcome. Se vier "vou ter um squad automatizado", é output, não outcome. Moreh repergunta até chegar em algo como "reduzo em 60% o tempo que gasto com X" ou "consigo atender 3x mais clientes sem contratar".

Depois, Moreh monta o OST em texto estruturado:

```markdown
## Outcome: [resultado mensurável]

### Oportunidade 1: [dor/desejo]
- Sol A: [abordagem]
  - Test: [menor experimento pra validar]
- Sol B: [abordagem alternativa]

### Oportunidade 2: [outra dor/desejo]
- Sol C: [abordagem]
  - Test: [menor experimento]
```

**Regra:** nenhuma oportunidade entra no OST sem vínculo claro ao outcome. Torres avisa: "only include opportunities that are relevant to your outcome" [Fonte: continuous.txt:211].

### 3.4 Problem space e solution space evoluem juntos

> "The problem space and the solution space evolve together" [Fonte: continuous.txt:244]

O OST não é feito uma vez. Ele vive. Quando um teste falha, a lição não é "passar pra próxima solução" — é revisitar o entendimento da oportunidade. Torres cita Nigel Cross: designers experts evoluem problema e solução juntos [Fonte: continuous.txt:245].

Aplicado ao Moreh: quando um quality gate falha durante composição do squad, NÃO é só ajustar o output. É voltar no OST e perguntar: entendemos a oportunidade? O outcome continua válido?

---

## 4. Assumption Testing — testar barato antes de construir caro

Continuous Discovery tem um habit que muda o custo de construir: em vez de validar ideia depois de pronta, testa-se a suposição antes.

### 4.1 Canvas de teste

Cada solução no OST carrega suposições implícitas. Torres separa em quatro tipos [Fonte: continuous.txt:431-487, síntese]:

| Tipo de suposição | O que assume | Como testa |
|-------------------|-------------|------------|
| **Desirability** | Usuário quer isso | Entrevista story-based, protótipo baixa fidelidade |
| **Viability** | Faz sentido pro negócio | Math check, unit economics |
| **Feasibility** | Dá pra construir | Spike técnico, POC |
| **Usability** | Usuário consegue usar | Teste usabilidade, observação |

### 4.2 Template de Assumption Card

Pra cada suposição crítica:

```markdown
## Assumption: [frase declarativa]
**Tipo:** Desirability | Viability | Feasibility | Usability
**Confidence atual:** 0.0-1.0
**Risco se errado:** [o que acontece se a suposição for falsa]
**Menor teste:** [experimento mais barato pra validar]
**Evidência necessária:** [% de resposta, signal quantitativo ou qualitativo]
**Critério de sucesso:** [o que conta como "validado"]
**Status:** Untested | Testing | Validated | Refuted
```

### 4.3 Regra do "menor teste"

Torres insiste: rodar "small research activities" [Fonte: continuous.txt:131]. Não é pesquisa de 6 meses. É entrevista de 20 minutos semana que vem.

Pra o Moreh isso vira: antes de construir o squad inteiro, rodar uma sessão com o expert usando PU-STEPs em papel. Se a sequência não faz sentido em 20 minutos de dry-run, não vai funcionar em produção.

### 4.4 Integração com confidence score (MP-06)

O confidence score que o process-archaeologist atribui a cada PU (VOL-02) é uma forma de assumption. PU com confidence <0.7 é assumption não-validada. Antes de seguir, ou testa (mini-playback com expert), ou marca explicitamente como risco no blueprint.

---

## 5. Grand Slam Offer — squad é oferta, não artefato

Hormozi redefine o que é um produto bem-sucedido: não é "funciona" — é "o cliente sentiria burrice em recusar". Aplicado ao squad, muda o briefing inteiro.

### 5.1 A definição

> "Make people an offer so good they would feel stupid saying no." [Fonte: 100M.txt:104, citando Travis Jones]

> "Grand Slam Offer: an offer you present to the marketplace that cannot be compared to any other product or service available" [Fonte: 100M.txt:196, síntese]

Squad mediano: "sim, automatiza X". Grand Slam squad: "resolve X em 20 minutos contra 8 horas, com 3 safety nets, e se não resolver você tem Y garantido".

### 5.2 Value Equation

Hormozi operacionaliza valor em 4 drivers [Fonte: 100M.txt, capítulo Value, síntese do bloco 385-390 segundo relatório da exploração]:

```
            (Dream Outcome × Likelihood of Achievement)
Valor = ─────────────────────────────────────────────
         (Time Delay × Effort & Sacrifice)
```

- **Dream Outcome:** qual é o resultado desejado (não a feature)
- **Perceived Likelihood:** o cliente acredita que vai funcionar?
- **Time Delay:** em quanto tempo o resultado aparece?
- **Effort & Sacrifice:** quanto trabalho/dor custa pro cliente usar?

Pra aumentar valor: ↑ dream outcome, ↑ likelihood, ↓ time delay, ↓ effort. Qualquer decisão de design do squad pode ser avaliada por esses 4 eixos.

### 5.3 Aplicação no design do squad

Moreh avalia cada squad gerado contra 4 checks:

| Eixo | Pergunta de design |
|------|--------------------|
| Dream Outcome | Nosso squad entrega o resultado que o expert SONHA ou só um passo intermediário? |
| Likelihood | Que evidências o squad gera pra o expert acreditar que vai funcionar? (spot-check visíveis, preview, dry-run) |
| Time Delay | Quanto tempo entre "liga squad" e "tem output útil"? (se é >1 dia, precisa de entregas intermediárias) |
| Effort | Quanto o expert precisa saber/fazer pra usar o squad? (se é >10 min de onboarding, algo tá errado) |

### 5.4 Commodity vs Grand Slam

> "Commoditized = Price Driven Purchases (race to the bottom) / Differentiated = Value Driven Purchases (sell in a category of one)" [Fonte: 100M.txt:192-194]

Squad commodity: "mais um squad de extração". Squad Grand Slam: "squad que extrai processo em 2h com playback obrigatório e zero invenção, único no mercado de meta-forges". O Moreh deve perseguir o segundo.

### 5.5 Divergent thinking no design

Hormozi usa divergent thinking no design de oferta: gerar múltiplas soluções por problema antes de escolher. Aplicado ao Moreh durante architect-squad: pra cada PU-STEP, o smith gera pelo menos 2 formas de mapear em task, escolhe baseado em value equation.

---

## 6. 5-Step Musk Algorithm — o método de stress test

Elon Musk formalizou um protocolo pra evitar o erro clássico de otimizar o desnecessário. É sequencial e não se pula etapa.

### 6.1 Os 5 passos na ordem

> "Musk's algorithm to bust bureaucracy at his production sites contains five main steps" [Fonte: elon.txt:87]

| # | Passo | Regra-chave |
|---|-------|-------------|
| 1 | **Question every requirement** | Atribuir nome (pessoa real) a cada requirement. "You need to know the name of the real person who made that requirement" [elon.txt:95] |
| 2 | **Delete any part of the process you can** | Se você não adicionou de volta >=10% do que deletou, não deletou suficiente [elon.txt:108] |
| 3 | **Simplify and optimize** | "A common mistake is to simplify and optimize a part or a process that should not exist" [elon.txt:119] |
| 4 | **Accelerate cycle time** | "Every process can be speeded up, but only do this after you have followed the first three steps" [elon.txt:124] |
| 5 | **Automate** | "The big mistake in [my factories] was that I began by trying to automate every step. We should have waited until all the requirements had been questioned, parts and processes deleted, and the bugs were shaken out" [elon.txt:127-129] |

### 6.2 Por que a ordem importa

O erro que Musk confessa: automatizou passos que deveria ter deletado. Resultado: infraestrutura cara pra rodar o que nem precisa existir.

Aplicado ao Moreh: se o squad automatiza um passo desnecessário, o expert paga (em complexidade, manutenção, tokens) pra rodar desperdício. Stress test vira quality gate.

### 6.3 Protocolo Moreh-adaptado

Entre extract-process (fase 1) e architect-squad (fase 2), rodar:

```
STEP 1 — Questionar
  Pra cada PU-STEP extraído:
    "Quem decidiu que esse passo existe? Nome da pessoa."
    "Por que esse passo existe?"
  
  Se a resposta é "sempre foi assim" ou "não sei", flag RED.

STEP 2 — Deletar
  Meta: marcar >=10% dos PU-STEPs como candidatos a delete.
  Justificar: "esse passo resolve qual PU-INPUT? Se removermos, quebra?"
  Se <10% deletados: insuficiente. Revisitar.

STEP 3 — Simplificar
  Pra cada PU-STEP que sobreviveu:
    "Esse passo pode ser uma fração dele mesmo?"
    "Combinar com outro passo elimina handoff?"

STEP 4 — Acelerar
  Pra cada fluxo sobrevivente:
    "Qual parte do tempo é espera? Pode ser paralelizada?"
    "Qual parte é trabalho? Pode ser reduzida?"

STEP 5 — Automatizar
  Só agora decidir executor_hint (agent/hybrid/human/worker).
  Se automatizar passo que não sobreviveu aos 4 anteriores, rollback.
```

### 6.4 "The best part is no part"

Musk: se você não adicionou de volta pelo menos 10% do que deletou, não deletou suficiente [elon.txt:108]. Traduzindo: assumir que o default é deletar, não manter. O ônus da prova é pra quem quer preservar o passo, não pra quem quer remover.

### 6.5 Attaching name ao requirement

Por que o passo 1 exige nome? Porque requirement anônimo é imune à crítica. Musk: "Requirements from smart people are the most dangerous because people are less likely to question them" [elon.txt:99]. Aplicado ao Moreh: cada regra herdada de um processo anterior precisa ter autoria rastreável. Sem autoria, é candidato a delete.

### 6.6 Skip level

Musk recomenda, pra problem-solving: "Don't just meet with your managers. Do a skip level, where you meet with the right people that are at the front line" [elon.txt:161]. Aplicado ao Moreh: quando extrair processo, não só com o expert — também com quem executa no chão (se houver). O expert descreve intenção; o executor descreve realidade.

---

## 7. Workflow Decomposition — hierarquia de 4 níveis

Hormozi + Eva Juergens entregam a peça que reconciliam task-first (RC-03) com decomposição granular. Não é contradição — é hierarquia.

### 7.1 A mudança de mentalidade

> "One of the big shifts that everybody here has to make is shifting away from thinking about roles-based growth and expansion towards workflow-based automation" [Fonte: ai-vision.txt:2]

> "You have to go more granular to the level of [...] this action to this action to this action to this action all the way through [...] it might be 120 actions that go from inbound lead to dirt" [Fonte: ai-vision.txt:6]

Não é "contratar editor". É identificar quais 4-5 workflows o editor faz, e dentro de cada workflow, quais ações atômicas de 30s.

### 7.2 Os 4 níveis

| Nível | O que é | Exemplo "editor" | Duração típica |
|-------|---------|------------------|----------------|
| **Role** | Abstração organizacional/papel humano | "Editor" | N/A (é abstração) |
| **Workflow** | SOP completo | "Editar hotline hormozi" | 30 min |
| **Task** | Unidade agente/humano (KaiZen atual) | "Segmentar transcrição por falante" | 5-10 min |
| **Action** | Ação atômica observável | "Remover todos os 'um' e 'ah'" | 30s |

### 7.3 Reconciliação com RC-03

RC-03 (task-first) continua válida — tasks são primárias em SQUAD level. O que muda: tasks existem DENTRO de workflows, DENTRO de roles. Role e Workflow são abstrações de organização; Task é unidade de execução do squad; Action é o que a task FAZ dentro de si.

**Nova RC-21 adotada:** "Role > Workflow > Task > Action" é a hierarquia oficial. Task continua sendo a unidade do squad; os níveis superiores (role/workflow) dão contexto de escopo, os níveis inferiores (action) dão instrução executável.

### 7.4 Exemplo concreto — podcast editing

Hormozi dá o exemplo completo [Fonte: ai-vision.txt:35-51]:

```
ROLE: Editor de Podcast

WORKFLOW: Processar hotline

  TASK 1: Baixar transcrição
    ACTION 1a: Chamar API de transcript
    ACTION 1b: Salvar em /hotlines/{data}.txt
  
  TASK 2: Segmentar por falante
    ACTION 2a: Detectar mudança Alex → interlocutor
    ACTION 2b: Marcar timestamps de virada
  
  TASK 3: Extrair momento de maior tensão
    ACTION 3a: Ler palavras, identificar pico emocional
    ACTION 3b: Marcar esse momento como abertura do clip
  
  TASK 4: Limpar filler
    ACTION 4a: Remover "um", "ah", pausas >2s
  
  TASK 5: Exportar final
    ACTION 5a: Manter só 4 pontos que Alex delivered
    ACTION 5b: Colapsar o resto
    ACTION 5c: Export MP4 final
```

### 7.5 Implicação pra o Moreh

Durante extract-process, Moreh captura no nível Role/Workflow primeiro (big picture). Durante architect-squad, desce pra Task (unidade do squad). Durante compose, cada Task tem Actions listadas em instruction (executável).

**Regra implícita:** se uma Task tem mais de 5-7 Actions internas, ou ela deveria ser 2 Tasks, ou as Actions deveriam virar uma skill reutilizável (RC-22).

### 7.6 Observable behavior only

> "We have to break it down to what someone would do" [Fonte: ai-vision.txt:58]

Hormozi insiste: ações precisam ser observáveis. "Seja mais carismático" não é ação. "Levante o tom de voz, aumente 20% a velocidade, acene quando o outro falar" são ações. Traduzindo pro Moreh: toda Action na task deve ser descrita em comportamento observável. Isso vale tanto pra agents quanto pra humanos.

---

## 8. Skill Markdown → Agent Include (pipeline de formalização)

Hormozi mostra um pipeline de 3 estágios pra levar conhecimento de processo manual a agente autônomo [Fonte: ai-vision.txt:194-207]:

### 8.1 Os 3 estágios

```
Estágio 1: Markdown file (SOP escrito em linguagem natural)
              ↓
Estágio 2: Skill markdown (markdown + prompt + exemplos testados)
              ↓
Estágio 3: Agent include (skill integrada no agente)
```

Cada estágio é um nível maior de formalização. Não se pula estágio — cada um revela problemas que o próximo não resolveria.

### 8.2 Protocolo operacional (7 passos)

> "If I had to implement AI into my content workflow from scratch, this is exactly how I would do it" [Fonte: ai-vision.txt:192]

1. Decompor processo em roles (start to finish)
2. Decompor roles em workflows (SOPs)
3. Decompor workflows em steps (cada unidade mínima)
4. Converter cada workflow/SOP em skill markdown file
5. Testar e refinar skill em task real; corrigir até output = ou melhor que manual
6. Converter skill em agent include (inclusão em agente)
7. Repetir pra cada role/workflow; conectar via handoffs

### 8.3 Nova RC-22 adotada

**RC-22: KB → Skill → Agent Pipeline.** Conhecimento é formalizado em 3 estágios progressivos. Pular estágio degrada qualidade. Moreh deve forçar essa sequência — primeiro markdown, depois skill testada, depois integração em agente.

### 8.4 Handoff entre workflows

> "Once you have agents built for each workflow for each position, write out the handoff" [Fonte: ai-vision.txt:207]

O handoff artifact (MP-07 em VOL-07/VOL-08) é exatamente esse "write out the handoff" que conecta workflows em processo completo. Confirma o pattern encontrado em squad-forge.

### 8.5 Human quality control entre estágios

> "Not everything can be automated quite yet, and there's a lot of human quality control you need to implement in between each role/stage" [Fonte: ai-vision.txt:209]

Alinhado com RC-15 (human-in-loop). Moreh deve identificar explicitamente onde fica o checkpoint humano entre workflows, não deixar implícito.

---

## 9. Hook Model — design pra adoção recorrente

Nir Eyal estudou por que alguns produtos criam hábito e outros ficam no museu de features não-usadas. O Hook Model tem 4 fases que loopam até o hábito formar.

### 9.1 As 4 fases

> "The Hook Model has four phases: trigger, action, variable reward, and investment" [Fonte: hooked.txt:124]

```
  Trigger (Externo → Interno)
      ↓
   Action (baixa fricção)
      ↓
  Variable Reward (surpresa, não linear)
      ↓
  Investment (user colabora, ↑ ties)
      ↓
  [volta pro Trigger, agora interno]
```

### 9.2 Trigger — externo vs interno

> "Triggers come in two types: external and internal" [Fonte: hooked.txt:86]

**Externos (4 tipos):**
| Tipo | Descrição | Fonte |
|------|-----------|-------|
| **Paid** | Advertising, search marketing. "Paid triggers can be effective but costly" [hooked.txt:297] |
| **Earned** | Press, viral, featured. "Free but require investment in time" [hooked.txt:300] |
| **Relationship** | Word of mouth, convites, referrals. "Can create viral hyper-growth" [hooked.txt:305] |
| **Owned** | App icon, notifications, e-mail subscrito. "Consume real estate in the user's environment" [hooked.txt:310] |

**Internos:** emoções (especialmente negativas) que o produto alivia [Fonte: hooked.txt:319]. "Feelings of boredom, loneliness, frustration, confusion, and indecisiveness often instigate a slight pain or irritation and prompt an almost instantaneous and often mindless action" [hooked.txt:322].

### 9.3 Action — B = MAT

Eyal cita BJ Fogg: comportamento acontece quando **Motivação + Ability (facilidade) + Trigger** estão presentes juntos [Fonte: hooked.txt:399]. Se qualquer um falta, ação não rola.

Aplicado ao Moreh: squad que faz o expert ir fundo pra acionar (edita config, lembra comando complexo, abre 3 arquivos antes) tem ability baixa. Cada passo de fricção reduz probabilidade de uso recorrente.

### 9.4 Variable Reward — por que cria craving

> "What distinguishes the Hook Model from a plain vanilla feedback loop is the Hook's ability to create a craving. Feedback loops are all around us, but predictable ones don't create desire" [Fonte: hooked.txt:94]

Eyal cita dopamina: "Introducing variability multiplies the effect, creating a focused state" [hooked.txt:95]. O cérebro adora reward previsível no começo (aprender padrão) mas rejeita depois que virou rotina. Variabilidade mantém engajamento.

Tipos de variable reward:
- Reward of the tribe (social — aprovação, reconhecimento)
- Reward of the hunt (caça — informação, recursos)
- Reward of the self (mestria — progresso pessoal)

### 9.5 Investment — a fase que trava adoção

> "The investment phase increases the odds that the user will make another pass through the Hook cycle in the future. The investment occurs when the user puts something into the product of service such as time, data, effort, social capital, or money" [Fonte: hooked.txt:99]

Investment ≠ gasto. É o que o user DEIXA no produto que melhora a próxima volta pelo hook. Mais setup, mais preferências, mais histórico, mais customização.

Aplicado: cada vez que o expert usa o squad, deveria ficar algo que a próxima vez fica melhor. Um log de decisões que o próximo agente lê. Uma preferência armazenada. Um playbook refinado.

### 9.6 Aplicação no Moreh — Hook Canvas

Pra cada squad gerado, Moreh deve responder:

```markdown
## Hook Canvas — [squad-name]

### Trigger
- **Externo inicial:** como o expert é lembrado de usar o squad? (owned preferencial)
- **Interno-alvo:** qual dor/emoção o squad alivia? (5 Whys até emoção)

### Action
- Quantos passos entre "decidiu usar" e "output aparecendo"?
- Qual a menor ação possível pra ativar? (ex: slash command)

### Variable Reward
- O que o squad entrega DIFERENTE a cada execução? (não pode ser rotina 100% previsível)
- Há progresso visível? Celebração de marco?

### Investment
- O que fica no sistema depois que o squad roda?
- A próxima execução fica melhor por causa da anterior? Como?
```

Se qualquer campo vazio, hook incompleto. Adoção vai ser frustrante.

---

## 10. Variable Reward Schedule — cadência de feedback

A intuição diz: entregar output previsível e consistente. Eyal mostra: previsibilidade mata hábito.

### 10.1 Habit Zone

> "A behavior that occurs with enough frequency and perceived utility enters the Habit Zone" [Fonte: hooked.txt:206]

Frequência × Utilidade percebida. Se o squad roda 1x por mês, precisa ter utilidade absurda. Se roda 5x por dia, utilidade média já segura. Moreh precisa escolher posicionamento nesse plano.

### 10.2 Vitamins vs Painkillers

> "Habit-forming technologies are both. These services seem at first to be offering nice-to-have vitamins, but once the habit is established, they provide an ongoing pain remedy" [Fonte: hooked.txt:227]

> "A habit is when not doing an action causes a bit of pain" [hooked.txt:224]

Squad bem-desenhado começa como vitamin (nice-to-have, curiosity-driven) e vira painkiller (not using causes pain). A transição acontece via frequency + investment.

### 10.3 Cadências de reforço (intermittent schedules)

Pesquisa comportamental clássica identifica 4 schedules [Fonte: síntese com hooked.txt:94-102, aplicação]:

| Schedule | Descrição | Exemplo no Moreh |
|----------|-----------|------------------|
| **FR (Fixed Ratio)** | Reward a cada N ações | "A cada 10 squads, resumo consolidado" |
| **VR (Variable Ratio)** | Reward em número aleatório de ações | "Eventualmente um spotlight num pattern detectado" |
| **FI (Fixed Interval)** | Reward após tempo fixo | "Retro semanal" |
| **VI (Variable Interval)** | Reward em tempo aleatório | "Quando algo interessante emerge, flag" |

Slot machines usam VR (daí o vício). Ferramentas de uso contínuo precisam equilibrar: alguma previsibilidade (VI/FI) pra não parecer caos, mas variabilidade suficiente pra não virar rotina morta.

### 10.4 Regra pra Moreh

Squad bem-desenhado tem:
- 1 reward de FR (entrega base previsível — o output principal)
- 1 reward de VR/VI (surpresa — insight detectado, pattern, sugestão inesperada)

Sem VR, vira máquina. Sem FR, vira caos.

### 10.5 Variable reward ≠ feature aleatória

Importante: variable reward NÃO significa output aleatório. A qualidade do output principal deve ser consistente. O que varia é o METAREWARD — reconhecimento, insight lateral, conexão com outro squad, celebração.

---

## 11. Trio Pattern — discovery não para no launch

Torres observa uma mudança estrutural em times de produto de alto desempenho: discovery e delivery não são etapas sequenciais. São contínuas, feitas por um trio fixo.

### 11.1 O trio

> "The term 'product trio' will refer to a product manager, a designer, and a software engineer working together to develop products for their customers" [Fonte: continuous.txt:110]

Três papéis permanentes, decisões coletivas, discovery contínua mesmo pós-launch [Fonte: continuous.txt:55, 119-128].

### 11.2 Aplicação no Moreh

O Moreh não é um trio, é um squad. Mas o padrão se aplica. Pra cada squad gerado, 3 papéis colaboram continuamente (mesmo depois do launch):

| Papel | Responsabilidade |
|-------|------------------|
| **Executor** | Agente (ou humano) que roda a task |
| **Validator** | Juiz (quality gate) que avalia output |
| **Researcher** | Observador contínuo que detecta drift, pattern, oportunidade |

### 11.3 Cadência semanal

Torres enfatiza: "at a minimum, weekly touchpoints with customers" [Fonte: continuous.txt:132]. Traduzido pro Moreh: cada squad ativo deve ter uma sessão semanal de 15-20 min onde:

- Executor lista o que rodou e onde travou
- Validator lista onde reprovou output
- Researcher lista o que observou que ninguém pediu

Saída: 1-3 decisões sobre o que ajustar no squad.

### 11.4 Alinhamento com RC-20 adotada

**RC-20: KB evolui pós-launch.** Torres fornece o mecanismo operacional — cadência semanal do trio mantém a KB viva. Não é burocracia; é como o squad fica competitivo ao longo de meses.

### 11.5 Learning goals vs performance goals

> "Learning goals" antes de "performance goals" [Fonte: continuous.txt:323-328, parafraseado]

Primeiros 2-3 meses de vida do squad: metas de APRENDIZADO (validar suposições, calibrar outputs, ajustar KB). Só depois, metas de PERFORMANCE (N squads rodados, X% tempo reduzido). Invertendo a ordem, você otimiza o errado.

---

## 12. Niche Lock — compromisso antes de pivotar

Hormozi tem um princípio contra-intuitivo contra a flakiness do empreendedor recém-frustrado.

### 12.1 A regra

> "I have a saying when coaching entrepreneurs on picking their target market: 'Don't make me niche slap you.' Too often, a newer entrepreneur half-heartedly tries one offer in one market, doesn't make a million dollars, then mistakenly thinks 'this is a bad market.'" [Fonte: 100M.txt:277-278]

> "If you try one hundred offers, I promise you will succeed" [Fonte: 100M.txt:300]

Pivotar antes de testar é síndrome. A resposta: commit ao nicho/problema por período mínimo antes de reconsiderar.

### 12.2 Aplicação no Moreh

Squad recém-gerado vai parecer imperfeito. Vai ter output fraco em casos edge. O instinto é mudar arquitetura. Regra:

```
Niche Lock Protocol:
  - Mínimo: 10 iterações OU 4 semanas de uso
  - Durante esse período: NÃO mudar arquitetura core
  - Permitido mudar: KB, prompts, checklists
  - Proibido mudar: número de agentes, separação de papéis, quality gates
  - Após mínimo: retro formal → decisão de manter/adaptar/reconstruir
```

### 12.3 Stop personalizing

> "Stop personalizing! It's not about you! If your offer doesn't work, it doesn't mean you suck. It means your offer sucks. Big difference" [Fonte: 100M.txt:301]

Squad que não funciona não significa expert incompetente. Significa offer (squad) precisa ajuste. Distinguir importa — pivot emocional é caro.

### 12.4 Quando é hora legítima de pivotar

3 sinais (todos juntos, não um):

1. Mercado mudou estruturalmente (indicador de Market Validation vira RED)
2. Assumption crítica refutada em assumption testing
3. Completou o mínimo de 10 iterações/4 semanas sem tração

Menos que os 3 = niche slap.

---

## 13. Story-Based Interviewing — captura de tacit

Torres tem uma técnica de entrevista que muda o que o process-archaeologist consegue extrair.

### 13.1 A técnica

> "What did you do last time?" (memory-grounded) >> "What do you usually do?" (idealized self) [Fonte: continuous.txt:430-487, síntese]

Humano descreve "o que faria" de forma idealizada (sem bias de memória, otimista). Mas perguntando "conta a última vez que você fez X", acessa memória específica — revela detalhes, exceções, frustrações que não aparecem no modo idealizado.

### 13.2 Integração com Gemba

VOL-02 já tem Gemba ("me mostra" > "me conta"). Story-based é o complemento quando Gemba não é possível (processo intelectual, decisão mental). Em vez de perguntar "como você decide X?", perguntar "me conta a última vez que você decidiu X — o que aconteceu, o que estava em cima da mesa?".

### 13.3 Protocolo no extract-process

Antes de cada ronda do process-archaeologist, se o PU é TACIT (decisão implícita, julgamento, intuição), usar story-based em vez de pergunta direta:

```
ANTES (idealizada):
  "Como você decide qual cliente atender primeiro?"

DEPOIS (story-based):
  "Me conta o último cliente que você priorizou. 
   Qual era a situação? Quais outras opções tinha?
   O que te fez escolher esse?"
```

A resposta story-based revela variáveis que a pergunta direta esconde.

### 13.4 Connection with 5 Whys

Eyal também cita 5 Whys de Ohno [Fonte: hooked.txt:349]. Story-based + 5 Whys = captura de trigger interno/emocional. "Me conta a última vez que você abriu o app. Por quê? [resposta]. Por quê isso importava?" [...] 5 níveis depois, emoção fundante aparece.

---

## 14. Guarantee as Risk Reversal — squad contract

Hormozi tem um mecanismo de oferta que transfere risco do comprador pro vendedor — e aumenta valor percebido sem mudar o produto.

### 14.1 Por que garantia funciona

> "Percepção de risco é preço" — parafraseando Hormozi [síntese de 100M.txt bloco garantias]

Cliente não compra se o risco é alto demais. Garantia reduz risco percebido a zero (ou quase). Resultado: conversão sobe, preço pode subir.

### 14.2 Aplicado ao squad contract

Squad pode ter "guarantee-like clauses" no contract:

| Cláusula | Exemplo |
|----------|---------|
| **Uptime guarantee** | "Se squad falhar em >2 de 10 execuções, trigger de self-healing automático" |
| **Rollback guarantee** | "Se output reprovar 2x seguidas, volta pra versão anterior" |
| **Error recovery SLA** | "Erro crítico resolve em <4h, ou escala pro expert" |
| **Preview before commit** | "Nunca altera sem dry-run + aprovação" |

Essas cláusulas no squad.yaml (ou equivalente) viram parte da definição formal do squad.

### 14.3 Padrão AIOX já existente

PA-01 (Dry-Run) e PA-02 (Backup Strategy) do squad-creator AIOX são exatamente implementações de guarantee. O squad-creator já faz isso tacitamente; o Moreh deve explicitar como design pattern.

---

## 15. Integração com os volumes existentes

Resumo das conexões:

| Conceito VOL-11 | Reforça/Refina | Volume existente |
|-----------------|----------------|------------------|
| Market Validation Checklist (§2) | Pré-ativação do Moreh | VOL-01 (Fundamentos) |
| Opportunity-Solution Tree (§3) | Complemento a extract-process | VOL-02 (Extração) |
| Assumption Testing (§4) | Refina confidence tracking | VOL-02 + VOL-06 |
| Value Equation (§5) | Critério de design | VOL-03 (Design) |
| 5-Step Musk (§6) | Stress test formalizado | VOL-02 (nova seção) |
| Role>Workflow>Task>Action (§7) | Reconcilia RC-03 | VOL-01 + VOL-03 |
| KB→Skill→Agent Pipeline (§8) | Progressive formalization | VOL-04 + VOL-05 |
| Hook Model (§9) | Design de adoção | VOL-08 (orquestração) |
| Variable Reward (§10) | Feedback loop não-linear | VOL-08 + VOL-11 |
| Trio Pattern (§11) | Discovery contínua | VOL-08 + VOL-11 |
| Niche Lock (§12) | Anti-pivot prematuro | VOL-10 (governance) |
| Story-Based Interview (§13) | Técnica de extração | VOL-02 (Extração) |
| Guarantee as Risk Reversal (§14) | Contrato de squad | VOL-04 (Contratos) |

---

## 16. Regras cardinais introduzidas por este volume

Três RCs novas adotadas (RC-20, RC-21, RC-22). Duas rejeitadas (RC-19, RC-23, RC-24 — conteúdo permanece como framework/pattern, não como regra).

| RC | Regra | Severidade |
|----|-------|------------|
| **RC-20** | KB evolui pós-launch. Cadência semanal de trio mantém KB viva. Não é afterthought, é operação contínua. | MUST |
| **RC-21** | Hierarquia Role > Workflow > Task > Action. Task continua unidade do squad (RC-03), mas reconhece níveis superiores (contextuais) e inferior (operacional). | MUST |
| **RC-22** | KB → Skill → Agent Pipeline. Conhecimento formalizado em 3 estágios sequenciais. Pular estágio degrada qualidade. | MUST |

Conteúdo de Market Validation (§2), Hook Design (§9) e Variable Reward (§10) permanece como frameworks aplicáveis, sem virar regra cardinal — uso por contexto, não por obrigação.

---

## 17. Anti-objetivo deste volume

Esse volume NÃO é:

- Manual de marketing/vendas (mesmo citando Hormozi)
- Livro de UX (mesmo citando Eyal)
- Teoria de inovação (mesmo citando Torres)

Esse volume É:

- Lente operacional pra o Moreh decidir O QUE construir (upstream) e COMO garantir que vai ser usado (downstream)
- Filtro pra evitar erros caros: construir o errado, construir o desnecessário, construir pra ninguém usar
- Ponte entre método Danilo (8 passos) e as práticas validadas da indústria

---

## 18. Proveniência

Regras de citação nesse volume:
- Citação literal: `[Fonte: knowledge-refs/100M.txt:104]`
- Paráfrase: `[Fonte: hooked.txt:74-124, síntese]`
- Conexão com volumes KaiZen: referência direta ao VOL-XX

Fontes primárias:
- `docs/kaizen/knowledge-refs/100M.txt` — Hormozi, 100M Leads
- `docs/kaizen/knowledge-refs/continuous.txt` — Teresa Torres, Continuous Discovery Habits
- `docs/kaizen/knowledge-refs/elon.txt` — Elon Musk via James Clear
- `docs/kaizen/knowledge-refs/ai-vision.txt` — Alex Hormozi + Eva Juergens, AI Vision
- `docs/kaizen/knowledge-refs/hooked.txt` — Nir Eyal, Hooked

Autoridade por território:
- Validação de mercado + oferta → Hormozi
- Descoberta de oportunidade + trio pattern → Torres
- Stress test + first principles → Musk/Clear
- Granularização + pipeline de formalização → Hormozi+Juergens
- Hábito + engajamento → Eyal

---

## 19. Quick reference — o que procurar quando

| Situação | Seção |
|----------|-------|
| Expert pediu squad mas tô duvidando se faz sentido | §2 (Market Validation) |
| Tenho outcome mas não sei qual oportunidade priorizar | §3 (OST) |
| Suposição crítica dentro do squad me incomoda | §4 (Assumption Testing) |
| Squad parece técnico demais, falta alma | §5 (Grand Slam Offer) |
| Processo extraído parece grande demais | §6 (5-Step Musk) |
| Confusão entre task, workflow, action | §7 (Decomposição 4 níveis) |
| Como levar SOP até agente autônomo | §8 (Pipeline Markdown→Skill→Agent) |
| Squad tá pronto mas expert não usa | §9 (Hook Model) |
| Output virou rotina, uso caiu | §10 (Variable Reward) |
| Como manter squad vivo pós-launch | §11 (Trio Pattern) |
| Expert quer pivotar antes da hora | §12 (Niche Lock) |
| Extração parece rasa, muito "idealizada" | §13 (Story-Based Interview) |
| Expert tem receio de adotar | §14 (Guarantee as Risk Reversal) |

---

## Fim do VOL-11

Próximo passo: patches cirúrgicos aos VOLs 1-10 + updates em GLOSSARIO, REGRAS-CARDINAIS, REPERTORIO, README.
