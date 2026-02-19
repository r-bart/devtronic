import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  readClaudeSettings,
  writeClaudeSettings,
  registerPlugin,
  unregisterPlugin,
} from '../settings.js';

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'agentic-settings-test-'));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

describe('readClaudeSettings', () => {
  it('returns empty object when .claude/settings.json does not exist', () => {
    expect(readClaudeSettings(tempDir)).toEqual({});
  });

  it('returns empty object for invalid JSON', () => {
    mkdirSync(join(tempDir, '.claude'), { recursive: true });
    writeFileSync(join(tempDir, '.claude', 'settings.json'), 'not json');

    expect(readClaudeSettings(tempDir)).toEqual({});
  });

  it('reads existing settings', () => {
    const settings = {
      someKey: 'someValue',
      enabledPlugins: { 'foo@bar': true },
    };
    mkdirSync(join(tempDir, '.claude'), { recursive: true });
    writeFileSync(join(tempDir, '.claude', 'settings.json'), JSON.stringify(settings));

    const result = readClaudeSettings(tempDir);

    expect(result.someKey).toBe('someValue');
    expect(result.enabledPlugins).toEqual({ 'foo@bar': true });
  });
});

describe('writeClaudeSettings', () => {
  it('creates .claude/ directory and writes settings', () => {
    writeClaudeSettings(tempDir, { foo: 'bar' });

    const content = readFileSync(join(tempDir, '.claude', 'settings.json'), 'utf-8');
    expect(JSON.parse(content)).toEqual({ foo: 'bar' });
  });

  it('overwrites existing settings', () => {
    mkdirSync(join(tempDir, '.claude'), { recursive: true });
    writeFileSync(join(tempDir, '.claude', 'settings.json'), '{"old": true}');

    writeClaudeSettings(tempDir, { new: true });

    const content = readFileSync(join(tempDir, '.claude', 'settings.json'), 'utf-8');
    expect(JSON.parse(content)).toEqual({ new: true });
  });

  it('outputs formatted JSON', () => {
    writeClaudeSettings(tempDir, { a: 1 });

    const content = readFileSync(join(tempDir, '.claude', 'settings.json'), 'utf-8');
    expect(content).toContain('\n'); // formatted, not single-line
  });
});

describe('registerPlugin', () => {
  it('creates marketplace and enables plugin from scratch', () => {
    registerPlugin(tempDir, 'tut-ai', 'tutellus-local', '.claude-plugins');

    const settings = JSON.parse(
      readFileSync(join(tempDir, '.claude', 'settings.json'), 'utf-8')
    );

    expect(settings.extraKnownMarketplaces).toEqual({
      'tutellus-local': {
        source: { source: 'directory', path: '.claude-plugins' },
      },
    });
    expect(settings.enabledPlugins).toEqual({
      'tut-ai@tutellus-local': true,
    });
  });

  it('preserves existing settings when adding plugin', () => {
    mkdirSync(join(tempDir, '.claude'), { recursive: true });
    writeFileSync(
      join(tempDir, '.claude', 'settings.json'),
      JSON.stringify({
        existingKey: 'preserved',
        enabledPlugins: { 'other@marketplace': true },
      })
    );

    registerPlugin(tempDir, 'tut-ai', 'tutellus-local', '.claude-plugins');

    const settings = JSON.parse(
      readFileSync(join(tempDir, '.claude', 'settings.json'), 'utf-8')
    );

    expect(settings.existingKey).toBe('preserved');
    expect(settings.enabledPlugins['other@marketplace']).toBe(true);
    expect(settings.enabledPlugins['tut-ai@tutellus-local']).toBe(true);
  });

  it('is idempotent — does not duplicate on second call', () => {
    registerPlugin(tempDir, 'tut-ai', 'tutellus-local', '.claude-plugins');
    registerPlugin(tempDir, 'tut-ai', 'tutellus-local', '.claude-plugins');

    const settings = JSON.parse(
      readFileSync(join(tempDir, '.claude', 'settings.json'), 'utf-8')
    );

    const marketplaceKeys = Object.keys(settings.extraKnownMarketplaces);
    expect(marketplaceKeys).toHaveLength(1);

    const pluginKeys = Object.keys(settings.enabledPlugins);
    expect(pluginKeys).toHaveLength(1);
  });

  it('does not overwrite user-disabled plugin', () => {
    mkdirSync(join(tempDir, '.claude'), { recursive: true });
    writeFileSync(
      join(tempDir, '.claude', 'settings.json'),
      JSON.stringify({
        enabledPlugins: { 'tut-ai@tutellus-local': false },
      })
    );

    registerPlugin(tempDir, 'tut-ai', 'tutellus-local', '.claude-plugins');

    const settings = JSON.parse(
      readFileSync(join(tempDir, '.claude', 'settings.json'), 'utf-8')
    );

    // User explicitly set to false — should not be overwritten
    expect(settings.enabledPlugins['tut-ai@tutellus-local']).toBe(false);
  });
});

describe('unregisterPlugin', () => {
  it('removes plugin from enabledPlugins', () => {
    registerPlugin(tempDir, 'tut-ai', 'tutellus-local', '.claude-plugins');
    unregisterPlugin(tempDir, 'tut-ai', 'tutellus-local');

    const settings = JSON.parse(
      readFileSync(join(tempDir, '.claude', 'settings.json'), 'utf-8')
    );

    expect(settings.enabledPlugins['tut-ai@tutellus-local']).toBeUndefined();
  });

  it('preserves marketplace after unregistering plugin', () => {
    registerPlugin(tempDir, 'tut-ai', 'tutellus-local', '.claude-plugins');
    unregisterPlugin(tempDir, 'tut-ai', 'tutellus-local');

    const settings = JSON.parse(
      readFileSync(join(tempDir, '.claude', 'settings.json'), 'utf-8')
    );

    expect(settings.extraKnownMarketplaces['tutellus-local']).toBeDefined();
  });

  it('does nothing when plugin is not registered', () => {
    writeClaudeSettings(tempDir, { enabledPlugins: {} });

    // Should not throw
    unregisterPlugin(tempDir, 'nonexistent', 'nowhere');

    const settings = JSON.parse(
      readFileSync(join(tempDir, '.claude', 'settings.json'), 'utf-8')
    );

    expect(settings.enabledPlugins).toEqual({});
  });

  it('does nothing when no settings file exists', () => {
    // Should not throw
    unregisterPlugin(tempDir, 'tut-ai', 'tutellus-local');

    // Settings file gets created with empty enabledPlugins
    const settings = JSON.parse(
      readFileSync(join(tempDir, '.claude', 'settings.json'), 'utf-8')
    );
    expect(settings).toBeDefined();
  });
});
