import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync } from 'node:fs';
import { join, dirname } from 'node:path';
import type { AddonConfig, AddonConfigEntry, DevtronicMode, AddonName } from '../types.js';
import { getAvailableAddons, getAddonManifest } from '../addons/registry.js';

export type { AddonConfig, AddonConfigEntry };

// Config lives in .claude/devtronic.json (Claude Code-specific)
const CONFIG_DIR = '.claude';
const CONFIG_FILE = 'devtronic.json';

function getConfigPath(targetDir: string): string {
  return join(targetDir, CONFIG_DIR, CONFIG_FILE);
}

// Legacy path for auto-migration (old: devtronic.json at project root)
function getLegacyConfigPath(targetDir: string): string {
  return join(targetDir, CONFIG_FILE);
}

/**
 * Reads the addon config from .claude/devtronic.json.
 * Auto-migrates from root devtronic.json if new path doesn't exist.
 * Returns a default config if neither file exists.
 */
export function readAddonConfig(targetDir: string): AddonConfig {
  const configPath = getConfigPath(targetDir);
  const legacyPath = getLegacyConfigPath(targetDir);

  // Auto-migrate: if new path absent but old root path exists, move it
  if (!existsSync(configPath) && existsSync(legacyPath)) {
    mkdirSync(dirname(configPath), { recursive: true });
    renameSync(legacyPath, configPath);
  }

  if (!existsSync(configPath)) {
    return { agents: ['claude'], installed: {} };
  }

  const raw = JSON.parse(readFileSync(configPath, 'utf-8'));
  const data = raw.addons ?? raw;
  return {
    version: 1,
    mode: data.mode,
    agents: data.agents ?? ['claude'],
    installed: data.installed ?? {},
  };
}

/**
 * Writes the full addon config to .claude/devtronic.json.
 */
export function writeAddonConfig(targetDir: string, config: AddonConfig): void {
  const configPath = getConfigPath(targetDir);
  mkdirSync(dirname(configPath), { recursive: true });
  const payload = { version: 1, ...config };
  writeFileSync(configPath, JSON.stringify(payload, null, 2) + '\n');
}

/**
 * Adds or updates a single addon entry in the config.
 */
export function writeAddonToConfig(
  targetDir: string,
  name: string,
  entry: AddonConfigEntry
): void {
  const config = readAddonConfig(targetDir);
  config.installed[name] = entry;
  writeAddonConfig(targetDir, config);
}

/**
 * Removes an addon entry from the config.
 */
export function removeAddonFromConfig(targetDir: string, name: string): void {
  const config = readAddonConfig(targetDir);
  delete config.installed[name];
  writeAddonConfig(targetDir, config);
}

/**
 * Reads the current execution mode from config.
 * Returns 'hitl' as the default if not configured.
 */
export function readMode(targetDir: string): DevtronicMode {
  const config = readAddonConfig(targetDir);
  return config.mode ?? 'hitl';
}

/**
 * Writes the execution mode to .claude/devtronic.json.
 * Preserves all other config fields.
 */
export function writeMode(targetDir: string, mode: DevtronicMode): void {
  const config = readAddonConfig(targetDir);
  config.mode = mode;
  writeAddonConfig(targetDir, config);
}

/**
 * Detects addon files present in .claude/ that are not registered in config.installed.
 * Used by `devtronic update` to auto-migrate orphaned addon installations.
 */
export function detectOrphanedAddonFiles(targetDir: string): string[] {
  const config = readAddonConfig(targetDir);
  const orphaned: string[] = [];

  for (const addon of getAvailableAddons()) {
    if (config.installed[addon.name]) continue; // already registered
    // Check if skill directory exists
    const skillDir = join(targetDir, '.claude', 'skills', addon.name);
    if (existsSync(skillDir)) {
      orphaned.push(addon.name);
    }
  }

  return orphaned;
}

/**
 * Registers an addon in config.installed without copying any files.
 * Used to register orphaned addon files discovered during migration.
 */
export function registerAddonInConfig(targetDir: string, addonName: string): void {
  const manifest = getAddonManifest(addonName as AddonName);
  const fileList: string[] = [
    ...(manifest.files.skills ?? []).map((s: string) => `skills/${s}`),
    ...(manifest.files.agents ?? []).map((a: string) => `agents/${a}.md`),
    ...(manifest.files.rules ?? []).map((r: string) => `rules/${r}`),
  ];
  writeAddonToConfig(targetDir, addonName, {
    version: manifest.version,
    files: fileList,
  });
}
