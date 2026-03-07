/**
 * @generated-from thoughts/specs/2026-03-07_addon-list-and-init-multiselect.md
 * @immutable Do NOT modify these tests — implementation must make them pass as-is.
 *
 * Integration tests for addon selection in initCommand.
 * Kept in a separate file to avoid conflicting with the commands/init.js mock
 * used in addon-list-init-multiselect.test.ts.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import * as clack from '@clack/prompts';

// ─── Mock interactive I/O ─────────────────────────────────────────────────────

vi.mock('@clack/prompts', () => ({
  intro: vi.fn(),
  outro: vi.fn(),
  spinner: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
  log: { warn: vi.fn(), info: vi.fn(), message: vi.fn(), error: vi.fn() },
  confirm: vi.fn().mockResolvedValue(true),
  multiselect: vi.fn().mockResolvedValue([]),
  select: vi.fn().mockResolvedValue('claude-code'),
  note: vi.fn(),
  cancel: vi.fn(),
  isCancel: vi.fn(() => false),
}));

vi.mock('../../analyzers/index.js', () => ({
  analyzeProject: vi.fn().mockReturnValue({
    architecture: { pattern: 'flat', layers: [] },
    stack: { stateManagement: [], dataFetching: [], orm: [], testing: [], ui: [], validation: [] },
    framework: { name: 'unknown' },
    scripts: {},
    packageManager: 'npm',
    existingConfigs: {},
  }),
}));

vi.mock('../../prompts/analysis.js', () => ({
  promptForProjectConfig: vi.fn().mockResolvedValue({
    architecture: 'flat',
    layers: [],
    stateManagement: [],
    dataFetching: [],
    orm: [],
    testing: [],
    ui: [],
    validation: [],
    framework: 'unknown',
    qualityCommand: 'npm run typecheck',
  }),
}));

vi.mock('../../utils/version.js', () => ({
  getCliVersion: () => '1.0.0',
}));

vi.mock('../../utils/settings.js', () => ({
  registerPlugin: vi.fn(),
}));

// Bypass TTY check so initCommand can run in non-interactive test environment
vi.mock('../../utils/tty.js', () => ({
  ensureInteractive: vi.fn(),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

let tempDir: string;

const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'devtronic-init-addon-'));
  vi.clearAllMocks();
  exitSpy.mockImplementation(() => undefined as never);
  vi.mocked(clack.isCancel).mockReturnValue(false);
  vi.mocked(clack.confirm).mockResolvedValue(true);
  vi.mocked(clack.multiselect).mockResolvedValue([]);
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

// ─── US-2/AC-1: guard conditions ─────────────────────────────────────────────

describe('US-2/AC-1: addon multiselect guard conditions', () => {
  it('should NOT call p.multiselect when --yes flag is set', async () => {
    // Spec: US-2/AC-1
    // With --yes, initCommand runs non-interactively — addon multiselect is skipped
    const { initCommand } = await import('../init.js');

    await initCommand({ path: tempDir, yes: true });

    expect(clack.multiselect).not.toHaveBeenCalled();
  });

  it('should NOT call p.multiselect when --preset flag is set', async () => {
    // Spec: US-2/AC-1
    // Note: also pass ide to skip IDE selection (which also uses p.multiselect),
    // so we can assert the addon multiselect specifically was not triggered.
    const { initCommand } = await import('../init.js');

    await initCommand({ path: tempDir, preset: 'minimal', ide: 'claude-code' });

    expect(clack.multiselect).not.toHaveBeenCalled();
  });
});

// ─── US-2/AC-6: empty selection → no addons recorded ─────────────────────────

describe('US-2/AC-6: empty addon selection leaves manifest clean', () => {
  it('should not record any addons in manifest when user selects nothing', async () => {
    // Spec: US-2/AC-6
    // multiselect for IDEs returns ['claude-code'], multiselect for addons returns []
    vi.mocked(clack.multiselect)
      .mockResolvedValueOnce(['claude-code']) // IDE selection
      .mockResolvedValueOnce([]);             // addon selection (empty)

    const { initCommand } = await import('../init.js');
    await initCommand({ path: tempDir });

    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const manifestPath = join(tempDir, '.ai-template', 'manifest.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));

    expect(manifest.projectConfig?.enabledAddons ?? []).toHaveLength(0);
  });
});

// ─── US-2/AC-5: selected addon recorded in manifest ──────────────────────────

describe('US-2/AC-5: selected addon is recorded in manifest', () => {
  it('should record auto-devtronic in manifest when selected', async () => {
    // Spec: US-2/AC-5
    // Note: initCommand records file-based addons in manifest but does not install
    // their files during init — installation happens via `addon enable`.
    vi.mocked(clack.multiselect)
      .mockResolvedValueOnce(['claude-code'])      // IDE selection
      .mockResolvedValueOnce(['auto-devtronic']);   // addon selection

    const { initCommand } = await import('../init.js');
    await initCommand({ path: tempDir });

    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const manifestPath = join(tempDir, '.ai-template', 'manifest.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));

    expect(manifest.projectConfig?.enabledAddons).toContain('auto-devtronic');
  });
});
