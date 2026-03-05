/**
 * @generated-from thoughts/specs/2026-03-05_addon-system.md
 * @immutable Do NOT modify these tests — implementation must make them pass as-is.
 *
 * These tests encode the spec's acceptance criteria as executable assertions.
 * If a test seems wrong, update the spec and regenerate — don't edit tests directly.
 *
 * Note: These tests cover the NEW addon system (v2) described in the spec.
 * The existing addon.test.ts covers the current plugin-mode addon system.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// ─── Types that will be created during implementation ────────────────────────

// ─── Helpers ─────────────────────────────────────────────────────────────────

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'devtronic-addon-v2-cmd-'));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

function writeDevtronicConfig(dir: string, config: unknown): void {
  writeFileSync(join(dir, 'devtronic.json'), JSON.stringify(config, null, 2));
}

function readDevtronicConfig(dir: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(dir, 'devtronic.json'), 'utf-8'));
}

// ─── US-2: Add Addon Post-Setup ─────────────────────────────────────────────

describe('addon add command', () => {
  it.todo('US-2/AC-1: should copy addon files to repo on add');
  // Spec: US-2/AC-1
  // When addonAddCommand exists:
  // writeDevtronicConfig(tempDir, { addons: { agents: ['claude'], installed: {} } })
  // await addonAddCommand('design-best-practices', { path: tempDir })
  // expect(existsSync(join(tempDir, '.claude', 'skills', 'design-init', 'SKILL.md'))).toBe(true)
  // expect(existsSync(join(tempDir, '.claude', 'skills', 'design-review', 'SKILL.md'))).toBe(true)
  // expect(existsSync(join(tempDir, '.claude', 'rules', 'design-quality.md'))).toBe(true)

  it.todo('US-2/AC-2: should generate files for all configured agents');
  // Spec: US-2/AC-2
  // writeDevtronicConfig(tempDir, { addons: { agents: ['claude', 'cursor'], installed: {} } })
  // await addonAddCommand('design-best-practices', { path: tempDir })
  // expect(existsSync(join(tempDir, '.claude', 'skills', 'design-init', 'SKILL.md'))).toBe(true)
  // expect(existsSync(join(tempDir, '.cursor', 'skills', 'design-init', 'SKILL.md'))).toBe(true)

  it.todo('US-2/AC-3: should be idempotent — running twice does not duplicate files');
  // Spec: US-2/AC-3
  // writeDevtronicConfig(tempDir, { addons: { agents: ['claude'], installed: {} } })
  // await addonAddCommand('design-best-practices', { path: tempDir })
  // await addonAddCommand('design-best-practices', { path: tempDir })
  // // No duplicates, no errors — config shows addon once
  // const config = readDevtronicConfig(tempDir)
  // expect(Object.keys((config.addons as any).installed)).toHaveLength(1)

  it.todo('US-2/AC-4: should prompt for confirmation before writing files');
  // Spec: US-2/AC-4
  // Requires mocking @clack/prompts confirm
  // vi.mocked(confirm).mockResolvedValueOnce(false)
  // writeDevtronicConfig(tempDir, { addons: { agents: ['claude'], installed: {} } })
  // await addonAddCommand('design-best-practices', { path: tempDir })
  // expect(existsSync(join(tempDir, '.claude', 'skills', 'design-init', 'SKILL.md'))).toBe(false)

  it.todo('should reject unknown addon name');
  // Spec: FR-5
  // writeDevtronicConfig(tempDir, { addons: { agents: ['claude'], installed: {} } })
  // await expect(addonAddCommand('nonexistent-addon', { path: tempDir })).rejects.toThrow()
});

// ─── US-3: Remove Addon ─────────────────────────────────────────────────────

describe('addon remove command', () => {
  it.todo('US-3/AC-1: should delete addon files on remove');
  // Spec: US-3/AC-1
  // writeDevtronicConfig(tempDir, { addons: { agents: ['claude'], installed: {
  //   'design-best-practices': { version: '1.0.0', files: ['skills/design-init', 'rules/design-quality.md'] }
  // } } })
  // // Pre-create addon files
  // mkdirSync(join(tempDir, '.claude', 'skills', 'design-init'), { recursive: true })
  // writeFileSync(join(tempDir, '.claude', 'skills', 'design-init', 'SKILL.md'), '# design-init')
  // mkdirSync(join(tempDir, '.claude', 'rules'), { recursive: true })
  // writeFileSync(join(tempDir, '.claude', 'rules', 'design-quality.md'), '# rule')
  //
  // await addonRemoveCommand('design-best-practices', { path: tempDir })
  // expect(existsSync(join(tempDir, '.claude', 'skills', 'design-init'))).toBe(false)
  // expect(existsSync(join(tempDir, '.claude', 'rules', 'design-quality.md'))).toBe(false)

  it.todo('US-3/AC-2: should warn about customized files before removing');
  // Spec: US-3/AC-2
  // writeDevtronicConfig(tempDir, { addons: { agents: ['claude'], installed: {
  //   'design-best-practices': {
  //     version: '1.0.0',
  //     files: ['skills/design-init'],
  //     checksums: { 'skills/design-init/SKILL.md': 'original-hash' }
  //   }
  // } } })
  // mkdirSync(join(tempDir, '.claude', 'skills', 'design-init'), { recursive: true })
  // writeFileSync(join(tempDir, '.claude', 'skills', 'design-init', 'SKILL.md'), '# MODIFIED BY USER')
  //
  // Requires mocking @clack/prompts confirm and checking it was called
  // await addonRemoveCommand('design-best-practices', { path: tempDir })
  // expect(confirm).toHaveBeenCalled()

  it.todo('US-3/AC-3: should remove from all configured agent directories');
  // Spec: US-3/AC-3
  // writeDevtronicConfig(tempDir, { addons: { agents: ['claude', 'cursor'], installed: {
  //   'design-best-practices': { version: '1.0.0', files: ['skills/design-init'] }
  // } } })
  // for (const agent of ['.claude', '.cursor']) {
  //   mkdirSync(join(tempDir, agent, 'skills', 'design-init'), { recursive: true })
  //   writeFileSync(join(tempDir, agent, 'skills', 'design-init', 'SKILL.md'), '# skill')
  // }
  // await addonRemoveCommand('design-best-practices', { path: tempDir })
  // expect(existsSync(join(tempDir, '.claude', 'skills', 'design-init'))).toBe(false)
  // expect(existsSync(join(tempDir, '.cursor', 'skills', 'design-init'))).toBe(false)

  it.todo('US-3/AC-4: should update addon registry in config');
  // Spec: US-3/AC-4
  // writeDevtronicConfig(tempDir, { addons: { agents: ['claude'], installed: {
  //   'design-best-practices': { version: '1.0.0', files: [] }
  // } } })
  // await addonRemoveCommand('design-best-practices', { path: tempDir })
  // const config = readDevtronicConfig(tempDir)
  // expect((config.addons as any).installed['design-best-practices']).toBeUndefined()
});

// ─── US-4: List Addons ──────────────────────────────────────────────────────

describe('addon list command', () => {
  it.todo('US-4/AC-1: should show all available first-party addons');
  // Spec: US-4/AC-1
  // const result = getAvailableAddons()
  // expect(result).toContainEqual(expect.objectContaining({ name: 'design-best-practices' }))

  it.todo('US-4/AC-2: should mark installed addons');
  // Spec: US-4/AC-2
  // writeDevtronicConfig(tempDir, { addons: { agents: ['claude'], installed: {
  //   'design-best-practices': { version: '1.0.0', files: [] }
  // } } })
  // const result = getAddonListInfo(tempDir)
  // const design = result.find(a => a.name === 'design-best-practices')
  // expect(design?.installed).toBe(true)

  it.todo('US-4/AC-3: should show agent targets for installed addons');
  // Spec: US-4/AC-3
  // writeDevtronicConfig(tempDir, { addons: { agents: ['claude', 'cursor'], installed: {
  //   'design-best-practices': { version: '1.0.0', files: [] }
  // } } })
  // const result = getAddonListInfo(tempDir)
  // const design = result.find(a => a.name === 'design-best-practices')
  // expect(design?.agents).toEqual(['claude', 'cursor'])
});

// ─── FR-5: Addon Sync ───────────────────────────────────────────────────────

describe('addon sync command', () => {
  it.todo('FR-5: should regenerate addon files for current agent configuration');
  // Spec: FR-5, US-5/AC-4
  // writeDevtronicConfig(tempDir, { addons: { agents: ['claude', 'cursor'], installed: {
  //   'design-best-practices': { version: '1.0.0', files: ['skills/design-init'] }
  // } } })
  // // Only claude has files
  // mkdirSync(join(tempDir, '.claude', 'skills', 'design-init'), { recursive: true })
  // writeFileSync(join(tempDir, '.claude', 'skills', 'design-init', 'SKILL.md'), '# skill')
  //
  // await addonSyncCommand({ path: tempDir })
  // // Cursor should now also have files
  // expect(existsSync(join(tempDir, '.cursor', 'skills', 'design-init', 'SKILL.md'))).toBe(true)
});
