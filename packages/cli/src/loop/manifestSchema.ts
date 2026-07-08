/**
 * Loop manifest schema (Capa 1 — the portable policy contract).
 *
 * Shape per design §7.4. This is the TS source of truth for the manifest that
 * `loop.manifest.yaml` declares and that `validateManifest` enforces at runtime.
 * Pure types only — no I/O, no runtime deps.
 */

/** Gate tiers referenced by a phase. `objective` = Tier ①, `subjective` = Tier ②. */
export type GateTier = 'objective' | 'subjective';

/** Who owns a phase's stop condition while it is in flight. */
export type PhaseOwner = 'human' | 'machine';

/** Tier ① — a deterministic command gate (typecheck/lint/test). */
export interface ObjectiveGate {
  cmd: string;
  /** Optional guard expression (e.g. a clean-tree precondition). */
  when?: string;
  stopOn?: 'green';
}

/** Tier ② — a judgment gate delegated to a reviewing agent. */
export interface SubjectiveGate {
  agent?: string;
  check?: string;
  adapter?: string;
  strict?: boolean;
  adversarial?: boolean;
}

/** One phase of the loop. `gates` references tier names defined in `gates`. */
export interface Phase {
  id: string;
  entry: string;
  exit: string;
  owner: PhaseOwner;
  gates: GateTier[];
}

export interface DoD {
  as_tests: string;
  extra?: string[];
}

export interface ShipContract {
  strategy: string;
  guards?: string[];
  approval: 'human';
}

export interface Budget {
  max_iterations: number;
  on_exhausted?: string;
  context_reset_at?: string[];
}

export interface LoopManifest {
  version: 1;
  phases: Phase[];
  gates: { objective: ObjectiveGate[]; subjective: SubjectiveGate[] };
  dod: DoD;
  ship: ShipContract;
  budget: Budget;
}

/** A single validation failure: a dotted path plus a human-actionable message. */
export interface ValidationError {
  path: string;
  message: string;
}

export type ValidateResult =
  | { ok: true; manifest: LoopManifest }
  | { ok: false; errors: ValidationError[] };
