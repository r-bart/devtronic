import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  generatePlugin,
  generatePluginJson,
  generateMarketplaceJson,
  PLUGIN_NAME,
  MARKETPLACE_NAME,
  PLUGIN_DIR,
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
  tempDir = mkdtempSync(join(tmpdir(), 'agentic-plugin-test-'));

  // Create a minimal template structure mimicking templates/claude-code/.claude/
  templatesDir = join(tempDir, '_templates');
  const claudeDir = join(templatesDir, 'claude-code', '.claude');

  // Skills
  const skillsDir = join(claudeDir, 'skills');
  mkdirSync(join(skillsDir, 'brief'), { recursive: true });
  writeFileSync(join(skillsDir, 'brief', 'SKILL.md'), '# Brief skill');

  mkdirSync(join(skillsDir, 'audit'), { recursive: true });
  writeFileSync(join(skillsDir, 'audit', 'SKILL.md'), '# Audit skill');
  writeFileSync(join(skillsDir, 'audit', 'report-template.md'), '# Report template');

  // Agents
  const agentsDir = join(claudeDir, 'agents');
  mkdirSync(agentsDir, { recursive: true });
  writeFileSync(join(agentsDir, 'code-reviewer.md'), '# Code reviewer');
  writeFileSync(join(agentsDir, 'quality-runner.md'), '# Quality runner');

  // Rules (should NOT be copied into the plugin)
  const rulesDir = join(claudeDir, 'rules');
  mkdirSync(rulesDir, { recursive: true });
  writeFileSync(join(rulesDir, 'architecture.md'), '# Architecture rules');
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

describe('generatePluginJson', () => {
  it('returns valid JSON', () => {
    expect(() => JSON.parse(generatePluginJson('1.8.0'))).not.toThrow();
  });

  it('uses devtronic as plugin name', () => {
    const result = JSON.parse(generatePluginJson('1.8.0'));
    expect(result.name).toBe('devtronic');
  });

  it('includes the CLI version', () => {
    const result = JSON.parse(generatePluginJson('2.0.0'));
    expect(result.version).toBe('2.0.0');
  });

  it('includes required metadata fields', () => {
    const result = JSON.parse(generatePluginJson('1.0.0'));
    expect(result.description).toBeTruthy();
    expect(result.author).toBeTruthy();
    expect(result.license).toBe('MIT');
    expect(result.keywords).toBeInstanceOf(Array);
  });
});

describe('generateMarketplaceJson', () => {
  it('returns valid JSON', () => {
    expect(() => JSON.parse(generateMarketplaceJson())).not.toThrow();
  });

  it('uses devtronic-local as marketplace name', () => {
    const result = JSON.parse(generateMarketplaceJson());
    expect(result.name).toBe('devtronic-local');
  });

  it('references the devtronic plugin with relative path', () => {
    const result = JSON.parse(generateMarketplaceJson());
    expect(result.plugins).toHaveLength(1);
    expect(result.plugins[0].name).toBe('devtronic');
    expect(result.plugins[0].source).toBe('./devtronic');
  });
});

describe('generatePlugin', () => {
  it('creates marketplace.json at .claude-plugins/.claude-plugin/', () => {
    const targetDir = join(tempDir, 'project');
    mkdirSync(targetDir);

    generatePlugin(targetDir, templatesDir, '1.8.0', createConfig(), 'npm');

    const marketplacePath = join(targetDir, PLUGIN_DIR, '.claude-plugin', 'marketplace.json');
    expect(existsSync(marketplacePath)).toBe(true);

    const content = JSON.parse(readFileSync(marketplacePath, 'utf-8'));
    expect(content.name).toBe(MARKETPLACE_NAME);
  });

  it('creates plugin.json at .claude-plugins/devtronic/.claude-plugin/', () => {
    const targetDir = join(tempDir, 'project');
    mkdirSync(targetDir);

    generatePlugin(targetDir, templatesDir, '1.8.0', createConfig(), 'npm');

    const pluginJsonPath = join(
      targetDir,
      PLUGIN_DIR,
      PLUGIN_NAME,
      '.claude-plugin',
      'plugin.json'
    );
    expect(existsSync(pluginJsonPath)).toBe(true);

    const content = JSON.parse(readFileSync(pluginJsonPath, 'utf-8'));
    expect(content.name).toBe(PLUGIN_NAME);
    expect(content.version).toBe('1.8.0');
  });

  it('copies skills from template into plugin', () => {
    const targetDir = join(tempDir, 'project');
    mkdirSync(targetDir);

    generatePlugin(targetDir, templatesDir, '1.8.0', createConfig(), 'npm');

    // Single-file skill
    const briefPath = join(targetDir, PLUGIN_DIR, PLUGIN_NAME, 'skills', 'brief', 'SKILL.md');
    expect(existsSync(briefPath)).toBe(true);
    expect(readFileSync(briefPath, 'utf-8')).toBe('# Brief skill');

    // Directory skill with supporting file
    const auditPath = join(targetDir, PLUGIN_DIR, PLUGIN_NAME, 'skills', 'audit', 'SKILL.md');
    expect(existsSync(auditPath)).toBe(true);

    const reportPath = join(
      targetDir,
      PLUGIN_DIR,
      PLUGIN_NAME,
      'skills',
      'audit',
      'report-template.md'
    );
    expect(existsSync(reportPath)).toBe(true);
  });

  it('copies agents from template into plugin', () => {
    const targetDir = join(tempDir, 'project');
    mkdirSync(targetDir);

    generatePlugin(targetDir, templatesDir, '1.8.0', createConfig(), 'npm');

    const reviewerPath = join(
      targetDir,
      PLUGIN_DIR,
      PLUGIN_NAME,
      'agents',
      'code-reviewer.md'
    );
    expect(existsSync(reviewerPath)).toBe(true);
    expect(readFileSync(reviewerPath, 'utf-8')).toBe('# Code reviewer');

    const runnerPath = join(
      targetDir,
      PLUGIN_DIR,
      PLUGIN_NAME,
      'agents',
      'quality-runner.md'
    );
    expect(existsSync(runnerPath)).toBe(true);
  });

  it('does NOT copy rules into plugin', () => {
    const targetDir = join(tempDir, 'project');
    mkdirSync(targetDir);

    generatePlugin(targetDir, templatesDir, '1.8.0', createConfig(), 'npm');

    const rulesPath = join(targetDir, PLUGIN_DIR, PLUGIN_NAME, 'rules');
    expect(existsSync(rulesPath)).toBe(false);
  });

  it('generates hooks.json inside the plugin', () => {
    const targetDir = join(tempDir, 'project');
    mkdirSync(targetDir);

    generatePlugin(targetDir, templatesDir, '1.8.0', createConfig(), 'npm');

    const hooksPath = join(targetDir, PLUGIN_DIR, PLUGIN_NAME, 'hooks', 'hooks.json');
    expect(existsSync(hooksPath)).toBe(true);

    const content = JSON.parse(readFileSync(hooksPath, 'utf-8'));
    expect(content.hooks).toBeTruthy();
    expect(Object.keys(content.hooks)).toHaveLength(5);
  });

  it('generates checkpoint.sh script', () => {
    const targetDir = join(tempDir, 'project');
    mkdirSync(targetDir);

    generatePlugin(targetDir, templatesDir, '1.8.0', createConfig(), 'npm');

    const scriptPath = join(targetDir, PLUGIN_DIR, PLUGIN_NAME, 'scripts', 'checkpoint.sh');
    expect(existsSync(scriptPath)).toBe(true);

    const content = readFileSync(scriptPath, 'utf-8');
    expect(content).toContain('#!/bin/bash');
  });

  it('generates stop-guard.sh script with quality command', () => {
    const targetDir = join(tempDir, 'project');
    mkdirSync(targetDir);

    const config = createConfig({ qualityCommand: 'pnpm typecheck && pnpm lint' });
    generatePlugin(targetDir, templatesDir, '1.8.0', config, 'pnpm');

    const scriptPath = join(targetDir, PLUGIN_DIR, PLUGIN_NAME, 'scripts', 'stop-guard.sh');
    expect(existsSync(scriptPath)).toBe(true);

    const content = readFileSync(scriptPath, 'utf-8');
    expect(content).toContain('#!/bin/bash');
    expect(content).toContain('stop_hook_active');
    expect(content).toContain('pnpm typecheck && pnpm lint');
  });

  it('returns manifest entries for all generated files', () => {
    const targetDir = join(tempDir, 'project');
    mkdirSync(targetDir);

    const result = generatePlugin(targetDir, templatesDir, '1.8.0', createConfig(), 'npm');

    // marketplace.json + plugin.json + 3 skills (brief/SKILL.md, audit/SKILL.md, audit/report-template.md)
    // + 2 agents + hooks.json + checkpoint.sh + stop-guard.sh = 10 files
    expect(Object.keys(result.files)).toHaveLength(10);

    // Every entry should have checksum and originalChecksum
    for (const entry of Object.values(result.files)) {
      expect(entry.checksum).toBeTruthy();
      expect(entry.originalChecksum).toBe(entry.checksum);
      expect(entry.modified).toBe(false);
    }
  });

  it('returns the correct pluginPath', () => {
    const targetDir = join(tempDir, 'project');
    mkdirSync(targetDir);

    const result = generatePlugin(targetDir, templatesDir, '1.8.0', createConfig(), 'npm');

    expect(result.pluginPath).toBe(join(PLUGIN_DIR, PLUGIN_NAME));
  });

  it('personalizes hooks by package manager', () => {
    const targetDir = join(tempDir, 'project');
    mkdirSync(targetDir);

    generatePlugin(targetDir, templatesDir, '1.8.0', createConfig(), 'pnpm');

    const hooksPath = join(targetDir, PLUGIN_DIR, PLUGIN_NAME, 'hooks', 'hooks.json');
    const content = JSON.parse(readFileSync(hooksPath, 'utf-8'));
    const lintHook = content.hooks.PostToolUse[0].hooks[0];

    expect(lintHook.command).toContain('pnpm');
  });
});

describe('constants', () => {
  it('exports expected plugin name', () => {
    expect(PLUGIN_NAME).toBe('devtronic');
  });

  it('exports expected marketplace name', () => {
    expect(MARKETPLACE_NAME).toBe('devtronic-local');
  });

  it('exports expected plugin directory', () => {
    expect(PLUGIN_DIR).toBe('.claude-plugins');
  });
});
