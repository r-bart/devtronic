/**
 * @generated-from thoughts/specs/2026-07-07_loop-skill-prd.md
 * @immutable Do NOT modify these tests — implementation must make them pass as-is.
 *
 * Tests-as-DoD for hook↔loop coexistence (US-3, FR-3). The generated stop-guard
 * must subordinate to an active loop yet stay byte-for-byte identical in intent
 * when no loop owns the tree (backward compatibility by construction).
 *
 * Assertions activated during /execute-plan exactly as specified in the comments.
 */
import { describe, it, expect } from 'vitest';
import { generateStopGuardScript } from '../hooks.js';
import type { ProjectConfig } from '../../types.js';

const config: ProjectConfig = {
  architecture: 'clean',
  layers: [],
  stateManagement: [],
  dataFetching: [],
  orm: [],
  testing: [],
  ui: [],
  validation: [],
  framework: 'nextjs',
  qualityCommand: 'npm run typecheck && npm run lint',
};

describe('stop-guard coexistence (US-3, FR-3)', () => {
  describe('US-3/AC: backward compatibility', () => {
    it('with no sentinel present the guard behaves exactly as today (quality gate runs)', () => {
      // Spec: US-3
      const script = generateStopGuardScript(config);
      expect(script).toContain(config.qualityCommand); // still the fallback path
    });
  });

  describe('US-3/AC: subordination', () => {
    it('emits an early exit-0 when a fresh machine-owned sentinel is not at a barrier', () => {
      // Spec: US-3, FR-3
      const script = generateStopGuardScript(config);
      expect(script).toMatch(/\.loop-owner/); // reads the sentinel
      expect(script).toMatch(/"owner":"machine"/); // checks ownership
      expect(script).toMatch(/atBarrier/); // respects barriers
      expect(script).toMatch(/exit 0/); // defers
    });

    it('reclaims a stale sentinel (rm) instead of deferring forever', () => {
      // Spec: US-3, FR-3 (crash lifecycle)
      const script = generateStopGuardScript(config);
      expect(script).toMatch(/rm -f .*\.loop-owner/);
    });
  });

  describe('US-3/AC: manifest is the single source of truth for Tier ① gates', () => {
    it('when a manifest exists the Tier ① command is sourced from it, not re-guessed', () => {
      // Spec: US-3
      // (with loop.manifest.yaml present) the generated guard references the manifest's
      // objective gate command rather than the auto-detected typecheck/lint.
      const script = generateStopGuardScript(config);
      expect(script).toMatch(/loop\.manifest\.yaml/);
      expect(script).toMatch(/--gate-cmd/);
    });
  });
});
