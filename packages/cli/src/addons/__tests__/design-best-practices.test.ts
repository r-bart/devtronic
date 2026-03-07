/**
 * @generated-from thoughts/specs/2026-03-05_addon-system.md
 * @immutable Do NOT modify these tests — implementation must make them pass as-is.
 *
 * These tests validate the CONTENT of the design-best-practices addon:
 * - Correct file structure
 * - Valid manifest
 * - All required skills, references, and rules exist
 *
 * These are content validation tests, not logic tests.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// ─── Addon source path ──────────────────────────────────────────────────────

const ADDON_ROOT = join(import.meta.dirname, '../../../templates/addons/design-best-practices');

// ─── FR-1: Addon Registry Structure ────────────────────────────────────────

describe('design-best-practices addon structure', () => {
  it('FR-1: addon source directory exists', () => {
    // Spec: FR-1
    expect(existsSync(ADDON_ROOT)).toBe(true);
  });

  it('FR-2: manifest.json exists and is valid JSON', () => {
    // Spec: FR-2
    const manifestPath = join(ADDON_ROOT, 'manifest.json');
    expect(existsSync(manifestPath)).toBe(true);
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
    expect(manifest.name).toBe('design-best-practices');
    expect(manifest.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(manifest.license).toBe('MIT');
  });

  it('FR-2: manifest declares all 5 skills', () => {
    // Spec: FR-2, FR-6
    const manifest = JSON.parse(readFileSync(join(ADDON_ROOT, 'manifest.json'), 'utf-8'));
    expect(manifest.files.skills).toEqual([
      'design-init',
      'design-review',
      'design-refine',
      'design-system',
      'design-harden',
    ]);
  });

  it('FR-2: manifest declares all 7 reference docs', () => {
    // Spec: FR-2, FR-7
    const manifest = JSON.parse(readFileSync(join(ADDON_ROOT, 'manifest.json'), 'utf-8'));
    expect(manifest.files.reference).toEqual([
      'typography.md',
      'color-and-contrast.md',
      'spatial-design.md',
      'motion-design.md',
      'interaction-design.md',
      'responsive-design.md',
      'ux-writing.md',
    ]);
  });

  it('FR-2: manifest declares design-quality rule', () => {
    // Spec: FR-2, FR-8
    const manifest = JSON.parse(readFileSync(join(ADDON_ROOT, 'manifest.json'), 'utf-8'));
    expect(manifest.files.rules).toEqual(['design-quality.md']);
  });

  it('FR-2: manifest includes attribution for Apache 2.0 content', () => {
    // Spec: FR-2, Attribution
    const manifest = JSON.parse(readFileSync(join(ADDON_ROOT, 'manifest.json'), 'utf-8'));
    expect(manifest.attribution).toContain('Apache 2.0');
  });
});

// ─── FR-6: Skill Files Exist ────────────────────────────────────────────────

describe('design addon skill files', () => {
  const expectedSkills = [
    'design-init',
    'design-review',
    'design-refine',
    'design-system',
    'design-harden',
  ];

  for (const skill of expectedSkills) {
    it(`FR-6: ${skill}/SKILL.md exists`, () => {
      // Spec: FR-6
      const skillPath = join(ADDON_ROOT, 'skills', skill, 'SKILL.md');
      expect(existsSync(skillPath)).toBe(true);
    });
  }

  it('FR-6: design-init skill has user-invokable: true', () => {
    // Spec: US-6
    const content = readFileSync(join(ADDON_ROOT, 'skills', 'design-init', 'SKILL.md'), 'utf-8');
    expect(content).toContain('user-invokable: true');
  });

  it('FR-6: design-review skill has user-invokable: true', () => {
    // Spec: US-7
    const content = readFileSync(join(ADDON_ROOT, 'skills', 'design-review', 'SKILL.md'), 'utf-8');
    expect(content).toContain('user-invokable: true');
  });

  it('FR-6: design-refine skill accepts --direction argument', () => {
    // Spec: US-8/AC-1
    const content = readFileSync(join(ADDON_ROOT, 'skills', 'design-refine', 'SKILL.md'), 'utf-8');
    expect(content).toContain('direction');
    expect(content).toMatch(/bolder|quieter|minimal|delightful/);
  });

  it('FR-6: design-system skill supports extract and normalize modes', () => {
    // Spec: US-9/AC-4
    const content = readFileSync(join(ADDON_ROOT, 'skills', 'design-system', 'SKILL.md'), 'utf-8');
    expect(content).toMatch(/extract/i);
    expect(content).toMatch(/normalize/i);
  });
});

// ─── FR-7: Reference Docs Exist ─────────────────────────────────────────────

describe('design addon reference docs', () => {
  const expectedRefs = [
    'typography.md',
    'color-and-contrast.md',
    'spatial-design.md',
    'motion-design.md',
    'interaction-design.md',
    'responsive-design.md',
    'ux-writing.md',
  ];

  for (const ref of expectedRefs) {
    it(`FR-7: reference/${ref} exists`, () => {
      // Spec: FR-7
      const refPath = join(ADDON_ROOT, 'reference', ref);
      expect(existsSync(refPath)).toBe(true);
    });
  }

  it('FR-7: typography.md covers type scales and fluid sizing', () => {
    // Spec: FR-7
    const content = readFileSync(join(ADDON_ROOT, 'reference', 'typography.md'), 'utf-8');
    expect(content).toMatch(/modular scale/i);
    expect(content).toMatch(/clamp/i);
  });

  it('FR-7: color-and-contrast.md covers OKLCH and WCAG', () => {
    // Spec: FR-7
    const content = readFileSync(join(ADDON_ROOT, 'reference', 'color-and-contrast.md'), 'utf-8');
    expect(content).toMatch(/oklch/i);
    expect(content).toMatch(/wcag/i);
    expect(content).toMatch(/4\.5:1/);
  });

  it('FR-7: motion-design.md covers reduced motion', () => {
    // Spec: FR-7
    const content = readFileSync(join(ADDON_ROOT, 'reference', 'motion-design.md'), 'utf-8');
    expect(content).toMatch(/prefers-reduced-motion/i);
  });
});

// ─── FR-8: Design Quality Rule ──────────────────────────────────────────────

describe('design quality rule', () => {
  it('FR-8: design-quality.md rule file exists', () => {
    // Spec: FR-8
    const rulePath = join(ADDON_ROOT, 'rules', 'design-quality.md');
    expect(existsSync(rulePath)).toBe(true);
  });

  it('FR-8: rule includes AI slop detection guidance', () => {
    // Spec: FR-8
    const content = readFileSync(join(ADDON_ROOT, 'rules', 'design-quality.md'), 'utf-8');
    expect(content).toMatch(/ai slop/i);
  });

  it('FR-8: rule includes DO/DON\'T quick reference', () => {
    // Spec: FR-8
    const content = readFileSync(join(ADDON_ROOT, 'rules', 'design-quality.md'), 'utf-8');
    expect(content).toMatch(/don't/i);
    expect(content).toMatch(/do\b/i);
  });
});
