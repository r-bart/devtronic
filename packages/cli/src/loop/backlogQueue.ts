/**
 * Backlog queue (Capa 1 — pure). Turns a BACKLOG.md into loop items, decides
 * readiness (spec + DoD present), and orders by priority. No I/O: the existence
 * check is injected so the module stays pure and testable (the CLI passes
 * `fs.existsSync`). Priority derives from the BACKLOG.md section, not a field.
 */

export interface BacklogItem {
  id: string;
  spec: string;
  dod: string;
  /** 3 = High, 2 = Medium, 1 = Low (derived from the BACKLOG.md section). */
  priority: number;
}

export type Eligibility =
  | { item: BacklogItem; ready: true }
  | { item: BacklogItem; ready: false; reason: string };

/** Existence probe — injected for purity (CLI passes fs.existsSync). */
export type ExistsProbe = (path: string) => boolean;

const SECTION_PRIORITY: Array<{ match: RegExp; priority: number }> = [
  { match: /high priority/i, priority: 3 },
  { match: /medium priority/i, priority: 2 },
  { match: /low priority/i, priority: 1 },
];

/**
 * Parse a BACKLOG.md into loop-eligible items. Priority comes from the current
 * `##` section; each `### [BACK-NNN] title` item collects its `- Spec:` / `- DoD:`
 * bullets. Items missing spec/dod get empty strings (readiness rejects them).
 */
export function parseBacklog(md: string): BacklogItem[] {
  const items: BacklogItem[] = [];
  let priority = 0;
  let current: BacklogItem | null = null;

  const push = () => {
    if (current) items.push(current);
    current = null;
  };

  for (const raw of md.split('\n')) {
    const line = raw.trim();

    const section = line.match(/^##\s+(.*)$/);
    if (section) {
      push();
      const found = SECTION_PRIORITY.find((s) => s.match.test(section[1]));
      priority = found ? found.priority : 0;
      continue;
    }

    const item = line.match(/^###\s+\[(BACK-\d+)\]/);
    if (item) {
      push();
      current = { id: item[1], spec: '', dod: '', priority };
      continue;
    }

    if (current) {
      const spec = line.match(/^-\s*Spec:\s*(\S+)/i);
      if (spec) current.spec = spec[1];
      const dod = line.match(/^-\s*DoD:\s*(\S+)/i);
      if (dod) current.dod = dod[1];
    }
  }
  push();
  return items;
}

/** An item is ready when both its spec and its DoD tests exist on disk. */
export function checkReadiness(item: BacklogItem, exists: ExistsProbe): Eligibility {
  if (!item.spec || !exists(item.spec)) {
    return { item, ready: false, reason: `missing spec (${item.spec || 'none declared'})` };
  }
  if (!item.dod || !exists(item.dod)) {
    return { item, ready: false, reason: `missing DoD tests (${item.dod || 'none declared'})` };
  }
  return { item, ready: true };
}

/** Descending priority; stable within a band (FIFO — oldest queued first). */
export function orderByPriority(items: BacklogItem[]): BacklogItem[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => b.item.priority - a.item.priority || a.index - b.index)
    .map((x) => x.item);
}

/** Split a queue into ready (priority-ordered) and skipped (with reasons). */
export function eligibleQueue(
  items: BacklogItem[],
  exists: ExistsProbe
): { ready: BacklogItem[]; skipped: Array<{ item: BacklogItem; ready: false; reason: string }> } {
  const ready: BacklogItem[] = [];
  const skipped: Array<{ item: BacklogItem; ready: false; reason: string }> = [];
  for (const item of items) {
    const r = checkReadiness(item, exists);
    if (r.ready) ready.push(item);
    else skipped.push(r);
  }
  return { ready: orderByPriority(ready), skipped };
}
