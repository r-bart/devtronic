/**
 * @generated-from thoughts/specs/2026-03-05_addon-system.md
 * @immutable Do NOT modify these tests — implementation must make them pass as-is.
 *
 * These tests encode the spec's acceptance criteria as executable assertions.
 * If a test seems wrong, update the spec and regenerate — don't edit tests directly.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// ─── Types that will be created during implementation ────────────────────────
// These tests use it.todo() for items requiring types/modules that don't exist yet.
// When the module exists, convert todos to real tests using the commented body.

// ─── Helpers ─────────────────────────────────────────────────────────────────

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'devtronic-addon-manifest-'));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

function writeJson(dir: string, filename: string, data: unknown): void {
  writeFileSync(join(dir, filename), JSON.stringify(data, null, 2));
}

// ─── FR-2: Addon Manifest Parsing ───────────────────────────────────────────

describe('AddonManifest', () => {
  const validManifest = {
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
  };

  it.todo('FR-2: should parse valid addon manifest');
  // Spec: FR-2
  // When parseAddonManifest exists:
  // const result = parseAddonManifest(validManifest)
  // expect(result.name).toBe('design-best-practices')
  // expect(result.version).toBe('1.0.0')
  // expect(result.files.skills).toHaveLength(5)
  // expect(result.files.reference).toHaveLength(7)
  // expect(result.files.rules).toHaveLength(1)

  it.todo('FR-2: should reject manifest with missing name');
  // Spec: FR-2
  // const invalid = { ...validManifest, name: undefined }
  // expect(() => parseAddonManifest(invalid)).toThrow()

  it.todo('FR-2: should reject manifest with missing version');
  // Spec: FR-2
  // const invalid = { ...validManifest, version: undefined }
  // expect(() => parseAddonManifest(invalid)).toThrow()

  it.todo('FR-2: should reject manifest with empty skills array');
  // Spec: FR-2
  // const invalid = { ...validManifest, files: { ...validManifest.files, skills: [] } }
  // expect(() => parseAddonManifest(invalid)).toThrow()

  it.todo('FR-2: should accept manifest without attribution field');
  // Spec: FR-2
  // const noAttrib = { ...validManifest, attribution: undefined }
  // const result = parseAddonManifest(noAttrib)
  // expect(result.attribution).toBeUndefined()
});

// ─── FR-4: Config Tracking ──────────────────────────────────────────────────

describe('Addon config tracking', () => {
  it.todo('FR-4: should read addon config from devtronic config file');
  // Spec: FR-4
  // When readAddonConfig exists:
  // writeJson(tempDir, 'devtronic.json', {
  //   addons: { agents: ['claude'], installed: {} }
  // })
  // const config = readAddonConfig(tempDir)
  // expect(config.agents).toEqual(['claude'])
  // expect(config.installed).toEqual({})

  it.todo('FR-4: should write installed addon to config with file tracking');
  // Spec: FR-4
  // writeJson(tempDir, 'devtronic.json', {
  //   addons: { agents: ['claude'], installed: {} }
  // })
  // writeAddonToConfig(tempDir, 'design-best-practices', {
  //   version: '1.0.0',
  //   files: ['skills/design-init', 'skills/design-review', 'rules/design-quality.md']
  // })
  // const config = readAddonConfig(tempDir)
  // expect(config.installed['design-best-practices']).toBeDefined()
  // expect(config.installed['design-best-practices'].version).toBe('1.0.0')
  // expect(config.installed['design-best-practices'].files).toHaveLength(3)

  it.todo('FR-4: should remove addon from config');
  // Spec: FR-4
  // writeJson(tempDir, 'devtronic.json', {
  //   addons: {
  //     agents: ['claude'],
  //     installed: {
  //       'design-best-practices': { version: '1.0.0', files: ['skills/design-init'] }
  //     }
  //   }
  // })
  // removeAddonFromConfig(tempDir, 'design-best-practices')
  // const config = readAddonConfig(tempDir)
  // expect(config.installed['design-best-practices']).toBeUndefined()

  it.todo('FR-4: should track file checksums for each installed addon');
  // Spec: FR-4
  // writeJson(tempDir, 'devtronic.json', {
  //   addons: { agents: ['claude'], installed: {} }
  // })
  // writeAddonToConfig(tempDir, 'design-best-practices', {
  //   version: '1.0.0',
  //   files: ['skills/design-init'],
  //   checksums: { 'skills/design-init/SKILL.md': 'abc123' }
  // })
  // const config = readAddonConfig(tempDir)
  // expect(config.installed['design-best-practices'].checksums['skills/design-init/SKILL.md']).toBe('abc123')

  it.todo('US-5/AC-1: should store agent targets in config');
  // Spec: US-5/AC-1
  // writeJson(tempDir, 'devtronic.json', {
  //   addons: { agents: ['claude', 'cursor'], installed: {} }
  // })
  // const config = readAddonConfig(tempDir)
  // expect(config.agents).toEqual(['claude', 'cursor'])

  it.todo('US-5/AC-3: should default to claude-only when no agents configured');
  // Spec: US-5/AC-3
  // writeJson(tempDir, 'devtronic.json', { addons: { installed: {} } })
  // const config = readAddonConfig(tempDir)
  // expect(config.agents).toEqual(['claude'])
});
