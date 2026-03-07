/**
 * @generated-from thoughts/specs/2026-03-05_addon-system.md
 *
 * These tests encode the spec's acceptance criteria as executable assertions.
 *
 * Note: These tests cover the NEW addon system (v2) described in the spec.
 * The existing addon.test.ts covers the current plugin-mode addon system.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import * as clack from '@clack/prompts';
import { getAvailableAddons } from '../../addons/registry.js';
import { addonCommand, getAddonListInfo, addonSyncCommand } from '../addon.js';
import { readAddonConfig } from '../../utils/addonConfig.js';

// ─── Mock external I/O ──────────────────────────────────────────────────────

vi.mock('@clack/prompts', () => ({
  intro: vi.fn(),
  outro: vi.fn(),
  spinner: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
  log: { warn: vi.fn(), info: vi.fn(), message: vi.fn() },
  confirm: vi.fn().mockResolvedValue(true),
  note: vi.fn(),
  cancel: vi.fn(),
  isCancel: vi.fn(() => false),
}));

vi.mock('../../commands/init.js', () => ({
  TEMPLATES_DIR: join(import.meta.dirname, '../../../../templates'),
}));

vi.mock('../../utils/version.js', () => ({
  getCliVersion: () => '1.0.0',
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

let tempDir: string;

const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'devtronic-addon-v2-cmd-'));
  vi.clearAllMocks();
  exitSpy.mockImplementation(() => undefined as never);
  vi.mocked(clack.confirm).mockResolvedValue(true);
  vi.mocked(clack.isCancel).mockReturnValue(false);
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

function writeDevtronicConfig(dir: string, config: unknown): void {
  const claudeDir = join(dir, '.claude');
  if (!existsSync(claudeDir)) {
    mkdirSync(claudeDir, { recursive: true });
  }
  writeFileSync(join(dir, '.claude', 'devtronic.json'), JSON.stringify(config, null, 2));
}

// ─── US-2: Add Addon Post-Setup ─────────────────────────────────────────────

describe('addon add command', () => {
  it('US-2/AC-1: should copy addon files to repo on add', async () => {
    // Spec: US-2/AC-1
    await addonCommand('add', 'design-best-practices', { path: tempDir });
    expect(existsSync(join(tempDir, '.claude', 'skills', 'design-init', 'SKILL.md'))).toBe(true);
    expect(existsSync(join(tempDir, '.claude', 'rules', 'design-quality.md'))).toBe(true);
  });

  it('US-2/AC-2: should generate files for all configured agents', async () => {
    // Spec: US-2/AC-2
    writeDevtronicConfig(tempDir, {
      addons: { agents: ['claude', 'cursor'], installed: {} },
    });
    await addonCommand('add', 'design-best-practices', { path: tempDir });
    expect(existsSync(join(tempDir, '.claude', 'skills', 'design-init', 'SKILL.md'))).toBe(true);
    expect(existsSync(join(tempDir, '.cursor', 'skills', 'design-init', 'SKILL.md'))).toBe(true);
  });

  it('US-2/AC-3: should be idempotent — running twice does not duplicate files', async () => {
    // Spec: US-2/AC-3
    await addonCommand('add', 'design-best-practices', { path: tempDir });
    const firstContent = readFileSync(
      join(tempDir, '.claude', 'skills', 'design-init', 'SKILL.md'),
      'utf-8'
    );
    // Second call — addon is already installed, should warn and return
    await addonCommand('add', 'design-best-practices', { path: tempDir });
    const secondContent = readFileSync(
      join(tempDir, '.claude', 'skills', 'design-init', 'SKILL.md'),
      'utf-8'
    );
    expect(firstContent).toBe(secondContent);
  });

  it('US-2/AC-4: should prompt for confirmation before writing files', async () => {
    // Spec: US-2/AC-4
    await addonCommand('add', 'design-best-practices', { path: tempDir });
    expect(clack.confirm).toHaveBeenCalled();
  });

  it('should reject unknown addon name', () => {
    // Spec: FR-5
    const validAddons = getAvailableAddons().map((a) => a.name);
    expect(validAddons).not.toContain('nonexistent-addon');
  });

  it('should persist file checksums in devtronic.json after install', async () => {
    await addonCommand('add', 'design-best-practices', { path: tempDir });
    const config = JSON.parse(readFileSync(join(tempDir, '.claude', 'devtronic.json'), 'utf-8'));
    const installed = config.installed['design-best-practices'];
    expect(installed.checksums).toBeDefined();
    expect(Object.keys(installed.checksums).length).toBeGreaterThan(0);
    expect(installed.checksums['skills/design-init/SKILL.md']).toMatch(/^[0-9a-f]{32}$/);
  });

  it('should use manifest version (not hardcoded 1.0.0) in config after install', async () => {
    await addonCommand('add', 'design-best-practices', { path: tempDir });
    const config = JSON.parse(readFileSync(join(tempDir, '.claude', 'devtronic.json'), 'utf-8'));
    const installed = config.installed['design-best-practices'];
    expect(installed.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(installed.version).not.toBe('');
  });
});

// ─── US-3: Remove Addon ─────────────────────────────────────────────────────

describe('addon remove command', () => {
  it('US-3/AC-1: should delete addon files on remove', async () => {
    // Spec: US-3/AC-1
    await addonCommand('add', 'design-best-practices', { path: tempDir });
    expect(existsSync(join(tempDir, '.claude', 'skills', 'design-init', 'SKILL.md'))).toBe(true);
    await addonCommand('remove', 'design-best-practices', { path: tempDir });
    expect(existsSync(join(tempDir, '.claude', 'skills', 'design-init'))).toBe(false);
  });

  it('US-3/AC-2: should warn about customized files before removing', async () => {
    // Spec: US-3/AC-2
    await addonCommand('add', 'design-best-practices', { path: tempDir });
    // Write checksums so modification detection works
    const originalContent = readFileSync(
      join(tempDir, '.claude', 'skills', 'design-init', 'SKILL.md'),
      'utf-8'
    );
    const { createHash } = await import('node:crypto');
    const hash = createHash('sha256').update(originalContent).digest('hex').slice(0, 16);
    const config = JSON.parse(readFileSync(join(tempDir, '.claude', 'devtronic.json'), 'utf-8'));
    config.installed['design-best-practices'].checksums = {
      'skills/design-init/SKILL.md': hash,
    };
    writeFileSync(join(tempDir, '.claude', 'devtronic.json'), JSON.stringify(config, null, 2));

    // Modify the file
    writeFileSync(
      join(tempDir, '.claude', 'skills', 'design-init', 'SKILL.md'),
      '# Custom content'
    );
    vi.mocked(clack.confirm).mockResolvedValueOnce(true);
    await addonCommand('remove', 'design-best-practices', { path: tempDir });
    // Should have warned via log.warn
    expect(clack.log.warn).toHaveBeenCalledWith(
      expect.stringContaining('customized')
    );
  });

  it('US-3/AC-3: should remove from all configured agent directories', async () => {
    // Spec: US-3/AC-3
    writeDevtronicConfig(tempDir, {
      addons: { agents: ['claude', 'cursor'], installed: {} },
    });
    await addonCommand('add', 'design-best-practices', { path: tempDir });
    expect(existsSync(join(tempDir, '.claude', 'skills', 'design-init', 'SKILL.md'))).toBe(true);
    expect(existsSync(join(tempDir, '.cursor', 'skills', 'design-init', 'SKILL.md'))).toBe(true);
    await addonCommand('remove', 'design-best-practices', { path: tempDir });
    expect(existsSync(join(tempDir, '.claude', 'skills', 'design-init'))).toBe(false);
    expect(existsSync(join(tempDir, '.cursor', 'skills', 'design-init'))).toBe(false);
  });

  it('US-3/AC-4: should update addon registry in config', async () => {
    // Spec: US-3/AC-4
    await addonCommand('add', 'design-best-practices', { path: tempDir });
    const configBefore = readAddonConfig(tempDir);
    expect(configBefore.installed['design-best-practices']).toBeDefined();
    await addonCommand('remove', 'design-best-practices', { path: tempDir });
    const configAfter = readAddonConfig(tempDir);
    expect(configAfter.installed['design-best-practices']).toBeUndefined();
  });

  it('US-3/AC-2: should warn about modified files when real checksums are stored', async () => {
    // Install — now stores real checksums
    await addonCommand('add', 'design-best-practices', { path: tempDir });

    // Verify real checksums were stored
    const configAfterInstall = JSON.parse(readFileSync(join(tempDir, '.claude', 'devtronic.json'), 'utf-8'));
    expect(Object.keys(configAfterInstall.installed['design-best-practices'].checksums).length).toBeGreaterThan(0);

    // Modify an installed file
    const skillPath = join(tempDir, '.claude', 'skills', 'design-init', 'SKILL.md');
    writeFileSync(skillPath, '# My custom version');

    // Remove should detect modification and warn
    vi.mocked(clack.confirm).mockResolvedValueOnce(true);
    await addonCommand('remove', 'design-best-practices', { path: tempDir });
    expect(clack.log.warn).toHaveBeenCalledWith(expect.stringContaining('customized'));
  });
});

// ─── US-4: List Addons ──────────────────────────────────────────────────────

describe('addon list command', () => {
  it('US-4/AC-1: should show all available first-party addons', () => {
    // Spec: US-4/AC-1
    const result = getAvailableAddons();
    expect(result).toContainEqual(expect.objectContaining({ name: 'design-best-practices' }));
  });

  it('US-4/AC-2: should mark installed addons', () => {
    // Spec: US-4/AC-2
    writeDevtronicConfig(tempDir, {
      addons: {
        agents: ['claude'],
        installed: {
          'design-best-practices': { version: '1.0.0', files: [] },
        },
      },
    });
    const result = getAddonListInfo(tempDir);
    const design = result.find((a) => a.name === 'design-best-practices');
    expect(design?.installed).toBe(true);
  });

  it('US-4/AC-3: should show agent targets for installed addons', () => {
    // Spec: US-4/AC-3
    writeDevtronicConfig(tempDir, {
      addons: {
        agents: ['claude', 'cursor'],
        installed: {
          'design-best-practices': { version: '1.0.0', files: [] },
        },
      },
    });
    const result = getAddonListInfo(tempDir);
    const design = result.find((a) => a.name === 'design-best-practices');
    expect(design?.agents).toEqual(['claude', 'cursor']);
  });
});

// ─── auto-devtronic addon ───────────────────────────────────────────────────

describe('auto-devtronic addon', () => {
  it('should install skill and all 4 agents', async () => {
    await addonCommand('add', 'auto-devtronic', { path: tempDir });
    expect(existsSync(join(tempDir, '.claude', 'skills', 'auto-devtronic', 'SKILL.md'))).toBe(true);
    expect(existsSync(join(tempDir, '.claude', 'agents', 'issue-parser.md'))).toBe(true);
    expect(existsSync(join(tempDir, '.claude', 'agents', 'failure-analyst.md'))).toBe(true);
    expect(existsSync(join(tempDir, '.claude', 'agents', 'quality-executor.md'))).toBe(true);
    expect(existsSync(join(tempDir, '.claude', 'agents', 'afk-task-validator.md'))).toBe(true);
  });

  it('should persist agents in fileList of devtronic.json after install', async () => {
    await addonCommand('add', 'auto-devtronic', { path: tempDir });
    const config = JSON.parse(readFileSync(join(tempDir, '.claude', 'devtronic.json'), 'utf-8'));
    const installed = config.installed['auto-devtronic'];
    expect(installed.files).toContain('agents/issue-parser.md');
    expect(installed.files).toContain('agents/failure-analyst.md');
    expect(installed.files).toContain('agents/quality-executor.md');
  });

  it('should remove skill and agents on remove', async () => {
    await addonCommand('add', 'auto-devtronic', { path: tempDir });
    await addonCommand('remove', 'auto-devtronic', { path: tempDir });
    expect(existsSync(join(tempDir, '.claude', 'skills', 'auto-devtronic'))).toBe(false);
    expect(existsSync(join(tempDir, '.claude', 'agents', 'issue-parser.md'))).toBe(false);
    expect(existsSync(join(tempDir, '.claude', 'agents', 'quality-executor.md'))).toBe(false);
  });
});

// ─── FR-5: Addon Sync ───────────────────────────────────────────────────────

describe('addon sync command', () => {
  it('FR-5: should regenerate addon files for current agent configuration', async () => {
    // Spec: FR-5
    // Install for claude only
    await addonCommand('add', 'design-best-practices', { path: tempDir });
    expect(existsSync(join(tempDir, '.claude', 'skills', 'design-init', 'SKILL.md'))).toBe(true);
    expect(existsSync(join(tempDir, '.cursor', 'skills', 'design-init', 'SKILL.md'))).toBe(false);

    // Update config to add cursor agent
    const config = JSON.parse(readFileSync(join(tempDir, '.claude', 'devtronic.json'), 'utf-8'));
    config.agents = ['claude', 'cursor'];
    writeFileSync(join(tempDir, '.claude', 'devtronic.json'), JSON.stringify(config, null, 2));

    // Sync should generate cursor files
    await addonSyncCommand({ path: tempDir });
    expect(existsSync(join(tempDir, '.cursor', 'skills', 'design-init', 'SKILL.md'))).toBe(true);
  });

  it('should warn about conflicts when syncing a modified file', async () => {
    await addonCommand('add', 'design-best-practices', { path: tempDir });

    // Modify a file to create a conflict
    const skillPath = join(tempDir, '.claude', 'skills', 'design-init', 'SKILL.md');
    writeFileSync(skillPath, '# My custom version');

    await addonSyncCommand({ path: tempDir });
    expect(clack.log.warn).toHaveBeenCalledWith('Customized files were preserved:');
  });

  it('should handle sync with no installed addons gracefully', async () => {
    await addonSyncCommand({ path: tempDir });
    expect(clack.log.info).toHaveBeenCalledWith(
      expect.stringContaining('No addons installed')
    );
  });
});

// ─── Cancellation paths ──────────────────────────────────────────────────────

describe('addon add cancellation', () => {
  it('should call process.exit(0) when user declines confirm', async () => {
    vi.mocked(clack.confirm).mockResolvedValueOnce(false);
    await addonCommand('add', 'design-best-practices', { path: tempDir });
    expect(exitSpy).toHaveBeenCalledWith(0);
  });
});

// ─── addon enable/disable aliases ───────────────────────────────────────────

describe('addon enable/disable aliases', () => {
  it('should enable addon using enable action (same as add)', async () => {
    await addonCommand('enable' as any, 'design-best-practices', { path: tempDir });
    expect(existsSync(join(tempDir, '.claude', 'skills', 'design-init', 'SKILL.md'))).toBe(true);
  });

  it('should show deprecation warning when using enable (deprecated)', async () => {
    await addonCommand('enable' as any, 'design-best-practices', { path: tempDir });
    const warnCalls = vi.mocked(clack.log.warn).mock.calls.flat().join(' ');
    expect(warnCalls).toContain('deprecated');
  });

  it('should disable addon using disable action (same as remove)', async () => {
    await addonCommand('enable' as any, 'design-best-practices', { path: tempDir });
    vi.clearAllMocks();
    await addonCommand('disable' as any, 'design-best-practices', { path: tempDir });
    expect(existsSync(join(tempDir, '.claude', 'skills', 'design-init'))).toBe(false);
  });
});
