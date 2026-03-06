/**
 * @generated-from thoughts/specs/2026-03-06_addon-mode-ux-refactor.md
 * @immutable Do NOT modify these tests — implementation must make them pass as-is.
 *
 * These tests encode the spec's acceptance criteria as executable assertions.
 * If a test seems wrong, update the spec and regenerate — don't edit tests directly.
 */
import { describe, it, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// readMode, writeMode, modeCommand — not yet implemented.
// All tests here are it.todo() with intended body in comments.
// The utility round-trip tests that CAN compile are at the bottom.

// ─── Mock external I/O ───────────────────────────────────────────────────────

vi.mock('@clack/prompts', () => ({
  intro: vi.fn(),
  outro: vi.fn(),
  log: { info: vi.fn(), warn: vi.fn(), success: vi.fn(), message: vi.fn() },
  note: vi.fn(),
  cancel: vi.fn(),
  isCancel: vi.fn(() => false),
}));

vi.mock('../../utils/version.js', () => ({
  getCliVersion: () => '1.0.0',
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'devtronic-mode-cmd-'));
  vi.clearAllMocks();
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

// ─── FR-3: modeCommand ───────────────────────────────────────────────────────

describe('FR-3: devtronic mode command', () => {
  it.todo('US-2/AC-1: mode afk should write mode: afk to .claude/devtronic.json');
  // Spec: FR-3, US-2/AC-1
  // import { modeCommand } from '../mode.js';
  // import { readMode } from '../../utils/addonConfig.js';
  // await modeCommand('afk', { path: tempDir });
  // expect(readMode(tempDir)).toBe('afk');
  // expect(existsSync(join(tempDir, '.claude', 'devtronic.json'))).toBe(true);

  it.todo('US-2/AC-2: mode hitl should write mode: hitl to .claude/devtronic.json');
  // Spec: FR-3, US-2/AC-2
  // import { modeCommand } from '../mode.js';
  // import { readMode } from '../../utils/addonConfig.js';
  // await modeCommand('hitl', { path: tempDir });
  // expect(readMode(tempDir)).toBe('hitl');

  it.todo('US-2/AC-3: mode show with afk config should log afk');
  // Spec: FR-3, US-2/AC-3
  // import { modeCommand } from '../mode.js';
  // import { writeMode } from '../../utils/addonConfig.js';
  // import * as clack from '@clack/prompts';
  // writeMode(tempDir, 'afk');
  // await modeCommand('show', { path: tempDir });
  // const allLogs = vi.mocked(clack.log.info).mock.calls.flat().join(' ');
  // expect(allLogs).toContain('afk');

  it.todo('EC: mode show with no config should log hitl and (default)');
  // Spec: EC, FR-3
  // import { modeCommand } from '../mode.js';
  // import * as clack from '@clack/prompts';
  // await modeCommand('show', { path: tempDir }); // no config file
  // const allLogs = vi.mocked(clack.log.info).mock.calls.flat().join(' ');
  // expect(allLogs).toContain('hitl');
  // expect(allLogs).toContain('default');

  it.todo('mode show should include .claude/devtronic.json path in output');
  // Spec: FR-5
  // import { modeCommand } from '../mode.js';
  // import * as clack from '@clack/prompts';
  // await modeCommand('show', { path: tempDir });
  // const allLogs = vi.mocked(clack.log.info).mock.calls.flat().join(' ');
  // expect(allLogs).toContain('.claude/devtronic.json');

  it.todo('mode afk should log a success message');
  // Spec: FR-3
  // import { modeCommand } from '../mode.js';
  // import * as clack from '@clack/prompts';
  // await modeCommand('afk', { path: tempDir });
  // expect(clack.log.success).toHaveBeenCalled();
  // const msg = vi.mocked(clack.log.success).mock.calls.flat().join(' ');
  // expect(msg).toContain('afk');

  it.todo('mode hitl should log a success message');
  // Spec: FR-3
  // import { modeCommand } from '../mode.js';
  // import * as clack from '@clack/prompts';
  // await modeCommand('hitl', { path: tempDir });
  // expect(clack.log.success).toHaveBeenCalled();
  // const msg = vi.mocked(clack.log.success).mock.calls.flat().join(' ');
  // expect(msg).toContain('hitl');
});

// ─── US-2/AC-4: mode resolution priority (documented in SKILL.md) ────────────

describe('US-2/AC-4,5: mode resolution priority', () => {
  it.todo('SKILL.md should document that --afk/--hitl flag overrides config mode');
  // Spec: US-2/AC-4
  // Validate by reading packages/cli/src/addons/auto-devtronic/skills/auto-devtronic/SKILL.md
  // and confirming it contains "Mode Resolution" section with flag priority documented

  it.todo('SKILL.md should document that config mode is used when no flag is passed');
  // Spec: US-2/AC-5
  // Same file — confirm config fallback is documented

  it.todo('SKILL.md should document that HITL is the default when no flag and no config');
  // Spec: US-2/AC-3 (default)
  // Same file — confirm HITL default is documented
});
