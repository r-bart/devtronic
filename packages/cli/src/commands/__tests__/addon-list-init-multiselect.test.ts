/**
 * @generated-from thoughts/specs/2026-03-07_addon-list-and-init-multiselect.md
 * @immutable Do NOT modify these tests — implementation must make them pass as-is.
 *
 * These tests encode the spec's acceptance criteria as executable assertions.
 * If a test seems wrong, update the spec and regenerate — don't edit tests directly.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import * as clack from '@clack/prompts';
import { ADDONS } from '../../types.js';
import type { AddonName } from '../../types.js';
import { getAddonListInfo, addonListCommand } from '../addon.js';
import { promptForAddons } from '../../prompts/init.js';

// ─── Mock external I/O ───────────────────────────────────────────────────────

vi.mock('@clack/prompts', () => ({
  intro: vi.fn(),
  outro: vi.fn(),
  spinner: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
  log: { warn: vi.fn(), info: vi.fn(), message: vi.fn() },
  confirm: vi.fn().mockResolvedValue(true),
  multiselect: vi.fn().mockResolvedValue([]),
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
  tempDir = mkdtempSync(join(tmpdir(), 'devtronic-addon-list-multiselect-'));
  vi.clearAllMocks();
  exitSpy.mockImplementation(() => undefined as never);
  vi.mocked(clack.isCancel).mockReturnValue(false);
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

/** Write a devtronic.json (file-based addon config) */
function writeAddonConfig(dir: string, installed: Record<string, unknown> = {}): void {
  const claudeDir = join(dir, '.claude');
  mkdirSync(claudeDir, { recursive: true });
  writeFileSync(
    join(claudeDir, 'devtronic.json'),
    JSON.stringify({ version: 1, agents: [], installed }, null, 2)
  );
}

/** Write a devtronic manifest with enabledAddons (plugin-based / legacy addons) */
function writeManifestWithAddons(dir: string, enabledAddons: string[]): void {
  const manifestDir = join(dir, '.ai-template');
  mkdirSync(manifestDir, { recursive: true });
  writeFileSync(
    join(manifestDir, 'manifest.json'),
    JSON.stringify(
      {
        version: '1.0.0',
        implantedAt: '2026-03-07',
        selectedIDEs: ['claude-code'],
        projectConfig: { enabledAddons },
        files: {},
      },
      null,
      2
    )
  );
}

// ─── US-1/AC-2: getAddonListInfo returns all registered addons ────────────────

describe('US-1/AC-2: getAddonListInfo returns all registered addons', () => {
  it('should return an entry for every addon in the ADDONS registry', () => {
    // Spec: US-1/AC-2
    const registeredNames = Object.keys(ADDONS);
    const result = getAddonListInfo(tempDir);

    expect(result).toHaveLength(registeredNames.length);
    for (const name of registeredNames) {
      expect(result.find((a) => a.name === name)).toBeDefined();
    }
  });

  it('should include auto-devtronic in the list', () => {
    // Spec: US-1/AC-2 — auto-devtronic must be listed
    const result = getAddonListInfo(tempDir);
    expect(result.find((a) => a.name === 'auto-devtronic')).toBeDefined();
  });
});

// ─── US-1/AC-3: each item has name, description, installed ───────────────────

describe('US-1/AC-3: each addon item has required fields', () => {
  it('should include name, label, description, and installed on each item', () => {
    // Spec: US-1/AC-3
    const result = getAddonListInfo(tempDir);

    for (const item of result) {
      expect(item.name).toBeTruthy();
      expect(item.label).toBeTruthy();
      expect(item.description).toBeTruthy();
      expect(typeof item.installed).toBe('boolean');
    }
  });

  it('should reflect description from the ADDONS registry', () => {
    // Spec: US-1/AC-3
    const result = getAddonListInfo(tempDir);
    const design = result.find((a) => a.name === 'design-best-practices');

    expect(design?.description).toBe(ADDONS['design-best-practices'].description);
  });

  it('should show file-based addon as installed when present in addonConfig', () => {
    // Spec: US-1/AC-3 — design-best-practices uses file-based config
    writeAddonConfig(tempDir, {
      'design-best-practices': { version: '1.0.0', files: [] },
    });

    const result = getAddonListInfo(tempDir);
    const design = result.find((a) => a.name === 'design-best-practices');

    expect(design?.installed).toBe(true);
  });

  it('should show file-based addon as NOT installed when absent from addonConfig', () => {
    // Spec: US-1/AC-3
    const result = getAddonListInfo(tempDir);
    const design = result.find((a) => a.name === 'design-best-practices');

    expect(design?.installed).toBe(false);
  });
});

// ─── US-1/AC-3 (bug fix): orchestration state via manifest ───────────────────

describe('US-1/AC-3 (orchestration): correct installed state from manifest', () => {
  it('should show orchestration as installed when present in manifest enabledAddons', () => {
    // Spec: US-1/AC-3
    // orchestration is a legacy/plugin-based addon — its state is in the manifest,
    // NOT in addonConfig. This was a bug where it always showed as "available".
    writeManifestWithAddons(tempDir, ['orchestration']);

    const result = getAddonListInfo(tempDir);
    const orch = result.find((a) => a.name === 'orchestration');

    expect(orch?.installed).toBe(true);
  });

  it('should show orchestration as NOT installed when absent from manifest', () => {
    // Spec: US-1/AC-3
    writeManifestWithAddons(tempDir, []);

    const result = getAddonListInfo(tempDir);
    const orch = result.find((a) => a.name === 'orchestration');

    expect(orch?.installed).toBe(false);
  });

  it('should show orchestration as NOT installed when no manifest exists', () => {
    // Spec: US-1/AC-3 — fresh project, nothing installed
    const result = getAddonListInfo(tempDir);
    const orch = result.find((a) => a.name === 'orchestration');

    expect(orch?.installed).toBe(false);
  });

  it('should show both orchestration (manifest) and design-best-practices (addonConfig) correctly when both installed', () => {
    // Spec: US-1/AC-3 — mixed install scenario
    writeManifestWithAddons(tempDir, ['orchestration']);
    writeAddonConfig(tempDir, {
      'design-best-practices': { version: '1.0.0', files: [] },
    });

    const result = getAddonListInfo(tempDir);
    const orch = result.find((a) => a.name === 'orchestration');
    const design = result.find((a) => a.name === 'design-best-practices');

    expect(orch?.installed).toBe(true);
    expect(design?.installed).toBe(true);
  });
});

// ─── US-1/AC-1: addonListCommand runs without error ──────────────────────────

describe('US-1/AC-1: addonListCommand command runs without error', () => {
  it('should complete without calling process.exit(1)', async () => {
    // Spec: US-1/AC-1
    await addonListCommand({ path: tempDir });

    expect(exitSpy).not.toHaveBeenCalledWith(1);
  });

  it('should call p.note with addon information', async () => {
    // Spec: US-1/AC-1, US-1/AC-3
    await addonListCommand({ path: tempDir });

    expect(clack.note).toHaveBeenCalled();
    const noteArg = vi.mocked(clack.note).mock.calls[0]?.[0] as string;
    expect(noteArg).toContain('design-best-practices');
    expect(noteArg).toContain('auto-devtronic');
  });
});

// ─── US-1/AC-4: addon --help shows list subcommand ───────────────────────────

describe('US-1/AC-4: addon list is registered as a CLI subcommand', () => {
  it.todo(
    'devtronic addon --help should include "list" in Commands section'
    // This requires integration testing of the CLI binary.
    // When implemented, run the CLI process and check stdout:
    //
    // const { execSync } = await import('node:child_process')
    // const help = execSync('node dist/index.js addon --help').toString()
    // expect(help).toContain('list')
    // expect(help).toContain('List available and installed addons')
  );
});

// ─── US-2: promptForAddons multi-select ──────────────────────────────────────

describe('US-2: promptForAddons multiselect', () => {
  beforeEach(() => {
    vi.mocked(clack.multiselect).mockResolvedValue([]);
  });

  it('US-2/AC-2: should call p.multiselect with options for all ADDONS entries', async () => {
    // Spec: US-2/AC-2
    await promptForAddons();

    const call = vi.mocked(clack.multiselect).mock.calls[0][0] as {
      options: { value: string }[];
    };
    const values = call.options.map((o) => o.value);
    const registeredNames = Object.keys(ADDONS);

    for (const name of registeredNames) {
      expect(values).toContain(name);
    }
  });

  it('US-2/AC-2: should include auto-devtronic in the multiselect options', async () => {
    // Spec: US-2/AC-2
    await promptForAddons();

    const call = vi.mocked(clack.multiselect).mock.calls[0][0] as {
      options: { value: string }[];
    };
    const values = call.options.map((o) => o.value);
    expect(values).toContain('auto-devtronic');
  });

  it('US-2/AC-3: each option should have label (addon.label) and hint (addon.description)', async () => {
    // Spec: US-2/AC-3
    await promptForAddons();

    const call = vi.mocked(clack.multiselect).mock.calls[0][0] as {
      options: { value: string; label: string; hint: string }[];
    };
    for (const option of call.options) {
      const addon = ADDONS[option.value as AddonName];
      expect(option.label).toBe(addon.label);
      expect(option.hint).toBe(addon.description);
    }
  });

  it('US-2/AC-4: should not require a selection (required: false)', async () => {
    // Spec: US-2/AC-4
    await promptForAddons();

    const call = vi.mocked(clack.multiselect).mock.calls[0][0] as { required: boolean };
    expect(call.required).toBe(false);
  });

  it('US-2/AC-4: should return an empty array when the user selects nothing', async () => {
    // Spec: US-2/AC-4
    vi.mocked(clack.multiselect).mockResolvedValue([]);

    const result = await promptForAddons();
    expect(result).toEqual([]);
  });

  // US-2/AC-1, AC-5, AC-6 integration tests are in:
  // src/commands/__tests__/init-addon-selection.test.ts
});
