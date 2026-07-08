/**
 * `devtronic loop --backlog` — the deterministic spine of the outer loop.
 *
 * Policy (which items, in what order) is the backlog + readiness; orchestration
 * (converge, park-ahead) is the `/loop` skill's "Backlog mode". This handler is
 * the tested middle: preview the queue, and mutate authoritative run state
 * (take / park / quarantine / sign / abort) that the skill drives per item.
 */
import { resolve, join } from 'node:path';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import * as p from '@clack/prompts';
import chalk from 'chalk';
import { introTitle, symbols } from '../utils/ui.js';
import { parseBacklog, eligibleQueue } from '../loop/backlogQueue.js';
import { buildBacklogPlan } from '../loop/backlogPlan.js';
import { transition } from '../loop/itemState.js';
import type { ItemState } from '../loop/itemState.js';
import { serializeLedger, parseLedger } from '../loop/backlogLedger.js';
import type { Ledger, ItemRecord } from '../loop/backlogLedger.js';
import { addWorktree, removeWorktree } from '../loop/worktrees.js';
import { writeSentinel, clearSentinel } from '../loop/ownership.js';

export interface BacklogOptions {
  validate?: boolean;
  dryRun?: boolean;
  next?: boolean;
  status?: boolean;
  take?: string;
  park?: string;
  quarantine?: string;
  sign?: string;
  abort?: boolean;
  spent?: string; // tokens spent, recorded with --take/--park
  width?: string;
  budget?: string;
  path?: string;
}

const BACKLOG_PATH = join('thoughts', 'BACKLOG.md');
const LEDGER_PATH = join('thoughts', 'loop', 'backlog.ledger.md');
const DEFAULT_WIDTH = 3;
const DEFAULT_BUDGET = 1_000_000;

const IN_FLIGHT: ItemState[] = ['converging', 'parked'];

function loadLedger(dir: string): Ledger {
  const path = join(dir, LEDGER_PATH);
  if (!existsSync(path)) return { run: 'backlog', budgetSpent: 0, items: [] };
  return parseLedger(readFileSync(path, 'utf8'));
}

function saveLedger(dir: string, ledger: Ledger): void {
  const path = join(dir, LEDGER_PATH);
  mkdirSync(join(dir, 'thoughts', 'loop'), { recursive: true });
  writeFileSync(path, serializeLedger(ledger), 'utf8');
}

function record(ledger: Ledger, id: string): ItemRecord | undefined {
  return ledger.items.find((i) => i.id === id);
}

export async function loopBacklogCommand(opts: BacklogOptions): Promise<void> {
  const dir = resolve(opts.path || '.');
  const width = opts.width ? parseInt(opts.width, 10) : DEFAULT_WIDTH;
  const budget = opts.budget ? parseInt(opts.budget, 10) : DEFAULT_BUDGET;
  const spent = opts.spent ? parseInt(opts.spent, 10) : 0;

  const readBacklog = () => {
    const file = join(dir, BACKLOG_PATH);
    if (!existsSync(file)) return null;
    return eligibleQueue(parseBacklog(readFileSync(file, 'utf8')), (rel) => existsSync(join(dir, rel)));
  };

  // ---- machine-readable, silent commands (called by the skill) ----

  if (opts.next) {
    const q = readBacklog();
    if (!q) process.exit(1);
    const ledger = loadLedger(dir);
    const inflightOrDone = new Set(ledger.items.filter((i) => i.state !== 'quarantined').map((i) => i.id));
    const next = q.ready.find((i) => !inflightOrDone.has(i.id));
    if (!next) process.exit(1);
    process.stdout.write(next.id + '\n');
    return;
  }

  if (opts.take) {
    const ledger = loadLedger(dir);
    if (record(ledger, opts.take)) {
      process.stderr.write(`Item ${opts.take} is already in the run.\n`);
      process.exit(1);
    }
    const wt = addWorktree(dir, opts.take);
    writeSentinel(wt, { phase: 'implement', owner: 'machine', atBarrier: false });
    ledger.items.push({
      id: opts.take,
      state: transition('queued', 'launch'),
      worktree: wt,
      budgetSpent: spent,
      trace: join('thoughts', 'loop', `${opts.take}.trace.md`),
    });
    ledger.budgetSpent += spent;
    saveLedger(dir, ledger);
    return;
  }

  if (opts.park || opts.quarantine) {
    const id = (opts.park || opts.quarantine)!;
    const event = opts.park ? 'converged' : 'fail';
    const ledger = loadLedger(dir);
    const rec = record(ledger, id);
    if (!rec) {
      process.stderr.write(`Item ${id} is not in the run.\n`);
      process.exit(1);
    }
    rec.state = transition(rec.state, event);
    rec.budgetSpent += spent;
    ledger.budgetSpent += spent;
    saveLedger(dir, ledger);
    return;
  }

  // ---- human-facing commands ----

  if (opts.sign) {
    p.intro(introTitle('Loop backlog — sign'));
    const ledger = loadLedger(dir);
    const rec = record(ledger, opts.sign);
    if (!rec) {
      p.cancel(`Item ${opts.sign} is not in the run.`);
      process.exit(1);
    }
    rec.state = transition(rec.state, 'sign'); // throws if not parked
    clearSentinel(rec.worktree);
    try {
      removeWorktree(dir, rec.worktree);
    } catch {
      /* worktree may already be gone; ledger state is authoritative */
    }
    saveLedger(dir, ledger);
    p.log.success(`Signed ${chalk.cyan(opts.sign)} — shipped, worktree released.`);
    p.outro('');
    return;
  }

  if (opts.abort) {
    p.intro(introTitle('Loop backlog — abort'));
    const ledger = loadLedger(dir);
    const inflight = ledger.items.filter((i) => IN_FLIGHT.includes(i.state));
    for (const rec of inflight) {
      rec.state = 'quarantined';
      clearSentinel(rec.worktree);
      try {
        removeWorktree(dir, rec.worktree);
      } catch {
        /* best-effort */
      }
    }
    saveLedger(dir, ledger);
    p.log.success(`Aborted — quarantined ${inflight.length} in-flight item(s); worktrees released.`);
    p.outro('');
    return;
  }

  if (opts.status) {
    p.intro(introTitle('Loop backlog — status'));
    const ledger = loadLedger(dir);
    if (ledger.items.length === 0) {
      p.log.info('No active backlog run.');
      p.outro('');
      return;
    }
    const by = (s: ItemState) => ledger.items.filter((i) => i.state === s);
    const lines: string[] = [];
    const section = (label: string, recs: ItemRecord[]) => {
      if (recs.length === 0) return;
      lines.push(chalk.bold(label));
      for (const r of recs) lines.push(`  ${r.id}  ${chalk.dim(r.trace)}`);
    };
    section('■ Parked — awaiting your sign (devtronic loop --backlog --sign <id>)', by('parked'));
    section('▶ Converging', by('converging'));
    section('✓ Done', by('done'));
    section('⚠ Quarantined', by('quarantined'));
    p.note(lines.join('\n'), `Run: ${ledger.run} · ${ledger.budgetSpent} tokens`);
    p.outro('');
    return;
  }

  // ---- default: --validate / --dry-run ----

  p.intro(introTitle(opts.dryRun ? 'Loop backlog — dry-run' : 'Loop backlog — validate'));
  const q = readBacklog();
  if (!q) {
    p.cancel(`No backlog found at ${chalk.dim(BACKLOG_PATH)}.`);
    process.exit(1);
  }

  if (!opts.dryRun) {
    p.log.success(`${q.ready.length} ready · ${q.skipped.length} skipped`);
    if (q.ready.length) {
      p.note(q.ready.map((i) => `  ${symbols.pass} ${i.id} ${chalk.dim(`(priority ${i.priority})`)}`).join('\n'), 'Ready');
    }
    if (q.skipped.length) {
      p.note(q.skipped.map((s) => `  ${symbols.fail} ${s.item.id} — ${s.reason}`).join('\n'), 'Skipped');
    }
    p.outro(`Preview the run with ${chalk.cyan('devtronic loop --backlog --dry-run')}`);
    return;
  }

  const plan = buildBacklogPlan(q.ready, { budget, width });
  const lines = plan.map((l) => `${chalk.bold(l.itemId)}\n   ${l.explanation}`);
  p.note(lines.join('\n\n') || chalk.dim('(no ready items)'), 'Backlog run plan (nothing executed)');
  p.outro(chalk.dim(`width cap ${width} · budget ${budget} tokens · dry-run only`));
}
