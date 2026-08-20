import { existsSync, rmSync, readdirSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import * as p from '@clack/prompts';
import chalk from 'chalk';
import type { Manifest, UninstallOptions } from '../types.js';
import { fileExists, readManifest, MANIFEST_DIR } from '../utils/files.js';
import { unregisterPlugin, readClaudeSettings, writeClaudeSettings } from '../utils/settings.js';
import { PLUGIN_NAME, MARKETPLACE_NAME, PLUGIN_DIR, GITHUB_MARKETPLACE_NAME } from '../generators/plugin.js';
import { ensureInteractive } from '../utils/tty.js';
import { introTitle, symbols } from '../utils/ui.js';

/**
 * Files devtronic generates but the user is expected to edit. None of them is
 * ever deleted without an explicit yes, so they are held out of the bulk
 * managed-file sweep and offered one by one instead.
 *
 * `loop.manifest.yaml` belongs here for the same reason as `CLAUDE.md`: it is
 * the project's own convergence policy, hand-tuned, and impossible to recover.
 */
export const USER_AUTHORED_FILES = ['CLAUDE.md', 'AGENTS.md', 'loop.manifest.yaml'] as const;

export type UserAuthoredFile = (typeof USER_AUTHORED_FILES)[number];

export interface UninstallInventory {
  manifest: Pick<Manifest, 'files' | 'installMode'>;
  /** Whether a manifest-tracked path still exists in the project */
  existsInProject: (relativePath: string) => boolean;
  /** Whether the local plugin directory is on disk */
  hasPluginDir: boolean;
  /** Whether the thoughts/ directory is on disk */
  hasThoughts: boolean;
}

/** What the user answered for each file that may hold their own work */
export type UserContentChoices = Partial<Record<UserAuthoredFile | 'thoughts', boolean>>;

export interface UninstallPlan {
  /** Managed files deleted outright — templates and rules, nothing hand-written */
  managedFiles: string[];
  /** Files present on disk that hold the user's own work, and the verdict on each */
  userFiles: Array<{ path: string; remove: boolean }>;
  /** Manifest entries whose file is already gone */
  missingFiles: string[];
  removeThoughts: boolean;
  removePluginDir: boolean;
  unregisterPlugin: boolean;
  unregisterMarketplace: boolean;
}

/**
 * Decides what an uninstall touches, before anything is deleted.
 *
 * The split that matters: a *managed* file is one devtronic wrote and owns, and
 * it goes without asking. A *user-authored* file is one devtronic seeded and the
 * user then made theirs, and it only goes on an explicit yes. Getting a file
 * into the wrong bucket destroys work that cannot be recovered, which is why
 * this is a pure function with tests rather than a loop inside a prompt flow.
 */
export function planUninstall(
  inventory: UninstallInventory,
  choices: UserContentChoices
): UninstallPlan {
  const { manifest, existsInProject, hasPluginDir, hasThoughts } = inventory;
  const tracked = Object.keys(manifest.files);
  const present = tracked.filter((f) => existsInProject(f));

  const isUserAuthored = (path: string): path is UserAuthoredFile =>
    (USER_AUTHORED_FILES as readonly string[]).includes(path);

  const managedFiles = present.filter(
    (f) =>
      !isUserAuthored(f) &&
      // thoughts/ is handled as a whole directory, on its own question
      !f.startsWith('thoughts/') &&
      // plugin files go with the plugin directory
      !f.startsWith(PLUGIN_DIR + '/')
  );

  // Offer every user-authored file that is actually on disk, tracked or not:
  // an older install may predate the manifest entry.
  const userFiles = USER_AUTHORED_FILES.filter((f) => existsInProject(f)).map((path) => ({
    path,
    remove: choices[path] === true,
  }));

  return {
    managedFiles,
    userFiles,
    missingFiles: tracked.filter((f) => !existsInProject(f)),
    removeThoughts: hasThoughts && choices.thoughts === true,
    removePluginDir: hasPluginDir,
    unregisterPlugin: manifest.installMode === 'plugin',
    unregisterMarketplace: manifest.installMode === 'marketplace',
  };
}

export async function uninstallCommand(options: UninstallOptions): Promise<void> {
  ensureInteractive('uninstall');

  const targetDir = resolve(options.path || '.');

  p.intro(introTitle('Uninstall'));

  // ── Check for manifest ──────────────────────────────────────────────
  const manifest = readManifest(targetDir);

  if (!manifest) {
    p.log.warn('No devtronic installation found in this directory.');
    p.log.info(
      `If you installed in a different directory, use ${chalk.cyan('devtronic uninstall --path <dir>')}`
    );
    p.outro('Nothing to uninstall');
    return;
  }

  // ── Inventory what exists ───────────────────────────────────────────
  const managedFiles = Object.keys(manifest.files);
  const existingFiles = managedFiles.filter((f) => fileExists(join(targetDir, f)));
  const missingFiles = managedFiles.filter((f) => !fileExists(join(targetDir, f)));

  const hasPlugin =
    manifest.installMode === 'plugin' &&
    existsSync(join(targetDir, PLUGIN_DIR, PLUGIN_NAME));

  const hasMarketplace = manifest.installMode === 'marketplace';

  const hasThoughts = existsSync(join(targetDir, 'thoughts'));
  const hasClaudeMd = fileExists(join(targetDir, 'CLAUDE.md'));
  const hasAgentsMd = fileExists(join(targetDir, 'AGENTS.md'));
  const hasLoopManifest = fileExists(join(targetDir, 'loop.manifest.yaml'));

  // ── Show what will be removed ───────────────────────────────────────
  p.log.info(`Installation found: v${manifest.version} (${manifest.implantedAt})`);
  p.log.info(`IDEs: ${manifest.selectedIDEs.join(', ')}`);
  p.log.info(`Mode: ${manifest.installMode || 'standalone'}`);

  const removalLines: string[] = [];

  if (hasMarketplace) {
    removalLines.push(`  ${symbols.fail} GitHub marketplace registration (${chalk.cyan(GITHUB_MARKETPLACE_NAME)})`);
  }

  if (hasPlugin) {
    removalLines.push(`  ${symbols.fail} Plugin ${chalk.cyan(PLUGIN_NAME)} (${PLUGIN_DIR}/${PLUGIN_NAME}/)`);
  }

  const nonPluginFiles = existingFiles.filter((f) => !f.startsWith(PLUGIN_DIR + '/'));
  if (nonPluginFiles.length > 0) {
    removalLines.push(`  ${symbols.fail} ${nonPluginFiles.length} managed files (rules, templates)`);
  }

  removalLines.push(`  ${symbols.fail} Installation manifest (${MANIFEST_DIR}/)`);

  if (hasClaudeMd) {
    removalLines.push(`  ${symbols.warn} CLAUDE.md ${chalk.dim('(may contain your customizations)')}`);
  }

  if (hasAgentsMd) {
    removalLines.push(`  ${symbols.warn} AGENTS.md`);
  }

  if (hasLoopManifest) {
    removalLines.push(`  ${symbols.warn} loop.manifest.yaml ${chalk.dim('(your convergence policy)')}`);
  }

  if (hasThoughts) {
    removalLines.push(`  ${symbols.warn} thoughts/ directory ${chalk.dim('(checkpoints, notes, specs)')}`);
  }

  if (missingFiles.length > 0) {
    removalLines.push(
      `  ${symbols.info} ${missingFiles.length} files already removed`
    );
  }

  p.note(removalLines.join('\n'), 'Will be removed');

  // ── Confirm ─────────────────────────────────────────────────────────
  const confirm = await p.confirm({
    message: 'Remove devtronic from this project? This cannot be undone.',
    initialValue: false,
  });

  if (p.isCancel(confirm) || !confirm) {
    p.cancel('Uninstall cancelled. No files were changed.');
    return;
  }

  // ── Ask about user-generated content ────────────────────────────────
  let removeClaudeMd = false;
  let removeAgentsMd = false;
  let removeLoopManifest = false;
  let removeThoughts = false;

  if (hasClaudeMd || hasAgentsMd || hasLoopManifest || hasThoughts) {
    p.log.step('Some files may contain your own work. Keep or remove?');

    if (hasClaudeMd) {
      const confirmClaude = await p.confirm({
        message: 'Remove CLAUDE.md? (may contain self-improvements and custom rules)',
        initialValue: false,
      });
      // Cancel on individual questions = keep the file, don't abort uninstall
      removeClaudeMd = !p.isCancel(confirmClaude) && confirmClaude;
    }

    if (hasAgentsMd) {
      const confirmAgents = await p.confirm({
        message: 'Remove AGENTS.md?',
        initialValue: true,
      });
      removeAgentsMd = !p.isCancel(confirmAgents) && confirmAgents;
    }

    if (hasLoopManifest) {
      const confirmLoop = await p.confirm({
        message: 'Remove loop.manifest.yaml? (your gates, phases and DoD policy)',
        initialValue: false,
      });
      removeLoopManifest = !p.isCancel(confirmLoop) && confirmLoop;
    }

    if (hasThoughts) {
      const confirmThoughts = await p.confirm({
        message: 'Remove thoughts/ directory? (checkpoints, specs, plans, notes)',
        initialValue: false,
      });
      removeThoughts = !p.isCancel(confirmThoughts) && confirmThoughts;
    }
  }

  // ── Remove ──────────────────────────────────────────────────────────
  const spinner = p.spinner();
  spinner.start('Removing devtronic...');

  const removed: string[] = [];
  const kept: string[] = [];
  const errors: string[] = [];

  // 0. Unregister GitHub marketplace from .claude/settings.json
  if (hasMarketplace) {
    try {
      const settings = readClaudeSettings(targetDir);
      if (settings.extraKnownMarketplaces?.[GITHUB_MARKETPLACE_NAME]) {
        delete settings.extraKnownMarketplaces[GITHUB_MARKETPLACE_NAME];
        if (Object.keys(settings.extraKnownMarketplaces).length === 0) {
          delete settings.extraKnownMarketplaces;
        }
      }
      if (settings.enabledPlugins) {
        delete settings.enabledPlugins[`${PLUGIN_NAME}@${GITHUB_MARKETPLACE_NAME}`];
        if (Object.keys(settings.enabledPlugins).length === 0) {
          delete settings.enabledPlugins;
        }
      }
      writeClaudeSettings(targetDir, settings);
      removed.push('GitHub marketplace unregistered from .claude/settings.json');
    } catch (err) {
      errors.push(`Failed to unregister marketplace: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const plan = planUninstall(
    {
      manifest,
      existsInProject: (relativePath) => fileExists(join(targetDir, relativePath)),
      hasPluginDir: hasPlugin,
      hasThoughts,
    },
    {
      'CLAUDE.md': removeClaudeMd,
      'AGENTS.md': removeAgentsMd,
      'loop.manifest.yaml': removeLoopManifest,
      thoughts: removeThoughts,
    }
  );

  // 1. Unregister plugin from .claude/settings.json
  if (hasPlugin) {
    try {
      unregisterPlugin(targetDir, PLUGIN_NAME, MARKETPLACE_NAME);

      // Also remove the marketplace entry
      const settings = readClaudeSettings(targetDir);
      if (settings.extraKnownMarketplaces?.[MARKETPLACE_NAME]) {
        delete settings.extraKnownMarketplaces[MARKETPLACE_NAME];
        if (Object.keys(settings.extraKnownMarketplaces).length === 0) {
          delete settings.extraKnownMarketplaces;
        }
        writeClaudeSettings(targetDir, settings);
      }

      removed.push('Plugin unregistered from .claude/settings.json');
    } catch (err) {
      errors.push(`Failed to unregister plugin: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // 2. Remove plugin directory
  if (hasPlugin) {
    try {
      rmSync(join(targetDir, PLUGIN_DIR, PLUGIN_NAME), { recursive: true, force: true });
      removed.push(`${PLUGIN_DIR}/${PLUGIN_NAME}/`);

      // Remove .claude-plugin marketplace descriptor
      const marketplaceDescDir = join(targetDir, PLUGIN_DIR, '.claude-plugin');
      if (existsSync(marketplaceDescDir)) {
        rmSync(marketplaceDescDir, { recursive: true, force: true });
        removed.push(`${PLUGIN_DIR}/.claude-plugin/`);
      }

      // Remove .claude-plugins/ if empty
      const pluginsDir = join(targetDir, PLUGIN_DIR);
      if (existsSync(pluginsDir)) {
        const remaining = readdirSafe(pluginsDir);
        if (remaining.length === 0) {
          rmSync(pluginsDir, { recursive: true, force: true });
          removed.push(`${PLUGIN_DIR}/ (empty)`);
        }
      }
    } catch (err) {
      errors.push(`Failed to remove plugin: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // 3. Remove managed files (rules, templates — never a user-authored file)
  for (const file of plan.managedFiles) {
    try {
      const filePath = join(targetDir, file);
      if (existsSync(filePath)) {
        rmSync(filePath, { force: true });
        removed.push(file);

        // Clean up empty parent directories
        cleanEmptyParents(targetDir, dirname(file));
      }
    } catch (err) {
      errors.push(`Failed to remove ${file}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // 4. Remove the user-authored files the human said yes to
  for (const { path: file, remove } of plan.userFiles) {
    if (!remove) {
      kept.push(file);
      continue;
    }
    try {
      rmSync(join(targetDir, file), { force: true });
      removed.push(file);
    } catch (err) {
      errors.push(`Failed to remove ${file}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // 5. Remove thoughts/ directory
  if (hasThoughts) {
    if (plan.removeThoughts) {
      try {
        rmSync(join(targetDir, 'thoughts'), { recursive: true, force: true });
        removed.push('thoughts/');
      } catch (err) {
        errors.push(`Failed to remove thoughts/: ${err instanceof Error ? err.message : String(err)}`);
      }
    } else {
      kept.push('thoughts/');
    }
  }

  // 7. Remove manifest
  try {
    const manifestDir = join(targetDir, MANIFEST_DIR);
    if (existsSync(manifestDir)) {
      rmSync(manifestDir, { recursive: true, force: true });
      removed.push(`${MANIFEST_DIR}/`);
    }
  } catch (err) {
    errors.push(`Failed to remove manifest: ${err instanceof Error ? err.message : String(err)}`);
  }

  spinner.stop('Removal complete');

  // ── Summary ─────────────────────────────────────────────────────────
  if (removed.length > 0) {
    p.note(
      removed.map((f) => `  ${symbols.fail} ${f}`).join('\n'),
      'Removed'
    );
  }

  if (kept.length > 0) {
    p.note(
      kept.map((f) => `  ${symbols.pass} ${f} ${chalk.dim('(kept)')}`).join('\n'),
      'Preserved'
    );
  }

  if (errors.length > 0) {
    p.note(
      errors.map((e) => `  ${symbols.warn} ${e}`).join('\n'),
      'Errors'
    );
  }

  // ── Farewell ────────────────────────────────────────────────────────
  if (errors.length === 0) {
    p.note(
      [
        `  Thanks for using devtronic.`,
        `  If something didn't work as expected, we'd love to hear about it:`,
        `  ${chalk.cyan('https://github.com/r-bart/devtronic/issues')}`,
        ``,
        `  To reinstall anytime: ${chalk.cyan('npx devtronic init')}`,
      ].join('\n'),
      'Until next time'
    );
    p.outro(chalk.green('Clean uninstall complete. See you around!'));
  } else {
    p.log.warn('Some files could not be removed. You may need to delete them manually.');
    p.log.info(`To reinstall: ${chalk.cyan('npx devtronic init')}`);
    p.outro(chalk.yellow('Partial uninstall complete'));
  }
}

/**
 * Removes empty parent directories up to (but not including) the target dir.
 */
function cleanEmptyParents(targetDir: string, relDir: string): void {
  if (!relDir || relDir === '.') return;

  const absDir = join(targetDir, relDir);
  if (!existsSync(absDir)) return;

  const entries = readdirSafe(absDir);
  if (entries.length === 0) {
    try {
      rmSync(absDir, { recursive: true, force: true });
      // Recurse upward
      cleanEmptyParents(targetDir, dirname(relDir));
    } catch {
      // Ignore — directory may be in use
    }
  }
}

/**
 * Safe readdir that returns [] on error.
 */
function readdirSafe(dir: string): string[] {
  try {
    return readdirSync(dir) as string[];
  } catch {
    return [];
  }
}
