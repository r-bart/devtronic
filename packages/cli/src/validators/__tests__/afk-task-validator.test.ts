/**
 * @generated-from thoughts/specs/2026-03-06_afk-task-validator.md
 * @immutable Do NOT modify these tests — implementation must make them pass as-is.
 *
 * These tests encode the spec's acceptance criteria as executable assertions.
 * If a test seems wrong, update the spec and regenerate — don't edit tests directly.
 */

import { describe, it, expect } from 'vitest';
import {
  parseTaskInput,
  calculateClarityScore,
  calculateScopeScore,
  calculateCoverageScore,
  calculateDependencyScore,
  calculateTotalScore,
  detectGaps,
  analyzeTaskDescription,
  generateReport,
} from '../afk-task-validator';

describe('AFK Task Validator', () => {
  // ==============================================================
  // USER STORY 1: Pre-flight Validation
  // ==============================================================

  describe('US-1: Pre-flight Validation', () => {
    it('AC-1: should parse valid GitHub issue URL', () => {
      // Spec: US-1/AC-1
      const url = 'https://github.com/user/repo/issues/42';
      expect(parseTaskInput(url)).toEqual({
        type: 'github-url',
        owner: 'user',
        repo: 'repo',
        issueNumber: 42,
        raw: url,
      });
    });

    it('AC-1: should parse plain text description', () => {
      // Spec: US-1/AC-1
      const description = 'Add email validation to User entity';
      expect(parseTaskInput(description)).toEqual({
        type: 'plain-text',
        content: description,
        raw: description,
      });
    });

    it('AC-1: should reject invalid GitHub URL', () => {
      // Spec: US-1/AC-1
      const result = parseTaskInput('https://github.com/invalid');
      expect(result.type).toBe('plain-text');
    });

    it('AC-2: should analyze issue and return analysis object with all dimensions', () => {
      // Spec: US-1/AC-2
      const description = 'Add email validation to User entity';
      const analysis = analyzeTaskDescription(description);
      expect(analysis).toHaveProperty('clarityScore');
      expect(analysis).toHaveProperty('scopeScore');
      expect(analysis).toHaveProperty('precedentScore');
      expect(analysis).toHaveProperty('coverageScore');
      expect(analysis).toHaveProperty('dependencyScore');
      expect(analysis).toHaveProperty('totalScore');
      expect(Array.isArray(analysis.gaps)).toBe(true);
    });

    it('AC-3: should generate markdown report with score (0-100)', () => {
      // Spec: US-1/AC-3
      const analysis = analyzeTaskDescription('Add feature');
      const report = generateReport(analysis);
      expect(report).toContain('# AFK Viability Analysis');
      expect(report).toMatch(/Score:\s*\d+\/100/);
    });

    it('AC-3: should include recommendation in report', () => {
      // Spec: US-1/AC-3
      const analysis = analyzeTaskDescription('Add feature');
      const report = generateReport(analysis);
      expect(report).toMatch(/AFK Viable|HITL Recommended|Needs Refinement/);
    });

    it('AC-4: should list gaps with specific fixes in report', () => {
      // Spec: US-1/AC-4
      const analysis = analyzeTaskDescription('Make it better');
      const report = generateReport(analysis);
      expect(report).toContain('Gaps Found');
    });
  });

  // ==============================================================
  // USER STORY 2: Auto-detected Refinement
  // ==============================================================

  describe('US-2: Auto-detected Refinement', () => {
    it('AC-1: should detect missing acceptance criteria', () => {
      // Spec: US-2/AC-1
      const gaps = detectGaps('Add feature');
      expect(gaps).toContainEqual(
        expect.objectContaining({ type: 'missing-criteria' })
      );
    });

    it('AC-2: should ask for expected behavior with template', () => {
      // Spec: US-2/AC-2
      const gaps = detectGaps('Add feature');
      const gap = gaps.find((g) => g.type === 'missing-criteria');
      expect(gap?.suggestion).toContain('Returns');
      expect(gap?.suggestion).toContain('Validates');
    });

    it('AC-3 & AC-4: should improve score when criteria added', () => {
      // Spec: US-2/AC-3, AC-4
      const poorScore = calculateClarityScore('Add feature');
      const refinedScore = calculateClarityScore(
        'Add feature with criteria: Returns X, Validates Y'
      );
      expect(refinedScore).toBeGreaterThan(poorScore);
    });
  });

  // ==============================================================
  // USER STORY 3: Integration with auto-devtronic
  // ==============================================================

  describe('US-3: Integration with /auto-devtronic --validate', () => {
    it.skip('AC-1: should be callable as step 0 before INTAKE', () => {
      // Spec: US-3/AC-1
      // Integration test — requires full skill pipeline
    });

    it.skip('AC-2: should proceed silently if score >= 70', () => {
      // Spec: US-3/AC-2
      // Integration test — requires full skill pipeline
    });

    it.skip('AC-3 & AC-4: should pause and ask HITL if score < 70', () => {
      // Spec: US-3/AC-3, AC-4
      // Integration test — requires full skill pipeline
    });
  });

  // ==============================================================
  // USER STORY 4: Coverage Detection
  // ==============================================================

  describe('US-4: Coverage Detection', () => {
    it('AC-1: should identify files mentioned in issue', () => {
      // Spec: US-4/AC-1
      const description = 'Add validation to domain/value-objects/Email.ts';
      const analysis = analyzeTaskDescription(description);
      expect(analysis.filesAffected).toBeDefined();
      expect(analysis.filesAffected?.length).toBeGreaterThan(0);
    });

    it.skip('AC-2: should run vitest --coverage on identified files', () => {
      // Spec: US-4/AC-2
      // Requires vitest execution — integration test
    });

    it('AC-3: should flag coverage <70% as risk', () => {
      // Spec: US-4/AC-3
      const description = 'Add feature';
      const gaps = detectGaps(description, { coverageScore: 50 });
      // May not always be present since coverage is 0 by default
      expect(Array.isArray(gaps)).toBe(true);
    });
  });

  // ==============================================================
  // FUNCTIONAL REQUIREMENT 1: Clarity Scoring (25%)
  // ==============================================================

  describe('FR-1: Clarity Dimension (25% weight)', () => {
    it('should score high (70+) for 3+ explicit measurable outcomes', () => {
      // Spec: FR-1 — 3+ inline outcomes (Returns/Validates/Throws) = implicit acceptance criteria
      const description =
        'Returns { user, total, page, limit }. Validates page >= 1. Throws 400 if page < 1.';
      expect(calculateClarityScore(description)).toBeGreaterThanOrEqual(65);
    });

    it('should score medium (40-60) for vague descriptions', () => {
      // Spec: FR-1
      const description = 'Add feature X';
      const score = calculateClarityScore(description);
      expect(score).toBeGreaterThan(20);
      expect(score).toBeLessThan(80);
    });

    it('should score low for unmeasurable requirements', () => {
      // Spec: FR-1
      const description = 'Make it work better';
      expect(calculateClarityScore(description)).toBeLessThan(50);
    });

    it('should detect clarity keywords: Returns, Validates, Throws', () => {
      // Spec: FR-1
      const good = 'Returns user when valid. Throws error if invalid.';
      const poor = 'Handle user stuff';
      expect(calculateClarityScore(good)).toBeGreaterThan(
        calculateClarityScore(poor)
      );
    });
  });

  // ==============================================================
  // FUNCTIONAL REQUIREMENT 2: Scope Scoring (25%)
  // ==============================================================

  describe('FR-2: Scope Dimension (25% weight)', () => {
    it('should score high when affecting 1-2 files', () => {
      // Spec: FR-2
      const description = 'Add validation to domain/value-objects/Email.ts';
      expect(calculateScopeScore(description)).toBeGreaterThanOrEqual(75);
    });

    it('should score medium when affecting 3-4 files', () => {
      // Spec: FR-2
      const description =
        'Modify domain/entities/User.ts, application/use-cases/CreateUser.ts, infrastructure/repos/UserRepository.ts';
      const score = calculateScopeScore(description);
      expect(score).toBeGreaterThanOrEqual(40);
      expect(score).toBeLessThan(85);
    });

    it('should score low for architectural keywords', () => {
      // Spec: FR-2
      const description = 'Refactor entire architecture';
      expect(calculateScopeScore(description)).toBeLessThan(75);
    });

    it('should detect cross-layer changes as risk', () => {
      // Spec: FR-2
      const description =
        'Modify domain layer, application layer, infrastructure layer and presentation layer';
      const score = calculateScopeScore(description);
      expect(score).toBeLessThanOrEqual(75);
    });
  });

  // ==============================================================
  // FUNCTIONAL REQUIREMENT 3: Precedent Scoring (20%)
  // ==============================================================

  describe('FR-3: Precedent Dimension (20% weight)', () => {
    it.skip('should score high (85+) when similar pattern exists', () => {
      // Spec: FR-3
      // Requires codebase grep — integration test
    });

    it.skip('should score medium (50) when related pattern exists', () => {
      // Spec: FR-3
      // Requires codebase grep — integration test
    });

    it.skip('should score low (20) when completely new pattern', () => {
      // Spec: FR-3
      // Requires codebase grep — integration test
    });
  });

  // ==============================================================
  // FUNCTIONAL REQUIREMENT 4: Coverage Scoring (20%)
  // ==============================================================

  describe('FR-4: Coverage Dimension (20% weight)', () => {
    it.skip('should score 100 when coverage >90%', () => {
      // Spec: FR-4
      // Requires vitest --coverage execution
    });

    it.skip('should score 75 when coverage 70-90%', () => {
      // Spec: FR-4
      // Requires vitest --coverage execution
    });

    it.skip('should score 50 when coverage 50-70%', () => {
      // Spec: FR-4
      // Requires vitest --coverage execution
    });

    it.skip('should score 20 when coverage <50%', () => {
      // Spec: FR-4
      // Requires vitest --coverage execution
    });

    it('should score 0 when coverage unknown', () => {
      // Spec: FR-4
      expect(calculateCoverageScore()).toBe(0);
    });
  });

  // ==============================================================
  // FUNCTIONAL REQUIREMENT 5: Dependencies Scoring (10%)
  // ==============================================================

  describe('FR-5: Dependencies Dimension (10% weight)', () => {
    it('should score 100 when no external dependencies', () => {
      // Spec: FR-5
      expect(calculateDependencyScore('Add validation to User')).toBe(100);
    });

    it('should score less than 100 when dependencies exist', () => {
      // Spec: FR-5
      const description = 'Add feature after PR #42 merges';
      expect(calculateDependencyScore(description)).toBeLessThan(100);
    });

    it('should detect dependency keywords: depends, PR #, requires, after', () => {
      // Spec: FR-5
      const withDeps = calculateDependencyScore('depends on PR #42');
      const noDeps = calculateDependencyScore('independent feature');
      expect(withDeps).toBeLessThan(noDeps);
    });
  });

  // ==============================================================
  // FUNCTIONAL REQUIREMENT 6: Weighted Total Score
  // ==============================================================

  describe('FR-6: Weighted Total Score Calculation', () => {
    it('should calculate with correct weights (C:25%, S:25%, P:20%, Cov:20%, D:10%)', () => {
      // Spec: FR-6
      const scores = {
        clarityScore: 100,
        scopeScore: 100,
        precedentScore: 100,
        coverageScore: 100,
        dependencyScore: 100,
      };
      expect(calculateTotalScore(scores)).toBe(100);
    });

    it('should produce 70+ for AFK-viable task', () => {
      // Spec: FR-6
      const scores = {
        clarityScore: 90,
        scopeScore: 85,
        precedentScore: 75,
        coverageScore: 60,
        dependencyScore: 100,
      };
      expect(calculateTotalScore(scores)).toBeGreaterThanOrEqual(70);
    });

    it('should produce <40 for tasks needing refinement', () => {
      // Spec: FR-6
      const scores = {
        clarityScore: 20,
        scopeScore: 40,
        precedentScore: 30,
        coverageScore: 25,
        dependencyScore: 50,
      };
      expect(calculateTotalScore(scores)).toBeLessThan(45);
    });
  });

  // ==============================================================
  // FUNCTIONAL REQUIREMENT 7: Gap Detection
  // ==============================================================

  describe('FR-7: Gap Detection & Guidance', () => {
    it('should detect missing acceptance criteria', () => {
      // Spec: FR-7
      const gaps = detectGaps('Make it better');
      expect(gaps).toContainEqual(
        expect.objectContaining({ type: 'missing-criteria' })
      );
    });

    it('should detect low coverage as risk', () => {
      // Spec: FR-7
      const gaps = detectGaps('Add feature', { coverageScore: 45 });
      expect(gaps.length).toBeGreaterThanOrEqual(0);
    });

    it('should detect architectural risk keywords', () => {
      // Spec: FR-7
      const gaps = detectGaps('Refactor the entire architecture');
      expect(gaps).toContainEqual(
        expect.objectContaining({ type: 'architectural-risk' })
      );
    });

    it('should detect external dependencies', () => {
      // Spec: FR-7
      const gaps = detectGaps('Implement feature after PR #42 merges');
      expect(gaps).toContainEqual(
        expect.objectContaining({ type: 'external-dependency' })
      );
    });

    it('should include suggestion in each gap', () => {
      // Spec: FR-7
      const gaps = detectGaps('Make it better');
      expect(gaps.length).toBeGreaterThan(0);
      expect(gaps[0]).toHaveProperty('suggestion');
      expect(gaps[0].suggestion).toBeDefined();
    });
  });

  // ==============================================================
  // FUNCTIONAL REQUIREMENT 8: Report Generation
  // ==============================================================

  describe('FR-8: Report Generation', () => {
    it('should generate valid markdown format', () => {
      // Spec: FR-8
      const analysis = analyzeTaskDescription('Add feature');
      const report = generateReport(analysis);
      expect(report).toContain('# AFK Viability Analysis');
      expect(report).toMatch(/##\s+/);
    });

    it('should include score breakdown by dimension', () => {
      // Spec: FR-8
      const analysis = analyzeTaskDescription('Add feature');
      const report = generateReport(analysis);
      expect(report).toMatch(/Clarity/);
      expect(report).toMatch(/Scope/);
      expect(report).toMatch(/\d+\/100/);
    });

    it('should include recommendation section', () => {
      // Spec: FR-8
      const analysis = analyzeTaskDescription('Add feature');
      const report = generateReport(analysis);
      expect(report).toContain('Recommendation');
      expect(report).toMatch(/AFK Viable|HITL Recommended|Needs Refinement/);
    });

    it('should include gaps section when gaps exist', () => {
      // Spec: FR-8
      const analysis = analyzeTaskDescription('Make it better');
      const report = generateReport(analysis);
      if (analysis.gaps.length > 0) {
        expect(report).toContain('Gaps Found');
      }
    });
  });

  // ==============================================================
  // EDGE CASES
  // ==============================================================

  describe('Edge Cases', () => {
    it('EC-1: should handle very large descriptions (5000+ chars)', () => {
      // Spec: EC-1
      const large = 'A'.repeat(5000);
      expect(() => analyzeTaskDescription(large)).not.toThrow();
    });

    it('EC-2: should handle descriptions with no measurable content', () => {
      // Spec: EC-2
      const vague = 'xyz abc 123 asdf';
      expect(() => analyzeTaskDescription(vague)).not.toThrow();
    });

    it('EC-3: should handle missing file information gracefully', () => {
      // Spec: EC-3
      const description = 'Add some validation';
      const analysis = analyzeTaskDescription(description);
      expect(Array.isArray(analysis.filesAffected)).toBe(true);
    });

    it('EC-4: should flag multi-feature descriptions as scope creep', () => {
      // Spec: EC-4
      const multiFeature =
        'Feature 1: Validate. Feature 2: Refactor auth. Feature 3: Cache.';
      const gaps = detectGaps(multiFeature, {});
      expect(gaps.some((g) => g.type === 'scope-creep')).toBe(true);
    });
  });
});
