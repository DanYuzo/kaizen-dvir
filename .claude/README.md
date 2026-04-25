# `.claude/` — Framework Boundary determinística do KaiZen (v1.4)

Este diretório contém a camada **determinística** da Framework Boundary do KaiZen. O arquivo `settings.json` é lido diretamente pelo harness do Claude Code e aplica regras de `Write`/`Edit` antes de qualquer ferramenta executar — independente de hooks ou runtime. Esta é a primeira linha de defesa da integridade do framework (story M1.4).

## Mapa L1/L2/L3/L4

| Camada | Mutabilidade | Paths | Ação em `settings.json` | Racional |
|--------|-------------|-------|-------------------------|----------|
| **L1** Framework Core | NUNCA modificar | `.kaizen-dvir/dvir/**`, `.kaizen-dvir/commandments.md`, `bin/**` | `deny` em `Write` e `Edit` | Código-fonte do DVIR, Commandments e CLI são a espinha do framework. Qualquer escrita acidental aqui quebra o sistema silenciosamente. |
| **L2** Framework Templates | NUNCA modificar (com 1 exceção) | `.kaizen-dvir/instructions/**`, `.kaizen-dvir/infra/**` | `deny` em `Write` e `Edit` | Templates e infraestrutura do framework são extend-only — o expert extende adicionando L4, nunca editando L2. |
| **L2 (exceção)** Memória de célula | Mutável em runtime | `.kaizen-dvir/celulas/*/MEMORY.md` | `allow` explícito em `Write` e `Edit` | D-v1.1-09: cada célula persiste sua memória operacional no próprio `MEMORY.md`. É o único arquivo sob `celulas/` que pode ser escrito em runtime. |
| **L3** Configuração do projeto | Mutável | `.claude/**`, `.kaizen-dvir/dvir-config.yaml` | `allow` em `Write` e `Edit` | Configuração que o expert e o `@devops` ajustam ao longo da vida do projeto. |
| **L4** Runtime do projeto | SEMPRE modificar | `celulas/**`, `refs/**`, `.kaizen/**` | `allow` em `Write` e `Edit` | Onde o trabalho do expert vive. Células instanciadas, referências e estado de runtime. |

## A exceção `MEMORY.md` — como foi implementada

A Commandment D-v1.1-09 exige que `.kaizen-dvir/celulas/*/MEMORY.md` permaneça escrevível em runtime mesmo com L2 protegido. O harness do Claude Code aplica regras com precedência `ask > deny > allow` — um `deny` amplo em `celulas/**` venceria o `allow` específico em `celulas/*/MEMORY.md`.

**Opção escolhida: (A) omitir o `deny` amplo em `.kaizen-dvir/celulas/**`.**

Racional:
1. **Aderente ao modelo default-deny do Claude Code:** na ausência de `allow` que case, escritas em caminhos não declarados passam por fluxo de confirmação (`ask`). Isso já oferece barreira para escritas casuais.
2. **Precedência honrada sem truque de glob:** o `allow` explícito de `MEMORY.md` funciona sem lutar com um `deny` mais amplo.
3. **Simplicidade verificável:** os testes de M1.5 (`test-l2-memory-exception.js`) podem afirmar (a) que `MEMORY.md` é escrevível e (b) que escritas em arquivos arbitrários sob `celulas/*/` não são livres — o segundo ponto se verifica pelo fato de não haver `allow` que os case.

Opção rejeitada: **(B) denys específicos por extensão** (`Write(.kaizen-dvir/celulas/*/*.yaml)` etc. com exceção). Mais verboso, mais frágil quando surgirem novos formatos.

## Contrato do toggle `boundary.frameworkProtection`

`dvir-config.yaml` expõe a chave `boundary.frameworkProtection` (default `true`). Ela controla se as denys L1/L2 estão ativas.

**Realização escolhida para M1.4: path (a) — reescrita determinística.**

Quando o flag é `false`, um passo alinhado ao `kaizen doctor` reescreve `.claude/settings.json` removendo as entradas `deny` de L1/L2 (os `allow` de L2-MEMORY, L3 e L4 permanecem). A reescrita é feita pelo stub `.kaizen-dvir/dvir/boundary-toggle.js`. Em M1.4 entregamos apenas o stub + contrato; a invocação completa pelo `kaizen doctor` é parte de M2.

**Contrato para M2 (path (b), deferido):**
- O hook de runtime (`PreToolUse`) consumirá `getBoundaryFlag()` exposto por `.kaizen-dvir/dvir/config-loader.js`.
- Se `frameworkProtection === false`, o hook deve **pular** a aplicação das denys L1/L2 — ou confiar que o stub (path (a)) já reescreveu `settings.json` e o harness está operando sob o conjunto reduzido.
- Path (a) e path (b) são complementares: (a) é determinístico e sobrevive a restart; (b) honra troca de flag sem restart (AC-011).

## Compatibilidade com v1.4

Todos os paths aqui refletem os renames da v1.4 (D-v1.4-01, D-v1.4-04, D-v1.4-05). Não há referências a `core/`, `development/`, `infrastructure/`, `docs/`, `knowledge/` ou `core-config.yaml`.

## Arquivos nesta pasta

| Arquivo | Função |
|---------|--------|
| `settings.json` | Regras `deny`/`allow` consumidas pelo harness do Claude Code |
| `README.md` | Este documento (pt-BR) |
