/**
 * @generated-from thoughts/specs/2026-03-06_addon-mode-ux-refactor.md
 * @immutable Do NOT modify these tests — implementation must make them pass as-is.
 *
 * These tests encode the spec's acceptance criteria as executable assertions.
 * If a test seems wrong, update the spec and regenerate — don't edit tests directly.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import * as clack from '@clack/prompts';
import { addonCommand, getAddonListInfo } from '../addon.js';
import { readAddonConfig } from '../../utils/addonConfig.js';

// ─── Mock external I/O ───────────────────────────────────────────────────────

vi.mock('@clack/prompts', () => ({
  intro: vi.fn(),
  outro: vi.fn(),
  spinner: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
  log: { warn: vi.fn(), info: vi.fn(), message: vi.fn(), success: vi.fn() },
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
  tempDir = mkdtempSync(join(tmpdir(), 'devtronic-enable-disable-'));
  vi.clearAllMocks();
  exitSpy.mockImplementation(() => undefined as never);
  vi.mocked(clack.confirm).mockResolvedValue(true);
  vi.mocked(clack.isCancel).mockReturnValue(false);
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

// addonCommand('enable', ...) — action type will be updated in implementation.
// Using `as any` cast so tests compile now and fail at runtime until implemented.

// ─── US-1/AC-1: addon enable copies files ────────────────────────────────────

describe('US-1/AC-1: addon enable', () => {
  it('should copy addon files to .claude/ on enable', async () => {
    // Spec: US-1/AC-1, FR-2
    await (addonCommand as any)('enable', 'design-best-practices', { path: tempDir });
    expect(existsSync(join(tempDir, '.claude', 'skills', 'design-init', 'SKILL.md'))).toBe(true);
  });

  it('should register addon in .claude/devtronic.json on enable (not root)', async () => {
    // Spec: US-1/AC-1, FR-1, FR-2
    await (addonCommand as any)('enable', 'design-best-practices', { path: tempDir });
    const config = readAddonConfig(tempDir);
    expect(config.installed['design-best-practices']).toBeDefined();
    // Config should be in .claude/, not root
    expect(existsSync(join(tempDir, '.claude', 'devtronic.json'))).toBe(true);
    expect(existsSync(join(tempDir, 'devtronic.json'))).toBe(false);
  });

  it('should prompt for confirmation before enabling', async () => {
    // Spec: US-1/AC-1, FR-2
    await (addonCommand as any)('enable', 'design-best-practices', { path: tempDir });
    expect(clack.confirm).toHaveBeenCalled();
  });

  it('EC: enable on already-enabled addon should warn and exit cleanly', async () => {
    // Spec: FR-2, EC
    await (addonCommand as any)('enable', 'design-best-practices', { path: tempDir });
    vi.clearAllMocks();
    await (addonCommand as any)('enable', 'design-best-practices', { path: tempDir });
    expect(clack.log.warn).toHaveBeenCalled();
    expect(exitSpy).not.toHaveBeenCalledWith(1);
  });

  it('should call process.exit(0) when user declines enable confirmation', async () => {
    // Spec: FR-2
    vi.mocked(clack.confirm).mockResolvedValueOnce(false);
    await (addonCommand as any)('enable', 'design-best-practices', { path: tempDir });
    expect(exitSpy).toHaveBeenCalledWith(0);
  });
});

// ─── US-1/AC-2: addon disable removes files ──────────────────────────────────

describe('US-1/AC-2: addon disable', () => {
  it('should remove addon files from .claude/ on disable', async () => {
    // Spec: US-1/AC-2, FR-2
    await (addonCommand as any)('enable', 'design-best-practices', { path: tempDir });
    expect(existsSync(join(tempDir, '.claude', 'skills', 'design-init', 'SKILL.md'))).toBe(true);
    await (addonCommand as any)('disable', 'design-best-practices', { path: tempDir });
    expect(existsSync(join(tempDir, '.claude', 'skills', 'design-init'))).toBe(false);
  });

  it('should remove addon from config.installed on disable', async () => {
    // Spec: US-1/AC-2, FR-2
    await (addonCommand as any)('enable', 'design-best-practices', { path: tempDir });
    await (addonCommand as any)('disable', 'design-best-practices', { path: tempDir });
    const config = readAddonConfig(tempDir);
    expect(config.installed['design-best-practices']).toBeUndefined();
  });

  it('EC: disable on not-enabled addon should warn and exit cleanly', async () => {
    // Spec: FR-2, EC
    await (addonCommand as any)('disable', 'design-best-practices', { path: tempDir });
    expect(clack.log.warn).toHaveBeenCalled();
    expect(exitSpy).not.toHaveBeenCalledWith(1);
  });
});

// ─── US-1/AC-3: addon list shows enabled/disabled ────────────────────────────

describe('US-1/AC-3: addon list enabled/disabled state', () => {
  it('should show addon as enabled after enabling', async () => {
    // Spec: US-1/AC-3, FR-2
    await (addonCommand as any)('enable', 'design-best-practices', { path: tempDir });
    const items = getAddonListInfo(tempDir);
    const design = items.find((a) => a.name === 'design-best-practices');
    expect(design?.installed).toBe(true);
  });

  it('should show addon as not enabled when not installed', () => {
    // Spec: US-1/AC-3, FR-2
    const items = getAddonListInfo(tempDir);
    const design = items.find((a) => a.name === 'design-best-practices');
    expect(design?.installed).toBe(false);
  });

  it('should show addon as not enabled after disabling', async () => {
    // Spec: US-1/AC-3, FR-2
    await (addonCommand as any)('enable', 'design-best-practices', { path: tempDir });
    await (addonCommand as any)('disable', 'design-best-practices', { path: tempDir });
    const items = getAddonListInfo(tempDir);
    const design = items.find((a) => a.name === 'design-best-practices');
    expect(design?.installed).toBe(false);
  });
});

// ─── FR-2: Deprecated enable/disable aliases ─────────────────────────────────

describe('FR-2: deprecated addon enable/disable aliases', () => {
  it('addon enable should still copy files (backward compat) AND show deprecation warning', async () => {
    // enable/disable are deprecated — add/remove are canonical
    await (addonCommand as any)('enable', 'design-best-practices', { path: tempDir });
    expect(existsSync(join(tempDir, '.claude', 'skills', 'design-init', 'SKILL.md'))).toBe(true);
    const warnCalls = vi.mocked(clack.log.warn).mock.calls.flat().join(' ');
    expect(warnCalls).toContain('deprecated');
  });

  it('addon disable should still remove files (backward compat) AND show deprecation warning', async () => {
    // enable/disable are deprecated — add/remove are canonical
    await (addonCommand as any)('enable', 'design-best-practices', { path: tempDir });
    vi.clearAllMocks();
    await (addonCommand as any)('disable', 'design-best-practices', { path: tempDir });
    expect(existsSync(join(tempDir, '.claude', 'skills', 'design-init'))).toBe(false);
    const warnCalls = vi.mocked(clack.log.warn).mock.calls.flat().join(' ');
    expect(warnCalls).toContain('deprecated');
  });

  it('addon enable deprecation warning should suggest using add instead', async () => {
    // enable is deprecated, should suggest add
    await (addonCommand as any)('enable', 'design-best-practices', { path: tempDir });
    const warnCalls = vi.mocked(clack.log.warn).mock.calls.flat().join(' ');
    expect(warnCalls).toContain('add');
  });

  it('addon add should NOT show deprecation warning (canonical command)', async () => {
    // add is the canonical command — no warning
    await addonCommand('add', 'design-best-practices', { path: tempDir });
    const warnCalls = vi.mocked(clack.log.warn).mock.calls.flat().join(' ');
    expect(warnCalls).not.toContain('deprecated');
  });
});

// ─── auto-devtronic: enable/disable ──────────────────────────────────────────

describe('auto-devtronic addon: enable/disable', () => {
  it('enable should install skill and all agents', async () => {
    // Spec: US-1/AC-1
    await (addonCommand as any)('enable', 'auto-devtronic', { path: tempDir });
    expect(existsSync(join(tempDir, '.claude', 'skills', 'auto-devtronic', 'SKILL.md'))).toBe(true);
    expect(existsSync(join(tempDir, '.claude', 'agents', 'issue-parser.md'))).toBe(true);
    expect(existsSync(join(tempDir, '.claude', 'agents', 'failure-analyst.md'))).toBe(true);
    expect(existsSync(join(tempDir, '.claude', 'agents', 'quality-runner.md'))).toBe(true);
  });

  it('disable should remove skill and all agents', async () => {
    // Spec: US-1/AC-2
    await (addonCommand as any)('enable', 'auto-devtronic', { path: tempDir });
    await (addonCommand as any)('disable', 'auto-devtronic', { path: tempDir });
    expect(existsSync(join(tempDir, '.claude', 'skills', 'auto-devtronic'))).toBe(false);
    expect(existsSync(join(tempDir, '.claude', 'agents', 'issue-parser.md'))).toBe(false);
    expect(existsSync(join(tempDir, '.claude', 'agents', 'quality-runner.md'))).toBe(false);
  });
});
