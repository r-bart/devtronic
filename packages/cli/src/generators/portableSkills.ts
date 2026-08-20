/**
 * Exports the core skill set in the Agent Skills open format, so runtimes other
 * than Claude Code can load the same workflows.
 *
 * One directory serves every non-Claude target devtronic supports: Codex,
 * Cursor, OpenCode and Copilot/VS Code all read `.agents/skills/`. Cursor and
 * OpenCode additionally read `.claude/skills/`, but writing there would collide
 * with Claude Code's own install, so `.agents/skills/` is the single home.
 *
 * Frontmatter is normalized on the way out: Claude Code-only execution controls
 * are dropped, and the fields every runtime either reads or safely ignores are
 * kept.
 */
import { dirname, join } from 'node:path';
import type { IDE, ManifestFile, ProjectConfig } from '../types.js';
import { ADDONS } from '../types.js';
import {
  createManifestEntry,
  ensureDir,
  getSubdirectories,
  readFile,
  writeFile,
  fileExists,
} from '../utils/files.js';

/** Shared skills directory read by Codex, Cursor, OpenCode and Copilot/VS Code. */
export const PORTABLE_SKILLS_DIR = '.agents/skills';

/** IDEs that consume the portable skill set instead of the Claude Code plugin. */
export const PORTABLE_SKILL_IDES: IDE[] = [
  'cursor',
  'antigravity',
  'github-copilot',
  'opencode',
  'codex',
];

/**
 * Frontmatter kept on export.
 *
 * `name` and `description` are the Agent Skills spec core. `allowed-tools`,
 * `license`, `compatibility` and `metadata` are also spec fields. The rest are
 * Claude Code extensions that other runtimes read (Cursor reads `paths` and
 * `disable-model-invocation`; Copilot/VS Code also read `argument-hint` and
 * `user-invocable`) or ignore without erroring.
 */
const PORTABLE_FIELDS = [
  'name',
  'description',
  'argument-hint',
  'allowed-tools',
  'disallowed-tools',
  'disable-model-invocation',
  'user-invocable',
  'paths',
  'license',
  'compatibility',
  'metadata',
];

/**
 * Frontmatter dropped on export: these drive Claude Code's own execution model
 * (forked subagent context, background execution) and mean nothing — or
 * something different — elsewhere.
 */
const CLAUDE_ONLY_FIELDS = ['context', 'background', 'model', 'effort', 'hooks', 'agent'];

/**
 * Rewrites a SKILL.md so its frontmatter carries only portable fields.
 *
 * Multi-line block values (such as a `paths:` list) are kept with their
 * continuation lines. The markdown body is passed through untouched.
 */
export function toPortableSkill(content: string): string {
  const match = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return content;

  const kept: string[] = [];
  let keeping = false;

  for (const line of match[1].split('\n')) {
    const key = line.match(/^([A-Za-z][A-Za-z0-9_-]*):/);
    if (key) {
      keeping = PORTABLE_FIELDS.includes(key[1]) && !CLAUDE_ONLY_FIELDS.includes(key[1]);
      if (keeping) kept.push(line);
      continue;
    }
    // Continuation line (list item or folded value) — follows the last key.
    if (keeping) kept.push(line);
  }

  return content.replace(match[0], `---\n${kept.join('\n')}\n---\n`);
}

/**
 * Computes what the portable skill set should contain, without writing anything.
 *
 * `update` needs this to notice drift: an install created before the export
 * existed has no portable files at all, and comparing checksums is the only way
 * to see that there is something to apply.
 *
 * @returns Map of project-relative path → file content
 */
export function computePortableSkills(
  templatesDir: string,
  config: ProjectConfig
): Map<string, string> {
  const sourceDir = join(templatesDir, 'claude-code', '.claude', 'skills');
  const out = new Map<string, string>();

  if (!fileExists(sourceDir)) return out;

  const addonOnlySkills = new Set(Object.values(ADDONS).flatMap((a) => a.skills));
  const enabledAddonSkills = new Set(
    (config.enabledAddons ?? []).flatMap((a) => ADDONS[a]?.skills ?? [])
  );

  for (const skill of getSubdirectories(sourceDir)) {
    if (addonOnlySkills.has(skill) && !enabledAddonSkills.has(skill)) continue;

    const sourcePath = join(sourceDir, skill, 'SKILL.md');
    if (!fileExists(sourcePath)) continue;

    out.set(`${PORTABLE_SKILLS_DIR}/${skill}/SKILL.md`, toPortableSkill(readFile(sourcePath)));
  }

  return out;
}

export interface PortableSkillsResult {
  /** Files written, keyed by path relative to the project root */
  files: Record<string, ManifestFile>;
  /** Skill names exported */
  skills: string[];
}

/**
 * Writes the core skill set to `.agents/skills/<name>/SKILL.md`.
 *
 * Addon skills live in the same template directory as the core ones, so they are
 * filtered the same way the plugin generator filters them: a skill that belongs
 * to an addon ships only when that addon is enabled.
 *
 * @param targetDir - Absolute path to the user's project root
 * @param templatesDir - Absolute path to the CLI's templates/ directory
 * @param config - Project config, read for `enabledAddons`
 * @param skipPaths - Relative paths the user edited by hand; left untouched
 */
export function generatePortableSkills(
  targetDir: string,
  templatesDir: string,
  config: ProjectConfig,
  skipPaths: readonly string[] = []
): PortableSkillsResult {
  const files: Record<string, ManifestFile> = {};
  const skills: string[] = [];
  const skip = new Set(skipPaths);

  for (const [relPath, content] of computePortableSkills(templatesDir, config)) {
    if (skip.has(relPath)) continue;

    const destPath = join(targetDir, relPath);
    ensureDir(dirname(destPath));
    writeFile(destPath, content);

    files[relPath] = createManifestEntry(content);
    skills.push(skillNameFromPath(relPath));
  }

  return { files, skills };
}

/** `.agents/skills/audit/SKILL.md` → `audit` */
function skillNameFromPath(relPath: string): string {
  const parts = relPath.split('/');
  return parts[parts.length - 2];
}
