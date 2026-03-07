/**
 * @generated-from thoughts/specs/2026-03-05_addon-system.md
 * @immutable Do NOT modify these tests — implementation must make them pass as-is.
 *
 * These tests encode the spec's acceptance criteria as executable assertions.
 * If a test seems wrong, update the spec and regenerate — don't edit tests directly.
 */
/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-require-imports */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  generateAddonFiles,
  removeAddonFiles,
  syncAddonFiles,
  detectModifiedAddonFiles,
} from '../addonFiles.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

let tempDir: string;
let addonSourceDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'devtronic-addon-gen-'));

  // Create a minimal addon source structure (simulates bundled addon content)
  addonSourceDir = join(tempDir, '_addon-source', 'design-best-practices');
  const skillsDir = join(addonSourceDir, 'skills');
  const refDir = join(addonSourceDir, 'reference');
  const rulesDir = join(addonSourceDir, 'rules');

  // Skills
  for (const skill of ['design-init', 'design-review', 'design-refine', 'design-system', 'design-harden']) {
    mkdirSync(join(skillsDir, skill), { recursive: true });
    writeFileSync(join(skillsDir, skill, 'SKILL.md'), `# ${skill}\nTest content for ${skill}`);
  }

  // Reference docs (nested in design-harden source)
  mkdirSync(refDir, { recursive: true });
  for (const ref of [
    'typography.md',
    'color-and-contrast.md',
    'spatial-design.md',
    'motion-design.md',
    'interaction-design.md',
    'responsive-design.md',
    'ux-writing.md',
  ]) {
    writeFileSync(join(refDir, ref), `# ${ref}\nReference content`);
  }

  // Rules
  mkdirSync(rulesDir, { recursive: true });
  writeFileSync(join(rulesDir, 'design-quality.md'), '# Design Quality\nRule content');

  // Manifest
  writeFileSync(
    join(addonSourceDir, 'manifest.json'),
    JSON.stringify({
      name: 'design-best-practices',
      description: 'Frontend design quality skills',
      version: '1.0.0',
      license: 'MIT',
      attribution: 'Reference docs derived from Anthropic frontend-design skill (Apache 2.0).',
      files: {
        skills: ['design-init', 'design-review', 'design-refine', 'design-system', 'design-harden'],
        reference: [
          'typography.md',
          'color-and-contrast.md',
          'spatial-design.md',
          'motion-design.md',
          'interaction-design.md',
          'responsive-design.md',
          'ux-writing.md',
        ],
        rules: ['design-quality.md'],
      },
    })
  );
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

// ─── FR-3: File Generation — Single Agent ───────────────────────────────────

describe('Agent file generation — single agent', () => {
  it('FR-3: should generate skill files in .claude/skills/ for claude agent', () => {
    // Spec: FR-3, US-2/AC-2
    const projectDir = join(tempDir, 'project');
    mkdirSync(projectDir);
    generateAddonFiles(projectDir, addonSourceDir, ['claude']);
    expect(existsSync(join(projectDir, '.claude', 'skills', 'design-init', 'SKILL.md'))).toBe(true);
    expect(existsSync(join(projectDir, '.claude', 'skills', 'design-review', 'SKILL.md'))).toBe(true);
    expect(existsSync(join(projectDir, '.claude', 'skills', 'design-refine', 'SKILL.md'))).toBe(true);
    expect(existsSync(join(projectDir, '.claude', 'skills', 'design-system', 'SKILL.md'))).toBe(true);
    expect(existsSync(join(projectDir, '.claude', 'skills', 'design-harden', 'SKILL.md'))).toBe(true);
  });

  it('FR-3: should place rules in .claude/rules/ for claude agent', () => {
    // Spec: FR-3
    const projectDir = join(tempDir, 'project');
    mkdirSync(projectDir);
    generateAddonFiles(projectDir, addonSourceDir, ['claude']);
    expect(existsSync(join(projectDir, '.claude', 'rules', 'design-quality.md'))).toBe(true);
  });

  it('FR-3: should nest reference docs inside design-harden skill', () => {
    // Spec: FR-3
    const projectDir = join(tempDir, 'project');
    mkdirSync(projectDir);
    generateAddonFiles(projectDir, addonSourceDir, ['claude']);
    const refDir = join(projectDir, '.claude', 'skills', 'design-harden', 'reference');
    expect(existsSync(join(refDir, 'typography.md'))).toBe(true);
    expect(existsSync(join(refDir, 'color-and-contrast.md'))).toBe(true);
    expect(existsSync(join(refDir, 'spatial-design.md'))).toBe(true);
    expect(existsSync(join(refDir, 'motion-design.md'))).toBe(true);
    expect(existsSync(join(refDir, 'interaction-design.md'))).toBe(true);
    expect(existsSync(join(refDir, 'responsive-design.md'))).toBe(true);
    expect(existsSync(join(refDir, 'ux-writing.md'))).toBe(true);
  });

  it('FR-3: should generate files in .cursor/skills/ for cursor agent', () => {
    // Spec: FR-3, US-5/AC-2
    const projectDir = join(tempDir, 'project');
    mkdirSync(projectDir);
    generateAddonFiles(projectDir, addonSourceDir, ['cursor']);
    expect(existsSync(join(projectDir, '.cursor', 'skills', 'design-init', 'SKILL.md'))).toBe(true);
    expect(existsSync(join(projectDir, '.cursor', 'rules', 'design-quality.md'))).toBe(true);
  });

  it('FR-3: should generate files in .gemini/skills/ for gemini agent', () => {
    // Spec: FR-3, US-5/AC-2
    const projectDir = join(tempDir, 'project');
    mkdirSync(projectDir);
    generateAddonFiles(projectDir, addonSourceDir, ['gemini']);
    expect(existsSync(join(projectDir, '.gemini', 'skills', 'design-init', 'SKILL.md'))).toBe(true);
  });

  it('FR-3: should return checksums for written files', () => {
    const projectDir = join(tempDir, 'project');
    mkdirSync(projectDir);
    const result = generateAddonFiles(projectDir, addonSourceDir, ['claude']);
    expect(result.checksums).toBeDefined();
    expect(Object.keys(result.checksums!).length).toBeGreaterThan(0);
    for (const hash of Object.values(result.checksums!)) {
      expect(hash).toMatch(/^[0-9a-f]{16}$/);
    }
    expect(result.checksums!['skills/design-init/SKILL.md']).toBeDefined();
  });

  it('FR-3: should not include checksums for skipped files', () => {
    const projectDir = join(tempDir, 'project');
    mkdirSync(projectDir);
    generateAddonFiles(projectDir, addonSourceDir, ['claude']); // first run — writes
    const result2 = generateAddonFiles(projectDir, addonSourceDir, ['claude']); // second run — all skipped
    expect(result2.skipped).toBeGreaterThan(0);
    expect(Object.keys(result2.checksums ?? {}).length).toBe(0);
  });
});

// ─── FR-3: File Generation — Multiple Agents ────────────────────────────────

describe('Agent file generation — multiple agents', () => {
  it('US-2/AC-2: should generate files for all configured agents', () => {
    // Spec: US-2/AC-2, US-5/AC-2
    const projectDir = join(tempDir, 'project');
    mkdirSync(projectDir);
    generateAddonFiles(projectDir, addonSourceDir, ['claude', 'cursor', 'gemini']);
    for (const agent of ['.claude', '.cursor', '.gemini']) {
      expect(existsSync(join(projectDir, agent, 'skills', 'design-init', 'SKILL.md'))).toBe(true);
      expect(existsSync(join(projectDir, agent, 'rules', 'design-quality.md'))).toBe(true);
    }
  });

  it('US-5/AC-4: should regenerate on sync when agent config changes', () => {
    // Spec: US-5/AC-4
    const projectDir = join(tempDir, 'project');
    mkdirSync(projectDir);
    // First install: claude only
    generateAddonFiles(projectDir, addonSourceDir, ['claude']);
    expect(existsSync(join(projectDir, '.claude', 'skills', 'design-init', 'SKILL.md'))).toBe(true);
    expect(existsSync(join(projectDir, '.cursor', 'skills', 'design-init', 'SKILL.md'))).toBe(false);
    // Sync with new agents
    syncAddonFiles(projectDir, addonSourceDir, ['claude', 'cursor']);
    expect(existsSync(join(projectDir, '.cursor', 'skills', 'design-init', 'SKILL.md'))).toBe(true);
  });
});

// ─── Idempotency & Conflict Handling ────────────────────────────────────────

describe('Idempotency and conflict handling', () => {
  it('US-2/AC-3: should be idempotent — running twice produces identical output', () => {
    // Spec: US-2/AC-3
    const projectDir = join(tempDir, 'project');
    mkdirSync(projectDir);
    generateAddonFiles(projectDir, addonSourceDir, ['claude']);
    const firstContent = readFileSync(join(projectDir, '.claude', 'skills', 'design-init', 'SKILL.md'), 'utf-8');
    generateAddonFiles(projectDir, addonSourceDir, ['claude']);
    const secondContent = readFileSync(join(projectDir, '.claude', 'skills', 'design-init', 'SKILL.md'), 'utf-8');
    expect(firstContent).toBe(secondContent);
  });

  it('EC-1: should detect customized files via checksum comparison', () => {
    // Spec: File Conflict Handling
    const projectDir = join(tempDir, 'project');
    mkdirSync(projectDir);
    generateAddonFiles(projectDir, addonSourceDir, ['claude']);

    // Write a devtronic.json with checksums for the original content
    const originalContent = readFileSync(join(projectDir, '.claude', 'skills', 'design-init', 'SKILL.md'), 'utf-8');
    const { createHash } = require('node:crypto');
    const originalChecksum = createHash('sha256').update(originalContent).digest('hex').slice(0, 16);
    writeFileSync(
      join(projectDir, 'devtronic.json'),
      JSON.stringify({
        addons: {
          agents: ['claude'],
          installed: {
            'design-best-practices': {
              version: '1.0.0',
              files: ['skills/design-init'],
              checksums: { 'skills/design-init/SKILL.md': originalChecksum },
            },
          },
        },
      })
    );

    // User modifies a file
    const skillPath = join(projectDir, '.claude', 'skills', 'design-init', 'SKILL.md');
    writeFileSync(skillPath, '# User customized content');
    const modified = detectModifiedAddonFiles(projectDir, 'design-best-practices');
    expect(modified).toContain('skills/design-init/SKILL.md');
  });

  it('EC-2: should skip identical files silently on reinstall', () => {
    // Spec: File Conflict Handling
    const projectDir = join(tempDir, 'project');
    mkdirSync(projectDir);
    const result1 = generateAddonFiles(projectDir, addonSourceDir, ['claude']);
    const result2 = generateAddonFiles(projectDir, addonSourceDir, ['claude']);
    expect(result2.skipped).toBeGreaterThan(0);
    expect(result2.written).toBe(0);
  });
});

// ─── Addon Removal ──────────────────────────────────────────────────────────

describe('Addon file removal', () => {
  it('US-3/AC-1: should remove all addon files for an agent', () => {
    // Spec: US-3/AC-1
    const projectDir = join(tempDir, 'project');
    mkdirSync(projectDir);
    generateAddonFiles(projectDir, addonSourceDir, ['claude']);
    expect(existsSync(join(projectDir, '.claude', 'skills', 'design-init', 'SKILL.md'))).toBe(true);
    removeAddonFiles(projectDir, 'design-best-practices', ['claude']);
    expect(existsSync(join(projectDir, '.claude', 'skills', 'design-init'))).toBe(false);
    expect(existsSync(join(projectDir, '.claude', 'rules', 'design-quality.md'))).toBe(false);
  });

  it('US-3/AC-3: should remove from all configured agent directories', () => {
    // Spec: US-3/AC-3
    const projectDir = join(tempDir, 'project');
    mkdirSync(projectDir);
    generateAddonFiles(projectDir, addonSourceDir, ['claude', 'cursor']);
    removeAddonFiles(projectDir, 'design-best-practices', ['claude', 'cursor']);
    expect(existsSync(join(projectDir, '.claude', 'skills', 'design-init'))).toBe(false);
    expect(existsSync(join(projectDir, '.cursor', 'skills', 'design-init'))).toBe(false);
  });
});

// ─── Addon Sync & Updates ───────────────────────────────────────────────────

describe('Addon sync and updates', () => {
  it('EC-3: should update unmodified files during sync', () => {
    // Spec: Addon Sync & Updates (RESOLVED)
    const projectDir = join(tempDir, 'project');
    mkdirSync(projectDir);
    generateAddonFiles(projectDir, addonSourceDir, ['claude']);
    // Simulate new version: update source content
    writeFileSync(join(addonSourceDir, 'skills', 'design-init', 'SKILL.md'), '# Updated content v2');
    const result = syncAddonFiles(projectDir, addonSourceDir, ['claude']);
    expect((result.updated ?? 0) + result.written).toBeGreaterThan(0);
    const content = readFileSync(join(projectDir, '.claude', 'skills', 'design-init', 'SKILL.md'), 'utf-8');
    expect(content).toContain('Updated content v2');
  });

  it('EC-4: should preserve customized files during sync and warn', () => {
    // Spec: Addon Sync & Updates (RESOLVED)
    const projectDir = join(tempDir, 'project');
    mkdirSync(projectDir);
    generateAddonFiles(projectDir, addonSourceDir, ['claude']);

    // Write checksums for original content
    const originalContent = readFileSync(join(projectDir, '.claude', 'skills', 'design-init', 'SKILL.md'), 'utf-8');
    const { createHash } = require('node:crypto');
    const originalChecksum = createHash('sha256').update(originalContent).digest('hex').slice(0, 16);
    writeFileSync(
      join(projectDir, 'devtronic.json'),
      JSON.stringify({
        addons: {
          agents: ['claude'],
          installed: {
            'design-best-practices': {
              version: '1.0.0',
              files: ['skills/design-init'],
              checksums: { 'skills/design-init/SKILL.md': originalChecksum },
            },
          },
        },
      })
    );

    // User customizes a file
    const skillPath = join(projectDir, '.claude', 'skills', 'design-init', 'SKILL.md');
    writeFileSync(skillPath, '# My custom version');
    // Update source
    writeFileSync(join(addonSourceDir, 'skills', 'design-init', 'SKILL.md'), '# Updated v2');
    const result = syncAddonFiles(projectDir, addonSourceDir, ['claude']);
    expect(result.conflicts).toContain('skills/design-init/SKILL.md');
    // User's version preserved
    const content = readFileSync(skillPath, 'utf-8');
    expect(content).toBe('# My custom version');
  });
});

// ─── Addon with agents ──────────────────────────────────────────────────────

describe('Addon file generation — with agents', () => {
  let agentAddonSourceDir: string;
  let agentProjectDir: string;

  beforeEach(() => {
    agentAddonSourceDir = join(tempDir, '_addon-with-agents', 'test-addon');
    mkdirSync(join(agentAddonSourceDir, 'skills', 'test-skill'), { recursive: true });
    writeFileSync(join(agentAddonSourceDir, 'skills', 'test-skill', 'SKILL.md'), '# Test skill');
    mkdirSync(join(agentAddonSourceDir, 'agents'), { recursive: true });
    writeFileSync(join(agentAddonSourceDir, 'agents', 'test-agent.md'), '# Test agent');
    writeFileSync(
      join(agentAddonSourceDir, 'manifest.json'),
      JSON.stringify({
        name: 'test-addon',
        version: '1.0.0',
        license: 'MIT',
        files: { skills: ['test-skill'], agents: ['test-agent'] },
      })
    );
    agentProjectDir = join(tempDir, 'agent-project');
    mkdirSync(agentProjectDir);
  });

  it('should generate agent files in .claude/agents/', () => {
    generateAddonFiles(agentProjectDir, agentAddonSourceDir, ['claude']);
    expect(existsSync(join(agentProjectDir, '.claude', 'agents', 'test-agent.md'))).toBe(true);
    const content = readFileSync(join(agentProjectDir, '.claude', 'agents', 'test-agent.md'), 'utf-8');
    expect(content).toBe('# Test agent');
  });

  it('should remove agent files when removing addon', () => {
    generateAddonFiles(agentProjectDir, agentAddonSourceDir, ['claude']);
    expect(existsSync(join(agentProjectDir, '.claude', 'agents', 'test-agent.md'))).toBe(true);
    removeAddonFiles(agentProjectDir, 'test-addon', ['claude'], agentAddonSourceDir);
    expect(existsSync(join(agentProjectDir, '.claude', 'agents', 'test-agent.md'))).toBe(false);
  });

  it('should include agent files in checksums', () => {
    const result = generateAddonFiles(agentProjectDir, agentAddonSourceDir, ['claude']);
    expect(result.checksums!['agents/test-agent.md']).toMatch(/^[0-9a-f]{16}$/);
  });
});

// ─── generateAddonFiles: pre-existing files with different content ───────────

describe('generateAddonFiles — pre-existing file conflict', () => {
  it('should not overwrite a pre-existing file with different content and report as conflict', () => {
    const projectDir = join(tempDir, 'project');
    mkdirSync(projectDir);
    const skillDir = join(projectDir, '.claude', 'skills', 'design-init');
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(join(skillDir, 'SKILL.md'), '# Pre-existing custom content');

    const result = generateAddonFiles(projectDir, addonSourceDir, ['claude']);

    // The pre-existing file should be preserved and reported as a conflict
    expect(result.conflicts.length).toBeGreaterThan(0);
    const preserved = readFileSync(join(skillDir, 'SKILL.md'), 'utf-8');
    expect(preserved).toBe('# Pre-existing custom content');
    // Not included in checksums (only written files are tracked)
    expect(result.checksums!['skills/design-init/SKILL.md']).toBeUndefined();
  });
});

// ─── detectModifiedAddonFiles edge cases ────────────────────────────────────

describe('detectModifiedAddonFiles edge cases', () => {
  it('should return empty array when devtronic.json has invalid JSON', () => {
    const projectDir = join(tempDir, 'project');
    mkdirSync(projectDir);
    writeFileSync(join(projectDir, 'devtronic.json'), 'NOT VALID JSON {{{');
    const modified = detectModifiedAddonFiles(projectDir, 'design-best-practices');
    expect(modified).toEqual([]);
  });

  it('should return empty array when devtronic.json does not exist', () => {
    const projectDir = join(tempDir, 'project');
    mkdirSync(projectDir);
    const modified = detectModifiedAddonFiles(projectDir, 'design-best-practices');
    expect(modified).toEqual([]);
  });
});

// ─── Attribution — NOTICE.md ────────────────────────────────────────────────

describe('Attribution NOTICE.md', () => {
  it('should create NOTICE.md on first attributed addon install', () => {
    // Spec: Attribution (RESOLVED)
    const projectDir = join(tempDir, 'project');
    mkdirSync(projectDir);
    generateAddonFiles(projectDir, addonSourceDir, ['claude']);
    expect(existsSync(join(projectDir, 'NOTICE.md'))).toBe(true);
    const notice = readFileSync(join(projectDir, 'NOTICE.md'), 'utf-8');
    expect(notice).toContain('Apache 2.0');
    expect(notice).toContain('Anthropic');
  });

  it('should clean up NOTICE.md when last attributed addon removed', () => {
    // Spec: Attribution (RESOLVED)
    const projectDir = join(tempDir, 'project');
    mkdirSync(projectDir);
    generateAddonFiles(projectDir, addonSourceDir, ['claude']);
    expect(existsSync(join(projectDir, 'NOTICE.md'))).toBe(true);
    removeAddonFiles(projectDir, 'design-best-practices', ['claude']);
    expect(existsSync(join(projectDir, 'NOTICE.md'))).toBe(false);
  });
});
