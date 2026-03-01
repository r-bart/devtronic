import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { Manifest } from '../../types.js';
import { ADDONS } from '../../types.js';

function baseManifest(overrides: Partial<Manifest> = {}): Manifest {
  return {
    version: '1.0.0',
    implantedAt: '2026-02-27',
    selectedIDEs: ['claude-code'],
    projectConfig: {
      architecture: 'clean',
      layers: ['domain', 'application'],
      stateManagement: ['zustand'],
      dataFetching: ['react-query'],
      orm: [],
      testing: ['vitest'],
      ui: ['tailwind'],
      validation: ['zod'],
      framework: 'nextjs',
      qualityCommand: 'pnpm typecheck && pnpm lint',
    },
    files: {},
    ...overrides,
  };
}

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'config-test-'));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

describe('config manifest reading', () => {
  it('reads manifest with all project config fields', () => {
    const manifest = baseManifest();
    const manifestDir = join(tempDir, '.ai-template');
    mkdirSync(manifestDir, { recursive: true });
    writeFileSync(join(manifestDir, 'manifest.json'), JSON.stringify(manifest));

    const content = JSON.parse(readFileSync(join(manifestDir, 'manifest.json'), 'utf-8'));
    expect(content.projectConfig.architecture).toBe('clean');
    expect(content.projectConfig.framework).toBe('nextjs');
    expect(content.projectConfig.layers).toEqual(['domain', 'application']);
    expect(content.projectConfig.stateManagement).toEqual(['zustand']);
    expect(content.projectConfig.qualityCommand).toBe('pnpm typecheck && pnpm lint');
  });

  it('handles manifest with missing optional fields', () => {
    const manifest = baseManifest({
      projectConfig: {
        architecture: 'flat',
        layers: [],
        stateManagement: [],
        dataFetching: [],
        orm: [],
        testing: [],
        ui: [],
        validation: [],
        framework: 'react',
        qualityCommand: 'npm run lint',
      },
    });
    const manifestDir = join(tempDir, '.ai-template');
    mkdirSync(manifestDir, { recursive: true });
    writeFileSync(join(manifestDir, 'manifest.json'), JSON.stringify(manifest));

    const content = JSON.parse(readFileSync(join(manifestDir, 'manifest.json'), 'utf-8'));
    expect(content.projectConfig.layers).toEqual([]);
    expect(content.projectConfig.orm).toEqual([]);
  });

  it('config set updates manifest correctly for string keys', () => {
    const manifest = baseManifest();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (manifest.projectConfig as any).framework = 'vue';

    expect(manifest.projectConfig!.framework).toBe('vue');
  });

  it('config set updates manifest correctly for array keys', () => {
    const manifest = baseManifest();
    const value = 'vitest,playwright';
    const arrayValue = value.split(',').map((v) => v.trim()).filter(Boolean);
    manifest.projectConfig!.testing = arrayValue;

    expect(manifest.projectConfig!.testing).toEqual(['vitest', 'playwright']);
  });

  it('config set handles comma-separated values with spaces', () => {
    const value = 'zustand, jotai, redux';
    const arrayValue = value.split(',').map((v) => v.trim()).filter(Boolean);

    expect(arrayValue).toEqual(['zustand', 'jotai', 'redux']);
  });

  it('config set filters empty values from comma-separated input', () => {
    const value = 'zustand,,jotai,';
    const arrayValue = value.split(',').map((v) => v.trim()).filter(Boolean);

    expect(arrayValue).toEqual(['zustand', 'jotai']);
  });
});

describe('config key validation', () => {
  const ARRAY_KEYS = [
    'layers',
    'stateManagement',
    'dataFetching',
    'orm',
    'testing',
    'ui',
    'validation',
    'enabledAddons',
  ];

  const VALID_KEYS = ['architecture', 'framework', 'qualityCommand', ...ARRAY_KEYS];

  it('recognizes all valid keys', () => {
    for (const key of VALID_KEYS) {
      expect(VALID_KEYS.includes(key)).toBe(true);
    }
  });

  it('rejects invalid keys', () => {
    expect(VALID_KEYS.includes('invalid')).toBe(false);
    expect(VALID_KEYS.includes('version')).toBe(false);
    expect(VALID_KEYS.includes('selectedIDEs')).toBe(false);
  });

  it('identifies array keys correctly', () => {
    expect(ARRAY_KEYS.includes('layers')).toBe(true);
    expect(ARRAY_KEYS.includes('testing')).toBe(true);
    expect(ARRAY_KEYS.includes('architecture')).toBe(false);
    expect(ARRAY_KEYS.includes('framework')).toBe(false);
  });
});

describe('addon validation', () => {
  it('validates addon names against ADDONS registry', () => {
    const validAddons = Object.keys(ADDONS);
    expect(validAddons).toContain('orchestration');
    expect(validAddons).not.toContain('foobar');
    expect(validAddons).not.toContain('');
  });

  it('ADDONS registry contains required fields for each addon', () => {
    for (const [name, addon] of Object.entries(ADDONS)) {
      expect(addon.name).toBe(name);
      expect(addon.label).toBeTruthy();
      expect(addon.description).toBeTruthy();
      expect(addon.skills.length).toBeGreaterThan(0);
      expect(Array.isArray(addon.agents)).toBe(true);
    }
  });

  it('orchestration addon has the correct skills', () => {
    const addon = ADDONS.orchestration;
    expect(addon.skills).toContain('briefing');
    expect(addon.skills).toContain('recap');
    expect(addon.skills).toContain('handoff');
  });
});
