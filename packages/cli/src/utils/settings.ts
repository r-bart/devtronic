import { join } from 'node:path';
import { fileExists, readFile, writeFile, ensureDir } from './files.js';

const SETTINGS_FILE = '.claude/settings.json';

interface MarketplaceSource {
  source: string;
  path?: string;
  package?: string;
}

export interface ClaudeSettings {
  extraKnownMarketplaces?: Record<string, { source: MarketplaceSource }>;
  enabledPlugins?: Record<string, boolean>;
  [key: string]: unknown;
}

/**
 * Reads .claude/settings.json from the target directory.
 * Returns an empty object if the file doesn't exist or is invalid.
 */
export function readClaudeSettings(targetDir: string): ClaudeSettings {
  const settingsPath = join(targetDir, SETTINGS_FILE);
  if (!fileExists(settingsPath)) return {};
  try {
    return JSON.parse(readFile(settingsPath));
  } catch {
    return {};
  }
}

/**
 * Writes .claude/settings.json, creating the .claude/ directory if needed.
 * Preserves all existing keys — callers should read-modify-write.
 */
export function writeClaudeSettings(targetDir: string, settings: ClaudeSettings): void {
  const settingsPath = join(targetDir, SETTINGS_FILE);
  ensureDir(join(targetDir, '.claude'));
  writeFile(settingsPath, JSON.stringify(settings, null, 2));
}

/**
 * Registers a local plugin by adding a directory marketplace and enabling the plugin.
 * Idempotent — safe to call multiple times.
 */
export function registerPlugin(
  targetDir: string,
  pluginName: string,
  marketplaceName: string,
  marketplacePath: string
): void {
  const settings = readClaudeSettings(targetDir);

  // Add marketplace if not present
  if (!settings.extraKnownMarketplaces) {
    settings.extraKnownMarketplaces = {};
  }
  if (!settings.extraKnownMarketplaces[marketplaceName]) {
    settings.extraKnownMarketplaces[marketplaceName] = {
      source: { source: 'directory', path: marketplacePath },
    };
  }

  // Enable plugin if not present
  if (!settings.enabledPlugins) {
    settings.enabledPlugins = {};
  }
  const pluginKey = `${pluginName}@${marketplaceName}`;
  if (settings.enabledPlugins[pluginKey] === undefined) {
    settings.enabledPlugins[pluginKey] = true;
  }

  writeClaudeSettings(targetDir, settings);
}

/**
 * Removes a plugin from enabledPlugins. Does not remove the marketplace.
 */
export function unregisterPlugin(
  targetDir: string,
  pluginName: string,
  marketplaceName: string
): void {
  const settings = readClaudeSettings(targetDir);
  const pluginKey = `${pluginName}@${marketplaceName}`;

  if (settings.enabledPlugins) {
    delete settings.enabledPlugins[pluginKey];
  }

  writeClaudeSettings(targetDir, settings);
}
