import { resolve, join } from 'node:path';
import { existsSync, readdirSync } from 'node:fs';
import * as p from '@clack/prompts';
import chalk from 'chalk';
import { readManifest } from '../utils/files.js';
import { introTitle, formatKV } from '../utils/ui.js';
import { getCliVersion, getLatestVersion, compareSemver } from '../utils/version.js';

export async function infoCommand(): Promise<void> {
  const targetDir = resolve('.');

  p.intro(introTitle('Info'));

  const manifest = readManifest(targetDir);
  const currentVersion = getCliVersion();

  // Start non-blocking version check
  const latestPromise = getLatestVersion('devtronic');

  // Version line
  let versionLine = currentVersion;

  // Count skills and agents
  let skillCount = 0;
  let agentCount = 0;

  if (manifest) {
    // Count from plugin path if available
    const pluginDir = manifest.pluginPath
      ? join(targetDir, manifest.pluginPath)
      : null;

    if (pluginDir && existsSync(pluginDir)) {
      const skillsDir = join(pluginDir, 'skills');
      const agentsDir = join(pluginDir, 'agents');

      if (existsSync(skillsDir)) {
        skillCount = readdirSync(skillsDir, { withFileTypes: true }).filter(
          (e) => e.isDirectory() || (e.isFile() && e.name.endsWith('.md'))
        ).length;
      }
      if (existsSync(agentsDir)) {
        agentCount = readdirSync(agentsDir, { withFileTypes: true }).filter(
          (e) => e.isFile() && e.name.endsWith('.md')
        ).length;
      }
    }

    // Also check .claude/ for standalone installs
    if (skillCount === 0) {
      const claudeSkills = join(targetDir, '.claude', 'skills');
      if (existsSync(claudeSkills)) {
        skillCount = readdirSync(claudeSkills, { withFileTypes: true }).filter(
          (e) => e.isDirectory() || (e.isFile() && e.name.endsWith('.md'))
        ).length;
      }
    }
    if (agentCount === 0) {
      const claudeAgents = join(targetDir, '.claude', 'agents');
      if (existsSync(claudeAgents)) {
        agentCount = readdirSync(claudeAgents, { withFileTypes: true }).filter(
          (e) => e.isFile() && e.name.endsWith('.md')
        ).length;
      }
    }
  }

  // Await version check
  const latest = await latestPromise;
  if (latest) {
    const cmp = compareSemver(currentVersion, latest);
    if (cmp === 0) {
      versionLine = `${currentVersion} ${chalk.green('(latest)')}`;
    } else if (cmp < 0) {
      versionLine = `${currentVersion} ${chalk.yellow(`→ ${latest} available`)}`;
    } else {
      versionLine = `${currentVersion} ${chalk.dim('(pre-release)')}`;
    }
  }

  const lines = [formatKV('Version:', versionLine)];

  if (manifest) {
    lines.push(formatKV('Installed:', manifest.implantedAt));
    lines.push(formatKV('IDEs:', manifest.selectedIDEs.join(', ')));
    lines.push(formatKV('Mode:', manifest.installMode || 'standalone'));
    lines.push(formatKV('Skills:', String(skillCount)));
    lines.push(formatKV('Agents:', String(agentCount)));

    if (manifest.projectConfig) {
      lines.push(formatKV('Framework:', manifest.projectConfig.framework));
      lines.push(formatKV('Architecture:', manifest.projectConfig.architecture));
    }
  } else {
    lines.push(chalk.dim('  Not installed in this directory.'));
    lines.push(chalk.dim(`  Run ${chalk.cyan('npx devtronic init')} to set up.`));
  }

  p.note(lines.join('\n'), 'devtronic');

  if (latest && compareSemver(currentVersion, latest) < 0) {
    p.log.warn(
      `Update available: ${currentVersion} ${chalk.dim('→')} ${chalk.cyan(latest)}\n  Run ${chalk.cyan('npx devtronic@latest init')} to upgrade.`
    );
  }

  p.outro('');
}
