/**
 * Pure dry-run plan builder (FR-11, US-2). Returns data; the command prints it.
 *
 * Not a listing — a teaching surface: every phase carries a plain-language
 * explanation of who owns it and why it stops (or doesn't), each gate is
 * annotated with what it verifies + its tier/frequency, and the machine phase
 * states the budget/escalation policy in words. No I/O, no exec (purity asserted).
 */
import type { LoopManifest, GateTier, PhaseOwner } from './manifestSchema.js';

/** A resolved gate annotation for a phase in the dry-run plan. */
export interface PlanGateLine {
  /** Numeric tier: 1 = objective (deterministic), 2 = subjective (judgment). */
  tier: 1 | 2;
  /** How often the gate runs. */
  frequency: 'per-iteration' | 'per-phase';
  /** What the gate verifies, in plain language. */
  describes: string;
  /** The command (Tier ①) or reviewing agent/check (Tier ②). */
  detail: string;
}

/** One phase line in the dry-run plan. */
export interface PlanLine {
  phaseId: string;
  owner: PhaseOwner;
  /** True when the loop pauses here for a human signature. */
  stop: boolean;
  /** Plain-language explanation of ownership + stop semantics (+ budget on machine phases). */
  explanation: string;
  gates: PlanGateLine[];
}

const TIER_META: Record<GateTier, { tier: 1 | 2; frequency: PlanGateLine['frequency']; label: string }> = {
  objective: { tier: 1, frequency: 'per-iteration', label: 'Tier ① objective' },
  subjective: { tier: 2, frequency: 'per-phase', label: 'Tier ② subjective' },
};

function budgetSentence(m: LoopManifest): string {
  const n = m.budget.max_iterations;
  const onExhausted = m.budget.on_exhausted ?? 'replan-then-human';
  const tail =
    onExhausted === 'replan-then-human'
      ? 'then re-plan, then ask you'
      : `then ${onExhausted.replace(/-/g, ' ')}`;
  return `Runs up to ${n} iterations, ${tail}.`;
}

export function buildPlan(m: LoopManifest): PlanLine[] {
  return m.phases.map((phase) => {
    const stop = phase.owner === 'human';

    const gates: PlanGateLine[] = phase.gates.map((tier) => {
      const meta = TIER_META[tier];
      if (tier === 'objective') {
        const cmds = m.gates.objective.map((g) => g.cmd);
        return {
          tier: meta.tier,
          frequency: meta.frequency,
          describes: `deterministic checks must pass (${meta.label}, ${meta.frequency})`,
          detail: cmds.join(' && ') || '(no objective commands defined)',
        };
      }
      const reviewers = m.gates.subjective.map((g) => g.agent ?? g.check ?? 'reviewer');
      return {
        tier: meta.tier,
        frequency: meta.frequency,
        describes: `judgment review must confirm (${meta.label}, ${meta.frequency})`,
        detail: reviewers.join(', ') || '(no subjective reviewers defined)',
      };
    });

    let explanation: string;
    if (stop) {
      explanation = `STOP — ${phase.owner} owns this phase; the loop pauses for your signature (${phase.entry} → ${phase.exit}).`;
    } else {
      explanation = `${phase.owner} owns this phase and drives it autonomously (${phase.entry} → ${phase.exit}). ${budgetSentence(m)}`;
    }

    return { phaseId: phase.id, owner: phase.owner, stop, explanation, gates };
  });
}
