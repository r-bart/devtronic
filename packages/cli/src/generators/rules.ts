import type {
  AddonName,
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
    layered: 'Layered',
    mvc: 'MVC',
    'feature-based': 'Feature-Based',
    flat: 'Flat',
    none: 'None',
  };
  return labels[architecture] || architecture;
}

export function getArchitectureOneLiner(config: ProjectConfig): string {
  if (config.architecture === 'clean') {
    return 'Dependencies point INWARD only: Presentation → Application → Domain ← Infrastructure.';
  }
  if (config.architecture === 'layered') {
    return 'Layered: Routes/Controllers → Services → Repositories. Each layer calls only the one below.';
  }
  if (config.architecture === 'mvc') {
    return 'Model-View-Controller: Models hold data/logic, Views handle UI, Controllers orchestrate.';
  }
  if (config.architecture === 'feature-based') {
    return 'Each feature is self-contained with its own components, hooks, API calls, and types.';
  }
  if (config.architecture === 'none') {
    return 'No architecture rules configured. Run `devtronic config set architecture clean` to add rules later.';
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
  if (config.architecture === 'layered') {
    lines.push('- **Business logic**: Services layer');
  }
  if (config.orm.length > 0) {
    lines.push(`- **ORM**: ${config.orm.join(', ')}`);
    if (config.architecture === 'clean') {
      lines.push('- Repository interfaces in `domain/`, implementations in `infrastructure/`');
    }
    if (config.architecture === 'layered') {
      lines.push('- Database access only in `repositories/`');
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
  const skillsSection = generateSkillsSection(config.enabledAddons);

  const archSection = config.architecture === 'none'
    ? `## Architecture

${archOneLiner}`
    : `## Architecture

${archOneLiner}

IMPORTANT: See \`docs/ARCHITECTURE.md\` for structure. See \`.claude/rules/\` for enforcement rules.`;

  const workflowSection = config.enabledAddons?.includes('orchestration')
    ? `## Workflow

- **New feature**: \`/briefing\` → \`/spec\` → \`/create-plan\` → \`/generate-tests\` → \`/execute-plan\` → \`/recap\`
- **Bug fix**: \`/brief\` → fix → test → \`/summary\` → \`/post-review\`
- **Refactor**: \`/brief\` → \`/create-plan\` → \`/execute-plan\` → \`/summary\` → \`/post-review\`
- **Session start**: \`/brief\` for orientation
- **Session end**: \`/handoff\` for clean context rotation

> \`/briefing\` for pre-planning alignment. \`/recap\` for quick summaries. \`/checkpoint\` to save progress.`
    : `## Workflow

- **New feature**: \`/brief\` → \`/spec\` → \`/create-plan\` → \`/generate-tests\` → \`/execute-plan\` → \`/summary\` → \`/post-review\`
- **Bug fix**: \`/brief\` → fix → test → \`/summary\` → \`/post-review\`
- **Refactor**: \`/brief\` → \`/create-plan\` → implement → \`/summary\` → \`/post-review\`

> \`/brief\` for session orientation (with pre-flight checks). \`/summary\` to document changes. \`/checkpoint\` to save progress.`;

  return `# ${frameworkName}

${frameworkName} project${config.architecture !== 'none' ? ` with ${archLabel} architecture` : ''}.

## Commands

${commands}

Run quality checks after every change.

## Code Style

- **Files**: PascalCase components, camelCase utils
- **Code**: camelCase vars/functions, PascalCase types
- **Unused**: Prefix with \`_\`

## Code Patterns

${codePatterns}

${archSection}

${workflowSection}

## Available Skills

${skillsSection}

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

  const agentsArchSection = config.architecture === 'none'
    ? `## Architecture

${archOneLiner}`
    : `## Architecture

${archOneLiner} See \`docs/ARCHITECTURE.md\` for detailed structure.`;

  const skillsSection = generateSkillsSection(config.enabledAddons);

  const workflowSection = config.enabledAddons?.includes('orchestration')
    ? `## Workflow

- **New feature**: \`/briefing\` → \`/spec\` → \`/create-plan\` → \`/generate-tests\` → \`/execute-plan\` → \`/recap\`
- **Bug fix**: \`/brief\` → fix → test → \`/summary\`
- **Session start**: \`/brief\` for orientation
- **Session end**: \`/handoff\` for clean context rotation`
    : `## Workflow

- **New feature**: \`/brief\` → \`/spec\` → \`/create-plan\` → \`/generate-tests\` → \`/execute-plan\` → \`/summary\` → \`/post-review\`
- **Bug fix**: \`/brief\` → fix → test → \`/summary\``;

  return `# ${frameworkName}

${frameworkName} project${config.architecture !== 'none' ? ` with ${archLabel} architecture` : ''}.

## Commands

${commands}

Run quality checks after every change.

## Code Style

- **Files**: PascalCase components, camelCase utils
- **Code**: camelCase vars/functions, PascalCase types
- **Unused**: Prefix with \`_\`

## Code Patterns

${codePatterns}

${agentsArchSection}

${workflowSection}

## Available Skills

${skillsSection}
`;
}

// ─── Skills Listing ───────────────────────────────────────────────────────

/** Core skills always available */
export const CORE_SKILLS: Array<{ name: string; desc: string }> = [
  { name: 'brief', desc: 'Session orientation with pre-flight checks' },
  { name: 'spec', desc: 'Product specification interview (PRD)' },
  { name: 'research', desc: 'Codebase investigation (--deep, --external)' },
  { name: 'create-plan', desc: 'Phased implementation plan with task dependencies' },
  { name: 'execute-plan', desc: 'Parallel phase execution of plans' },
  { name: 'quick', desc: 'Fast ad-hoc tasks: implement, verify, commit' },
  { name: 'generate-tests', desc: 'Failing tests from spec (Tests-as-DoD)' },
  { name: 'post-review', desc: 'Pre-PR review (architecture, quality, requirements)' },
  { name: 'audit', desc: 'Codebase audit (security, complexity, architecture)' },
  { name: 'summary', desc: 'Post-change documentation' },
  { name: 'checkpoint', desc: 'Save session progress for resumption' },
  { name: 'backlog', desc: 'Issue management with BACK-### IDs' },
  { name: 'investigate', desc: 'Deep error and bug analysis' },
  { name: 'learn', desc: 'Post-task teaching breakdown' },
  { name: 'scaffold', desc: 'Create new projects from scratch' },
  { name: 'setup', desc: 'Interactive project configuration' },
  { name: 'worktree', desc: 'Git worktree management' },
  { name: 'opensrc', desc: 'Fetch npm/GitHub source for full context' },
  { name: 'create-skill', desc: 'Generate new custom skills' },
];

/** Addon skills keyed by addon name */
const ADDON_SKILLS: Record<AddonName, Array<{ name: string; desc: string }>> = {
  orchestration: [
    { name: 'briefing', desc: 'Pre-planning alignment Q&A' },
    { name: 'recap', desc: 'Quick session summary from git activity' },
    { name: 'handoff', desc: 'Context rotation for fresh sessions' },
  ],
  'design-best-practices': [
    { name: 'design-init', desc: 'One-time project design context setup' },
    { name: 'design-review', desc: 'Design critique with AI slop detection' },
    { name: 'design-refine', desc: 'Directional design refinement' },
    { name: 'design-system', desc: 'Design system extraction and normalization' },
    { name: 'design-harden', desc: 'Production hardening for edge cases' },
  ],
};

/**
 * Generates the available skills section for AGENTS.md / CLAUDE.md.
 * Universal format readable by any AI coding agent.
 */
function generateSkillsSection(enabledAddons?: AddonName[]): string {
  const lines = CORE_SKILLS.map((s) => `- \`/${s.name}\` — ${s.desc}`);

  const addons = enabledAddons || [];
  for (const addon of addons) {
    const addonSkills = ADDON_SKILLS[addon];
    if (addonSkills) {
      for (const s of addonSkills) {
        lines.push(`- \`/${s.name}\` — ${s.desc}`);
      }
    }
  }

  return lines.join('\n');
}

// ─── Private Helpers ───────────────────────────────────────────────────────

function getArchitectureSectionUniversal(pattern: ArchitecturePattern): string {
  if (pattern === 'clean') {
    return `Dependencies point INWARD only: Presentation → Application → Domain ← Infrastructure.

See \`docs/ARCHITECTURE.md\` for detailed structure.`;
  }

  if (pattern === 'layered') {
    return `Layered: Routes/Controllers → Services → Repositories. Each layer calls only the one below.

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

  if (pattern === 'none') {
    return `No architecture rules configured.`;
  }

  return `See \`docs/ARCHITECTURE.md\` for detailed structure.`;
}
