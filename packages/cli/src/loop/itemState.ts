/**
 * Per-item state machine (Capa 1 — pure). The deterministic spine of the outer
 * loop: one authoritative record of where each backlog item is. Invalid
 * transitions throw rather than being silently accepted.
 *
 *   queued ─launch─▶ converging ─converged─▶ parked ─sign─▶ done
 *                        │                      │
 *                        └────── fail/abort ────┴──▶ quarantined
 */

export type ItemState = 'queued' | 'converging' | 'parked' | 'done' | 'quarantined';
export type ItemEvent = 'launch' | 'converged' | 'sign' | 'fail' | 'abort';

const TABLE: Record<ItemState, Partial<Record<ItemEvent, ItemState>>> = {
  queued: { launch: 'converging' },
  converging: { converged: 'parked', fail: 'quarantined', abort: 'quarantined' },
  parked: { sign: 'done', abort: 'quarantined' },
  done: {},
  quarantined: {},
};

/** Apply an event to a state. Throws on an invalid transition. */
export function transition(state: ItemState, event: ItemEvent): ItemState {
  const next = TABLE[state][event];
  if (!next) {
    throw new Error(`Invalid transition: cannot "${event}" from "${state}".`);
  }
  return next;
}
