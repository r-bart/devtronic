import type {
  ArchitecturePattern,
  FrameworkName,
  ProjectAnalysis,
  ProjectConfig,
  ScriptsInfo,
} from '../types.js';

// ─── Shared Helpers ────────────────────────────────────────────────────────

export function getFrameworkDisplayName(framework: FrameworkName): string {
  const names: Record<FrameworkName, string> = {
    nextjs: 'Next.js',
    react: 'React',
    vue: 'Vue',
    nuxt: 'Nuxt',
    express: 'Express',
    nestjs: 'NestJS',
    fastify: 'Fastify',
    hono: 'Hono',
    astro: 'Astro',
    svelte: 'Svelte',
    sveltekit: 'SvelteKit',
    remix: 'Remix',
    unknown: 'Project',
  };
  return names[framework] || 'Project';
}

export function getArchitectureLabel(architecture: ArchitecturePattern): string {
  const labels: Record<ArchitecturePattern, string> = {
    clean: 'Clean + DDD',
    mvc: 'MVC',
    'feature-based': 'Feature-Based',
    flat: 'Flat',
  };
  return labels[architecture] || architecture;
}

export function getArchitectureOneLiner(config: ProjectConfig): string {
  if (config.architecture === 'clean') {
    return 'Dependencies point INWARD only: Presentation → Application → Domain ← Infrastructure.';
  }
  if (config.architecture === 'mvc') {
    return 'Model-View-Controller: Models hold data/logic, Views handle UI, Controllers orchestrate.';
  }
  if (config.architecture === 'feature-based') {
    return 'Each feature is self-contained with its own components, hooks, API calls, and types.';
  }
  return 'Document your architecture patterns.';
}

export function getCodePatternsBullets(config: ProjectConfig): string {
  const lines: string[] = [];

  if (config.stateManagement.length > 0) {
    lines.push(`- **UI state**: ${config.stateManagement.join(', ')}`);
  }
  if (config.dataFetching.length > 0) {
    lines.push(`- **Server state**: ${config.dataFetching.join(', ')}`);
  }
  if (config.architecture === 'clean') {
    lines.push('- **Domain state**: Use cases');
  }
  if (config.orm.length > 0) {
    lines.push(`- **ORM**: ${config.orm.join(', ')}`);
    if (config.architecture === 'clean') {
      lines.push('- Repository interfaces in `domain/`, implementations in `infrastructure/`');
    }
  }
  lines.push('- Never access DB from UI');

  return lines.join('\n');
}

function getCommandsBlock(
  scripts: ScriptsInfo,
  packageManager: string | null,
  qualityCommand: string
): string {
  const pm = packageManager || 'npm';
  const run = pm === 'npm' ? 'npm run' : pm;

  const devCmd = scripts.dev ? `\`${run} ${scripts.dev}\`` : '`# Add your dev command`';
  const buildCmd = scripts.build ? `\`${run} ${scripts.build}\`` : '`# Add your build command`';

  return `- **Dev**: ${devCmd}
- **Build**: ${buildCmd}
- **Quality**: \`${qualityCommand}\``;
}

// ─── Quality Commands ──────────────────────────────────────────────────────

export function generateQualityCommands(
  scripts: ScriptsInfo,
  packageManager: string | null
): string {
  const pm = packageManager || 'npm';
  const run = pm === 'npm' ? 'npm run' : pm;

  const commands: string[] = [];

  if (scripts.typecheck) {
    commands.push(`${run} ${scripts.typecheck}`);
  }
  if (scripts.lint) {
    commands.push(`${run} ${scripts.lint}`);
  }
  if (scripts.test) {
    commands.push(`${run} ${scripts.test}`);
  }

  if (commands.length === 0) {
    return '# No quality scripts detected - add your commands here';
  }

  return commands.join(' && ');
}

// ─── CLAUDE.md Generator ──────────────────────────────────────────────────

/**
 * Generate CLAUDE.md — the primary Claude Code context file.
 * Complete, self-improving, with workflow and Claude-specific references.
 */
export function generateClaudeMd(
  config: ProjectConfig,
  scripts: ScriptsInfo,
  packageManager: string | null
): string {
  const frameworkName = getFrameworkDisplayName(config.framework);
  const archLabel = getArchitectureLabel(config.architecture);
  const archOneLiner = getArchitectureOneLiner(config);
  const codePatterns = getCodePatternsBullets(config);
  const commands = getCommandsBlock(scripts, packageManager, config.qualityCommand);

  return `# ${frameworkName}

${frameworkName} project with ${archLabel} architecture.

## Commands

${commands}

Run quality checks after every change.

## Code Style

- **Files**: PascalCase components, camelCase utils
- **Code**: camelCase vars/functions, PascalCase types
- **Unused**: Prefix with \`_\`

## Code Patterns

${codePatterns}

## Architecture

${archOneLiner}

IMPORTANT: See \`docs/ARCHITECTURE.md\` for structure. See \`.claude/rules/\` for enforcement rules.

## Workflow

- **New feature**: \`/brief\` → \`/spec\` → \`/research --deep\` → \`/create-plan\` → implement → \`/post-review\`
- **Bug fix**: \`/brief\` → fix → test → \`/post-review\`
- **Refactor**: \`/brief\` → \`/create-plan\` → implement → \`/post-review\`

> \`/brief\` for session orientation. \`/checkpoint\` to save progress.

## Project Notes

Maintain notes in \`thoughts/notes/\` updated after every PR.

## Gotchas

<!-- Claude fills this section via self-improvement. Do not delete. -->

## Self-Improvement

After every significant correction, update this file:

"Update CLAUDE.md so you don't make that mistake again."

Add learned rules to the **Gotchas** section above. Keep rules:
- Concise (one line each)
- Absolute directives (ALWAYS/NEVER)
- Concrete with actual commands/code

## References

- **docs/ARCHITECTURE.md** — Folder structure
- **docs/worktrees.md** — Parallel sessions with git worktrees
- **.claude/skills/** — Available workflows
- **.claude/agents/** — Specialized helpers
`;
}

// ─── AGENTS.md Generator (from analysis, generic) ─────────────────────────

/**
 * Generate AGENTS.md from ProjectAnalysis — universal, no Claude-specific content.
 */
export function generateAgentsMd(analysis: ProjectAnalysis): string {
  const pm = analysis.packageManager || 'npm';
  const run = pm === 'npm' ? 'npm run' : pm;

  const qualityCmd = generateQualityCommands(analysis.scripts, analysis.packageManager);

  const devCmd = analysis.scripts.dev
    ? `\`${run} ${analysis.scripts.dev}\``
    : '`# Add your dev command`';
  const buildCmd = analysis.scripts.build
    ? `\`${run} ${analysis.scripts.build}\``
    : '`# Add your build command`';

  const archLabel =
    analysis.architecture.pattern === 'clean' ? ': Clean + DDD' : '';

  return `# AI Agents Guide

## Commands

- **Dev**: ${devCmd}
- **Build**: ${buildCmd}
- **Quality**: \`${qualityCmd}\`

Run after every change.

## Architecture${archLabel}

${getArchitectureSectionUniversal(analysis.architecture.pattern)}

## Code Patterns

- **UI state**: Zustand stores
- **Server state**: React Query
- **Domain state**: Use cases
- Never access DB from UI

## Code Style

- **Files**: PascalCase components, camelCase utils
- **Code**: camelCase vars/functions, PascalCase types
- **Unused**: Prefix with \`_\`
`;
}

// ─── AGENTS.md Generator (from config, personalized) ──────────────────────

/**
 * Generate AGENTS.md from confirmed ProjectConfig — universal, no Claude-specific content.
 * Stripped of: Workflow, Self-Improvement, Gotchas, Project Notes, References to .claude/.
 */
export function generateAgentsMdFromConfig(
  config: ProjectConfig,
  scripts: ScriptsInfo,
  packageManager: string | null
): string {
  const frameworkName = getFrameworkDisplayName(config.framework);
  const archLabel = getArchitectureLabel(config.architecture);
  const archOneLiner = getArchitectureOneLiner(config);
  const codePatterns = getCodePatternsBullets(config);
  const commands = getCommandsBlock(scripts, packageManager, config.qualityCommand);

  return `# ${frameworkName}

${frameworkName} project with ${archLabel} architecture.

## Commands

${commands}

Run quality checks after every change.

## Code Style

- **Files**: PascalCase components, camelCase utils
- **Code**: camelCase vars/functions, PascalCase types
- **Unused**: Prefix with \`_\`

## Code Patterns

${codePatterns}

## Architecture

${archOneLiner} See \`docs/ARCHITECTURE.md\` for detailed structure.
`;
}

// ─── Private Helpers ───────────────────────────────────────────────────────

function getArchitectureSectionUniversal(pattern: ArchitecturePattern): string {
  if (pattern === 'clean') {
    return `Dependencies point INWARD only: Presentation → Application → Domain ← Infrastructure.

See \`docs/ARCHITECTURE.md\` for detailed structure.`;
  }

  if (pattern === 'mvc') {
    return `Model-View-Controller: Models hold data/logic, Views handle UI, Controllers orchestrate.

See \`docs/ARCHITECTURE.md\` for detailed structure.`;
  }

  if (pattern === 'feature-based') {
    return `Each feature is self-contained with its own components, hooks, API calls, and types.

See \`docs/ARCHITECTURE.md\` for detailed structure.`;
  }

  return `See \`docs/ARCHITECTURE.md\` for detailed structure.`;
}
