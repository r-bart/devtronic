import { join } from 'node:path';
import { fileExists, readFile, writeFile, ensureDir } from './files.js';

const SETTINGS_FILE = '.claude/settings.json';

interface MarketplaceSource {
  source: string;
  path?: string;
  repo?: string;
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
 * Hook entries devtronic itself wrote into `.claude/settings.json` back when a
 * standalone install carried its own hooks.
 *
 * Once a project moves to the plugin, the plugin supplies these same hooks, and
 * the leftovers in settings.json run *as well*: the same SessionStart prompt
 * fires twice, and the unfiltered `npx eslint --fix` lints every markdown write
 * alongside the plugin's filtered `auto-lint.sh`.
 *
 * Matching is by signature, and deliberately narrow. A hook devtronic did not
 * write is never touched — an unrecognised entry is a hook the user added, and
 * removing it would take work they cannot get back.
 */
const DEVTRONIC_HOOK_SIGNATURES: RegExp[] = [
  // Standalone-era command hooks.
  /^npx eslint --fix --quiet/,
  /^\$\{CLAUDE_PLUGIN_ROOT\}\/scripts\//,
  /^\.claude\/scripts\/(checkpoint|stop-guard|auto-lint)\.sh/,
  /^bash \.claude\/scripts\//,
  // Standalone-era prompt hooks, matched on their opening words.
  /^Quick project orientation:/,
  /^A subagent has finished\./,
  /^If thoughts\/plans\/ contains a recent plan/,
];

interface SettingsHookEntry {
  type?: string;
  command?: string;
  prompt?: string;
  [key: string]: unknown;
}

interface SettingsHookMatcher {
  matcher?: string;
  hooks?: SettingsHookEntry[];
  [key: string]: unknown;
}

function isDevtronicHook(entry: SettingsHookEntry): boolean {
  const body = entry.command ?? entry.prompt;
  if (typeof body !== 'string') return false;
  return DEVTRONIC_HOOK_SIGNATURES.some((re) => re.test(body.trim()));
}

/**
 * Removes devtronic's own inline hooks from a settings object, leaving every
 * other hook untouched. Returns the event names it emptied, for reporting.
 *
 * Pure: takes and returns a plain object so the rule is testable on its own.
 */
export function stripDevtronicHooks(settings: ClaudeSettings): {
  settings: ClaudeSettings;
  removed: string[];
} {
  const hooks = settings.hooks as Record<string, SettingsHookMatcher[]> | undefined;
  if (!hooks || typeof hooks !== 'object') return { settings, removed: [] };

  const removed: string[] = [];
  const kept: Record<string, SettingsHookMatcher[]> = {};

  for (const [event, matchers] of Object.entries(hooks)) {
    if (!Array.isArray(matchers)) {
      kept[event] = matchers;
      continue;
    }

    const survivors: SettingsHookMatcher[] = [];
    let droppedHere = false;

    for (const matcher of matchers) {
      const entries = Array.isArray(matcher.hooks) ? matcher.hooks : [];
      const keptEntries = entries.filter((e) => !isDevtronicHook(e));
      if (keptEntries.length !== entries.length) droppedHere = true;
      // A matcher whose every hook was devtronic's goes with them. One that had
      // none to begin with is the user's empty placeholder, and stays.
      if (keptEntries.length > 0 || entries.length === 0) {
        survivors.push(entries.length === keptEntries.length ? matcher : { ...matcher, hooks: keptEntries });
      }
    }

    if (droppedHere) removed.push(event);
    if (survivors.length > 0) kept[event] = survivors;
  }

  const next: ClaudeSettings = { ...settings };
  if (Object.keys(kept).length > 0) {
    next.hooks = kept;
  } else {
    delete next.hooks;
  }
  return { settings: next, removed };
}

/** Legacy names from before the project was renamed to devtronic */
const LEGACY_PLUGIN_NAMES = ['dev-ai', 'ai-agentic'];
const LEGACY_MARKETPLACE_NAMES = ['dev-ai-local', 'ai-agentic-local', 'devtronic-local'];

/**
 * Registers a local plugin by adding a directory marketplace and enabling the plugin.
 * Cleans up legacy entries from previous project names.
 * Idempotent — safe to call multiple times.
 */
export function registerPlugin(
  targetDir: string,
  pluginName: string,
  marketplaceName: string,
  marketplacePath: string
): void {
  const settings = readClaudeSettings(targetDir);

  // Clean up legacy marketplaces and plugins
  if (settings.extraKnownMarketplaces) {
    for (const legacy of LEGACY_MARKETPLACE_NAMES) {
      delete settings.extraKnownMarketplaces[legacy];
    }
  }
  if (settings.enabledPlugins) {
    for (const key of Object.keys(settings.enabledPlugins)) {
      if (LEGACY_PLUGIN_NAMES.some((lp) => key.startsWith(`${lp}@`))) {
        delete settings.enabledPlugins[key];
      }
    }
  }

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
 * Registers a GitHub-hosted marketplace plugin.
 * Cleans up all legacy entries (local directory + old names).
 * Idempotent — safe to call multiple times.
 */
export function registerGitHubPlugin(
  targetDir: string,
  pluginName: string,
  marketplaceName: string,
  githubRepo: string
): string[] {
  // The plugin now supplies the hooks, so devtronic's own inline copies are
  // duplicates. Anything the user added stays.
  const { settings, removed } = stripDevtronicHooks(readClaudeSettings(targetDir));

  // Clean up legacy marketplaces and plugins (includes old local marketplace)
  if (settings.extraKnownMarketplaces) {
    for (const legacy of LEGACY_MARKETPLACE_NAMES) {
      delete settings.extraKnownMarketplaces[legacy];
    }
  }
  if (settings.enabledPlugins) {
    for (const key of Object.keys(settings.enabledPlugins)) {
      if (LEGACY_PLUGIN_NAMES.some((lp) => key.startsWith(`${lp}@`))) {
        delete settings.enabledPlugins[key];
      }
      // Also clean up the old local plugin key
      if (key === `${pluginName}@devtronic-local`) {
        delete settings.enabledPlugins[key];
      }
    }
  }

  // Add GitHub marketplace
  if (!settings.extraKnownMarketplaces) {
    settings.extraKnownMarketplaces = {};
  }
  settings.extraKnownMarketplaces[marketplaceName] = {
    source: { source: 'github', repo: githubRepo },
  };

  // Enable plugin
  if (!settings.enabledPlugins) {
    settings.enabledPlugins = {};
  }
  const pluginKey = `${pluginName}@${marketplaceName}`;
  if (settings.enabledPlugins[pluginKey] === undefined) {
    settings.enabledPlugins[pluginKey] = true;
  }

  writeClaudeSettings(targetDir, settings);
  return removed;
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
