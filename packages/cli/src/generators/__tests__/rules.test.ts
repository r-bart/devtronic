import { describe, it, expect } from 'vitest';
import {
  generateClaudeMd,
  generateAgentsMdFromConfig,
  generateQualityCommands,
  generateAgentsMd,
} from '../rules.js';
import type { ProjectConfig, ProjectAnalysis, ScriptsInfo } from '../../types.js';

function createConfig(overrides: Partial<ProjectConfig> = {}): ProjectConfig {
  return {
    architecture: 'clean',
    layers: ['domain', 'application', 'infrastructure', 'presentation'],
    stateManagement: ['Zustand'],
    dataFetching: ['React Query'],
    orm: ['Prisma'],
    testing: ['Vitest'],
    ui: ['Tailwind CSS'],
    validation: ['Zod'],
    framework: 'nextjs',
    qualityCommand: 'npm run typecheck && npm run lint && npm test',
    ...overrides,
  };
}

function createScripts(overrides: Partial<ScriptsInfo> = {}): ScriptsInfo {
  return {
    typecheck: 'typecheck',
    lint: 'lint',
    test: 'test',
    build: 'build',
    dev: 'dev',
    ...overrides,
  };
}

describe('generateClaudeMd', () => {
  it('includes framework name in title', () => {
    const result = generateClaudeMd(createConfig(), createScripts(), 'npm');
    expect(result).toMatch(/^# Next\.js/);
  });

  it('includes framework display name in description', () => {
    const result = generateClaudeMd(
      createConfig({ framework: 'react' }),
      createScripts(),
      'npm'
    );
    expect(result).toContain('React project with');
  });

  it('includes quality command from config', () => {
    const result = generateClaudeMd(
      createConfig({ qualityCommand: 'pnpm typecheck && pnpm lint' }),
      createScripts(),
      'pnpm'
    );
    expect(result).toContain('pnpm typecheck && pnpm lint');
  });

  it('includes Workflow with /slash-commands', () => {
    const result = generateClaudeMd(createConfig(), createScripts(), 'npm');
    expect(result).toContain('/brief');
    expect(result).toContain('/spec');
    expect(result).toContain('/research --deep');
    expect(result).toContain('/create-plan');
    expect(result).toContain('/post-review');
    expect(result).toContain('/checkpoint');
  });

  it('includes Gotchas section (empty)', () => {
    const result = generateClaudeMd(createConfig(), createScripts(), 'npm');
    expect(result).toContain('## Gotchas');
    expect(result).toContain('Claude fills this section via self-improvement');
  });

  it('includes Self-Improvement section', () => {
    const result = generateClaudeMd(createConfig(), createScripts(), 'npm');
    expect(result).toContain('## Self-Improvement');
    expect(result).toContain('Update CLAUDE.md');
  });

  it('references .claude/skills/ and .claude/agents/', () => {
    const result = generateClaudeMd(createConfig(), createScripts(), 'npm');
    expect(result).toContain('.claude/skills/');
    expect(result).toContain('.claude/agents/');
  });

  it('does NOT duplicate detailed architecture rules', () => {
    const result = generateClaudeMd(createConfig(), createScripts(), 'npm');
    expect(result).not.toContain('Common Violations');
    expect(result).not.toContain('Layer Rule');
    expect(result).not.toContain('Quick Reference');
  });

  it('includes code patterns from config', () => {
    const result = generateClaudeMd(createConfig(), createScripts(), 'npm');
    expect(result).toContain('Zustand');
    expect(result).toContain('React Query');
    expect(result).toContain('Prisma');
  });

  it('is less than 110 lines', () => {
    const result = generateClaudeMd(createConfig(), createScripts(), 'npm');
    const lineCount = result.split('\n').length;
    expect(lineCount).toBeLessThan(110);
  });

  it('includes architecture one-liner for clean', () => {
    const result = generateClaudeMd(createConfig(), createScripts(), 'npm');
    expect(result).toContain('Dependencies point INWARD only');
  });

  it('includes architecture one-liner for mvc', () => {
    const result = generateClaudeMd(
      createConfig({ architecture: 'mvc' }),
      createScripts(),
      'npm'
    );
    expect(result).toContain('Model-View-Controller');
  });

  it('includes dev and build commands', () => {
    const result = generateClaudeMd(createConfig(), createScripts(), 'npm');
    expect(result).toContain('npm run dev');
    expect(result).toContain('npm run build');
  });

  it('uses correct package manager prefix', () => {
    const result = generateClaudeMd(createConfig(), createScripts(), 'pnpm');
    expect(result).toContain('pnpm dev');
    expect(result).toContain('pnpm build');
  });

  it('includes Project Notes section', () => {
    const result = generateClaudeMd(createConfig(), createScripts(), 'npm');
    expect(result).toContain('## Project Notes');
    expect(result).toContain('thoughts/notes/');
  });

  it('includes References section with docs links', () => {
    const result = generateClaudeMd(createConfig(), createScripts(), 'npm');
    expect(result).toContain('## References');
    expect(result).toContain('docs/ARCHITECTURE.md');
    expect(result).toContain('docs/worktrees.md');
  });
});

describe('generateAgentsMdFromConfig (stripped)', () => {
  it('includes available skills with /slash-commands', () => {
    const result = generateAgentsMdFromConfig(createConfig(), createScripts(), 'npm');
    expect(result).toContain('## Available Skills');
    expect(result).toContain('/brief');
    expect(result).toContain('/spec');
    expect(result).toContain('/create-plan');
  });

  it('does NOT include references to .claude/', () => {
    const result = generateAgentsMdFromConfig(createConfig(), createScripts(), 'npm');
    expect(result).not.toContain('.claude/');
  });

  it('does NOT include Self-Improvement', () => {
    const result = generateAgentsMdFromConfig(createConfig(), createScripts(), 'npm');
    expect(result).not.toContain('Self-Improvement');
  });

  it('does NOT include Gotchas', () => {
    const result = generateAgentsMdFromConfig(createConfig(), createScripts(), 'npm');
    expect(result).not.toContain('Gotchas');
  });

  it('includes Workflow section', () => {
    const result = generateAgentsMdFromConfig(createConfig(), createScripts(), 'npm');
    expect(result).toContain('## Workflow');
    expect(result).toContain('/brief');
  });

  it('includes Commands section', () => {
    const result = generateAgentsMdFromConfig(createConfig(), createScripts(), 'npm');
    expect(result).toContain('## Commands');
    expect(result).toContain('npm run dev');
    expect(result).toContain('npm run build');
  });

  it('includes Architecture section', () => {
    const result = generateAgentsMdFromConfig(createConfig(), createScripts(), 'npm');
    expect(result).toContain('## Architecture');
    expect(result).toContain('Dependencies point INWARD only');
  });

  it('includes Code Style section', () => {
    const result = generateAgentsMdFromConfig(createConfig(), createScripts(), 'npm');
    expect(result).toContain('## Code Style');
    expect(result).toContain('PascalCase');
    expect(result).toContain('camelCase');
  });

  it('includes Code Patterns section', () => {
    const result = generateAgentsMdFromConfig(createConfig(), createScripts(), 'npm');
    expect(result).toContain('## Code Patterns');
    expect(result).toContain('Zustand');
    expect(result).toContain('React Query');
  });

  it('is less than 70 lines', () => {
    const result = generateAgentsMdFromConfig(createConfig(), createScripts(), 'npm');
    const lineCount = result.split('\n').length;
    expect(lineCount).toBeLessThan(70);
  });

  it('includes framework name in title', () => {
    const result = generateAgentsMdFromConfig(createConfig(), createScripts(), 'npm');
    expect(result).toMatch(/^# Next\.js/);
  });

  it('references docs/ARCHITECTURE.md', () => {
    const result = generateAgentsMdFromConfig(createConfig(), createScripts(), 'npm');
    expect(result).toContain('docs/ARCHITECTURE.md');
  });
});

describe('generateQualityCommands', () => {
  it('chains typecheck, lint and test with &&', () => {
    const scripts = createScripts();
    const result = generateQualityCommands(scripts, 'npm');
    expect(result).toBe('npm run typecheck && npm run lint && npm run test');
  });

  it('uses pnpm prefix when package manager is pnpm', () => {
    const scripts = createScripts();
    const result = generateQualityCommands(scripts, 'pnpm');
    expect(result).toBe('pnpm typecheck && pnpm lint && pnpm test');
  });

  it('omits missing scripts', () => {
    const scripts = createScripts({ typecheck: null, test: null });
    const result = generateQualityCommands(scripts, 'npm');
    expect(result).toBe('npm run lint');
  });

  it('returns fallback when no scripts detected', () => {
    const scripts = createScripts({ typecheck: null, lint: null, test: null });
    const result = generateQualityCommands(scripts, 'npm');
    expect(result).toContain('No quality scripts detected');
  });

  it('defaults to npm when package manager is null', () => {
    const scripts = createScripts({ typecheck: null, test: null });
    const result = generateQualityCommands(scripts, null);
    expect(result).toBe('npm run lint');
  });
});

describe('generateAgentsMd (from analysis)', () => {
  function createAnalysis(overrides: Partial<ProjectAnalysis> = {}): ProjectAnalysis {
    return {
      packageManager: 'npm',
      framework: { name: 'nextjs', version: '14.0.0' },
      architecture: { pattern: 'clean', layers: ['domain', 'application'], hasTests: true },
      scripts: createScripts(),
      existingConfigs: {
        'claude-code': false,
        cursor: false,
        antigravity: false,
        'github-copilot': false,
      },
      stack: {
        stateManagement: [],
        dataFetching: [],
        orm: [],
        testing: [],
        ui: [],
        validation: [],
        api: [],
      },
      hasTypescript: true,
      hasGit: true,
      ...overrides,
    };
  }

  it('includes AI Agents Guide header', () => {
    const result = generateAgentsMd(createAnalysis());
    expect(result).toContain('# AI Agents Guide');
  });

  it('includes dev and build commands', () => {
    const result = generateAgentsMd(createAnalysis());
    expect(result).toContain('npm run dev');
    expect(result).toContain('npm run build');
  });

  it('uses pnpm prefix when package manager is pnpm', () => {
    const result = generateAgentsMd(createAnalysis({ packageManager: 'pnpm' }));
    expect(result).toContain('pnpm dev');
    expect(result).toContain('pnpm build');
  });

  it('shows placeholder when dev/build scripts missing', () => {
    const result = generateAgentsMd(
      createAnalysis({ scripts: createScripts({ dev: null, build: null }) })
    );
    expect(result).toContain('Add your dev command');
    expect(result).toContain('Add your build command');
  });

  it('includes Clean + DDD label for clean architecture', () => {
    const result = generateAgentsMd(createAnalysis());
    expect(result).toContain('Architecture: Clean + DDD');
  });

  it('omits architecture label for non-clean patterns', () => {
    const result = generateAgentsMd(
      createAnalysis({ architecture: { pattern: 'mvc', layers: [], hasTests: true } })
    );
    expect(result).not.toContain(': Clean + DDD');
    expect(result).toContain('## Architecture');
  });

  it('includes MVC architecture description', () => {
    const result = generateAgentsMd(
      createAnalysis({ architecture: { pattern: 'mvc', layers: [], hasTests: true } })
    );
    expect(result).toContain('Model-View-Controller');
  });

  it('includes feature-based architecture description', () => {
    const result = generateAgentsMd(
      createAnalysis({
        architecture: { pattern: 'feature-based', layers: [], hasTests: true },
      })
    );
    expect(result).toContain('self-contained');
  });

  it('includes flat architecture description', () => {
    const result = generateAgentsMd(
      createAnalysis({ architecture: { pattern: 'flat', layers: [], hasTests: true } })
    );
    expect(result).toContain('docs/ARCHITECTURE.md');
  });

  it('includes Code Patterns and Code Style sections', () => {
    const result = generateAgentsMd(createAnalysis());
    expect(result).toContain('## Code Patterns');
    expect(result).toContain('## Code Style');
    expect(result).toContain('PascalCase');
  });

  it('defaults to npm when package manager is null', () => {
    const result = generateAgentsMd(createAnalysis({ packageManager: null }));
    expect(result).toContain('npm run dev');
  });
});

describe('getCodePatternsBullets edge cases', () => {
  it('omits state management line when empty', () => {
    const result = generateClaudeMd(
      createConfig({ stateManagement: [], dataFetching: [], orm: [] }),
      createScripts(),
      'npm'
    );
    expect(result).not.toContain('**UI state**');
    expect(result).not.toContain('**Server state**');
  });

  it('includes repository pattern note for clean + ORM', () => {
    const result = generateClaudeMd(
      createConfig({ architecture: 'clean', orm: ['Prisma'] }),
      createScripts(),
      'npm'
    );
    expect(result).toContain('Repository interfaces in `domain/`');
  });

  it('omits repository pattern note for non-clean architecture', () => {
    const result = generateClaudeMd(
      createConfig({ architecture: 'mvc', orm: ['Prisma'] }),
      createScripts(),
      'npm'
    );
    expect(result).not.toContain('Repository interfaces in `domain/`');
  });
});

describe('generateClaudeMd edge cases', () => {
  it('includes feature-based architecture one-liner', () => {
    const result = generateClaudeMd(
      createConfig({ architecture: 'feature-based' }),
      createScripts(),
      'npm'
    );
    expect(result).toContain('self-contained');
  });

  it('includes flat architecture one-liner', () => {
    const result = generateClaudeMd(
      createConfig({ architecture: 'flat' }),
      createScripts(),
      'npm'
    );
    expect(result).toContain('Document your architecture patterns');
  });

  it('shows placeholder when dev/build scripts are missing', () => {
    const result = generateClaudeMd(
      createConfig(),
      createScripts({ dev: null, build: null }),
      'npm'
    );
    expect(result).toContain('Add your dev command');
    expect(result).toContain('Add your build command');
  });

  it('defaults to npm when package manager is null', () => {
    const result = generateClaudeMd(createConfig(), createScripts(), null);
    expect(result).toContain('npm run dev');
  });
});
