#!/usr/bin/env node
'use strict';

const path = require('path');
const fs = require('fs');
const readline = require('readline');

const HELP_TEXT = [
  'Uso: kaizen <comando> [opções]',
  '',
  'Comandos:',
  '  init                            Inicializa um projeto KaiZen no diretório atual',
  '  doctor                          Diagnostica o projeto KaiZen (5 seções: hooks, gates, memory, cells, promotion)',
  '  install                         Instala uma célula (disponível em M4)',
  '  rollback                        Restaura o último snapshot do framework (M6.4)',
  '  rollback --list                 Lista snapshots disponíveis em .kaizen/snapshots/',
  '  Kaizen:Yotzer publish <id>      Publica a célula gerada pelo Yotzer (M4.5)',
  '  Kaizen:Yotzer resume <id>       Retoma o trabalho a partir do ultimo handoff (M4.6)',
  '  Kaizen:Yotzer validate <id>     Valida o trabalho antes de publicar (M4.6)',
  '',
  'Flags do doctor (M3.5):',
  '  --hooks                   Estado dos hooks (load, circuit breaker, últimas entradas)',
  '  --gates                   Veredictos por tipo de gate (últimos 100)',
  '  --memory                  Ikigai, MEMORY.md, handoffs, waivers',
  '  --cells                   Células instaladas com versão e status',
  '  --promotion               Lista candidatos de promoção',
  '  --promotion approve <id>  Promove um padrão (alvo padrão: rules)',
  '       [--target rules|commandments]    Define o alvo da promoção',
  '  --promotion reject <id> --reason "..."   Rejeita um candidato',
  '',
  'Opções:',
  '  --help      Mostra esta ajuda',
  '  --version   Mostra a versão do KaiZen',
  '',
].join('\n');

function printHelp() {
  process.stdout.write(HELP_TEXT);
}

function printVersion() {
  const pkgPath = path.join(__dirname, '..', 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  process.stdout.write(pkg.version + '\n');
}

function printUnknownCommand(cmd) {
  const msg =
    "Comando desconhecido: '" +
    cmd +
    "'. Rode 'kaizen --help' para ver os comandos disponíveis.\n";
  process.stderr.write(msg);
}

function printNotImplemented(cmd, milestone) {
  const msg =
    'kaizen ' +
    cmd +
    ' — implementação completa chega em ' +
    milestone +
    '. Consulte docs/kaizen/epics/epic-m1-foundation.md.\n';
  process.stdout.write(msg);
}

// --- doctor — full report (M3.5) ------------------------------------------
// Default output composes 5 sections in fixed order:
//   Hooks → frameworkProtection alert (if off) → Gates → Memory → Cells → Promotion
// All output pt-BR. Read-only by default; only `--promotion approve` and
// `--promotion reject` mutate state (and only under the expert-only guard).

function _pad(label, width) {
  if (label.length >= width) return label;
  return label + '.'.repeat(width - label.length);
}

function _renderHooksReport() {
  // Carregado tardiamente para manter `kaizen --help` leve e evitar probe
  // do hook-runner em comandos que não precisam dele.
  const hookState = require(
    path.join(__dirname, '..', '.kaizen-dvir', 'dvir', 'hooks', 'hook-state.js')
  );

  const lines = [];
  lines.push('Hooks carregados:');
  const loadStates = hookState.readLoadStates();
  for (const h of loadStates) {
    const label = _pad('  ' + h.name + ' ', 28);
    if (h.state === 'ok') {
      lines.push(label + ' ok');
    } else {
      lines.push(
        label + ' falha (' + (h.reason || 'erro desconhecido') + ')'
      );
    }
  }
  lines.push('');

  // Seção 2 — circuit breakers
  lines.push('Circuit breakers:');
  const breakers = hookState.readBreakerStates();
  for (const b of breakers) {
    const label = _pad('  ' + b.name + ' ', 28);
    lines.push(label + ' ' + b.state + ' (' + b.failures + ' falhas)');
  }
  lines.push('');

  // Seção 3 — últimas 5 entradas
  lines.push('Últimas 5 entradas em .kaizen/logs/hook-calls/:');
  const recent = hookState.readRecentHookCalls(5);
  if (recent.length === 0) {
    lines.push('  (sem entradas)');
  } else {
    for (const entry of recent) {
      const ts = entry.timestamp || '-';
      const hook = entry.hook_name || '-';
      const verdict = entry.verdict || entry.event_type || 'ok';
      const sess = entry.session_id ? '  session=' + entry.session_id : '';
      lines.push('  ' + ts + '  ' + hook + '  ' + verdict + sess);
    }
  }
  lines.push('');

  return lines.join('\n') + '\n';
}

function _frameworkProtectionFlag() {
  try {
    const cfgPath = path.join(
      __dirname,
      '..',
      '.kaizen-dvir',
      'dvir',
      'config-loader.js'
    );
    delete require.cache[require.resolve(cfgPath)];
    const cfg = require(cfgPath);
    return cfg.getBoundaryFlag();
  } catch (_) {
    // Defensive: when config missing or unparseable, do not surface the
    // R-009 alert (config-loader emits its own error when invoked).
    return true;
  }
}

function _renderFrameworkProtectionAlert() {
  const messages = require(
    path.join(__dirname, '..', '.kaizen-dvir', 'dvir', 'doctor', 'messages.js')
  );
  return messages.ALERT_FRAMEWORK_PROTECTION + '\n\n';
}

function _renderGatesReport() {
  const reporter = require(
    path.join(__dirname, '..', '.kaizen-dvir', 'dvir', 'doctor', 'gates-reporter.js')
  );
  return reporter.render();
}

function _renderMemoryReport(opts) {
  const reporter = require(
    path.join(__dirname, '..', '.kaizen-dvir', 'dvir', 'doctor', 'memory-reporter.js')
  );
  return reporter.render(opts);
}

function _renderCellsReport() {
  const reporter = require(
    path.join(__dirname, '..', '.kaizen-dvir', 'dvir', 'doctor', 'cells-reporter.js')
  );
  return reporter.render();
}

function _renderPromotionReport() {
  const reporter = require(
    path.join(__dirname, '..', '.kaizen-dvir', 'dvir', 'doctor', 'promotion-reporter.js')
  );
  return reporter.render();
}

function _renderTitle() {
  const messages = require(
    path.join(__dirname, '..', '.kaizen-dvir', 'dvir', 'doctor', 'messages.js')
  );
  return messages.HEADER_TITLE + '\n\n';
}

function _renderDefaultDoctor() {
  // 5 sections in fixed order with a frameworkProtection alert banner
  // emitted BEFORE the Memory section when the toggle is off (R-009).
  const lines = [];
  lines.push(_renderTitle());
  lines.push(_renderHooksReport());
  const fp = _frameworkProtectionFlag();
  if (fp === false) {
    lines.push(_renderFrameworkProtectionAlert());
  }
  lines.push(_renderGatesReport());
  lines.push(_renderMemoryReport({ frameworkProtection: fp }));
  lines.push(_renderCellsReport());
  lines.push(_renderPromotionReport());
  return lines.join('');
}

function _resolvePromotionSubcommand(args) {
  // args[0] is 'approve' or 'reject' (or undefined)
  const sub = args[0];
  if (sub !== 'approve' && sub !== 'reject') return null;
  const id = args[1];
  // Parse remaining flags: --target X | --reason "..."
  let target = 'rules';
  let reason = null;
  for (let i = 2; i < args.length; i++) {
    const a = args[i];
    if (a === '--target') {
      target = args[i + 1] || 'rules';
      i++;
    } else if (a === '--reason') {
      reason = args[i + 1] || null;
      i++;
    }
  }
  return { sub: sub, id: id, target: target, reason: reason };
}

function _stdinConfirm(promptText) {
  // Synchronous stdin read for confirmation. We use a simple readline
  // question wrapped in deasync-free Promise + Atomics polling? No — to
  // keep this stdlib-only and synchronous in tests, callers (tests) inject
  // a `confirm` function via env or test seam. For real CLI usage we read
  // a single line via fs on /dev/tty / stdin.
  process.stdout.write(promptText + ' ');
  // Use buffered synchronous stdin read.
  const buf = Buffer.alloc(1024);
  let read = 0;
  try {
    read = fs.readSync(0, buf, 0, buf.length, null);
  } catch (_) {
    return '';
  }
  if (read <= 0) return '';
  return buf.toString('utf8', 0, read).trim();
}

function _runPromotion(args) {
  const messages = require(
    path.join(__dirname, '..', '.kaizen-dvir', 'dvir', 'doctor', 'messages.js')
  );
  const promoter = require(
    path.join(__dirname, '..', '.kaizen-dvir', 'dvir', 'memory', 'pattern-promoter.js')
  );

  // Strip the leading '--promotion' flag.
  const subArgs = args.slice(1);
  const parsed = _resolvePromotionSubcommand(subArgs);

  if (parsed === null) {
    // No sub-command: render the candidate list.
    process.stdout.write(_renderPromotionReport());
    return 0;
  }

  if (!parsed.id) {
    process.stderr.write(
      'falta o id do candidato. uso: `kaizen doctor --promotion ' +
        parsed.sub +
        ' <id>`.\n'
    );
    return 1;
  }

  if (parsed.sub === 'approve') {
    const opts = {
      __expertCli__: true,
      targetLayer: parsed.target,
    };
    if (parsed.target === 'commandments') {
      opts.confirm = function (promptText) {
        return _stdinConfirm(promptText);
      };
    }
    const result = promoter.approve(parsed.id, opts);
    if (result.promoted) {
      process.stdout.write(
        'promovido: ' + result.target + ' -> ' + result.path + '\n'
      );
      return 0;
    }
    process.stderr.write((result.reason || 'falha desconhecida.') + '\n');
    return 1;
  }

  // reject path
  const result = promoter.reject(parsed.id, parsed.reason, {
    __expertCli__: true,
  });
  if (result.rejected) {
    process.stdout.write('rejeitado: ' + parsed.id + '\n');
    return 0;
  }
  process.stderr.write((result.reason || 'falha desconhecida.') + '\n');
  return 1;
}

function runDoctor(args) {
  // --promotion path (mutating sub-commands handled separately)
  if (args[0] === '--promotion') {
    try {
      return _runPromotion(args);
    } catch (err) {
      const msg =
        'kaizen doctor --promotion: falha (' +
        (err && err.message ? err.message : String(err)) +
        ').\n';
      process.stderr.write(msg);
      return 1;
    }
  }

  // Single-flag flags — print only that section.
  if (args.includes('--hooks')) {
    try {
      process.stdout.write('KaiZen doctor — hooks\n\n');
      process.stdout.write(_renderHooksReport());
      return 0;
    } catch (err) {
      process.stderr.write(
        'kaizen doctor --hooks: falha ao gerar relatório (' +
          (err && err.message ? err.message : String(err)) +
          ').\n'
      );
      return 1;
    }
  }
  if (args.includes('--gates')) {
    try {
      process.stdout.write(_renderGatesReport());
      return 0;
    } catch (err) {
      process.stderr.write(
        'kaizen doctor --gates: falha (' +
          (err && err.message ? err.message : String(err)) +
          ').\n'
      );
      return 1;
    }
  }
  if (args.includes('--memory')) {
    try {
      const fp = _frameworkProtectionFlag();
      process.stdout.write(_renderMemoryReport({ frameworkProtection: fp }));
      return 0;
    } catch (err) {
      process.stderr.write(
        'kaizen doctor --memory: falha (' +
          (err && err.message ? err.message : String(err)) +
          ').\n'
      );
      return 1;
    }
  }
  if (args.includes('--cells')) {
    try {
      process.stdout.write(_renderCellsReport());
      return 0;
    } catch (err) {
      process.stderr.write(
        'kaizen doctor --cells: falha (' +
          (err && err.message ? err.message : String(err)) +
          ').\n'
      );
      return 1;
    }
  }

  // Default — full 5-section report.
  try {
    process.stdout.write(_renderDefaultDoctor());
    return 0;
  } catch (err) {
    process.stderr.write(
      'kaizen doctor: falha (' +
        (err && err.message ? err.message : String(err)) +
        ').\n'
    );
    return 1;
  }
}

// --- Kaizen:Yotzer subcommands (M4.5) -------------------------------------
//
// `Kaizen:Yotzer publish <work-id>` materializes the generated cell at
// `celulas/{nome}/`, validates the four pre-publish gates (Actions-inline,
// OST closure, workflows/, success-examples), validates the final manifest
// via the M3.4 Schema Gate, and initializes the CHANGELOG at 1.0.0
// (FR-115). Idempotent: re-publish appends a new version row to the
// CHANGELOG and never overwrites expert edits without confirmation.
// Output strings pt-BR per D-v1.4-06. CON-002 CommonJS / CON-003 stdlib.

function _publisherModule() {
  const p = path.join(
    __dirname,
    '..',
    '.kaizen-dvir',
    'celulas',
    'yotzer',
    'agents',
    '_shared',
    'publisher.js'
  );
  delete require.cache[require.resolve(p)];
  return require(p);
}

function _celulasRoot() {
  if (process.env.KAIZEN_CELULAS_DIR) return process.env.KAIZEN_CELULAS_DIR;
  return path.join(__dirname, '..', 'celulas');
}

// Story M8.5 — `.claude/commands/` directory consumed by the Yotzer
// publisher when registering generated cells as slash skills. Tests
// override via env var to avoid polluting the framework working tree;
// production resolves to <project-root>/.claude/commands.
function _claudeCommandsDir() {
  if (process.env.KAIZEN_CLAUDE_COMMANDS_DIR) {
    return process.env.KAIZEN_CLAUDE_COMMANDS_DIR;
  }
  return path.join(__dirname, '..', '.claude', 'commands');
}

function _yotzerWorkRoot() {
  if (process.env.KAIZEN_YOTZER_WORK_DIR) {
    return process.env.KAIZEN_YOTZER_WORK_DIR;
  }
  return path.join(__dirname, '..', '.kaizen', 'yotzer', 'work');
}

function _yotzerLockRoot() {
  return path.join(__dirname, '..', '.kaizen', 'yotzer', 'locks');
}

function _readWorkSpec(workId) {
  const workPath = path.join(_yotzerWorkRoot(), workId, 'spec.json');
  if (!fs.existsSync(workPath)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(workPath, 'utf8'));
  } catch (_) {
    return null;
  }
}

function _checkF9Pass(workId) {
  // F9 PASS state stored at .kaizen/yotzer/work/<id>/f9-state.json
  const f9StatePath = path.join(
    _yotzerWorkRoot(),
    workId,
    'f9-state.json'
  );
  if (!fs.existsSync(f9StatePath)) {
    return { ok: false, reason: 'F9 ainda nao rodou para este work-id.' };
  }
  try {
    const state = JSON.parse(fs.readFileSync(f9StatePath, 'utf8'));
    if (state && state.verdict === 'PASS') return { ok: true };
    return {
      ok: false,
      reason: 'F9 sem PASS para este work-id (verdict=' + (state.verdict || '?') + ').',
    };
  } catch (e) {
    return { ok: false, reason: 'F9 state ilegivel: ' + (e.message || String(e)) + '.' };
  }
}

function _publishLockPath(workId) {
  return path.join(_yotzerLockRoot(), 'publish-' + workId + '.lock');
}

function _acquirePublishLock(workId) {
  const lockPath = _publishLockPath(workId);
  fs.mkdirSync(path.dirname(lockPath), { recursive: true });
  if (fs.existsSync(lockPath)) {
    return { acquired: false, reason: 'publish em andamento para work-id=' + workId + '.' };
  }
  fs.writeFileSync(lockPath, String(process.pid), 'utf8');
  return { acquired: true, lockPath: lockPath };
}

function _releasePublishLock(lockPath) {
  if (typeof lockPath !== 'string') return;
  try {
    if (fs.existsSync(lockPath)) fs.unlinkSync(lockPath);
  } catch (_) {
    // best-effort
  }
}

function _semverNext(currentVersion) {
  const m = /^(\d+)\.(\d+)\.(\d+)$/u.exec(currentVersion);
  if (!m) return '1.0.1';
  const major = parseInt(m[1], 10);
  const minor = parseInt(m[2], 10);
  const patch = parseInt(m[3], 10);
  return major + '.' + minor + '.' + (patch + 1);
}

function _readCurrentVersion(changelogPath) {
  if (!fs.existsSync(changelogPath)) return null;
  const text = fs.readFileSync(changelogPath, 'utf8');
  const re = /^##\s+(\d+\.\d+\.\d+)\s+—/gmu;
  let last = null;
  let m;
  while ((m = re.exec(text)) !== null) {
    last = m[1];
  }
  return last;
}

function _confirmPrompt(promptText, options) {
  // Test seam — when KAIZEN_PUBLISH_CONFIRM is set ('a', 'b', 'c'), use it.
  const fromEnv = process.env.KAIZEN_PUBLISH_CONFIRM;
  if (typeof fromEnv === 'string' && fromEnv.length > 0) {
    return fromEnv.trim().toLowerCase().charAt(0);
  }
  // Real CLI: synchronous stdin read (mirrors _stdinConfirm).
  process.stdout.write(promptText + ' ');
  const buf = Buffer.alloc(64);
  let read = 0;
  try {
    read = fs.readSync(0, buf, 0, buf.length, null);
  } catch (_) {
    return 'c';
  }
  if (read <= 0) return 'c';
  return buf.toString('utf8', 0, read).trim().toLowerCase().charAt(0) || 'c';
}

function runYotzerPublish(args) {
  // args: [<work-id>, ...flags]
  const workId = args[0];
  if (!workId || workId.startsWith('--')) {
    process.stderr.write(
      'falta o work-id. uso: `kaizen Kaizen:Yotzer publish <work-id>`.\n'
    );
    return 1;
  }

  const f9 = _checkF9Pass(workId);
  if (!f9.ok) {
    process.stderr.write(
      'publisher bloqueou publicacao: ' +
        f9.reason +
        ' execute F9 antes de publicar.\n'
    );
    return 1;
  }

  const spec = _readWorkSpec(workId);
  if (!spec) {
    process.stderr.write(
      'publisher bloqueou publicacao: spec do work-id=' +
        workId +
        ' nao encontrado em .kaizen/yotzer/work/<id>/spec.json. ' +
        'Yotzer escreve este arquivo no final de F9.\n'
    );
    return 1;
  }

  const cellName = (spec.manifest && spec.manifest.name) || spec.name;
  if (typeof cellName !== 'string' || cellName.length === 0) {
    process.stderr.write(
      'publisher bloqueou publicacao: name ausente no spec. revise spec.json.\n'
    );
    return 1;
  }

  const lock = _acquirePublishLock(workId);
  if (!lock.acquired) {
    process.stderr.write('publisher: ' + lock.reason + ' aguarde ou remova o lock.\n');
    return 1;
  }

  try {
    const publisher = _publisherModule();
    const celulasRoot = _celulasRoot();
    const cellPath = path.join(celulasRoot, cellName);

    // Idempotency check — re-publish detection.
    if (fs.existsSync(cellPath)) {
      const prompt =
        'a celula ' +
        cellName +
        ' ja foi publicada. detectei edicoes feitas apos o ultimo publish. ' +
        'voce quer (a) sobrescrever, (b) criar versao paralela celulas/' +
        cellName +
        '-v2/, ou (c) cancelar?';
      const choice = _confirmPrompt(prompt, ['a', 'b', 'c']);
      if (choice === 'c' || choice === '') {
        process.stdout.write('publish cancelado pelo expert.\n');
        return 0;
      }
      if (choice === 'b') {
        const branchedName = cellName + '-v2';
        const branchedSpec = Object.assign({}, spec);
        branchedSpec.manifest = Object.assign({}, spec.manifest || {});
        branchedSpec.manifest.name = branchedName;
        return _doPublish(publisher, branchedSpec, celulasRoot, branchedName, true);
      }
      // choice 'a' — overwrite path; bump version on existing CHANGELOG.
      const changelogPath = path.join(cellPath, 'CHANGELOG.md');
      const cur = _readCurrentVersion(changelogPath);
      const next = cur ? _semverNext(cur) : '1.0.1';
      try {
        publisher.appendChangelogVersion(
          cellPath,
          next,
          'republicacao via /Kaizen:Yotzer publish ' + workId + '.'
        );
        process.stdout.write(
          'celula ' +
            cellName +
            ' republicada em celulas/' +
            cellName +
            '/. versao ' +
            next +
            ' registrada.\n'
        );
        return 0;
      } catch (e) {
        process.stderr.write(
          'publisher: falha ao apender versao no CHANGELOG: ' +
            (e.message || String(e)) +
            '.\n'
        );
        return 1;
      }
    }

    return _doPublish(publisher, spec, celulasRoot, cellName, false);
  } finally {
    _releasePublishLock(lock.lockPath);
  }
}

function _doPublish(publisher, spec, celulasRoot, cellName, isBranched) {
  // Materialize the cell shell first so the validators see something.
  const targetSpec = Object.assign({}, spec);
  targetSpec.name = cellName;
  if (!targetSpec.manifest) targetSpec.manifest = {};
  targetSpec.manifest.name = cellName;
  if (!targetSpec.manifest.version) targetSpec.manifest.version = '1.0.0';

  // Story M8.5 — pass `.claude/commands` so materializeCell can delegate
  // slash-skill registration to dvir/cell-registry.registerCellSkills().
  // Helper handles the absent-personas case internally (no-op when the
  // materialized cell has no persona files yet — incomplete fixtures).
  let result;
  try {
    result = publisher.materializeCell(targetSpec, celulasRoot, {
      claudeCommandsDir: _claudeCommandsDir(),
    });
  } catch (matErr) {
    // Skill registration may have failed inside materializeCell. The
    // publisher already appended a CHANGELOG failure entry; surface the
    // pt-BR error and exit non-zero (NFR-101).
    process.stderr.write(
      'publisher bloqueou publicacao: ' +
        ((matErr && matErr.message) || String(matErr)) +
        '\n'
    );
    return 1;
  }

  // Run the four pre-publish validators.
  const pre = publisher.prePublishCheck(result.celulaPath);
  if (pre.verdict !== 'PASS') {
    const first = pre.failures[0];
    const errMsg =
      first && first.errors && first.errors[0]
        ? first.errors[0].message
        : 'validador desconhecido falhou.';
    process.stderr.write(errMsg + '\n');
    return 1;
  }

  // Schema Gate on the final manifest.
  const sg = publisher.schemaGateOnManifest(result.manifestPath);
  if (sg.verdict !== 'PASS') {
    const errs = sg.errors || [];
    const head =
      errs[0] && errs[0].message
        ? errs[0].message
        : 'manifesto invalido.';
    process.stderr.write(
      'publisher bloqueou publicacao: ' + head + ' corrija e republique.\n'
    );
    return 1;
  }

  process.stdout.write(
    'celula ' +
      cellName +
      ' publicada em celulas/' +
      cellName +
      '/. versao 1.0.0 registrada. ative com /Kaizen:' +
      _slashName(cellName) +
      '.\n'
  );

  // Story M8.5 — surface skill-registration confirmation and any warnings
  // the cell-registry helper collected (orphan files, missing non-chief
  // personas). Block only renders when registration actually ran, i.e.
  // the materialized cell had at least one persona file under agents/.
  const reg = result.skillRegistration;
  if (reg && reg.entryWritten) {
    const slashPrefix =
      (targetSpec.manifest && targetSpec.manifest.slashPrefix) ||
      'Kaizen:' + _slashName(cellName);
    const specialistsCount = Array.isArray(reg.specialistsWritten)
      ? reg.specialistsWritten.length
      : 0;
    process.stdout.write(
      'Skill registrada: /' +
        slashPrefix +
        ' (1 entry + ' +
        specialistsCount +
        ' specialists)\n'
    );
    if (Array.isArray(reg.warnings)) {
      for (const w of reg.warnings) {
        process.stdout.write('Aviso: ' + w + '\n');
      }
    }
  }

  return 0;
}

function _slashName(cellName) {
  return cellName
    .split('-')
    .map((p) => (p.length > 0 ? p[0].toUpperCase() + p.slice(1) : p))
    .join('');
}

function runYotzerCommand(args) {
  const sub = args[0];
  if (sub === 'publish') {
    try {
      return runYotzerPublish(args.slice(1));
    } catch (err) {
      process.stderr.write(
        'kaizen Kaizen:Yotzer publish: falha (' +
          (err && err.message ? err.message : String(err)) +
          ').\n'
      );
      return 1;
    }
  }
  if (sub === 'resume') {
    try {
      return runYotzerResume(args.slice(1));
    } catch (err) {
      process.stderr.write(
        'kaizen Kaizen:Yotzer resume: falha (' +
          (err && err.message ? err.message : String(err)) +
          ').\n'
      );
      return 1;
    }
  }
  if (sub === 'validate') {
    try {
      return runYotzerValidate(args.slice(1));
    } catch (err) {
      process.stderr.write(
        'kaizen Kaizen:Yotzer validate: falha (' +
          (err && err.message ? err.message : String(err)) +
          ').\n'
      );
      return 1;
    }
  }
  process.stderr.write(
    "subcomando desconhecido em Kaizen:Yotzer: '" +
      (sub || '') +
      "'. uso: `kaizen Kaizen:Yotzer publish|resume|validate <work-id>`.\n"
  );
  return 1;
}

// --- Kaizen:Yotzer resume / validate (M4.6) -------------------------------
//
// `Kaizen:Yotzer resume <work-id>` reads the latest handoff for `to: chief`
// from `.kaizen/handoffs/` via M3.2 handoff-engine.readLatest(); restores
// work state at the phase where the last handoff was emitted; prompts the
// expert in pt-BR to confirm continuation; idempotent — invoking twice on
// the same handoff timestamp emits a notice and exits 0 without
// duplicating state. AC-110, AC-201, FR-112.
//
// `Kaizen:Yotzer validate <work-id>` runs the full pre-publish validation
// suite in pt-BR — Schema Gate on the manifest, OST traceability,
// Actions-inline, handoff-size audit across all phases, critical-invariant
// flag presence, Reuse Gate re-check. Per-check PASS/FAIL with actionable
// hints. Does NOT publish (FR-113). Read-only on cell + work-state dirs;
// only writes a single validate-event log entry.
//
// Both subcommands honor the test seams documented in M4.5: env var
// overrides for KAIZEN_YOTZER_WORK_DIR, KAIZEN_HANDOFFS_DIR,
// KAIZEN_STATE_DIR, KAIZEN_LOGS_DIR, KAIZEN_CELULAS_DIR. CON-002 / CON-003.

function _handoffEngineModule() {
  const p = path.join(
    __dirname,
    '..',
    '.kaizen-dvir',
    'dvir',
    'memory',
    'handoff-engine.js'
  );
  delete require.cache[require.resolve(p)];
  return require(p);
}

function _reuseGateModule() {
  const p = path.join(
    __dirname,
    '..',
    '.kaizen-dvir',
    'dvir',
    'gates',
    'reuse-gate.js'
  );
  delete require.cache[require.resolve(p)];
  return require(p);
}

function _logsRoot() {
  if (process.env.KAIZEN_LOGS_DIR) return process.env.KAIZEN_LOGS_DIR;
  return path.join(__dirname, '..', '.kaizen', 'logs');
}

function _stateRoot() {
  if (process.env.KAIZEN_STATE_DIR) return process.env.KAIZEN_STATE_DIR;
  return path.join(__dirname, '..', '.kaizen', 'state');
}

function _resumeEventsPath(workId) {
  return path.join(_stateRoot(), 'yotzer', workId, 'resume-events.yaml');
}

function _appendGateVerdictLog(eventType, workId, verdict, note) {
  const dir = path.join(_logsRoot(), 'gate-verdicts');
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, eventType + '-' + workId + '.log');
  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    event_type: eventType,
    work_id: workId,
    verdict: verdict,
    note: note || '',
  }) + '\n';
  fs.appendFileSync(filePath, line, 'utf8');
}

function _readResumeEvents(workId) {
  const filePath = _resumeEventsPath(workId);
  if (!fs.existsSync(filePath)) return [];
  const text = fs.readFileSync(filePath, 'utf8');
  const lines = text.split(/\r?\n/u);
  const out = [];
  for (const raw of lines) {
    const m = /^-\s+handoff:\s+"([^"]*)"\s+at:\s+"([^"]*)"\s*$/u.exec(raw);
    if (m) out.push({ handoff: m[1], at: m[2] });
  }
  return out;
}

function _appendResumeEvent(workId, handoffPath) {
  const filePath = _resumeEventsPath(workId);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const line =
    '- handoff: "' +
    handoffPath.replace(/\\/gu, '/').replace(/"/gu, '\\"') +
    '" at: "' +
    new Date().toISOString() +
    '"\n';
  fs.appendFileSync(filePath, line, 'utf8');
}

function _resumePromptYesNo(promptText) {
  // Test seam — when KAIZEN_RESUME_CONFIRM is set ('sim' / 'nao'), use it.
  const fromEnv = process.env.KAIZEN_RESUME_CONFIRM;
  if (typeof fromEnv === 'string' && fromEnv.length > 0) {
    return fromEnv.trim().toLowerCase();
  }
  process.stdout.write(promptText + ' ');
  const buf = Buffer.alloc(64);
  let read = 0;
  try {
    read = fs.readSync(0, buf, 0, buf.length, null);
  } catch (_) {
    return 'nao';
  }
  if (read <= 0) return 'nao';
  return buf.toString('utf8', 0, read).trim().toLowerCase();
}

function runYotzerResume(args) {
  const workId = args[0];
  if (!workId || workId.startsWith('--')) {
    process.stderr.write(
      'falta o work-id. uso: `kaizen Kaizen:Yotzer resume <work-id>`.\n'
    );
    return 1;
  }
  if (!/^[A-Za-z0-9._-]+$/u.test(workId)) {
    process.stderr.write(
      'work-id invalido. use apenas letras, numeros, ponto, traco e sublinhado.\n'
    );
    return 1;
  }

  const handoffEngine = _handoffEngineModule();
  let latest;
  try {
    latest = handoffEngine.readLatest('chief');
  } catch (err) {
    process.stderr.write(
      'resume: falha ao ler handoff (' +
        (err && err.message ? err.message : String(err)) +
        '). revise .kaizen/handoffs/.\n'
    );
    return 1;
  }

  if (!latest) {
    process.stderr.write(
      'nenhum handoff para chief encontrado em .kaizen/handoffs/. ' +
        'execute uma fase do Yotzer antes de retomar.\n'
    );
    return 1;
  }

  // Idempotency check — if this exact handoff path has already been
  // resumed for this work-id, emit the pt-BR notice and exit 0.
  const events = _readResumeEvents(workId);
  const handoffPathNorm = latest.path.replace(/\\/gu, '/');
  const already = events.some(
    (ev) => ev.handoff === handoffPathNorm
  );
  if (already) {
    const lastAt = events.length > 0 ? events[events.length - 1].at : 'desconhecido';
    process.stdout.write(
      'Retomada ja registrada em ' +
        lastAt +
        '. Nenhuma duplicacao de estado.\n'
    );
    _appendGateVerdictLog('resume', workId, 'NOOP', 'idempotent');
    return 0;
  }

  const handoff = (latest.artifact && latest.artifact.handoff) || {};
  const wc = handoff.work_context || {};
  const phase = wc.current_phase || '<fase-desconhecida>';

  // Prompt expert to confirm continuation in pt-BR.
  const promptText =
    'Retomar trabalho ' + workId + ' a partir da fase ' + phase + '? [sim/nao]';
  const answer = _resumePromptYesNo(promptText);
  if (answer !== 'sim' && answer !== 's' && answer !== 'yes' && answer !== 'y') {
    process.stdout.write('Retomada cancelada pelo expert.\n');
    _appendGateVerdictLog('resume', workId, 'CANCELLED', 'expert disse nao');
    return 0;
  }

  // Persist the resume event AFTER expert confirmed.
  _appendResumeEvent(workId, handoffPathNorm);
  _appendGateVerdictLog('resume', workId, 'RESUMED', 'fase ' + phase);

  process.stdout.write(
    'Trabalho ' +
      workId +
      ' retomado na fase ' +
      phase +
      '. Ultima decisao: ' +
      ((Array.isArray(handoff.decisions) && handoff.decisions[0]) ||
        '<sem decisao registrada>') +
      '. Proxima acao: ' +
      (handoff.next_action || '<sem proxima acao>') +
      '.\n'
  );
  return 0;
}

// -- validate CLI helpers --------------------------------------------------

function _validateOutputLine(name, verdict, hint) {
  if (verdict === 'PASS') {
    return '[PASS] ' + name + '.';
  }
  return '[FAIL] ' + name + ' — ' + (hint || 'revise e tente novamente') + '.';
}

function _checkSchemaGateOnManifest(manifestPath) {
  if (!fs.existsSync(manifestPath)) {
    return {
      verdict: 'FAIL',
      hint: 'celula.yaml ausente em ' + manifestPath,
    };
  }
  const publisher = _publisherModule();
  const r = publisher.schemaGateOnManifest(manifestPath);
  if (r.verdict === 'PASS') return { verdict: 'PASS' };
  const head = r.errors && r.errors[0] ? r.errors[0].message : 'manifesto invalido.';
  return { verdict: 'FAIL', hint: head };
}

function _checkOstClosure(cellRoot) {
  const publisher = _publisherModule();
  const r = publisher.ostClosureValidator(cellRoot);
  if (r.verdict === 'PASS') return { verdict: 'PASS' };
  const head = r.errors && r.errors[0] ? r.errors[0].message : 'OST.md sem fechamento.';
  return { verdict: 'FAIL', hint: head };
}

function _checkActionsInline(cellRoot) {
  const publisher = _publisherModule();
  const r = publisher.actionsInlineValidator(path.join(cellRoot, 'tasks'));
  if (r.verdict === 'PASS') return { verdict: 'PASS' };
  const head = r.errors && r.errors[0] ? r.errors[0].message : 'arquivo action-*.md detectado.';
  return { verdict: 'FAIL', hint: head };
}

function _checkHandoffSizesAcrossPhases() {
  const handoffEngine = _handoffEngineModule();
  const dir = handoffEngine._handoffsDir();
  if (!fs.existsSync(dir)) {
    return {
      verdict: 'PASS',
      detail: { count: 0 },
    };
  }
  const entries = fs.readdirSync(dir);
  const TOKEN_CEILING = handoffEngine.TOKEN_CEILING;
  const tokenCounter = require(
    path.join(__dirname, '..', '.kaizen-dvir', 'dvir', 'memory', 'token-counter.js')
  );
  let count = 0;
  for (const name of entries) {
    if (!name.startsWith('handoff-') || !name.endsWith('.yaml')) continue;
    if (name.indexOf('.tmp-') !== -1) continue;
    const full = path.join(dir, name);
    const text = fs.readFileSync(full, 'utf8');
    const tokens = tokenCounter.count(text);
    count++;
    if (tokens > TOKEN_CEILING) {
      return {
        verdict: 'FAIL',
        hint:
          'handoff ' +
          name +
          ' com ' +
          tokens +
          ' tokens (limite ' +
          TOKEN_CEILING +
          '). reduza decisoes ou files_modified.',
      };
    }
  }
  return { verdict: 'PASS', detail: { count: count } };
}

function _checkCriticalInvariantsFlag(manifestPath) {
  if (!fs.existsSync(manifestPath)) {
    return { verdict: 'FAIL', hint: 'celula.yaml ausente.' };
  }
  const text = fs.readFileSync(manifestPath, 'utf8');
  // Conservative: any line starting with `critical_invariants:` followed
  // by at least one non-empty list entry counts as marked.
  const m = /critical_invariants\s*:\s*([^\n]*)(\n[\s\S]*?)?/u.exec(text);
  if (!m) {
    return {
      verdict: 'FAIL',
      hint:
        'campo critical_invariants ausente no manifesto. ' +
        'F1, F2 e F10 devem ser marcadas como invariantes criticas.',
    };
  }
  const after = (m[1] || '').trim();
  if (after.startsWith('[') && after.endsWith(']')) {
    const inner = after.slice(1, -1).trim();
    if (inner.length === 0) {
      return {
        verdict: 'FAIL',
        hint:
          'critical_invariants vazio. F1, F2 e F10 devem ser marcadas.',
      };
    }
    return { verdict: 'PASS' };
  }
  // Block list — look for at least one '- ' line within the next lines.
  const blockRe = /critical_invariants\s*:\s*\n((?:\s+-\s+[^\n]+\n?)+)/u;
  if (blockRe.test(text)) return { verdict: 'PASS' };
  // After-colon scalar like a single string is unusual but accept if non-empty.
  if (after.length > 0 && after !== 'null' && after !== '[]') {
    return { verdict: 'PASS' };
  }
  return {
    verdict: 'FAIL',
    hint:
      'critical_invariants vazio ou mal-formado. F1, F2 e F10 devem ser marcadas.',
  };
}

function _checkReuseGate(workId) {
  const reuseGate = _reuseGateModule();
  // Soft gate — never fails this validator pipeline; report WARN as PASS
  // with detail.
  const r = reuseGate.check('celula', workId);
  return {
    verdict: 'PASS',
    detail: { reuseVerdict: r.verdict, candidates: r.candidates || [] },
  };
}

function _writeValidateEventLog(workId, verdict, summary) {
  const dir = path.join(_logsRoot(), 'gate-verdicts');
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, 'validate-' + workId + '.log');
  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    event_type: 'validate',
    work_id: workId,
    verdict: verdict,
    summary: summary,
  }) + '\n';
  fs.appendFileSync(filePath, line, 'utf8');
}

function runYotzerValidate(args) {
  const workId = args[0];
  if (!workId || workId.startsWith('--')) {
    process.stderr.write(
      'falta o work-id. uso: `kaizen Kaizen:Yotzer validate <work-id>`.\n'
    );
    return 1;
  }
  if (!/^[A-Za-z0-9._-]+$/u.test(workId)) {
    process.stderr.write(
      'work-id invalido. use apenas letras, numeros, ponto, traco e sublinhado.\n'
    );
    return 1;
  }

  // Locate the cell that this work-id published. The publish CLI reads
  // .kaizen/yotzer/work/<id>/spec.json and writes celulas/<name>/. Our
  // validate path mirrors the same lookup so the validator chain runs
  // against the freshly-published cell.
  const spec = _readWorkSpec(workId);
  if (!spec) {
    process.stderr.write(
      'validate: spec do work-id=' +
        workId +
        ' nao encontrado em .kaizen/yotzer/work/<id>/spec.json. ' +
        'execute o pipeline ate F9 antes de validar.\n'
    );
    return 1;
  }
  const cellName = (spec.manifest && spec.manifest.name) || spec.name;
  if (typeof cellName !== 'string' || cellName.length === 0) {
    process.stderr.write(
      'validate: name ausente no spec. revise spec.json.\n'
    );
    return 1;
  }
  const cellRoot = path.join(_celulasRoot(), cellName);
  if (!fs.existsSync(cellRoot)) {
    process.stderr.write(
      'validate: celula ' +
        cellName +
        ' nao publicada em ' +
        cellRoot +
        '. execute /Kaizen:Yotzer publish antes de validar.\n'
    );
    return 1;
  }
  const manifestPath = path.join(cellRoot, 'celula.yaml');

  const checks = [
    {
      name: 'Schema Gate (manifesto)',
      run: () => _checkSchemaGateOnManifest(manifestPath),
    },
    {
      name: 'OST.md fecha Task -> Solution -> Opportunity -> Outcome',
      run: () => _checkOstClosure(cellRoot),
    },
    {
      name: 'Actions inline (sem action-*.md em tasks/)',
      run: () => _checkActionsInline(cellRoot),
    },
    {
      name: 'Handoffs sob 500 tokens em todas as fases',
      run: () => _checkHandoffSizesAcrossPhases(),
    },
    {
      name: 'Invariantes criticas marcadas (F1/F2/F10)',
      run: () => _checkCriticalInvariantsFlag(manifestPath),
    },
    {
      name: 'Reuse Gate re-check',
      run: () => _checkReuseGate(workId),
    },
  ];

  let failures = 0;
  const lines = [];
  for (const c of checks) {
    let r;
    try {
      r = c.run();
    } catch (e) {
      r = {
        verdict: 'FAIL',
        hint:
          'verificador travou: ' +
          (e && e.message ? e.message : String(e)) +
          '. revise o ambiente.',
      };
    }
    lines.push(_validateOutputLine(c.name, r.verdict, r.hint));
    if (r.verdict !== 'PASS') failures++;
  }

  const summary =
    'Validacao ' +
    workId +
    ': ' +
    (failures === 0 ? 'PASS' : 'FAIL') +
    ' — ' +
    checks.length +
    ' verificacoes, ' +
    failures +
    ' falhas.';
  lines.push(summary);
  lines.push(
    'Lembrete: validate nao publica. Use /Kaizen:Yotzer publish ' +
      workId +
      ' apos PASS.'
  );

  process.stdout.write(lines.join('\n') + '\n');
  _writeValidateEventLog(workId, failures === 0 ? 'PASS' : 'FAIL', summary);
  return failures === 0 ? 0 : 1;
}

// --- rollback subcommand (M6.4) -------------------------------------------
//
// `kaizen rollback` restores the most recent snapshot from
// `.kaizen/snapshots/`. Idempotent (NFR-105 / AC-024): re-running on a
// state that already matches the snapshot content emits a pt-BR warn and
// exits 0 without rewriting files. Running with no snapshots present
// also emits a pt-BR warn and exits 0. All console output is pt-BR per
// Commandment IV / D-v1.4-06.
//
// `kaizen rollback --list` prints available snapshots in pt-BR (newest
// first) without restoring anything.
//
// The module under .kaizen-dvir/dvir/update/snapshot.js is a pure I/O
// library — it never logs; this CLI layer owns all expert-facing
// strings.

function _snapshotModule() {
  const p = path.join(
    __dirname,
    '..',
    '.kaizen-dvir',
    'dvir',
    'update',
    'snapshot.js'
  );
  delete require.cache[require.resolve(p)];
  return require(p);
}

function _projectRoot() {
  if (process.env.KAIZEN_PROJECT_ROOT) return process.env.KAIZEN_PROJECT_ROOT;
  return path.join(__dirname, '..');
}

function _formatSizeBytes(bytes) {
  if (typeof bytes !== 'number' || isNaN(bytes)) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function _renderSnapshotList(entries) {
  if (entries.length === 0) {
    return 'Nenhum snapshot encontrado em .kaizen/snapshots/.\n';
  }
  const lines = [];
  lines.push('Snapshots disponíveis (mais recente primeiro):');
  for (const e of entries) {
    lines.push(
      '  ' +
        (e.timestamp || '(sem timestamp)') +
        '  versão=' +
        e.version +
        '  tamanho=' +
        _formatSizeBytes(e.sizeBytes) +
        '  caminho=' +
        e.path
    );
  }
  return lines.join('\n') + '\n';
}

function runRollback(args) {
  const snapshot = _snapshotModule();
  const projectRoot = _projectRoot();

  if (args.includes('--list')) {
    try {
      const entries = snapshot.listSnapshots({ projectRoot: projectRoot });
      process.stdout.write(_renderSnapshotList(entries));
      return 0;
    } catch (err) {
      process.stderr.write(
        'rollback --list: falha ao ler snapshots (' +
          (err && err.message ? err.message : String(err)) +
          ').\n'
      );
      return 1;
    }
  }

  let entries;
  try {
    entries = snapshot.listSnapshots({ projectRoot: projectRoot });
  } catch (err) {
    process.stderr.write(
      'rollback: falha ao ler snapshots (' +
        (err && err.message ? err.message : String(err)) +
        ').\n'
    );
    return 1;
  }

  if (entries.length === 0) {
    // AC-024 — no snapshot present: pt-BR warn + exit 0.
    process.stdout.write(
      'Aviso: nenhum snapshot disponível em .kaizen/snapshots/. ' +
        'Nada a restaurar. Execute `kaizen update` para gerar o primeiro snapshot.\n'
    );
    return 0;
  }

  const latest = entries[0];

  // Idempotency check — if the live state already matches the snapshot
  // content byte-for-byte, skip the restore.
  let liveFp;
  let snapFp;
  try {
    liveFp = snapshot.computeStateFingerprint({ projectRoot: projectRoot });
    snapFp = snapshot.computeSnapshotFingerprint(latest.path);
  } catch (_) {
    liveFp = null;
    snapFp = null;
  }
  if (liveFp && snapFp && liveFp === snapFp) {
    process.stdout.write(
      'Aviso: estado atual já corresponde ao snapshot ' +
        latest.name +
        '. Nada a restaurar (operação idempotente).\n'
    );
    return 0;
  }

  let result;
  try {
    result = snapshot.restoreSnapshot({
      projectRoot: projectRoot,
      snapshotPath: latest.path,
    });
  } catch (err) {
    process.stderr.write(
      'rollback: falha ao restaurar snapshot (' +
        (err && err.message ? err.message : String(err)) +
        '). Snapshot em ' +
        latest.path +
        ' continua intacto.\n'
    );
    return 1;
  }

  process.stdout.write(
    'Rollback concluído: ' +
      result.restoredCount +
      ' arquivo(s) restaurado(s) a partir de ' +
      latest.name +
      ' em ' +
      result.durationMs +
      ' ms.\n'
  );
  return 0;
}

function main(argv) {
  const args = argv.slice(2);
  const cmd = args[0];

  if (cmd === '--help' || cmd === '-h' || cmd === 'help' || cmd === undefined) {
    printHelp();
    return 0;
  }

  if (cmd === '--version' || cmd === '-v') {
    printVersion();
    return 0;
  }

  switch (cmd) {
    case 'init': {
      const initCmd = require('./kaizen-init.js');
      return initCmd(args.slice(1));
    }
    case 'doctor':
      return runDoctor(args.slice(1));
    case 'install':
      printNotImplemented('install', 'M4');
      return 0;
    case 'rollback':
      return runRollback(args.slice(1));
    case 'Kaizen:Yotzer':
    case 'kaizen:yotzer':
      return runYotzerCommand(args.slice(1));
    default:
      printUnknownCommand(cmd);
      return 1;
  }
}

if (require.main === module) {
  const exitCode = main(process.argv);
  process.exit(exitCode);
}

module.exports = {
  main: main,
  runYotzerCommand: runYotzerCommand,
  runYotzerPublish: runYotzerPublish,
  runYotzerResume: runYotzerResume,
  runYotzerValidate: runYotzerValidate,
  runRollback: runRollback,
};

// --- Change Log -----------------------------------------------------------
// 2026-04-24 — @dev (Dex) — M3.5: extended `doctor` from M2.5 `--hooks`
//   partial into the full 5-section report (hooks, gates, memory, cells,
//   promotion). Added `--promotion approve|reject` sub-commands wired to
//   `pattern-promoter.js` with the expert-only invocation guard
//   (FR-025) and double-confirmation for `--target commandments` (AC 9).
//   frameworkProtection alert (R-009) rendered before Memory section
//   when the toggle is off.
// 2026-04-25 — @dev (Dex) — M4.6: added Kaizen:Yotzer resume and validate
//   subcommands. Resume reads latest handoff for chief via M3.2
//   handoff-engine.readLatest, prompts in pt-BR, idempotent via
//   resume-events stamp, logs every invocation. Validate runs Schema
//   Gate, OST closure, Actions-inline, handoff size audit, critical
//   invariants flag, Reuse Gate re-check; pt-BR per-check rendering;
//   does NOT publish; only writes a single validate-event log entry.
// 2026-04-25 — @dev (Dex) — M6.4: added `rollback` subcommand. Restores
//   the most recent snapshot from .kaizen/snapshots/ via the snapshot
//   module's restoreSnapshot API. Supports `--list` for inventory.
//   Idempotent: pre-restore state-fingerprint check skips restore when
//   live state already matches the snapshot. No-snapshot case emits
//   pt-BR warn + exit 0 (NFR-105 / AC-024). All console output is pt-BR
//   per Commandment IV / D-v1.4-06.
