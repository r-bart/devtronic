/**
 * Pure runtime validator for the loop manifest (Capa 1). No I/O.
 *
 * Closes enemy #4 (schema drift): every FR-2 violation class produces one
 * actionable `{ path, message }` error. Never throws — malformed input
 * (null, string, array) returns `{ ok: false }` (EC-1).
 */
import type {
  LoopManifest,
  ValidateResult,
  ValidationError,
  GateTier,
} from './manifestSchema.js';

const VALID_OWNERS = new Set(['human', 'machine']);
const GATE_TIERS: GateTier[] = ['objective', 'subjective'];

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function validateManifest(raw: unknown): ValidateResult {
  const errors: ValidationError[] = [];

  if (!isObject(raw)) {
    return {
      ok: false,
      errors: [{ path: '', message: 'Manifest must be a YAML mapping (object).' }],
    };
  }

  // --- version ---
  if (raw.version !== 1) {
    errors.push({
      path: 'version',
      message: `Unsupported version: expected 1, got ${JSON.stringify(raw.version)}.`,
    });
  }

  // --- gates (validate before phases so tier refs can be checked) ---
  const gates = isObject(raw.gates) ? raw.gates : undefined;
  if (!gates) {
    errors.push({ path: 'gates', message: 'Missing "gates" (objective + subjective tiers).' });
  }
  const objectiveGates = Array.isArray(gates?.objective) ? gates!.objective : [];
  const subjectiveGates = Array.isArray(gates?.subjective) ? gates!.subjective : [];

  // Validate the shape of each gate entry — otherwise a bad entry (null, a
  // string, or an object missing cmd/agent/check) passes validation and later
  // makes buildPlan / --gate-cmd throw a raw TypeError. A tier only counts as
  // "defined" if it has at least one *well-formed* entry.
  let objectiveOk = 0;
  objectiveGates.forEach((gate, i) => {
    if (!isObject(gate) || typeof gate.cmd !== 'string' || gate.cmd.length === 0) {
      errors.push({
        path: `gates.objective[${i}]`,
        message: 'Objective gate must be an object with a non-empty "cmd" string.',
      });
    } else {
      objectiveOk++;
    }
  });
  let subjectiveOk = 0;
  subjectiveGates.forEach((gate, i) => {
    const hasAgent = isObject(gate) && typeof gate.agent === 'string' && gate.agent.length > 0;
    const hasCheck = isObject(gate) && typeof gate.check === 'string' && gate.check.length > 0;
    if (!isObject(gate) || (!hasAgent && !hasCheck)) {
      errors.push({
        path: `gates.subjective[${i}]`,
        message: 'Subjective gate must be an object with a non-empty "agent" or "check".',
      });
    } else {
      subjectiveOk++;
    }
  });

  const definedTiers: Record<GateTier, boolean> = {
    objective: objectiveOk > 0,
    subjective: subjectiveOk > 0,
  };

  // --- phases ---
  if (!Array.isArray(raw.phases) || raw.phases.length === 0) {
    errors.push({ path: 'phases', message: 'Missing or empty "phases" array.' });
  } else {
    raw.phases.forEach((phase, i) => {
      const at = `phases[${i}]`;
      if (!isObject(phase)) {
        errors.push({ path: at, message: 'Phase must be an object.' });
        return;
      }
      for (const field of ['id', 'entry', 'exit'] as const) {
        const value = phase[field];
        if (value === undefined || value === null) {
          errors.push({ path: `${at}.${field}`, message: `Phase is missing required "${field}".` });
        } else if (typeof value !== 'string' || value.length === 0) {
          const got = Array.isArray(value) ? 'an array' : `a ${typeof value}`;
          errors.push({
            path: `${at}.${field}`,
            message: `Phase "${field}" must be a non-empty string (got ${got}).`,
          });
        }
      }
      if (!VALID_OWNERS.has(phase.owner as string)) {
        errors.push({
          path: `${at}.owner`,
          message: `Unknown owner ${JSON.stringify(phase.owner)}; expected "human" or "machine".`,
        });
      }
      if (!Array.isArray(phase.gates)) {
        errors.push({ path: `${at}.gates`, message: 'Phase "gates" must be an array of tier names.' });
      } else {
        phase.gates.forEach((tier, g) => {
          if (!GATE_TIERS.includes(tier as GateTier)) {
            errors.push({
              path: `${at}.gates[${g}]`,
              message: `Unknown gate tier ${JSON.stringify(tier)}; expected "objective" or "subjective".`,
            });
          } else if (!definedTiers[tier as GateTier]) {
            errors.push({
              path: `${at}.gates[${g}]`,
              message: `Phase references tier "${tier}" but gates.${tier} defines no gates.`,
            });
          }
        });
      }
    });
  }

  // --- dod ---
  if (!isObject(raw.dod)) {
    errors.push({ path: 'dod', message: 'Missing "dod" (definition of done, e.g. { as_tests }).' });
  } else if (typeof raw.dod.as_tests !== 'string') {
    errors.push({ path: 'dod.as_tests', message: '"dod.as_tests" must be a glob string.' });
  }

  // --- ship ---
  if (!isObject(raw.ship)) {
    errors.push({ path: 'ship', message: 'Missing "ship" (strategy + approval).' });
  } else {
    if (typeof raw.ship.strategy !== 'string') {
      errors.push({ path: 'ship.strategy', message: '"ship.strategy" must be a string.' });
    }
    if (raw.ship.approval !== 'human') {
      errors.push({ path: 'ship.approval', message: '"ship.approval" must be "human".' });
    }
  }

  // --- budget ---
  if (!isObject(raw.budget)) {
    errors.push({ path: 'budget', message: 'Missing "budget" (at least max_iterations).' });
  } else if (typeof raw.budget.max_iterations !== 'number') {
    errors.push({
      path: 'budget.max_iterations',
      message: '"budget.max_iterations" must be a number.',
    });
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, manifest: raw as unknown as LoopManifest };
}
