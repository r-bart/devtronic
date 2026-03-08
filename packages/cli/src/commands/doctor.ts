import { resolve, join } from 'node:path';
import { existsSync, readdirSync, statSync, chmodSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import * as p from '@clack/prompts';
import chalk from 'chalk';
import type { DoctorOptions, DoctorCheck } from '../types.js';
import { readManifest, fileExists, readFile } from '../utils/files.js';
import { readClaudeSettings, registerPlugin, registerGitHubPlugin } from '../utils/settings.js';
import { introTitle, symbols } from '../utils/ui.js';
import { PLUGIN_NAME, MARKETPLACE_NAME, PLUGIN_DIR, GITHUB_MARKETPLACE_NAME, GITHUB_MARKETPLACE_REPO } from '../generators/plugin.js';

export async function doctorCommand(options: DoctorOptions): Promise<void> {
  const targetDir = resolve(options.path || '.');

  p.intro(introTitle('Doctor'));

  const manifest = readManifest(targetDir);

  if (!manifest) {
    p.cancel('No installation found. Run `npx devtronic init` first.');
    process.exit(1);
  }

  const checks: DoctorCheck[] = [];

  // 1. Manifest is valid with required keys
  checks.push(checkManifestValid(manifest));

  // 2. All manifest files exist on disk
  checks.push(checkManifestFiles(targetDir, manifest));

  // 3. Shell scripts have executable permissions
  checks.push(checkScriptPermissions(targetDir, manifest));

  // 4. Plugin registered in .claude/settings.json (if plugin mode)
  if (manifest.installMode === 'plugin' || manifest.installMode === 'marketplace') {
    checks.push(checkPluginRegistered(targetDir, manifest.installMode!));
  }

  // 5. Hook scripts point to existing files
  checks.push(checkHookScripts(targetDir, manifest));

  // 6. Quality scripts exist in package.json
  checks.push(checkQualityScripts(targetDir));

  // 7. thoughts/ directory structure
  checks.push(checkThoughtsDir(targetDir));

  // 8. eslint available
  checks.push(checkEslint(targetDir));

  // Apply fixes if --fix is passed
  if (options.fix) {
    let fixCount = 0;
    for (const check of checks) {
      if ((check.status === 'fail' || check.status === 'warn') && check.fixable && check.fix) {
        try {
          check.fix();
          check.status = 'pass';
          check.message += ' (fixed)';
          fixCount++;
        } catch {
          // Leave status as-is
        }
      }
    }
    if (fixCount > 0) {
      p.log.success(`Auto-fixed ${fixCount} issue${fixCount === 1 ? '' : 's'}`);
    }
  }

  // Display results
  const resultLines = checks.map((check) => {
    const icon =
      check.status === 'pass'
        ? symbols.pass
        : check.status === 'warn'
          ? symbols.warn
          : symbols.fail;
    const fixHint =
      (check.status === 'fail' || check.status === 'warn') && check.fixable && !options.fix
        ? chalk.dim(' (fixable)')
        : '';
    return `  ${icon} ${check.message}${fixHint}`;
  });

  const passCount = checks.filter((c) => c.status === 'pass').length;
  const warnCount = checks.filter((c) => c.status === 'warn').length;
  const failCount = checks.filter((c) => c.status === 'fail').length;

  p.note(resultLines.join('\n'), 'Health Check');

  const summaryParts: string[] = [];
  summaryParts.push(`${passCount} passed`);
  if (warnCount > 0) summaryParts.push(`${warnCount} warning${warnCount === 1 ? '' : 's'}`);
  if (failCount > 0) summaryParts.push(`${failCount} failed`);

  if (failCount > 0) {
    p.log.error(summaryParts.join(', '));
    if (!options.fix) {
      const fixable = checks.filter(
        (c) => (c.status === 'fail' || c.status === 'warn') && c.fixable
      ).length;
      if (fixable > 0) {
        p.log.info(`Run ${chalk.cyan('devtronic doctor --fix')} to auto-fix ${fixable} issue${fixable === 1 ? '' : 's'}.`);
      }
    }
  } else if (warnCount > 0) {
    p.log.warn(summaryParts.join(', '));
    if (!options.fix) {
      const fixable = checks.filter((c) => c.status === 'warn' && c.fixable).length;
      if (fixable > 0) {
        p.log.info(`Run ${chalk.cyan('devtronic doctor --fix')} to auto-fix ${fixable} issue${fixable === 1 ? '' : 's'}.`);
      }
    }
  } else {
    p.log.success(summaryParts.join(', '));
  }

  p.outro(failCount === 0 && warnCount === 0 ? chalk.green('All clear!') : '');
}

export function checkManifestValid(manifest: ReturnType<typeof readManifest>): DoctorCheck {
  if (!manifest) {
    return { name: 'manifest', status: 'fail', message: 'Manifest not found' };
  }

  const version = manifest.version || 'unknown';
  const hasIDEs = manifest.selectedIDEs && manifest.selectedIDEs.length > 0;
  const hasFiles = manifest.files && Object.keys(manifest.files).length > 0;

  if (!hasIDEs || !hasFiles) {
    return {
      name: 'manifest',
      status: 'warn',
      message: `Manifest exists but missing ${!hasIDEs ? 'IDEs' : 'files'} (v${version})`,
    };
  }

  return {
    name: 'manifest',
    status: 'pass',
    message: `Manifest is valid (v${version})`,
  };
}

export function checkManifestFiles(
  targetDir: string,
  manifest: NonNullable<ReturnType<typeof readManifest>>
): DoctorCheck {
  const totalFiles = Object.keys(manifest.files).length;
  let existCount = 0;
  const missing: string[] = [];

  for (const relativePath of Object.keys(manifest.files)) {
    if (fileExists(join(targetDir, relativePath))) {
      existCount++;
    } else {
      missing.push(relativePath);
    }
  }

  if (missing.length === 0) {
    return {
      name: 'files',
      status: 'pass',
      message: `${existCount}/${totalFiles} manifest files exist`,
    };
  }

  return {
    name: 'files',
    status: missing.length > totalFiles / 2 ? 'fail' : 'warn',
    message: `${existCount}/${totalFiles} manifest files exist (${missing.length} missing)`,
  };
}

export function checkScriptPermissions(
  targetDir: string,
  manifest: NonNullable<ReturnType<typeof readManifest>>
): DoctorCheck {
  const pluginDir = manifest.pluginPath
    ? join(targetDir, manifest.pluginPath)
    : null;

  const shFiles: string[] = [];

  // Find .sh files in plugin dir
  if (pluginDir && existsSync(pluginDir)) {
    const scriptsDir = join(pluginDir, 'scripts');
    if (existsSync(scriptsDir)) {
      const entries = readdirSync(scriptsDir);
      for (const entry of entries) {
        if (entry.endsWith('.sh')) {
          shFiles.push(join(scriptsDir, entry));
        }
      }
    }
  }

  if (shFiles.length === 0) {
    return {
      name: 'permissions',
      status: 'pass',
      message: 'No shell scripts to check',
    };
  }

  const nonExecutable: string[] = [];
  for (const file of shFiles) {
    try {
      const stat = statSync(file);
      // Check if any execute bit is set
      if (!(stat.mode & 0o111)) {
        nonExecutable.push(file);
      }
    } catch {
      // skip
    }
  }

  if (nonExecutable.length === 0) {
    return {
      name: 'permissions',
      status: 'pass',
      message: 'Scripts have executable permissions',
    };
  }

  return {
    name: 'permissions',
    status: 'warn',
    message: `${nonExecutable.length} script${nonExecutable.length === 1 ? '' : 's'} missing executable permission`,
    fixable: true,
    fix: () => {
      for (const file of nonExecutable) {
        chmodSync(file, 0o755);
      }
    },
  };
}

function checkPluginRegistered(targetDir: string, installMode: string): DoctorCheck {
  const settings = readClaudeSettings(targetDir);

  if (installMode === 'marketplace') {
    const pluginKey = `${PLUGIN_NAME}@${GITHUB_MARKETPLACE_NAME}`;
    const isRegistered = settings.enabledPlugins?.[pluginKey] === true;
    if (isRegistered) {
      return { name: 'plugin', status: 'pass', message: 'Marketplace plugin registered in .claude/settings.json' };
    }
    return {
      name: 'plugin',
      status: 'warn',
      message: 'Marketplace plugin not registered in .claude/settings.json',
      fixable: true,
      fix: () => {
        registerGitHubPlugin(targetDir, PLUGIN_NAME, GITHUB_MARKETPLACE_NAME, GITHUB_MARKETPLACE_REPO);
      },
    };
  }

  // Legacy local plugin mode
  const pluginKey = `${PLUGIN_NAME}@${MARKETPLACE_NAME}`;
  const isRegistered = settings.enabledPlugins?.[pluginKey] === true;

  if (isRegistered) {
    return {
      name: 'plugin',
      status: 'pass',
      message: 'Plugin registered in .claude/settings.json',
    };
  }

  return {
    name: 'plugin',
    status: 'warn',
    message: 'Plugin not registered in .claude/settings.json',
    fixable: true,
    fix: () => {
      registerPlugin(targetDir, PLUGIN_NAME, MARKETPLACE_NAME, PLUGIN_DIR);
    },
  };
}

function checkHookScripts(
  targetDir: string,
  manifest: NonNullable<ReturnType<typeof readManifest>>
): DoctorCheck {
  const pluginDir = manifest.pluginPath
    ? join(targetDir, manifest.pluginPath)
    : null;

  if (!pluginDir || !existsSync(pluginDir)) {
    return {
      name: 'hooks',
      status: 'pass',
      message: 'No hooks directory to check',
    };
  }

  const hooksDir = join(pluginDir, 'hooks');
  if (!existsSync(hooksDir)) {
    return {
      name: 'hooks',
      status: 'pass',
      message: 'No hooks directory found',
    };
  }

  // Read hook JSON files and check that referenced scripts exist
  const hookFiles = readdirSync(hooksDir).filter((f) => f.endsWith('.json'));
  let total = 0;
  let valid = 0;

  for (const hookFile of hookFiles) {
    try {
      const hookContent = JSON.parse(readFile(join(hooksDir, hookFile)));
      const hooks = Array.isArray(hookContent) ? hookContent : [hookContent];

      for (const hook of hooks) {
        if (hook.command) {
          total++;
          // Check if command references a script file
          const parts = hook.command.split(' ');
          const scriptRef = parts.find(
            (part: string) => part.endsWith('.sh') || part.endsWith('.js')
          );
          if (scriptRef) {
            // Resolve ${CLAUDE_PLUGIN_ROOT} and similar env-var placeholders
            const resolved = scriptRef.replace(
              /\$\{[A-Z_]+\}\//g,
              ''
            );
            const scriptPath = join(pluginDir, resolved);
            if (existsSync(scriptPath)) {
              valid++;
            }
          } else {
            valid++; // Not a file reference, assume valid
          }
        }
      }
    } catch {
      // skip invalid hook files
    }
  }

  if (total === 0) {
    return { name: 'hooks', status: 'pass', message: 'No hook scripts to verify' };
  }

  if (valid === total) {
    return { name: 'hooks', status: 'pass', message: 'Hook scripts exist' };
  }

  return {
    name: 'hooks',
    status: 'warn',
    message: `${valid}/${total} hook script references are valid`,
  };
}

export function checkQualityScripts(targetDir: string): DoctorCheck {
  const pkgPath = join(targetDir, 'package.json');

  if (!fileExists(pkgPath)) {
    return { name: 'quality', status: 'warn', message: 'No package.json found' };
  }

  try {
    const pkg = JSON.parse(readFile(pkgPath));
    const scripts = pkg.scripts || {};
    const expected = ['typecheck', 'lint', 'test'];
    const missing = expected.filter((s) => !scripts[s]);

    if (missing.length === 0) {
      return {
        name: 'quality',
        status: 'pass',
        message: 'Quality scripts exist (typecheck, lint, test)',
      };
    }

    return {
      name: 'quality',
      status: 'warn',
      message: `Missing package.json script${missing.length === 1 ? '' : 's'}: ${missing.join(', ')}`,
    };
  } catch {
    return { name: 'quality', status: 'warn', message: 'Could not parse package.json' };
  }
}

export function checkThoughtsDir(targetDir: string): DoctorCheck {
  const thoughtsDir = join(targetDir, 'thoughts');

  if (existsSync(thoughtsDir)) {
    return {
      name: 'thoughts',
      status: 'pass',
      message: 'thoughts/ directory exists',
    };
  }

  return {
    name: 'thoughts',
    status: 'warn',
    message: 'thoughts/ directory missing',
    fixable: true,
    fix: () => {
      const dirs = [
        'thoughts/specs',
        'thoughts/research',
        'thoughts/plans',
        'thoughts/checkpoints',
        'thoughts/notes',
        'thoughts/debug',
        'thoughts/audit',
        'thoughts/archive/backlog',
      ];
      for (const dir of dirs) {
        mkdirSync(join(targetDir, dir), { recursive: true });
      }
    },
  };
}

function checkEslint(targetDir: string): DoctorCheck {
  // Check if eslint is available (in node_modules or globally)
  try {
    const eslintLocal = join(targetDir, 'node_modules', '.bin', 'eslint');
    if (existsSync(eslintLocal)) {
      return { name: 'eslint', status: 'pass', message: 'eslint is available' };
    }

    // Try global
    execSync('which eslint', { stdio: 'pipe' });
    return { name: 'eslint', status: 'pass', message: 'eslint is available (global)' };
  } catch {
    return {
      name: 'eslint',
      status: 'warn',
      message: 'eslint not found (needed for PostToolUse hook)',
    };
  }
}
