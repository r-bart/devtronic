import { resolve, join, dirname } from 'node:path';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as p from '@clack/prompts';
import chalk from 'chalk';
import type { ListOptions } from '../types.js';
import { readManifest } from '../utils/files.js';
import { introTitle, symbols } from '../utils/ui.js';

const __list_filename = fileURLToPath(import.meta.url);
const __list_dirname = dirname(__list_filename);
const LIST_TEMPLATES_DIR = existsSync(resolve(__list_dirname, '../templates'))
  ? resolve(__list_dirname, '../templates')
  : resolve(__list_dirname, '../../templates');

interface DiscoveredItem {
  name: string;
  description: string;
}

export async function listCommand(
  filter: string | undefined,
  options: ListOptions
): Promise<void> {
  const targetDir = resolve(options.path || '.');

  p.intro(introTitle('List'));

  const manifest = readManifest(targetDir);

  const showSkills = !filter || filter === 'skills';
  const showAgents = !filter || filter === 'agents';

  if (filter && filter !== 'skills' && filter !== 'agents') {
    p.cancel(`Unknown filter: ${filter}\n\nValid options: skills, agents`);
    process.exit(1);
  }

  // Discover skills
  const skills: DiscoveredItem[] = [];
  const agents: DiscoveredItem[] = [];

  // Check plugin directory first
  const pluginDir = manifest?.pluginPath
    ? join(targetDir, manifest.pluginPath)
    : null;

  if (pluginDir && existsSync(pluginDir)) {
    if (showSkills) {
      const skillsDir = join(pluginDir, 'skills');
      if (existsSync(skillsDir)) {
        skills.push(...discoverSkills(skillsDir));
      }
    }
    if (showAgents) {
      const agentsDir = join(pluginDir, 'agents');
      if (existsSync(agentsDir)) {
        agents.push(...discoverAgents(agentsDir));
      }
    }
  }

  // For marketplace mode, discover from CLI templates (same content as marketplace repo)
  if (manifest?.installMode === 'marketplace') {
    if (showSkills && skills.length === 0) {
      const templateSkills = join(LIST_TEMPLATES_DIR, 'claude-code', '.claude', 'skills');
      if (existsSync(templateSkills)) {
        skills.push(...discoverSkills(templateSkills));
      }
    }
    if (showAgents && agents.length === 0) {
      const templateAgents = join(LIST_TEMPLATES_DIR, 'claude-code', '.claude', 'agents');
      if (existsSync(templateAgents)) {
        agents.push(...discoverAgents(templateAgents));
      }
    }
  }

  // Also check .claude/ for standalone installs (if plugin didn't yield results)
  if (showSkills && skills.length === 0) {
    const claudeSkills = join(targetDir, '.claude', 'skills');
    if (existsSync(claudeSkills)) {
      skills.push(...discoverSkills(claudeSkills));
    }
  }
  if (showAgents && agents.length === 0) {
    const claudeAgents = join(targetDir, '.claude', 'agents');
    if (existsSync(claudeAgents)) {
      agents.push(...discoverAgents(claudeAgents));
    }
  }

  if (showSkills) {
    if (skills.length > 0) {
      const skillLines = skills
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((s) => `  ${symbols.bullet} ${chalk.bold(s.name.padEnd(18))}${chalk.dim(s.description)}`);
      p.note(skillLines.join('\n'), `Skills (${skills.length})`);
      if (manifest?.installMode === 'marketplace') {
        p.log.info(chalk.dim('Plugin skills loaded from GitHub marketplace'));
      }
    } else {
      p.log.info('No skills found.');
    }
  }

  if (showAgents) {
    if (agents.length > 0) {
      const agentLines = agents
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((a) => `  ${symbols.bullet} ${chalk.bold(a.name.padEnd(18))}${chalk.dim(a.description)}`);
      p.note(agentLines.join('\n'), `Agents (${agents.length})`);
      if (manifest?.installMode === 'marketplace') {
        p.log.info(chalk.dim('Plugin skills loaded from GitHub marketplace'));
      }
    } else {
      p.log.info('No agents found.');
    }
  }

  p.outro('');
}

/**
 * Discovers skills from a skills directory.
 * Skills are directories containing SKILL.md or standalone .md files.
 */
function discoverSkills(skillsDir: string): DiscoveredItem[] {
  const items: DiscoveredItem[] = [];

  const entries = readdirSync(skillsDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const skillMd = join(skillsDir, entry.name, 'SKILL.md');
      const description = existsSync(skillMd)
        ? extractDescription(skillMd)
        : '';
      items.push({ name: entry.name, description });
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      const name = entry.name.replace(/\.md$/, '');
      const description = extractDescription(join(skillsDir, entry.name));
      items.push({ name, description });
    }
  }

  return items;
}

/**
 * Discovers agents from an agents directory.
 */
function discoverAgents(agentsDir: string): DiscoveredItem[] {
  const items: DiscoveredItem[] = [];

  const entries = readdirSync(agentsDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith('.md')) {
      const name = entry.name.replace(/\.md$/, '');
      const description = extractDescription(join(agentsDir, entry.name));
      items.push({ name, description });
    }
  }

  return items;
}

/** Longest description `devtronic list` will print before truncating */
const MAX_DESCRIPTION = 60;

/**
 * Picks the one-line description to show for a skill or agent.
 *
 * The frontmatter `description` wins when there is one: it is the text the
 * runtime itself reads, so the CLI and the agent agree on what a skill is for.
 * Older files without frontmatter fall back to the first prose line after the
 * heading.
 */
export function describeMarkdown(content: string): string {
  return truncate(stripMarkdown(frontmatterDescription(content) ?? firstProseLine(content)));
}

/** Reads `description:` out of the YAML frontmatter block, if present. */
function frontmatterDescription(content: string): string | null {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;

  for (const line of match[1].split('\n')) {
    const field = line.match(/^description:\s*(.+)$/);
    if (!field) continue;
    // Strip a surrounding quote pair; descriptions holding a colon need one.
    return field[1].trim().replace(/^(['"])(.*)\1$/, '$2');
  }
  return null;
}

/** First non-empty line after the first markdown heading. */
function firstProseLine(content: string): string {
  let pastHeading = false;

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) {
      pastHeading = true;
      continue;
    }
    if (pastHeading && trimmed.length > 0) return trimmed;
  }
  return '';
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1');
}

function truncate(text: string): string {
  return text.length > MAX_DESCRIPTION ? text.slice(0, MAX_DESCRIPTION - 3) + '...' : text;
}

function extractDescription(filePath: string): string {
  try {
    return describeMarkdown(readFileSync(filePath, 'utf-8'));
  } catch {
    return '';
  }
}
