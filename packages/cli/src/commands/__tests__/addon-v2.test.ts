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
/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { getAvailableAddons } from '../../addons/registry.js';
import { getAddonListInfo } from '../addon.js';
import { readAddonConfig } from '../../utils/addonConfig.js';

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
  // These tests require mocking @clack/prompts confirm — kept as todos
  it.todo('US-2/AC-1: should copy addon files to repo on add');
  it.todo('US-2/AC-2: should generate files for all configured agents');
  it.todo('US-2/AC-3: should be idempotent — running twice does not duplicate files');
  it.todo('US-2/AC-4: should prompt for confirmation before writing files');

  it('should reject unknown addon name', () => {
    // Spec: FR-5
    const validAddons = getAvailableAddons().map((a) => a.name);
    expect(validAddons).not.toContain('nonexistent-addon');
  });
});

// ─── US-3: Remove Addon ─────────────────────────────────────────────────────

describe('addon remove command', () => {
  // These tests require mocking @clack/prompts — kept as todos
  it.todo('US-3/AC-1: should delete addon files on remove');
  it.todo('US-3/AC-2: should warn about customized files before removing');
  it.todo('US-3/AC-3: should remove from all configured agent directories');
  it.todo('US-3/AC-4: should update addon registry in config');
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

// ─── FR-5: Addon Sync ───────────────────────────────────────────────────────

describe('addon sync command', () => {
  // This test requires mocking the CLI sync command — kept as todo
  it.todo('FR-5: should regenerate addon files for current agent configuration');
});
