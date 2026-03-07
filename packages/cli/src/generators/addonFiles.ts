import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  rmSync,
  unlinkSync,
  readdirSync,
  rmdirSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import type { AddonName } from '../types.js';
import { getAddonSourceDir } from '../addons/registry.js';
import { readAddonConfig } from '../utils/addonConfig.js';

export interface GenerateResult {
  written: number;
  skipped: number;
  conflicts: string[];
  updated?: number;
  checksums?: Record<string, string>;
}

/** Maps agent names to their dot-directory paths */
const AGENT_PATHS: Record<string, string> = {
  claude: '.claude',
  cursor: '.cursor',
  gemini: '.gemini',
};

/**
 * Strips the `name:` field from YAML frontmatter only.
 * OpenCode derives command name from filename — explicit name: causes conflicts.
 */
function stripFrontmatterName(content: string): string {
  return content.replace(/^(---\n)([\s\S]*?)(---)/m, (_match, open, body, close) => {
    const cleaned = body.split('\n').filter((l: string) => !l.startsWith('name:')).join('\n');
    return `${open}${cleaned}${close}`;
  });
}

interface RuntimeInstallSpec {
  /** Base directory relative to project root */
  baseDir: string;
  /** Transform skill name + raw content → install relPath + adapted content */
  skillAdapter: (skillName: string, content: string) => { relPath: string; content: string };
  /** Subdirectory under baseDir where rules are installed (if supported) */
  rulesDir?: string;
}

const RUNTIME_SPECS: Record<string, RuntimeInstallSpec> = {
  claude: {
    baseDir: '.claude',
    skillAdapter: (name, content) => ({
      relPath: `skills/${name}/SKILL.md`,
      content,
    }),
    rulesDir: 'rules',
  },
  gemini: {
    baseDir: '.gemini',
    skillAdapter: (name, content) => ({
      relPath: `skills/${name}/SKILL.md`,
      content,
    }),
    rulesDir: 'rules',
  },
  opencode: {
    baseDir: '.opencode',
    skillAdapter: (name, content) => ({
      relPath: `command/${name}.md`,
      content: stripFrontmatterName(content),
    }),
  },
  cursor: {
    baseDir: '.cursor',
    skillAdapter: (name, content) => ({
      relPath: `skills/${name}/SKILL.md`,
      content,
    }),
    rulesDir: 'rules',
  },
  codex: {
    baseDir: '.codex',
    skillAdapter: (name, content) => ({
      relPath: `skills/${name}/SKILL.md`,
      content,
    }),
  },
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

  // Agents
  for (const agent of manifest.files.agents ?? []) {
    const agentFile = join(addonSourceDir, 'agents', `${agent}.md`);
    if (existsSync(agentFile)) {
      files.set(`agents/${agent}.md`, readFileSync(agentFile, 'utf-8'));
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
  const result: GenerateResult = { written: 0, skipped: 0, conflicts: [], checksums: {} };

  for (const agent of agents) {
    const spec = RUNTIME_SPECS[agent];
    if (!spec) {
      // Fallback: use old AGENT_PATHS behavior for unknown runtimes
      const basePath = AGENT_PATHS[agent] ?? `.${agent}`;
      for (const [relPath, content] of fileMap) {
        const destPath = join(projectDir, basePath, relPath);
        if (existsSync(destPath)) {
          result.skipped++;
          continue;
        }
        ensureDir(dirname(destPath));
        writeFileSync(destPath, content);
        result.written++;
        result.checksums![relPath] = checksum(content);
      }
      continue;
    }

    // Install skills via runtime-specific adapter
    for (const skillName of manifest.files.skills ?? []) {
      const skillFile = join(addonSourceDir, 'skills', skillName, 'SKILL.md');
      if (!existsSync(skillFile)) continue;
      const rawContent = readFileSync(skillFile, 'utf-8');

      const { relPath, content } = spec.skillAdapter(skillName, rawContent);
      const destPath = join(projectDir, spec.baseDir, relPath);

      if (existsSync(destPath)) {
        const existing = readFileSync(destPath, 'utf-8');
        if (existing === content) {
          result.skipped++;
        } else {
          result.conflicts.push(relPath);
        }
        continue;
      }

      ensureDir(dirname(destPath));
      writeFileSync(destPath, content);
      result.written++;
      result.checksums![relPath] = checksum(content);
    }

    // Install agents to baseDir/agents/[name].md (same across runtimes)
    for (const agentName of manifest.files.agents ?? []) {
      const agentFile = join(addonSourceDir, 'agents', `${agentName}.md`);
      if (!existsSync(agentFile)) continue;
      const content = readFileSync(agentFile, 'utf-8');
      const destPath = join(projectDir, spec.baseDir, 'agents', `${agentName}.md`);
      if (!existsSync(destPath)) {
        ensureDir(dirname(destPath));
        writeFileSync(destPath, content);
        result.written++;
        result.checksums![`agents/${agentName}.md`] = checksum(content);
      } else {
        result.skipped++;
      }
    }

    // Install rules (only for runtimes that support them)
    if (spec.rulesDir) {
      for (const rule of manifest.files.rules ?? []) {
        const ruleSrcPath = join(addonSourceDir, 'rules', rule);
        if (!existsSync(ruleSrcPath)) continue;
        const content = readFileSync(ruleSrcPath, 'utf-8');
        const destPath = join(projectDir, spec.baseDir, spec.rulesDir, rule);
        if (!existsSync(destPath)) {
          ensureDir(dirname(destPath));
          writeFileSync(destPath, content);
          result.written++;
          result.checksums![`rules/${rule}`] = checksum(content);
        } else {
          result.skipped++;
        }
      }
    }

    // Install reference docs nested inside design-harden skill
    for (const ref of manifest.files.reference ?? []) {
      const refSrcPath = join(addonSourceDir, 'reference', ref);
      if (!existsSync(refSrcPath)) continue;
      const content = readFileSync(refSrcPath, 'utf-8');
      const relPath = `skills/design-harden/reference/${ref}`;
      const destPath = join(projectDir, spec.baseDir, relPath);
      if (!existsSync(destPath)) {
        ensureDir(dirname(destPath));
        writeFileSync(destPath, content);
        result.written++;
        result.checksums![relPath] = checksum(content);
      } else {
        result.skipped++;
      }
    }
  }

  // Handle NOTICE.md for attributed addons (keep existing logic)
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
 * Reads the addon's manifest to determine which files to remove.
 */
export function removeAddonFiles(
  projectDir: string,
  addonName: string,
  agents: string[],
  addonSourceDir?: string
): void {
  const sourceDir = addonSourceDir ?? getAddonSourceDir(addonName as AddonName);
  const manifest = readManifest(sourceDir);
  const knownSkills: string[] = manifest.files.skills ?? [];
  const knownAgents: string[] = manifest.files.agents ?? [];

  for (const agent of agents) {
    const spec = RUNTIME_SPECS[agent];

    if (!spec) {
      // Fallback: old AGENT_PATHS removal
      const basePath = AGENT_PATHS[agent] ?? `.${agent}`;
      for (const skill of knownSkills) {
        const skillDir = join(projectDir, basePath, 'skills', skill);
        if (existsSync(skillDir)) rmSync(skillDir, { recursive: true, force: true });
      }
      for (const agentName of knownAgents) {
        const agentPath = join(projectDir, basePath, 'agents', `${agentName}.md`);
        if (existsSync(agentPath)) unlinkSync(agentPath);
      }
      continue;
    }

    // Remove skill files via runtime spec
    for (const skillName of knownSkills) {
      // Derive relPath using a dummy content (we just need the path)
      const { relPath } = spec.skillAdapter(skillName, '');
      const destPath = join(projectDir, spec.baseDir, relPath);
      if (existsSync(destPath)) unlinkSync(destPath);
      // Also remove parent dir if empty (e.g. .codex/skills/devtronic/)
      const parentDir = dirname(destPath);
      if (existsSync(parentDir)) {
        try {
          const entries = readdirSync(parentDir);
          if (entries.length === 0) rmdirSync(parentDir);
        } catch { /* ignore */ }
      }
    }

    // Remove agents
    for (const agentName of knownAgents) {
      const agentPath = join(projectDir, spec.baseDir, 'agents', `${agentName}.md`);
      if (existsSync(agentPath)) unlinkSync(agentPath);
    }

    // Remove rules
    if (spec.rulesDir) {
      for (const rule of (manifest.files.rules ?? [])) {
        const rulePath = join(projectDir, spec.baseDir, spec.rulesDir, rule);
        if (existsSync(rulePath)) unlinkSync(rulePath);
      }
    }

    // Remove reference docs nested inside design-harden skill
    for (const ref of (manifest.files.reference ?? [])) {
      const refPath = join(projectDir, spec.baseDir, 'skills', 'design-harden', 'reference', ref);
      if (existsSync(refPath)) unlinkSync(refPath);
    }
    // Clean up empty reference dir
    const refDir = join(projectDir, spec.baseDir, 'skills', 'design-harden', 'reference');
    if (existsSync(refDir)) {
      try {
        const entries = readdirSync(refDir);
        if (entries.length === 0) rmdirSync(refDir);
      } catch { /* ignore */ }
    }
  }

  // Remove NOTICE.md only if this addon created it (has attribution)
  if (manifest.attribution) {
    const noticePath = join(projectDir, 'NOTICE.md');
    if (existsSync(noticePath)) unlinkSync(noticePath);
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
  const manifest = readManifest(addonSourceDir);
  const addonName = manifest.name as string;
  const result: GenerateResult = { written: 0, skipped: 0, conflicts: [], updated: 0 };

  // Build a checksum map of what was originally installed
  let installedChecksums: Record<string, string> = {};
  try {
    const config = readAddonConfig(projectDir);
    const installed = config.installed?.[addonName];
    if (installed?.checksums) {
      installedChecksums = installed.checksums;
    }
  } catch { /* ignore */ }

  for (const agent of agents) {
    const spec = RUNTIME_SPECS[agent];

    if (!spec) {
      // Fallback: old AGENT_PATHS behavior
      const basePath = AGENT_PATHS[agent] ?? `.${agent}`;
      for (const [relPath, newContent] of fileMap) {
        const destPath = join(projectDir, basePath, relPath);
        if (!existsSync(destPath)) {
          ensureDir(dirname(destPath));
          writeFileSync(destPath, newContent);
          result.written++;
          continue;
        }
        const existing = readFileSync(destPath, 'utf-8');
        const existingChecksum = checksum(existing);
        const originalChecksum = installedChecksums[relPath];
        if (existing === newContent) {
          result.skipped++;
          continue;
        }
        if (originalChecksum && existingChecksum !== originalChecksum) {
          result.conflicts.push(relPath);
          continue;
        }
        writeFileSync(destPath, newContent);
        result.updated = (result.updated ?? 0) + 1;
      }
      continue;
    }

    // Sync skills via runtime-specific adapter
    for (const skillName of manifest.files.skills ?? []) {
      const skillFile = join(addonSourceDir, 'skills', skillName, 'SKILL.md');
      if (!existsSync(skillFile)) continue;
      const rawContent = readFileSync(skillFile, 'utf-8');

      const { relPath, content: newContent } = spec.skillAdapter(skillName, rawContent);
      const destPath = join(projectDir, spec.baseDir, relPath);

      if (!existsSync(destPath)) {
        ensureDir(dirname(destPath));
        writeFileSync(destPath, newContent);
        result.written++;
        continue;
      }

      const existing = readFileSync(destPath, 'utf-8');
      const existingChecksum = checksum(existing);
      const originalChecksum = installedChecksums[relPath];

      if (existing === newContent) {
        result.skipped++;
        continue;
      }

      if (originalChecksum && existingChecksum !== originalChecksum) {
        result.conflicts.push(relPath);
        continue;
      }

      writeFileSync(destPath, newContent);
      result.updated = (result.updated ?? 0) + 1;
    }

    // Sync agents
    for (const agentName of manifest.files.agents ?? []) {
      const agentFile = join(addonSourceDir, 'agents', `${agentName}.md`);
      if (!existsSync(agentFile)) continue;
      const newContent = readFileSync(agentFile, 'utf-8');
      const destPath = join(projectDir, spec.baseDir, 'agents', `${agentName}.md`);
      const relPath = `agents/${agentName}.md`;

      if (!existsSync(destPath)) {
        ensureDir(dirname(destPath));
        writeFileSync(destPath, newContent);
        result.written++;
        continue;
      }

      const existing = readFileSync(destPath, 'utf-8');
      const existingChecksum = checksum(existing);
      const originalChecksum = installedChecksums[relPath];

      if (existing === newContent) {
        result.skipped++;
        continue;
      }

      if (originalChecksum && existingChecksum !== originalChecksum) {
        result.conflicts.push(relPath);
        continue;
      }

      writeFileSync(destPath, newContent);
      result.updated = (result.updated ?? 0) + 1;
    }

    // Sync rules (only for runtimes that support them)
    if (spec.rulesDir) {
      for (const rule of manifest.files.rules ?? []) {
        const ruleSrcPath = join(addonSourceDir, 'rules', rule);
        if (!existsSync(ruleSrcPath)) continue;
        const newContent = readFileSync(ruleSrcPath, 'utf-8');
        const destPath = join(projectDir, spec.baseDir, spec.rulesDir, rule);
        const relPath = `rules/${rule}`;

        if (!existsSync(destPath)) {
          ensureDir(dirname(destPath));
          writeFileSync(destPath, newContent);
          result.written++;
          continue;
        }

        const existing = readFileSync(destPath, 'utf-8');
        const existingChecksum = checksum(existing);
        const originalChecksum = installedChecksums[relPath];

        if (existing === newContent) {
          result.skipped++;
          continue;
        }

        if (originalChecksum && existingChecksum !== originalChecksum) {
          result.conflicts.push(relPath);
          continue;
        }

        writeFileSync(destPath, newContent);
        result.updated = (result.updated ?? 0) + 1;
      }
    }

    // Sync reference docs nested inside design-harden skill
    for (const ref of manifest.files.reference ?? []) {
      const refSrcPath = join(addonSourceDir, 'reference', ref);
      if (!existsSync(refSrcPath)) continue;
      const newContent = readFileSync(refSrcPath, 'utf-8');
      const relPath = `skills/design-harden/reference/${ref}`;
      const destPath = join(projectDir, spec.baseDir, relPath);

      if (!existsSync(destPath)) {
        ensureDir(dirname(destPath));
        writeFileSync(destPath, newContent);
        result.written++;
        continue;
      }

      const existing = readFileSync(destPath, 'utf-8');
      const existingChecksum = checksum(existing);
      const originalChecksum = installedChecksums[relPath];

      if (existing === newContent) {
        result.skipped++;
        continue;
      }

      if (originalChecksum && existingChecksum !== originalChecksum) {
        result.conflicts.push(relPath);
        continue;
      }

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
  addonName: string
): string[] {
  let installedChecksums: Record<string, string> = {};
  let agents: string[] = ['claude'];
  try {
    const config = readAddonConfig(projectDir);
    const installed = config.installed?.[addonName];
    if (!installed?.checksums) return [];
    installedChecksums = installed.checksums;
    agents = config.agents ?? ['claude'];
  } catch { return []; }

  const modified: string[] = [];

  // Check each tracked file against all configured agent directories
  for (const agent of agents) {
    const spec = RUNTIME_SPECS[agent];
    const baseDir = spec?.baseDir ?? AGENT_PATHS[agent] ?? `.${agent}`;

    for (const [relPath, originalHash] of Object.entries(installedChecksums)) {
      const absPath = join(projectDir, baseDir, relPath);
      if (!existsSync(absPath)) continue;
      const current = checksum(readFileSync(absPath, 'utf-8'));
      if (current !== originalHash) {
        modified.push(relPath);
      }
    }
  }

  return [...new Set(modified)];
}
