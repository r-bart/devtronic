import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  generatePlugin,
  generatePluginJson,
  generateMarketplaceJson,
  PLUGIN_NAME,
  PLUGIN_DIR,
  BASE_SKILL_COUNT,
} from '../plugin.js';
import type { ProjectConfig } from '../../types.js';

function createConfig(overrides: Partial<ProjectConfig> = {}): ProjectConfig {
  return {
    architecture: 'clean',
    layers: ['domain', 'application', 'infrastructure', 'presentation'],
    stateManagement: [],
    dataFetching: [],
    orm: [],
    testing: [],
    ui: [],
    validation: [],
    framework: 'nextjs',
    qualityCommand: 'npm run typecheck && npm run lint && npm test',
    ...overrides,
  };
}

let tempDir: string;
let templatesDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'agentic-addon-test-'));

  // Create a minimal template structure
  templatesDir = join(tempDir, '_templates');
  const claudeDir = join(templatesDir, 'claude-code', '.claude');

  // Core skills
  const skillsDir = join(claudeDir, 'skills');
  mkdirSync(join(skillsDir, 'brief'), { recursive: true });
  writeFileSync(join(skillsDir, 'brief', 'SKILL.md'), '# Brief skill');

  mkdirSync(join(skillsDir, 'audit'), { recursive: true });
  writeFileSync(join(skillsDir, 'audit', 'SKILL.md'), '# Audit skill');

  // Addon skills (orchestration)
  mkdirSync(join(skillsDir, 'briefing'), { recursive: true });
  writeFileSync(join(skillsDir, 'briefing', 'SKILL.md'), '# Briefing skill');

  mkdirSync(join(skillsDir, 'recap'), { recursive: true });
  writeFileSync(join(skillsDir, 'recap', 'SKILL.md'), '# Recap skill');

  mkdirSync(join(skillsDir, 'handoff'), { recursive: true });
  writeFileSync(join(skillsDir, 'handoff', 'SKILL.md'), '# Handoff skill');

  // Agents
  const agentsDir = join(claudeDir, 'agents');
  mkdirSync(agentsDir, { recursive: true });
  writeFileSync(join(agentsDir, 'code-reviewer.md'), '# Code reviewer');
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

describe('addon skill filtering', () => {
  it('excludes addon skills when no addons are enabled', () => {
    const targetDir = join(tempDir, 'project');
    mkdirSync(targetDir);

    const config = createConfig(); // no enabledAddons
    generatePlugin(targetDir, templatesDir, '1.0.0', config, 'npm');

    // Core skills should exist
    const briefPath = join(targetDir, PLUGIN_DIR, PLUGIN_NAME, 'skills', 'brief', 'SKILL.md');
    expect(existsSync(briefPath)).toBe(true);

    const auditPath = join(targetDir, PLUGIN_DIR, PLUGIN_NAME, 'skills', 'audit', 'SKILL.md');
    expect(existsSync(auditPath)).toBe(true);

    // Addon skills should NOT exist
    const briefingPath = join(targetDir, PLUGIN_DIR, PLUGIN_NAME, 'skills', 'briefing', 'SKILL.md');
    expect(existsSync(briefingPath)).toBe(false);

    const recapPath = join(targetDir, PLUGIN_DIR, PLUGIN_NAME, 'skills', 'recap', 'SKILL.md');
    expect(existsSync(recapPath)).toBe(false);

    const handoffPath = join(targetDir, PLUGIN_DIR, PLUGIN_NAME, 'skills', 'handoff', 'SKILL.md');
    expect(existsSync(handoffPath)).toBe(false);
  });

  it('includes addon skills when orchestration addon is enabled', () => {
    const targetDir = join(tempDir, 'project');
    mkdirSync(targetDir);

    const config = createConfig({ enabledAddons: ['orchestration'] });
    generatePlugin(targetDir, templatesDir, '1.0.0', config, 'npm');

    // Core skills should exist
    const briefPath = join(targetDir, PLUGIN_DIR, PLUGIN_NAME, 'skills', 'brief', 'SKILL.md');
    expect(existsSync(briefPath)).toBe(true);

    // Addon skills should also exist
    const briefingPath = join(targetDir, PLUGIN_DIR, PLUGIN_NAME, 'skills', 'briefing', 'SKILL.md');
    expect(existsSync(briefingPath)).toBe(true);

    const recapPath = join(targetDir, PLUGIN_DIR, PLUGIN_NAME, 'skills', 'recap', 'SKILL.md');
    expect(existsSync(recapPath)).toBe(true);

    const handoffPath = join(targetDir, PLUGIN_DIR, PLUGIN_NAME, 'skills', 'handoff', 'SKILL.md');
    expect(existsSync(handoffPath)).toBe(true);
  });

  it('excludes addon skills when enabledAddons is empty array', () => {
    const targetDir = join(tempDir, 'project');
    mkdirSync(targetDir);

    const config = createConfig({ enabledAddons: [] });
    generatePlugin(targetDir, templatesDir, '1.0.0', config, 'npm');

    const briefingPath = join(targetDir, PLUGIN_DIR, PLUGIN_NAME, 'skills', 'briefing', 'SKILL.md');
    expect(existsSync(briefingPath)).toBe(false);
  });
});

describe('dynamic skill count in plugin.json', () => {
  it('shows base count when no addons', () => {
    const result = JSON.parse(generatePluginJson('1.0.0', 0));
    expect(result.description).toContain(`${BASE_SKILL_COUNT} skills`);
    expect(result.description).not.toContain('addon');
  });

  it('shows addon count when addons enabled', () => {
    const result = JSON.parse(generatePluginJson('1.0.0', 3));
    expect(result.description).toContain(`${BASE_SKILL_COUNT} + 3 addon skills`);
  });
});

describe('dynamic skill count in marketplace.json', () => {
  it('shows base count when no addons', () => {
    const result = JSON.parse(generateMarketplaceJson(0));
    expect(result.plugins[0].description).toContain(`${BASE_SKILL_COUNT} skills`);
    expect(result.plugins[0].description).not.toContain('addon');
  });

  it('shows addon count when addons enabled', () => {
    const result = JSON.parse(generateMarketplaceJson(3));
    expect(result.plugins[0].description).toContain(`${BASE_SKILL_COUNT} + 3 addon skills`);
  });
});

describe('backward compatibility', () => {
  it('works with undefined enabledAddons', () => {
    const targetDir = join(tempDir, 'project');
    mkdirSync(targetDir);

    // Config without enabledAddons field at all
    const config = createConfig();
    delete (config as Partial<ProjectConfig>).enabledAddons;

    expect(() => {
      generatePlugin(targetDir, templatesDir, '1.0.0', config, 'npm');
    }).not.toThrow();

    // Core skills should exist
    const briefPath = join(targetDir, PLUGIN_DIR, PLUGIN_NAME, 'skills', 'brief', 'SKILL.md');
    expect(existsSync(briefPath)).toBe(true);

    // Addon skills should not exist
    const briefingPath = join(targetDir, PLUGIN_DIR, PLUGIN_NAME, 'skills', 'briefing', 'SKILL.md');
    expect(existsSync(briefingPath)).toBe(false);
  });
});

describe('BASE_SKILL_COUNT', () => {
  it('is 19', () => {
    expect(BASE_SKILL_COUNT).toBe(19);
  });
});
