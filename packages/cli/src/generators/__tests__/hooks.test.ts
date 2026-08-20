import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { generateAutoLintScript, generateHooks, generateCheckpointScript, generateStopGuardScript } from '../hooks.js';
import type { ProjectConfig } from '../../types.js';

function createConfig(overrides: Partial<ProjectConfig> = {}): ProjectConfig {
  return {
    architecture: 'clean',
    layers: ['domain', 'application', 'infrastructure', 'presentation'],
    stateManagement: [],
    dataFetching: [],
    orm: [],
    testing: [],
    ui: [],
    validation: [],
    framework: 'nextjs',
    qualityCommand: 'npm run typecheck && npm run lint && npm test',
    ...overrides,
  };
}

describe('generateHooks', () => {
  it('returns valid JSON', () => {
    const result = generateHooks();
    expect(() => JSON.parse(result)).not.toThrow();
  });

  it('includes all 6 hook events', () => {
    const result = JSON.parse(generateHooks());
    const events = Object.keys(result.hooks);

    expect(events).toContain('SessionStart');
    expect(events).toContain('PostToolUse');
    expect(events).toContain('Stop');
    expect(events).toContain('SubagentStop');
    expect(events).toContain('PreCompact');
    expect(events).toContain('StopFailure');
    expect(events).toHaveLength(6);
  });

  it('includes description field', () => {
    const result = JSON.parse(generateHooks());
    expect(result.description).toContain('r-bart');
  });

  describe('SessionStart hook', () => {
    it('uses haiku model', () => {
      const result = JSON.parse(generateHooks());
      const hook = result.hooks.SessionStart[0].hooks[0];

      expect(hook.type).toBe('prompt');
      expect(hook.model).toBe('haiku');
    });

    it('matches startup event', () => {
      const result = JSON.parse(generateHooks());
      expect(result.hooks.SessionStart[0].matcher).toBe('startup');
    });

    it('includes $ARGUMENTS placeholder', () => {
      const result = JSON.parse(generateHooks());
      const hook = result.hooks.SessionStart[0].hooks[0];
      expect(hook.prompt).toContain('$ARGUMENTS');
    });

    it('includes STATE.md reference in prompt', () => {
      const result = JSON.parse(generateHooks());
      const hook = result.hooks.SessionStart[0].hooks[0];
      expect(hook.prompt).toContain('STATE.md');
    });
  });

  describe('PostToolUse hook', () => {
    it('matches Write|Edit tools', () => {
      const result = JSON.parse(generateHooks());
      expect(result.hooks.PostToolUse[0].matcher).toBe('Write|Edit');
    });

    it('uses command type', () => {
      const result = JSON.parse(generateHooks());
      const hook = result.hooks.PostToolUse[0].hooks[0];
      expect(hook.type).toBe('command');
    });

    it('delegates to the auto-lint script', () => {
      const result = JSON.parse(generateHooks());
      const hook = result.hooks.PostToolUse[0].hooks[0];
      expect(hook.command).toBe('${CLAUDE_PLUGIN_ROOT}/scripts/auto-lint.sh 2>/dev/null || true');
    });

    it('registers a single handler', () => {
      const result = JSON.parse(generateHooks());
      expect(result.hooks.PostToolUse[0].hooks).toHaveLength(1);
    });
  });

  describe('Stop hook', () => {
    it('uses command type with stop-guard script', () => {
      const result = JSON.parse(generateHooks());
      const hook = result.hooks.Stop[0].hooks[0];
      expect(hook.type).toBe('command');
      expect(hook.command).toContain('${CLAUDE_PLUGIN_ROOT}');
      expect(hook.command).toContain('stop-guard.sh');
    });

    it('has a statusMessage for user feedback', () => {
      const result = JSON.parse(generateHooks());
      const hook = result.hooks.Stop[0].hooks[0];
      expect(hook.statusMessage).toBeTruthy();
    });

    it('has 2 hook entries (quality gate + done criteria check)', () => {
      const result = JSON.parse(generateHooks());
      const hooks = result.hooks.Stop[0].hooks;
      expect(hooks).toHaveLength(2);
      expect(hooks[0].type).toBe('command');
      expect(hooks[1].type).toBe('prompt');
      expect(hooks[1].prompt).toContain('Done Criteria');
    });
  });

  describe('SubagentStop hook', () => {
    it('uses haiku model', () => {
      const result = JSON.parse(generateHooks());
      const hook = result.hooks.SubagentStop[0].hooks[0];
      expect(hook.model).toBe('haiku');
    });

    it('includes $ARGUMENTS placeholder', () => {
      const result = JSON.parse(generateHooks());
      const hook = result.hooks.SubagentStop[0].hooks[0];
      expect(hook.prompt).toContain('$ARGUMENTS');
    });

    it('includes stop_hook_active guard in prompt', () => {
      const result = JSON.parse(generateHooks());
      const hook = result.hooks.SubagentStop[0].hooks[0];
      expect(hook.prompt).toContain('stop_hook_active');
    });
  });

  describe('PreCompact hook', () => {
    it('references CLAUDE_PLUGIN_ROOT for checkpoint script', () => {
      const result = JSON.parse(generateHooks());
      const hook = result.hooks.PreCompact[0].hooks[0];
      expect(hook.command).toContain('${CLAUDE_PLUGIN_ROOT}');
      expect(hook.command).toContain('checkpoint.sh');
    });

    it('matches auto compaction', () => {
      const result = JSON.parse(generateHooks());
      expect(result.hooks.PreCompact[0].matcher).toBe('auto');
    });
  });
});

describe('generateStopGuardScript', () => {
  it('starts with shebang', () => {
    const script = generateStopGuardScript(createConfig());
    expect(script.startsWith('#!/bin/bash')).toBe(true);
  });

  it('checks stop_hook_active to prevent infinite loops', () => {
    const script = generateStopGuardScript(createConfig());
    expect(script).toContain('stop_hook_active');
    expect(script).toContain('exit 0');
  });

  it('includes the project quality command', () => {
    const config = createConfig({ qualityCommand: 'pnpm typecheck && pnpm lint' });
    const script = generateStopGuardScript(config);
    expect(script).toContain('pnpm typecheck && pnpm lint');
  });

  it('exits 2 on quality failure to block stop', () => {
    const script = generateStopGuardScript(createConfig());
    expect(script).toContain('exit 2');
  });

  it('reads input from stdin', () => {
    const script = generateStopGuardScript(createConfig());
    expect(script).toContain('INPUT=$(cat)');
  });
});

describe('generateCheckpointScript', () => {
  it('starts with shebang', () => {
    const script = generateCheckpointScript();
    expect(script.startsWith('#!/bin/bash')).toBe(true);
  });

  it('creates thoughts/checkpoints directory', () => {
    const script = generateCheckpointScript();
    expect(script).toContain('mkdir -p "$CHECKPOINT_DIR"');
  });

  it('captures git diff --stat', () => {
    const script = generateCheckpointScript();
    expect(script).toContain('git diff --stat');
  });

  it('captures git log', () => {
    const script = generateCheckpointScript();
    expect(script).toContain('git log --oneline -5');
  });

  it('outputs to thoughts/checkpoints/ with timestamp', () => {
    const script = generateCheckpointScript();
    expect(script).toContain('CHECKPOINT_DIR="thoughts/checkpoints"');
    expect(script).toContain('TIMESTAMP=');
  });

  it('updates thoughts/STATE.md', () => {
    const script = generateCheckpointScript();
    expect(script).toContain('STATE_FILE');
    expect(script).toContain('thoughts/STATE.md');
  });
});

describe('generateAutoLintScript', () => {
  const pms = [
    ['npm', 'npm run lint:fix'],
    ['pnpm', 'pnpm lint:fix'],
    ['yarn', 'yarn lint:fix'],
    ['bun', 'bun lint:fix'],
  ] as const;

  for (const [pm, expected] of pms) {
    it(`uses ${expected} for ${pm} projects`, () => {
      expect(generateAutoLintScript(createConfig(), pm)).toContain(expected);
    });
  }

  it('falls back to npm when PM is null', () => {
    expect(generateAutoLintScript(createConfig(), null)).toContain('npm run');
  });

  it('suppresses errors with 2>/dev/null || true', () => {
    expect(generateAutoLintScript(createConfig(), 'npm')).toContain('2>/dev/null || true');
  });

  // The filter is why the hook exists: a README write must not run the linter.
  it('skips non-source edits and keeps every JS/TS extension', () => {
    const script = generateAutoLintScript(createConfig(), 'npm');
    for (const ext of ['*.ts', '*.tsx', '*.js', '*.jsx', '*.mjs', '*.cjs']) {
      expect(script, `${ext} not covered`).toContain(ext);
    }
    expect(script).toContain('exit 0 ;; # non-source edit');
  });

  it('adds the framework extension for single-file-component stacks', () => {
    expect(generateAutoLintScript({ ...createConfig(), framework: 'vue' }, 'npm')).toContain('*.vue');
    expect(generateAutoLintScript({ ...createConfig(), framework: 'svelte' }, 'npm')).toContain(
      '*.svelte'
    );
    expect(generateAutoLintScript({ ...createConfig(), framework: 'astro' }, 'npm')).toContain(
      '*.astro'
    );
  });

  it('lints when the file path cannot be determined', () => {
    expect(generateAutoLintScript(createConfig(), 'npm')).toContain('preserve prior behavior');
  });
});

// The CLI generates hooks.json for the local plugin, and templates/marketplace
// ships the same file for the GitHub plugin. They drifted before (one filtered
// non-source edits, the other did not); this keeps them in step.
describe('generated hooks match the bundled marketplace hooks', () => {
  const bundled = JSON.parse(
    readFileSync(resolve(__dirname, '../../../templates/marketplace/hooks.json'), 'utf-8')
  );

  it('declares the same events', () => {
    expect(Object.keys(JSON.parse(generateHooks()).hooks).sort()).toEqual(
      Object.keys(bundled.hooks).sort()
    );
  });

  it('is identical', () => {
    expect(JSON.parse(generateHooks())).toEqual(bundled);
  });
});
