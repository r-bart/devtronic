import { describe, it, expect } from 'vitest';
import { generateHooks, generateCheckpointScript, generateStopGuardScript } from '../hooks.js';
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
    const result = generateHooks(createConfig(), 'npm');
    expect(() => JSON.parse(result)).not.toThrow();
  });

  it('includes all 5 hook events', () => {
    const result = JSON.parse(generateHooks(createConfig(), 'npm'));
    const events = Object.keys(result.hooks);

    expect(events).toContain('SessionStart');
    expect(events).toContain('PostToolUse');
    expect(events).toContain('Stop');
    expect(events).toContain('SubagentStop');
    expect(events).toContain('PreCompact');
    expect(events).toHaveLength(5);
  });

  it('includes description field', () => {
    const result = JSON.parse(generateHooks(createConfig(), 'npm'));
    expect(result.description).toContain('r-bart');
  });

  describe('SessionStart hook', () => {
    it('uses haiku model', () => {
      const result = JSON.parse(generateHooks(createConfig(), 'npm'));
      const hook = result.hooks.SessionStart[0].hooks[0];

      expect(hook.type).toBe('prompt');
      expect(hook.model).toBe('haiku');
    });

    it('matches startup event', () => {
      const result = JSON.parse(generateHooks(createConfig(), 'npm'));
      expect(result.hooks.SessionStart[0].matcher).toBe('startup');
    });

    it('includes $ARGUMENTS placeholder', () => {
      const result = JSON.parse(generateHooks(createConfig(), 'npm'));
      const hook = result.hooks.SessionStart[0].hooks[0];
      expect(hook.prompt).toContain('$ARGUMENTS');
    });

    it('includes STATE.md reference in prompt', () => {
      const result = JSON.parse(generateHooks(createConfig(), 'npm'));
      const hook = result.hooks.SessionStart[0].hooks[0];
      expect(hook.prompt).toContain('STATE.md');
    });
  });

  describe('PostToolUse hook', () => {
    it('matches Write|Edit tools', () => {
      const result = JSON.parse(generateHooks(createConfig(), 'npm'));
      expect(result.hooks.PostToolUse[0].matcher).toBe('Write|Edit');
    });

    it('uses command type', () => {
      const result = JSON.parse(generateHooks(createConfig(), 'npm'));
      const hook = result.hooks.PostToolUse[0].hooks[0];
      expect(hook.type).toBe('command');
    });

    it('uses npm run lint:fix for npm projects', () => {
      const result = JSON.parse(generateHooks(createConfig(), 'npm'));
      const hook = result.hooks.PostToolUse[0].hooks[0];
      expect(hook.command).toContain('npm run lint:fix');
    });

    it('uses pnpm lint:fix for pnpm projects', () => {
      const result = JSON.parse(generateHooks(createConfig(), 'pnpm'));
      const hook = result.hooks.PostToolUse[0].hooks[0];
      expect(hook.command).toContain('pnpm lint:fix');
    });

    it('uses yarn lint:fix for yarn projects', () => {
      const result = JSON.parse(generateHooks(createConfig(), 'yarn'));
      const hook = result.hooks.PostToolUse[0].hooks[0];
      expect(hook.command).toContain('yarn lint:fix');
    });

    it('uses bun lint:fix for bun projects', () => {
      const result = JSON.parse(generateHooks(createConfig(), 'bun'));
      const hook = result.hooks.PostToolUse[0].hooks[0];
      expect(hook.command).toContain('bun lint:fix');
    });

    it('falls back to npm when PM is null', () => {
      const result = JSON.parse(generateHooks(createConfig(), null));
      const hook = result.hooks.PostToolUse[0].hooks[0];
      expect(hook.command).toContain('npm run');
    });

    it('suppresses errors with 2>/dev/null || true', () => {
      const result = JSON.parse(generateHooks(createConfig(), 'npm'));
      const hook = result.hooks.PostToolUse[0].hooks[0];
      expect(hook.command).toContain('2>/dev/null || true');
    });
  });

  describe('Stop hook', () => {
    it('uses command type with stop-guard script', () => {
      const result = JSON.parse(generateHooks(createConfig(), 'npm'));
      const hook = result.hooks.Stop[0].hooks[0];
      expect(hook.type).toBe('command');
      expect(hook.command).toContain('${CLAUDE_PLUGIN_ROOT}');
      expect(hook.command).toContain('stop-guard.sh');
    });

    it('has a statusMessage for user feedback', () => {
      const result = JSON.parse(generateHooks(createConfig(), 'npm'));
      const hook = result.hooks.Stop[0].hooks[0];
      expect(hook.statusMessage).toBeTruthy();
    });

    it('has 2 hook entries (quality gate + done criteria check)', () => {
      const result = JSON.parse(generateHooks(createConfig(), 'npm'));
      const hooks = result.hooks.Stop[0].hooks;
      expect(hooks).toHaveLength(2);
      expect(hooks[0].type).toBe('command');
      expect(hooks[1].type).toBe('prompt');
      expect(hooks[1].prompt).toContain('Done Criteria');
    });
  });

  describe('SubagentStop hook', () => {
    it('uses haiku model', () => {
      const result = JSON.parse(generateHooks(createConfig(), 'npm'));
      const hook = result.hooks.SubagentStop[0].hooks[0];
      expect(hook.model).toBe('haiku');
    });

    it('includes $ARGUMENTS placeholder', () => {
      const result = JSON.parse(generateHooks(createConfig(), 'npm'));
      const hook = result.hooks.SubagentStop[0].hooks[0];
      expect(hook.prompt).toContain('$ARGUMENTS');
    });

    it('includes stop_hook_active guard in prompt', () => {
      const result = JSON.parse(generateHooks(createConfig(), 'npm'));
      const hook = result.hooks.SubagentStop[0].hooks[0];
      expect(hook.prompt).toContain('stop_hook_active');
    });
  });

  describe('PreCompact hook', () => {
    it('references CLAUDE_PLUGIN_ROOT for checkpoint script', () => {
      const result = JSON.parse(generateHooks(createConfig(), 'npm'));
      const hook = result.hooks.PreCompact[0].hooks[0];
      expect(hook.command).toContain('${CLAUDE_PLUGIN_ROOT}');
      expect(hook.command).toContain('checkpoint.sh');
    });

    it('matches auto compaction', () => {
      const result = JSON.parse(generateHooks(createConfig(), 'npm'));
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
