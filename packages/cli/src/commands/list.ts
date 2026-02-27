import { resolve, join } from 'node:path';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import * as p from '@clack/prompts';
import chalk from 'chalk';
import type { ListOptions } from '../types.js';
import { readManifest } from '../utils/files.js';
import { introTitle, symbols } from '../utils/ui.js';

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

/**
 * Extracts a short description from a markdown file.
 * Reads the first non-empty line after the first heading.
 */
function extractDescription(filePath: string): string {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    let pastHeading = false;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('#')) {
        pastHeading = true;
        continue;
      }
      if (pastHeading && trimmed.length > 0) {
        // Strip markdown formatting (bold, italic, code, links)
        const plain = trimmed
          .replace(/\*\*(.+?)\*\*/g, '$1')
          .replace(/\*(.+?)\*/g, '$1')
          .replace(/`(.+?)`/g, '$1')
          .replace(/\[(.+?)\]\(.+?\)/g, '$1');
        return plain.length > 60 ? plain.slice(0, 57) + '...' : plain;
      }
    }
    return '';
  } catch {
    return '';
  }
}
