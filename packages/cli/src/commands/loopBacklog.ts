/**
 * `devtronic loop --backlog` — the deterministic spine of the outer loop.
 *
 * Policy (which items, in what order) is the backlog + readiness; orchestration
 * (converge, park-ahead) is the `/loop` skill's "Backlog mode". This handler is
 * the tested middle: preview the queue, and mutate authoritative run state
 * (take / park / quarantine / sign / abort) that the skill drives per item.
 *
 * The ledger is the single source of truth. Because the design runs items
 * concurrently (up to the width cap), every mutation is serialized under an
 * exclusive lock and written atomically (temp + rename) — no lost updates, no
 * torn reads. The budget/width gate is enforced HERE (not just in skill prose),
 * so a runaway orchestrator can't spawn unbounded worktrees or spend.
 */
import { resolve, join, dirname } from 'node:path';
import {
  existsSync,
  readFileSync,
  writeFileSync,
  renameSync,
  mkdirSync,
  openSync,
  closeSync,
  rmSync,
  statSync,
} from 'node:fs';
import * as p from '@clack/prompts';
import chalk from 'chalk';
import { introTitle, symbols } from '../utils/ui.js';
import { parseBacklog, eligibleQueue } from '../loop/backlogQueue.js';
import type { BacklogItem } from '../loop/backlogQueue.js';
import { buildBacklogPlan, canLaunchNext } from '../loop/backlogPlan.js';
import { transition } from '../loop/itemState.js';
import type { ItemState, ItemEvent } from '../loop/itemState.js';
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
  spent?: string;
  width?: string;
  budget?: string;
  path?: string;
}

const BACKLOG_PATH = join('thoughts', 'BACKLOG.md');
const LEDGER_PATH = join('thoughts', 'loop', 'backlog.ledger.md');
const DEFAULT_WIDTH = 3;
const DEFAULT_BUDGET = 1_000_000;
const LOCK_STALE_MS = 30_000;

/** Exit code the skill reads as "at capacity — stop launching, don't treat as error". */
const EXIT_AT_CAPACITY = 3;

const IN_FLIGHT: ItemState[] = ['converging', 'parked'];
const SAFE_ID = /^[A-Za-z0-9._-]+$/;

function ledgerFile(dir: string): string {
  return join(dir, LEDGER_PATH);
}

function loadLedger(dir: string): Ledger {
  const path = ledgerFile(dir);
  if (!existsSync(path)) return { run: 'backlog', budgetSpent: 0, items: [] };
  return parseLedger(readFileSync(path, 'utf8'));
}

/** Atomic write (temp + rename) so a concurrent read never sees a partial ledger. */
function saveLedger(dir: string, ledger: Ledger): void {
  const path = ledgerFile(dir);
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, serializeLedger(ledger), 'utf8');
  renameSync(tmp, path);
}

/** Serialize a load→mutate→save cycle under an exclusive, stale-aware lock. */
async function withLedger(dir: string, fn: (ledger: Ledger) => void): Promise<void> {
  const lockPath = `${ledgerFile(dir)}.lock`;
  mkdirSync(dirname(lockPath), { recursive: true });
  for (let attempt = 0; attempt < 100; attempt++) {
    let fd: number | undefined;
    try {
      fd = openSync(lockPath, 'wx');
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'EEXIST') {
        // Steal a stale lock left by a crashed process.
        try {
          if (Date.now() - statSync(lockPath).mtimeMs > LOCK_STALE_MS) rmSync(lockPath, { force: true });
        } catch {
          /* lock vanished between stat and rm — just retry */
        }
        await new Promise((r) => setTimeout(r, 50));
        continue;
      }
      throw err;
    }
    try {
      const ledger = loadLedger(dir);
      fn(ledger);
      saveLedger(dir, ledger);
      return;
    } finally {
      closeSync(fd);
      rmSync(lockPath, { force: true });
    }
  }
  throw new Error('Could not acquire the ledger lock (timeout).');
}

function record(ledger: Ledger, id: string): ItemRecord | undefined {
  return ledger.items.find((i) => i.id === id);
}

function fail(message: string, code = 1): never {
  process.stderr.write(message + '\n');
  process.exit(code);
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
    // Exclude every item already in this run (any state — a quarantined item has
    // been processed and must not be re-offered, or --take would reject it forever).
    const seen = new Set(ledger.items.map((i) => i.id));
    const next = q.ready.find((i) => !seen.has(i.id));
    if (!next) process.exit(1);
    process.stdout.write(next.id + '\n');
    return;
  }

  if (opts.take) {
    const id = opts.take;
    if (!SAFE_ID.test(id)) fail(`Unsafe item id: "${id}".`);
    const q = readBacklog();
    if (!q) fail(`No backlog found at ${BACKLOG_PATH}.`);
    if (!q.ready.some((i) => i.id === id)) {
      fail(`Item ${id} is not a ready backlog item (needs an existing spec + DoD).`);
    }
    // Gate BEFORE touching git: enforce the width cap + budget authoritatively.
    const pre = loadLedger(dir);
    if (record(pre, id)) fail(`Item ${id} is already in the run.`);
    const inFlight = pre.items.filter((i) => IN_FLIGHT.includes(i.state)).length;
    if (!canLaunchNext({ budgetSpent: pre.budgetSpent, budgetTotal: budget, inFlight, widthCap: width })) {
      fail(`At capacity (in-flight ${inFlight}/${width}, budget ${pre.budgetSpent}/${budget}).`, EXIT_AT_CAPACITY);
    }
    // Create the worktree first; roll it back if recording state fails.
    const wt = addWorktree(dir, id);
    try {
      writeSentinel(wt, { phase: 'implement', owner: 'machine', atBarrier: false });
      await withLedger(dir, (ledger) => {
        if (record(ledger, id)) throw new Error(`Item ${id} is already in the run.`);
        const inFlightNow = ledger.items.filter((i) => IN_FLIGHT.includes(i.state)).length;
        if (!canLaunchNext({ budgetSpent: ledger.budgetSpent, budgetTotal: budget, inFlight: inFlightNow, widthCap: width })) {
          throw new Error('AT_CAPACITY');
        }
        ledger.items.push({
          id,
          state: transition('queued', 'launch'),
          worktree: wt,
          budgetSpent: spent,
          trace: join('thoughts', 'loop', `${id}.trace.md`),
        });
        ledger.budgetSpent += spent;
      });
    } catch (err) {
      clearSentinel(wt);
      try {
        removeWorktree(dir, wt);
      } catch {
        /* best-effort rollback */
      }
      if (err instanceof Error && err.message === 'AT_CAPACITY') {
        fail(`At capacity for ${id}.`, EXIT_AT_CAPACITY);
      }
      fail(`Failed to take ${id}: ${err instanceof Error ? err.message : String(err)}`);
    }
    return;
  }

  if (opts.park || opts.quarantine) {
    const id = (opts.park || opts.quarantine)!;
    const event: ItemEvent = opts.park ? 'converged' : 'fail';
    const verb = opts.park ? 'park' : 'quarantine';
    await withLedger(dir, (ledger) => {
      const rec = record(ledger, id);
      if (!rec) throw new Error(`Item ${id} is not in the run.`);
      let next: ItemState;
      try {
        next = transition(rec.state, event);
      } catch {
        throw new Error(`Cannot ${verb} ${id} from state "${rec.state}".`);
      }
      rec.state = next;
      rec.budgetSpent += spent;
      ledger.budgetSpent += spent;
    }).catch((err) => fail(err instanceof Error ? err.message : String(err)));
    return;
  }

  // ---- human-facing commands ----

  if (opts.sign) {
    p.intro(introTitle('Loop backlog — sign'));
    const id = opts.sign;
    let signedWorktree: string | null = null;
    try {
      await withLedger(dir, (ledger) => {
        const rec = record(ledger, id);
        if (!rec) throw new Error(`Item ${id} is not in the run.`);
        rec.state = transition(rec.state, 'sign'); // throws if not parked
        signedWorktree = rec.worktree;
      });
    } catch (err) {
      p.cancel(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
    if (signedWorktree) {
      clearSentinel(signedWorktree);
      try {
        removeWorktree(dir, signedWorktree);
      } catch {
        /* worktree may already be gone; ledger state is authoritative */
      }
    }
    p.log.success(`Signed ${chalk.cyan(id)} — shipped, worktree released.`);
    p.outro('');
    return;
  }

  if (opts.abort) {
    p.intro(introTitle('Loop backlog — abort'));
    const released: string[] = [];
    await withLedger(dir, (ledger) => {
      for (const rec of ledger.items) {
        if (!IN_FLIGHT.includes(rec.state)) continue;
        rec.state = transition(rec.state, 'abort');
        released.push(rec.worktree);
      }
    });
    for (const wt of released) {
      clearSentinel(wt);
      try {
        removeWorktree(dir, wt);
      } catch {
        /* best-effort */
      }
    }
    p.log.success(`Aborted — quarantined ${released.length} in-flight item(s); worktrees released.`);
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
      p.note(q.ready.map((i: BacklogItem) => `  ${symbols.pass} ${i.id} ${chalk.dim(`(priority ${i.priority})`)}`).join('\n'), 'Ready');
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
