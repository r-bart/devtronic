import { join, dirname } from 'node:path';
import type { ProjectConfig, PackageManager, ManifestFile } from '../types.js';
import { ADDONS } from '../types.js';
import {
  ensureDir,
  writeFile,
  getAllFilesRecursive,
  getSubdirectories,
  readFile,
  createManifestEntry,
} from '../utils/files.js';
import { generateHooks, generateCheckpointScript, generateStopGuardScript } from './hooks.js';
import { CORE_SKILLS } from './rules.js';

export const PLUGIN_NAME = 'devtronic';
export const MARKETPLACE_NAME = 'devtronic-local';
export const PLUGIN_DIR = '.claude-plugins';

/** GitHub marketplace for remote plugin distribution */
export const GITHUB_MARKETPLACE_REPO = 'r-bart/devtronic-plugin';
export const GITHUB_MARKETPLACE_NAME = 'devtronic';

export interface PluginGenerationResult {
  /** Files created with their manifest entries, keyed by relative path from project root */
  files: Record<string, ManifestFile>;
  /** Relative path to the plugin directory from project root */
  pluginPath: string;
}

/** Base number of core skills (derived from CORE_SKILLS registry) */
export const BASE_SKILL_COUNT = CORE_SKILLS.length;
/** Number of design phase skills */
export const DESIGN_SKILL_COUNT = 12;
/** Total number of bundled agents (core + design) */
export const BASE_AGENT_COUNT = 15;

/**
 * Generates plugin.json content for the devtronic plugin.
 */
export function generatePluginJson(cliVersion: string, addonSkillCount: number = 0): string {
  const baseTotal = BASE_SKILL_COUNT + DESIGN_SKILL_COUNT;
  const skillLabel = addonSkillCount > 0
    ? `${baseTotal} + ${addonSkillCount} addon skills`
    : `${baseTotal} skills`;
  return JSON.stringify(
    {
      name: PLUGIN_NAME,
      description:
        `Agentic development toolkit — ${skillLabel}, ${BASE_AGENT_COUNT} agents, workflow hooks`,
      version: cliVersion,
      author: {
        name: 'r-bart',
      },
    },
    null,
    2
  );
}

/**
 * Generates marketplace.json for the local directory marketplace.
 */
export function generateMarketplaceJson(addonSkillCount: number = 0): string {
  const baseTotal = BASE_SKILL_COUNT + DESIGN_SKILL_COUNT;
  const skillLabel = addonSkillCount > 0
    ? `${baseTotal} + ${addonSkillCount} addon skills`
    : `${baseTotal} skills`;
  return JSON.stringify(
    {
      name: MARKETPLACE_NAME,
      owner: {
        name: 'r-bart',
        url: 'https://github.com/r-bart/devtronic',
      },
      plugins: [
        {
          name: PLUGIN_NAME,
          source: `./${PLUGIN_NAME}`,
          description: `devtronic — ${skillLabel}, ${BASE_AGENT_COUNT} agents, full workflow hooks`,
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
 * \-- devtronic/                            <- the plugin
 *     |-- .claude-plugin/
 *     |   \-- plugin.json
 *     |-- skills/   (31 skills: 19 core + 12 design)
 *     |-- agents/   (15 agents: 8 core + 7 design)
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

  // Compute addon skill filtering
  const addonOnlySkills = new Set(
    Object.values(ADDONS).flatMap((a) => a.skills)
  );
  const enabledAddonSkills = new Set(
    (config.enabledAddons || []).flatMap((a) => ADDONS[a]?.skills ?? [])
  );
  const addonSkillCount = enabledAddonSkills.size;

  // 1. Marketplace descriptor (.claude-plugins/.claude-plugin/marketplace.json)
  const marketplaceContent = generateMarketplaceJson(addonSkillCount);
  const marketplaceRelPath = join(PLUGIN_DIR, '.claude-plugin', 'marketplace.json');
  writeGeneratedFile(targetDir, marketplaceRelPath, marketplaceContent, files);

  // 2. Plugin manifest (.claude-plugins/devtronic/.claude-plugin/plugin.json)
  const pluginJsonContent = generatePluginJson(cliVersion, addonSkillCount);
  const pluginJsonRelPath = join(pluginRoot, '.claude-plugin', 'plugin.json');
  writeGeneratedFile(targetDir, pluginJsonRelPath, pluginJsonContent, files);

  // 3. Copy skills from template (filter by addon)
  const templateClaudeDir = join(templatesDir, 'claude-code', '.claude');
  const skillsSourceDir = join(templateClaudeDir, 'skills');
  const skillDirs = getSubdirectories(skillsSourceDir);
  for (const dir of skillDirs) {
    const isAddonSkill = addonOnlySkills.has(dir);
    if (!isAddonSkill || enabledAddonSkills.has(dir)) {
      copyTemplateDir(
        targetDir,
        join(skillsSourceDir, dir),
        join(pluginRoot, 'skills', dir),
        files
      );
    }
  }

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
