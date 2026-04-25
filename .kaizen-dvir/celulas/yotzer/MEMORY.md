# Memory — yotzer

<!--
Memória da célula. Sub-agentes desta célula compartilham este arquivo.
Toda escrita é append-only. Nenhum sub-agente reescreve linhas anteriores.
A escrita acontece pelo `memory-writer.js`, nunca direto.
-->

## Padrões Validados

<!--
Padrões observados em produção. Cada linha registra um aprendizado.
Formato: `- [data] — [padrão] — confiança: [low|medium|high]`.
Exemplo: `- 2026-04-24 — usuários abrem o relatório no domingo — confiança: high`.
-->

## Exceções Conhecidas

<!--
Casos em que o padrão não vale. Cada linha descreve a exceção
e a forma de tratar.
Formato: `- [data] — [contexto] — [como tratar]`.
Exemplo: `- 2026-04-24 — cliente plano básico — pular passo 3 do roteiro`.
-->

## Referências Cruzadas

<!--
Pontos do Ikigai que esta célula consulta antes de produzir saída.
Formato: `- [arquivo do Ikigai] — quando consultar`.
Exemplo: `- refs/ikigai/quem-sou.md — antes de escrever copy de autoridade`.
-->

## Change Log

<!--
Histórico append-only. Linhas anteriores nunca mudam.
Formato: `- [data] — [autor] — [mudança]`.
Exemplo: `- 2026-04-24 — @sub-agente-roteiro — registrou padrão de hook curto`.
-->

- 2026-04-24 — @dev (Dex) — MEMORY.md da celula Yotzer criado via Story M4.1 a partir do template `.kaizen-dvir/instructions/templates/memory-tmpl.md`.
