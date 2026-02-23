import { join, dirname } from 'node:path';
import type { ProjectConfig, PackageManager, ManifestFile } from '../types.js';
import {
  ensureDir,
  writeFile,
  getAllFilesRecursive,
  readFile,
  createManifestEntry,
} from '../utils/files.js';
import { generateHooks, generateCheckpointScript, generateStopGuardScript } from './hooks.js';

export const PLUGIN_NAME = 'rbartronic';
export const MARKETPLACE_NAME = 'rbartronic-local';
export const PLUGIN_DIR = '.claude-plugins';

export interface PluginGenerationResult {
  /** Files created with their manifest entries, keyed by relative path from project root */
  files: Record<string, ManifestFile>;
  /** Relative path to the plugin directory from project root */
  pluginPath: string;
}

/**
 * Generates plugin.json content for the rbartronic plugin.
 */
export function generatePluginJson(cliVersion: string): string {
  return JSON.stringify(
    {
      name: PLUGIN_NAME,
      version: cliVersion,
      description:
        'rbartronic — 16 skills, 7 agents, full workflow hooks by rbart',
      author: {
        name: 'r-bart',
        url: 'https://github.com/r-bart/rbartronic',
      },
      repository: 'https://github.com/r-bart/rbartronic',
      license: 'MIT',
      keywords: ['agentic', 'architecture', 'clean-architecture', 'ddd', 'workflow', 'skills'],
    },
    null,
    2
  );
}

/**
 * Generates marketplace.json for the local directory marketplace.
 */
export function generateMarketplaceJson(): string {
  return JSON.stringify(
    {
      name: MARKETPLACE_NAME,
      owner: {
        name: 'r-bart',
        url: 'https://github.com/r-bart/rbartronic',
      },
      plugins: [
        {
          name: PLUGIN_NAME,
          source: `./${PLUGIN_NAME}`,
          description: 'rbartronic — 16 skills, 7 agents, full workflow hooks',
        },
      ],
    },
    null,
    2
  );
}

/**
 * Generates the complete plugin structure from claude-code templates.
 *
 * Output structure:
 * ```
 * .claude-plugins/                       <- local marketplace root
 * |-- .claude-plugin/
 * |   \-- marketplace.json
 * \-- rbartronic/                            <- the plugin
 *     |-- .claude-plugin/
 *     |   \-- plugin.json
 *     |-- skills/   (16 skills from template)
 *     |-- agents/   (7 agents from template)
 *     |-- hooks/
 *     |   \-- hooks.json
 *     \-- scripts/
 *         \-- checkpoint.sh
 * ```
 *
 * @param targetDir - Absolute path to the user's project root
 * @param templatesDir - Absolute path to the CLI's templates/ directory
 * @param cliVersion - Current CLI version for plugin.json
 * @param config - Project config for personalizing hooks
 * @param packageManager - Detected PM for personalizing hooks
 * @returns Files written (relative paths) and the plugin root path
 */
export function generatePlugin(
  targetDir: string,
  templatesDir: string,
  cliVersion: string,
  config: ProjectConfig,
  packageManager: PackageManager
): PluginGenerationResult {
  const files: Record<string, ManifestFile> = {};
  const pluginRoot = join(PLUGIN_DIR, PLUGIN_NAME);

  // 1. Marketplace descriptor (.claude-plugins/.claude-plugin/marketplace.json)
  const marketplaceContent = generateMarketplaceJson();
  const marketplaceRelPath = join(PLUGIN_DIR, '.claude-plugin', 'marketplace.json');
  writeGeneratedFile(targetDir, marketplaceRelPath, marketplaceContent, files);

  // 2. Plugin manifest (.claude-plugins/rbartronic/.claude-plugin/plugin.json)
  const pluginJsonContent = generatePluginJson(cliVersion);
  const pluginJsonRelPath = join(pluginRoot, '.claude-plugin', 'plugin.json');
  writeGeneratedFile(targetDir, pluginJsonRelPath, pluginJsonContent, files);

  // 3. Copy skills from template
  const templateClaudeDir = join(templatesDir, 'claude-code', '.claude');
  copyTemplateDir(targetDir, join(templateClaudeDir, 'skills'), join(pluginRoot, 'skills'), files);

  // 4. Copy agents from template
  copyTemplateDir(targetDir, join(templateClaudeDir, 'agents'), join(pluginRoot, 'agents'), files);

  // 5. Generate hooks.json
  const hooksContent = generateHooks(config, packageManager);
  const hooksRelPath = join(pluginRoot, 'hooks', 'hooks.json');
  writeGeneratedFile(targetDir, hooksRelPath, hooksContent, files);

  // 6. Generate checkpoint script
  const scriptContent = generateCheckpointScript();
  const scriptRelPath = join(pluginRoot, 'scripts', 'checkpoint.sh');
  writeGeneratedFile(targetDir, scriptRelPath, scriptContent, files);

  // 7. Generate stop-guard script (quality checks before stopping)
  const stopGuardContent = generateStopGuardScript(config);
  const stopGuardRelPath = join(pluginRoot, 'scripts', 'stop-guard.sh');
  writeGeneratedFile(targetDir, stopGuardRelPath, stopGuardContent, files);

  return { files, pluginPath: pluginRoot };
}

/**
 * Writes a generated file and records it in the manifest map.
 */
function writeGeneratedFile(
  targetDir: string,
  relPath: string,
  content: string,
  files: Record<string, ManifestFile>
): void {
  const absPath = join(targetDir, relPath);
  ensureDir(dirname(absPath));
  writeFile(absPath, content);
  files[relPath] = createManifestEntry(content);
}

/**
 * Recursively copies all files from a template source directory
 * into a destination under the plugin, recording each in the manifest map.
 */
function copyTemplateDir(
  targetDir: string,
  sourceDir: string,
  destRelDir: string,
  files: Record<string, ManifestFile>
): void {
  const templateFiles = getAllFilesRecursive(sourceDir);

  if (templateFiles.length === 0) {
    throw new Error(`No template files found in ${sourceDir}. The CLI package may be corrupted.`);
  }

  for (const file of templateFiles) {
    const sourceContent = readFile(join(sourceDir, file));
    const destRelPath = join(destRelDir, file);
    const destAbsPath = join(targetDir, destRelPath);
    ensureDir(dirname(destAbsPath));
    writeFile(destAbsPath, sourceContent);
    files[destRelPath] = createManifestEntry(sourceContent);
  }
}
