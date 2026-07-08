/**
 * @generated-from thoughts/specs/2026-07-07_loop-skill-prd.md
 * @immutable Do NOT modify these tests — implementation must make them pass as-is.
 *
 * Tests-as-DoD for hook↔loop coexistence (US-3, FR-3). The generated stop-guard
 * must subordinate to an active loop yet stay byte-for-byte identical in intent
 * when no loop owns the tree (backward compatibility by construction).
 *
 * `generateStopGuardScript` already exists; the ownership-aware branch does not yet,
 * so these are it.todo() with intended assertions until Phase 2 implements it.
 */
import { describe, it /*, expect */ } from 'vitest';
// import { generateStopGuardScript } from '../hooks.js';
// import type { ProjectConfig } from '../../types.js';

describe('stop-guard coexistence (US-3, FR-3)', () => {
  describe('US-3/AC: backward compatibility', () => {
    it.todo('with no sentinel present the guard behaves exactly as today (quality gate runs)');
    // Spec: US-3
    // const script = generateStopGuardScript(config);
    // expect(script).toContain(config.qualityCommand); // still the fallback path
  });

  describe('US-3/AC: subordination', () => {
    it.todo('emits an early exit-0 when a fresh machine-owned sentinel is not at a barrier');
    // Spec: US-3, FR-3
    // const script = generateStopGuardScript(config);
    // expect(script).toMatch(/\.loop-owner/);            // reads the sentinel
    // expect(script).toMatch(/"owner":"machine"/);       // checks ownership
    // expect(script).toMatch(/atBarrier/);               // respects barriers
    // expect(script).toMatch(/exit 0/);                  // defers

    it.todo('reclaims a stale sentinel (rm) instead of deferring forever');
    // Spec: US-3, FR-3 (crash lifecycle)
    // const script = generateStopGuardScript(config);
    // expect(script).toMatch(/rm -f .*\.loop-owner/);
  });

  describe('US-3/AC: manifest is the single source of truth for Tier ① gates', () => {
    it.todo('when a manifest exists the Tier ① command is sourced from it, not re-guessed');
    // Spec: US-3
    // (with loop.manifest.yaml present) the generated guard references the manifest's
    // objective gate command rather than the auto-detected typecheck/lint.
  });
});
