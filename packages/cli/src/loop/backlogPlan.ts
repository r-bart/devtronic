/**
 * Backlog dry-run plan + launch gate (Capa 1 — pure). `buildBacklogPlan` returns
 * data; the command prints it (executes nothing). `canLaunchNext` is the launch
 * predicate that enforces the two outer bounds — the token budget and the width
 * cap — so an away human never triggers a worktree explosion or a runaway spend.
 */
import type { BacklogItem } from './backlogQueue.js';
import { orderByPriority } from './backlogQueue.js';

export interface BacklogCaps {
  /** Total token budget for the whole run. */
  budget: number;
  /** Max concurrent in-flight (converging + parked-unsigned) items. */
  width: number;
}

export interface BacklogPlanLine {
  itemId: string;
  priority: number;
  explanation: string;
}

/** Ordered, plain-language preview of the eligible queue under the caps. Pure. */
export function buildBacklogPlan(queue: BacklogItem[], caps: BacklogCaps): BacklogPlanLine[] {
  const ordered = orderByPriority(queue);
  return ordered.map((item, i) => ({
    itemId: item.id,
    priority: item.priority,
    explanation:
      `#${i + 1} priority ${item.priority} — converges in its own worktree, then parks ` +
      `for your ship-sign (up to ${caps.width} in flight; budget ${caps.budget} tokens).`,
  }));
}

/** True when another item may be launched: under both the budget and the width cap. */
export function canLaunchNext(state: {
  budgetSpent: number;
  budgetTotal: number;
  inFlight: number;
  widthCap: number;
}): boolean {
  return state.budgetSpent < state.budgetTotal && state.inFlight < state.widthCap;
}
