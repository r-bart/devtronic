import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export interface AddonConfigEntry {
  version: string;
  files: string[];
  checksums?: Record<string, string>;
}

export interface AddonConfig {
  agents: string[];
  installed: Record<string, AddonConfigEntry>;
}

const CONFIG_FILE = 'devtronic.json';

/**
 * Reads the addon config from devtronic.json.
 * Returns a default config if file doesn't exist.
 */
export function readAddonConfig(targetDir: string): AddonConfig {
  const configPath = join(targetDir, CONFIG_FILE);
  if (!existsSync(configPath)) {
    return { agents: ['claude'], installed: {} };
  }
  const raw = JSON.parse(readFileSync(configPath, 'utf-8'));
  const addons = raw.addons ?? raw;
  return {
    agents: addons.agents ?? ['claude'],
    installed: addons.installed ?? {},
  };
}

/**
 * Writes the full addon config to devtronic.json.
 */
export function writeAddonConfig(targetDir: string, config: AddonConfig): void {
  const configPath = join(targetDir, CONFIG_FILE);
  const payload = { addons: config };
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
