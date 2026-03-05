import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  rmSync,
  readdirSync,
  statSync,
  unlinkSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { createHash } from 'node:crypto';

export interface GenerateResult {
  written: number;
  skipped: number;
  conflicts: string[];
  updated?: number;
}

/** Maps agent names to their dot-directory paths */
const AGENT_PATHS: Record<string, string> = {
  claude: '.claude',
  cursor: '.cursor',
  gemini: '.gemini',
};

function checksum(content: string): string {
  return createHash('sha256').update(content).digest('hex').slice(0, 16);
}

function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

/**
 * Reads the addon manifest from the source directory.
 */
function readManifest(addonSourceDir: string) {
  const manifestPath = join(addonSourceDir, 'manifest.json');
  return JSON.parse(readFileSync(manifestPath, 'utf-8'));
}

/**
 * Builds a map of relative paths → source content for all addon files.
 */
function buildFileMap(addonSourceDir: string): Map<string, string> {
  const manifest = readManifest(addonSourceDir);
  const files = new Map<string, string>();

  // Skills
  for (const skill of manifest.files.skills ?? []) {
    const skillDir = join(addonSourceDir, 'skills', skill);
    if (!existsSync(skillDir)) continue;
    const skillFile = join(skillDir, 'SKILL.md');
    if (existsSync(skillFile)) {
      files.set(`skills/${skill}/SKILL.md`, readFileSync(skillFile, 'utf-8'));
    }
  }

  // Reference docs → nested inside design-harden skill
  for (const ref of manifest.files.reference ?? []) {
    const refPath = join(addonSourceDir, 'reference', ref);
    if (existsSync(refPath)) {
      files.set(`skills/design-harden/reference/${ref}`, readFileSync(refPath, 'utf-8'));
    }
  }

  // Rules
  for (const rule of manifest.files.rules ?? []) {
    const rulePath = join(addonSourceDir, 'rules', rule);
    if (existsSync(rulePath)) {
      files.set(`rules/${rule}`, readFileSync(rulePath, 'utf-8'));
    }
  }

  return files;
}

/**
 * Generates addon files for the specified agents.
 * Returns a summary of files written, skipped, and conflicting.
 */
export function generateAddonFiles(
  projectDir: string,
  addonSourceDir: string,
  agents: string[]
): GenerateResult {
  const fileMap = buildFileMap(addonSourceDir);
  const manifest = readManifest(addonSourceDir);
  const result: GenerateResult = { written: 0, skipped: 0, conflicts: [] };

  for (const agent of agents) {
    const basePath = AGENT_PATHS[agent] ?? `.${agent}`;

    for (const [relPath, content] of fileMap) {
      const destPath = join(projectDir, basePath, relPath);

      if (existsSync(destPath)) {
        const existing = readFileSync(destPath, 'utf-8');
        if (existing === content) {
          result.skipped++;
          continue;
        }
        // File exists but differs — skip silently on generate (not a conflict for initial install)
        result.skipped++;
        continue;
      }

      ensureDir(dirname(destPath));
      writeFileSync(destPath, content);
      result.written++;
    }
  }

  // Handle NOTICE.md for attributed addons
  if (manifest.attribution) {
    const noticePath = join(projectDir, 'NOTICE.md');
    const noticeContent = [
      '# NOTICE',
      '',
      'This project includes materials from third-party sources.',
      '',
      `## ${manifest.name}`,
      '',
      manifest.attribution,
      '',
      'Original source: Anthropic frontend-design skill',
      'License: Apache 2.0 (https://www.apache.org/licenses/LICENSE-2.0)',
      '',
    ].join('\n');
    writeFileSync(noticePath, noticeContent);
  }

  return result;
}

/**
 * Removes addon files from all specified agent directories.
 */
export function removeAddonFiles(
  projectDir: string,
  addonName: string,
  agents: string[]
): void {
  // We need to know what files belong to this addon.
  // Try to read the manifest from the bundled source.
  // For removal, we need the addon source dir — find it from the registry.
  // Since we're a utility, we'll work with what the caller can provide.
  // For now, use the known file structure for design-best-practices.

  const knownSkills = ['design-init', 'design-review', 'design-refine', 'design-system', 'design-harden'];
  const knownRules = ['design-quality.md'];

  for (const agent of agents) {
    const basePath = AGENT_PATHS[agent] ?? `.${agent}`;

    // Remove skill directories
    for (const skill of knownSkills) {
      const skillDir = join(projectDir, basePath, 'skills', skill);
      if (existsSync(skillDir)) {
        rmSync(skillDir, { recursive: true, force: true });
      }
    }

    // Remove rule files
    for (const rule of knownRules) {
      const rulePath = join(projectDir, basePath, 'rules', rule);
      if (existsSync(rulePath)) {
        unlinkSync(rulePath);
      }
    }
  }

  // Remove NOTICE.md
  const noticePath = join(projectDir, 'NOTICE.md');
  if (existsSync(noticePath)) {
    unlinkSync(noticePath);
  }
}

/**
 * Syncs addon files: updates unmodified files, preserves customized ones.
 * Returns result with updated count and conflicts for customized files.
 */
export function syncAddonFiles(
  projectDir: string,
  addonSourceDir: string,
  agents: string[]
): GenerateResult {
  const fileMap = buildFileMap(addonSourceDir);
  const result: GenerateResult = { written: 0, skipped: 0, conflicts: [], updated: 0 };

  // Build a checksum map of what was originally installed
  // by reading the current devtronic.json checksums
  const configPath = join(projectDir, 'devtronic.json');
  let installedChecksums: Record<string, string> = {};
  if (existsSync(configPath)) {
    try {
      const config = JSON.parse(readFileSync(configPath, 'utf-8'));
      const installed = config.addons?.installed?.['design-best-practices'];
      if (installed?.checksums) {
        installedChecksums = installed.checksums;
      }
    } catch { /* ignore */ }
  }

  for (const agent of agents) {
    const basePath = AGENT_PATHS[agent] ?? `.${agent}`;

    for (const [relPath, newContent] of fileMap) {
      const destPath = join(projectDir, basePath, relPath);

      if (!existsSync(destPath)) {
        // File doesn't exist — write it
        ensureDir(dirname(destPath));
        writeFileSync(destPath, newContent);
        result.written++;
        continue;
      }

      const existing = readFileSync(destPath, 'utf-8');
      const existingChecksum = checksum(existing);
      const originalChecksum = installedChecksums[relPath];

      if (existing === newContent) {
        // Already up to date
        result.skipped++;
        continue;
      }

      // Check if user modified the file
      if (originalChecksum && existingChecksum !== originalChecksum) {
        // User customized — preserve and report conflict
        result.conflicts.push(relPath);
        continue;
      }

      // Unmodified — safe to update
      writeFileSync(destPath, newContent);
      result.updated = (result.updated ?? 0) + 1;
    }
  }

  return result;
}

/**
 * Detects files that have been modified from their original installed state.
 */
export function detectModifiedAddonFiles(
  projectDir: string,
  _addonName: string
): string[] {
  const configPath = join(projectDir, 'devtronic.json');
  if (!existsSync(configPath)) return [];

  let installedChecksums: Record<string, string> = {};
  try {
    const config = JSON.parse(readFileSync(configPath, 'utf-8'));
    const installed = config.addons?.installed?.['design-best-practices'];
    if (installed?.checksums) {
      installedChecksums = installed.checksums;
    }
  } catch { return []; }

  const modified: string[] = [];

  // Check each tracked file against all agent dirs
  for (const agentDir of Object.values(AGENT_PATHS)) {
    for (const [relPath, originalHash] of Object.entries(installedChecksums)) {
      const absPath = join(projectDir, agentDir, relPath);
      if (!existsSync(absPath)) continue;
      const current = checksum(readFileSync(absPath, 'utf-8'));
      if (current !== originalHash) {
        modified.push(relPath);
      }
    }
  }

  return [...new Set(modified)];
}
