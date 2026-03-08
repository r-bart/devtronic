import { existsSync, rmSync, readdirSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import * as p from '@clack/prompts';
import chalk from 'chalk';
import type { UninstallOptions } from '../types.js';
import { fileExists, readManifest, MANIFEST_DIR } from '../utils/files.js';
import { unregisterPlugin, readClaudeSettings, writeClaudeSettings } from '../utils/settings.js';
import { PLUGIN_NAME, MARKETPLACE_NAME, PLUGIN_DIR, GITHUB_MARKETPLACE_NAME } from '../generators/plugin.js';
import { ensureInteractive } from '../utils/tty.js';
import { introTitle, symbols } from '../utils/ui.js';

/** Top-level files that devtronic may have created */
const DEVTRONIC_FILES = ['CLAUDE.md', 'AGENTS.md'];

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
  let removeThoughts = false;

  if (hasClaudeMd || hasAgentsMd || hasThoughts) {
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

  // 3. Remove managed files (rules, templates — excluding CLAUDE.md, AGENTS.md, thoughts)
  for (const file of existingFiles) {
    // Skip files handled separately
    if (DEVTRONIC_FILES.includes(file)) continue;
    if (file.startsWith('thoughts/')) continue;
    // Skip plugin files (already removed above)
    if (file.startsWith(PLUGIN_DIR + '/')) continue;

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

  // 4. Remove CLAUDE.md
  if (hasClaudeMd) {
    if (removeClaudeMd) {
      try {
        rmSync(join(targetDir, 'CLAUDE.md'), { force: true });
        removed.push('CLAUDE.md');
      } catch (err) {
        errors.push(`Failed to remove CLAUDE.md: ${err instanceof Error ? err.message : String(err)}`);
      }
    } else {
      kept.push('CLAUDE.md');
    }
  }

  // 5. Remove AGENTS.md
  if (hasAgentsMd) {
    if (removeAgentsMd) {
      try {
        rmSync(join(targetDir, 'AGENTS.md'), { force: true });
        removed.push('AGENTS.md');
      } catch (err) {
        errors.push(`Failed to remove AGENTS.md: ${err instanceof Error ? err.message : String(err)}`);
      }
    } else {
      kept.push('AGENTS.md');
    }
  }

  // 6. Remove thoughts/ directory
  if (hasThoughts) {
    if (removeThoughts) {
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
