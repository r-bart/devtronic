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

/** Reconstruct the ledger from its serialized form (inverse of serializeLedger). */
export function parseLedger(text: string): Ledger {
  const start = text.indexOf(DATA_OPEN);
  if (start === -1) throw new Error('Ledger data block not found.');
  const from = start + DATA_OPEN.length;
  const end = text.indexOf(DATA_CLOSE, from);
  if (end === -1) throw new Error('Ledger data block is unterminated.');
  return JSON.parse(text.slice(from, end).trim()) as Ledger;
}
