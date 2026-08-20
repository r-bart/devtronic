/**
 * `detectRemovedFiles` decides what `update` offers to delete. Every miss here
 * is a file the user loses, so the exclusions are pinned one by one.
 *
 * The rule is asymmetric on purpose: a template file that disappeared should be
 * offered for removal, but a *generated* file looks identical from the
 * manifest's point of view — tracked, and in no template — and must never be.
 */
import { describe, it, expect } from 'vitest';
import { detectRemovedFiles } from '../update.js';
import type { RemovalDetectionInput } from '../update.js';
import type { IDE, Manifest, ManifestFile } from '../../types.js';

function tracked(overrides: Partial<ManifestFile> = {}): ManifestFile {
  return { checksum: 'abc', originalChecksum: 'abc', modified: false, ...overrides };
}

function manifest(
  paths: Record<string, ManifestFile>,
  overrides: Partial<Pick<Manifest, 'selectedIDEs' | 'pluginPath'>> = {}
): RemovalDetectionInput['manifest'] {
  return {
    files: paths,
    selectedIDEs: overrides.selectedIDEs ?? (['claude-code'] as IDE[]),
    pluginPath: overrides.pluginPath,
  };
}

/** Detect against a world where `inTemplate` is what the templates still ship. */
function detect(
  files: Record<string, ManifestFile>,
  inTemplate: string[] = [],
  opts: {
    selectedIDEs?: IDE[];
    pluginPath?: string;
    /** Paths missing from the user's project; everything else is present */
    goneFromDisk?: string[];
  } = {}
) {
  return detectRemovedFiles({
    manifest: manifest(files, opts),
    existsInTemplate: (_ide, path) => inTemplate.includes(path),
    existsInProject: (path) => !(opts.goneFromDisk ?? []).includes(path),
  }).map((r) => r.path);
}

// ─── The rule itself ──────────────────────────────────────────────────────────

describe('detectRemovedFiles', () => {
  it('reports a tracked file the templates no longer ship', () => {
    expect(detect({ '.claude/rules/legacy.md': tracked() })).toEqual([
      '.claude/rules/legacy.md',
    ]);
  });

  it('leaves a file the templates still ship alone', () => {
    const files = { '.claude/rules/architecture.md': tracked() };
    expect(detect(files, ['.claude/rules/architecture.md'])).toEqual([]);
  });

  it('checks every selected IDE before calling a file removed', () => {
    // Shipped by cursor only — still not a removal for a two-IDE install.
    const files = { '.cursor/rules/architecture.mdc': tracked() };
    const result = detectRemovedFiles({
      manifest: manifest(files, { selectedIDEs: ['claude-code', 'cursor'] }),
      existsInTemplate: (ide, path) =>
        ide === 'cursor' && path === '.cursor/rules/architecture.mdc',
      existsInProject: () => true,
    });
    expect(result).toEqual([]);
  });

  it('says nothing about a file already gone from disk', () => {
    const files = { '.claude/rules/legacy.md': tracked() };
    expect(detect(files, [], { goneFromDisk: ['.claude/rules/legacy.md'] })).toEqual([]);
  });

  it('respects a file the user chose to keep', () => {
    expect(detect({ '.claude/rules/legacy.md': tracked({ ignored: true }) })).toEqual([]);
  });

  it('attaches the migration note when the registry has one', () => {
    const result = detectRemovedFiles({
      manifest: manifest({ '.claude/skills/loop/SKILL.md': tracked() }),
      existsInTemplate: () => false,
      existsInProject: () => true,
    });
    expect(result[0].info?.alternative).toContain('/converge');
  });

  it('reports no note for a file outside the registry', () => {
    const result = detectRemovedFiles({
      manifest: manifest({ '.claude/rules/unknown.md': tracked() }),
      existsInTemplate: () => false,
      existsInProject: () => true,
    });
    expect(result[0].info).toBeUndefined();
  });
});

// ─── Generated files must never be offered for deletion ───────────────────────

describe('detectRemovedFiles — generated files are never removals', () => {
  // Regression: `update` used to offer to delete the project's own AGENTS.md,
  // because init writes it from scratch and no template ships it.
  for (const path of ['AGENTS.md', 'CLAUDE.md', 'loop.manifest.yaml']) {
    it(`never offers to delete ${path}`, () => {
      expect(detect({ [path]: tracked() })).toEqual([]);
    });
  }

  it('never offers to delete an exported portable skill', () => {
    const files = {
      '.agents/skills/audit/SKILL.md': tracked(),
      '.agents/skills/converge/SKILL.md': tracked(),
    };
    expect(detect(files)).toEqual([]);
  });

  it('never offers to delete plugin files', () => {
    const files = { '.claude-plugins/devtronic/skills/brief/SKILL.md': tracked() };
    expect(detect(files, [], { pluginPath: '.claude-plugins/devtronic' })).toEqual([]);
  });

  it('never offers to delete the marketplace descriptor above the plugin dir', () => {
    const files = { '.claude-plugins/.claude-plugin/marketplace.json': tracked() };
    expect(detect(files, [], { pluginPath: '.claude-plugins/devtronic' })).toEqual([]);
  });

  it('does treat plugin files as removals when no plugin is installed', () => {
    // Without `pluginPath` the exclusion must not fire, or a leftover plugin
    // directory would become undeletable.
    const files = { '.claude-plugins/devtronic/skills/brief/SKILL.md': tracked() };
    expect(detect(files)).toEqual(['.claude-plugins/devtronic/skills/brief/SKILL.md']);
  });

  it('does not exclude a real file that merely starts like a generated one', () => {
    // `.agents/rules/` is an Antigravity template file, not a portable skill.
    const files = { '.agents/rules/architecture.md': tracked() };
    expect(detect(files)).toEqual(['.agents/rules/architecture.md']);
  });

  it('does not exclude a nested file named like a generated root file', () => {
    const files = { 'docs/AGENTS.md': tracked() };
    expect(detect(files)).toEqual(['docs/AGENTS.md']);
  });
});

// ─── A realistic mixed install ────────────────────────────────────────────────

describe('detectRemovedFiles — a full install', () => {
  it('picks out only the genuinely dropped template file', () => {
    const files = {
      'AGENTS.md': tracked(),
      'CLAUDE.md': tracked(),
      'loop.manifest.yaml': tracked(),
      '.claude/rules/architecture.md': tracked(),
      '.claude/rules/quality.md': tracked(),
      '.claude/skills/elegant.md': tracked(),
      '.agents/skills/spec/SKILL.md': tracked(),
      '.claude-plugins/devtronic/hooks/hooks.json': tracked(),
    };
    const stillShipped = ['.claude/rules/architecture.md', '.claude/rules/quality.md'];

    expect(detect(files, stillShipped, { pluginPath: '.claude-plugins/devtronic' })).toEqual([
      '.claude/skills/elegant.md',
    ]);
  });

  it('returns an empty list for an install with nothing dropped', () => {
    const files = { '.claude/rules/architecture.md': tracked() };
    expect(detect(files, ['.claude/rules/architecture.md'])).toEqual([]);
  });
});
