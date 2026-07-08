/**
 * Run ledger (Capa 1 — pure). The single authoritative record of a backlog run:
 * per-item state, worktree, budget spent, and a pointer to the item's inner
 * trace. Human-readable markdown that carries a parseable data block, so
 * `--resume` can reconstruct the run faithfully (serialize/parse round-trip).
 */
import type { ItemState } from './itemState.js';

export interface ItemRecord {
  id: string;
  state: ItemState;
  worktree: string;
  budgetSpent: number;
  trace: string;
}

export interface Ledger {
  run: string;
  budgetSpent: number;
  items: ItemRecord[];
}

const DATA_OPEN = '```json loop-ledger';
const DATA_CLOSE = '```';

/** Render the ledger as markdown with an embedded machine-readable data block. */
export function serializeLedger(ledger: Ledger): string {
  const rows = ledger.items
    .map((i) => `| ${i.id} | ${i.state} | ${i.budgetSpent} | ${i.trace} |`)
    .join('\n');
  return [
    `# Backlog Run: ${ledger.run}`,
    ``,
    `**Budget spent**: ${ledger.budgetSpent} tokens`,
    ``,
    `| Item | State | Budget | Trace |`,
    `|------|-------|--------|-------|`,
    rows,
    ``,
    `<!-- machine-readable — do not edit by hand -->`,
    DATA_OPEN,
    JSON.stringify(ledger),
    DATA_CLOSE,
    ``,
  ].join('\n');
}

/**
 * Reconstruct the ledger from its serialized form (inverse of serializeLedger).
 * Line-anchored on the exact `DATA_OPEN` fence so a stray triple-backtick added
 * by a human editing above the machine block cannot truncate the JSON slice.
 */
export function parseLedger(text: string): Ledger {
  const lines = text.split('\n');
  const open = lines.findIndex((l) => l.trim() === DATA_OPEN);
  if (open === -1) throw new Error('Ledger data block not found.');
  const jsonLines: string[] = [];
  let closed = false;
  for (let i = open + 1; i < lines.length; i++) {
    if (lines[i].trim() === DATA_CLOSE) {
      closed = true;
      break;
    }
    jsonLines.push(lines[i]);
  }
  if (!closed) throw new Error('Ledger data block is unterminated.');
  const json = jsonLines.join('\n').trim();
  if (!json) throw new Error('Ledger data block is empty.');
  return JSON.parse(json) as Ledger;
}
