/**
 * `devtronic loop` — the deterministic mechanism half of the convergence harness.
 *
 * Policy lives in `loop.manifest.yaml`; orchestration lives in the `loop` skill.
 * This command is the testable middle: validate the manifest, preview the plan
 * (dry-run, executes nothing), print the Tier ① gate command for the ambient
 * stop-guard, and abort a derailed loop by clearing the ownership sentinel.
 */
import { resolve, join } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { parse as parseYaml } from 'yaml';
import * as p from '@clack/prompts';
import chalk from 'chalk';
import { introTitle, symbols } from '../utils/ui.js';
import { validateManifest } from '../loop/validateManifest.js';
import { buildPlan } from '../loop/buildPlan.js';
import { readSentinel, clearSentinel, writeSentinel, treeStatus } from '../loop/ownership.js';
import type { ValidateResult } from '../loop/manifestSchema.js';

export interface LoopOptions {
  validate?: boolean;
  dryRun?: boolean;
  abort?: boolean;
  gateCmd?: boolean;
  own?: string;
  owner?: string;
  atBarrier?: boolean;
  release?: boolean;
  path?: string;
}

const DEFAULT_MANIFEST = 'loop.manifest.yaml';

/** Load + validate the manifest at `manifestPath`; never throws on bad content. */
function loadManifest(manifestPath: string): ValidateResult & { parseError?: string } {
  if (!existsSync(manifestPath)) {
    return {
      ok: false,
      errors: [{ path: '', message: `No manifest found at ${manifestPath}.` }],
    };
  }
  let parsed: unknown;
  try {
    parsed = parseYaml(readFileSync(manifestPath, 'utf8'));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, errors: [{ path: '', message: `YAML parse error: ${message}` }] };
  }
  return validateManifest(parsed);
}

export async function loopCommand(pathArg: string | undefined, options: LoopOptions): Promise<void> {
  const targetDir = resolve(options.path || '.');
  const manifestPath = pathArg
    ? resolve(targetDir, pathArg)
    : join(targetDir, DEFAULT_MANIFEST);

  // --gate-cmd: machine-readable. Print the Tier ① command to stdout for the
  // stop-guard to consume; stay silent + non-zero on any problem so bash falls
  // back to its baked quality command. No clack decoration here.
  if (options.gateCmd) {
    const result = loadManifest(manifestPath);
    if (!result.ok) process.exit(1);
    const cmds = result.manifest.gates.objective.map((g) => g.cmd).filter(Boolean);
    if (cmds.length === 0) process.exit(1);
    process.stdout.write(cmds.join(' && ') + '\n');
    return;
  }

  // --own: the skill takes/refreshes ownership of the tree for a phase (FR-3).
  // Machine-readable + silent so it can be called every iteration (heartbeat).
  if (options.own) {
    const owner = options.owner === 'human' ? 'human' : 'machine';
    // Clean-tree guard (FR-7): deterministic enforcement, not just SKILL prose.
    // Only on a *fresh* machine take (no sentinel yet) — heartbeat refreshes must
    // not fail once the machine's own work has (legitimately) dirtied the tree.
    // Only refuse on a *confirmed* dirty tree; 'unknown' (non-git) must not block.
    const takingFresh = readSentinel(targetDir) === null;
    if (takingFresh && owner === 'machine' && treeStatus(targetDir) === 'dirty') {
      process.stderr.write(
        'Refusing to take loop ownership: the working tree has uncommitted changes.\n' +
          'Commit or stash your WIP first — the loop must not converge over human work (FR-7).\n'
      );
      process.exit(1);
    }
    writeSentinel(targetDir, { phase: options.own, owner, atBarrier: !!options.atBarrier });
    return;
  }

  // --release: the skill relinquishes ownership (phase exit / completion).
  if (options.release) {
    clearSentinel(targetDir);
    return;
  }

  // --abort: clear the ownership sentinel and report the half-done phase (gap #5).
  if (options.abort) {
    p.intro(introTitle('Loop — abort'));
    const sentinel = readSentinel(targetDir);
    if (!sentinel) {
      p.log.info('No active loop ownership signal found — nothing to abort.');
      p.outro('');
      return;
    }
    clearSentinel(targetDir);
    p.log.success(`Cleared ownership signal (was: phase "${sentinel.phase}", owner "${sentinel.owner}").`);
    p.log.info(
      chalk.dim('The tree is back under human ownership. Review the working tree before resuming.')
    );
    p.outro('Loop aborted');
    return;
  }

  // --validate (default action) / --dry-run both need a loaded manifest.
  p.intro(introTitle(options.dryRun ? 'Loop — dry-run' : 'Loop — validate'));
  const result = loadManifest(manifestPath);

  if (!result.ok) {
    p.log.error(`Manifest invalid: ${chalk.dim(manifestPath)}`);
    p.note(
      result.errors.map((e) => `  ${symbols.fail} ${e.path ? chalk.cyan(e.path) + ': ' : ''}${e.message}`).join('\n'),
      `${result.errors.length} problem${result.errors.length === 1 ? '' : 's'}`
    );
    p.cancel('Fix the manifest and re-run.');
    process.exit(1);
  }

  if (!options.dryRun) {
    p.log.success(`Manifest valid: ${chalk.dim(manifestPath)}`);
    p.outro(`Preview the plan with ${chalk.cyan('devtronic loop --dry-run')}`);
    return;
  }

  // --dry-run: pedagogical plan. Executes nothing (FR-11 / US-2).
  const plan = buildPlan(result.manifest);
  const lines: string[] = [];
  plan.forEach((line, i) => {
    const marker = line.stop ? chalk.yellow('■ STOP') : chalk.green('▶ auto');
    lines.push(`${chalk.bold(`${i + 1}. ${line.phaseId}`)}  ${marker} ${chalk.dim(`(${line.owner})`)}`);
    lines.push(`   ${line.explanation}`);
    for (const gate of line.gates) {
      lines.push(
        `     ${symbols.arrow} ${chalk.cyan(`Tier ${gate.tier}`)} ${chalk.dim(gate.frequency)} — ${gate.describes}`
      );
      lines.push(`        ${chalk.dim(gate.detail)}`);
    }
    lines.push('');
  });
  p.note(lines.join('\n').trimEnd(), 'Convergence plan (nothing executed)');
  p.outro(chalk.dim('Dry-run only — no gates ran, no agents spawned, no files changed.'));
}
