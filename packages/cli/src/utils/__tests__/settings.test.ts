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
    registerPlugin(tempDir, 'devtronic', 'devtronic-local', '.claude-plugins');

    const settings = JSON.parse(
      readFileSync(join(tempDir, '.claude', 'settings.json'), 'utf-8')
    );

    expect(settings.extraKnownMarketplaces).toEqual({
      'devtronic-local': {
        source: { source: 'directory', path: '.claude-plugins' },
      },
    });
    expect(settings.enabledPlugins).toEqual({
      'devtronic@devtronic-local': true,
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

    registerPlugin(tempDir, 'devtronic', 'devtronic-local', '.claude-plugins');

    const settings = JSON.parse(
      readFileSync(join(tempDir, '.claude', 'settings.json'), 'utf-8')
    );

    expect(settings.existingKey).toBe('preserved');
    expect(settings.enabledPlugins['other@marketplace']).toBe(true);
    expect(settings.enabledPlugins['devtronic@devtronic-local']).toBe(true);
  });

  it('is idempotent — does not duplicate on second call', () => {
    registerPlugin(tempDir, 'devtronic', 'devtronic-local', '.claude-plugins');
    registerPlugin(tempDir, 'devtronic', 'devtronic-local', '.claude-plugins');

    const settings = JSON.parse(
      readFileSync(join(tempDir, '.claude', 'settings.json'), 'utf-8')
    );

    const marketplaceKeys = Object.keys(settings.extraKnownMarketplaces);
    expect(marketplaceKeys).toHaveLength(1);

    const pluginKeys = Object.keys(settings.enabledPlugins);
    expect(pluginKeys).toHaveLength(1);
  });

  it('cleans up legacy dev-ai entries', () => {
    mkdirSync(join(tempDir, '.claude'), { recursive: true });
    writeFileSync(
      join(tempDir, '.claude', 'settings.json'),
      JSON.stringify({
        extraKnownMarketplaces: {
          'dev-ai-local': {
            source: { source: 'directory', path: '.claude-plugins' },
          },
        },
        enabledPlugins: { 'dev-ai@dev-ai-local': true },
      })
    );

    registerPlugin(tempDir, 'devtronic', 'devtronic-local', '.claude-plugins');

    const settings = JSON.parse(
      readFileSync(join(tempDir, '.claude', 'settings.json'), 'utf-8')
    );

    // Legacy entries removed
    expect(settings.extraKnownMarketplaces['dev-ai-local']).toBeUndefined();
    expect(settings.enabledPlugins['dev-ai@dev-ai-local']).toBeUndefined();

    // New entries present
    expect(settings.extraKnownMarketplaces['devtronic-local']).toBeDefined();
    expect(settings.enabledPlugins['devtronic@devtronic-local']).toBe(true);
  });

  it('cleans up legacy ai-agentic entries', () => {
    mkdirSync(join(tempDir, '.claude'), { recursive: true });
    writeFileSync(
      join(tempDir, '.claude', 'settings.json'),
      JSON.stringify({
        extraKnownMarketplaces: {
          'ai-agentic-local': {
            source: { source: 'directory', path: '.claude-plugins' },
          },
        },
        enabledPlugins: { 'ai-agentic@ai-agentic-local': true },
      })
    );

    registerPlugin(tempDir, 'devtronic', 'devtronic-local', '.claude-plugins');

    const settings = JSON.parse(
      readFileSync(join(tempDir, '.claude', 'settings.json'), 'utf-8')
    );

    expect(settings.extraKnownMarketplaces['ai-agentic-local']).toBeUndefined();
    expect(settings.enabledPlugins['ai-agentic@ai-agentic-local']).toBeUndefined();
    expect(settings.enabledPlugins['devtronic@devtronic-local']).toBe(true);
  });

  it('does not overwrite user-disabled plugin', () => {
    mkdirSync(join(tempDir, '.claude'), { recursive: true });
    writeFileSync(
      join(tempDir, '.claude', 'settings.json'),
      JSON.stringify({
        enabledPlugins: { 'devtronic@devtronic-local': false },
      })
    );

    registerPlugin(tempDir, 'devtronic', 'devtronic-local', '.claude-plugins');

    const settings = JSON.parse(
      readFileSync(join(tempDir, '.claude', 'settings.json'), 'utf-8')
    );

    // User explicitly set to false — should not be overwritten
    expect(settings.enabledPlugins['devtronic@devtronic-local']).toBe(false);
  });
});

describe('unregisterPlugin', () => {
  it('removes plugin from enabledPlugins', () => {
    registerPlugin(tempDir, 'devtronic', 'devtronic-local', '.claude-plugins');
    unregisterPlugin(tempDir, 'devtronic', 'devtronic-local');

    const settings = JSON.parse(
      readFileSync(join(tempDir, '.claude', 'settings.json'), 'utf-8')
    );

    expect(settings.enabledPlugins['devtronic@devtronic-local']).toBeUndefined();
  });

  it('preserves marketplace after unregistering plugin', () => {
    registerPlugin(tempDir, 'devtronic', 'devtronic-local', '.claude-plugins');
    unregisterPlugin(tempDir, 'devtronic', 'devtronic-local');

    const settings = JSON.parse(
      readFileSync(join(tempDir, '.claude', 'settings.json'), 'utf-8')
    );

    expect(settings.extraKnownMarketplaces['devtronic-local']).toBeDefined();
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
    unregisterPlugin(tempDir, 'devtronic', 'devtronic-local');

    // Settings file gets created with empty enabledPlugins
    const settings = JSON.parse(
      readFileSync(join(tempDir, '.claude', 'settings.json'), 'utf-8')
    );
    expect(settings).toBeDefined();
  });
});
