/**
 * `stripDevtronicHooks` removes devtronic's own inline hooks from
 * `.claude/settings.json` once the project gets them from the plugin instead.
 *
 * A project installed before the plugin migration kept its standalone hooks in
 * settings.json. The migration registered the plugin and left them there, so
 * both ran: the same SessionStart prompt fired twice on every session, and the
 * unfiltered `npx eslint --fix` linted every markdown write alongside the
 * plugin's filtered `auto-lint.sh`.
 *
 * The dangerous half is the other direction. A hook devtronic did not write is
 * the user's, and deleting it takes work they cannot get back — so matching is
 * by signature and anything unrecognised survives.
 */
import { describe, it, expect } from 'vitest';
import { stripDevtronicHooks } from '../settings.js';
import type { ClaudeSettings } from '../settings.js';

function withHooks(hooks: unknown): ClaudeSettings {
  return { hooks, enabledPlugins: { 'devtronic@devtronic': true } } as ClaudeSettings;
}

function hooksOf(settings: ClaudeSettings): Record<string, unknown[]> {
  return (settings.hooks ?? {}) as Record<string, unknown[]>;
}

/** The exact shape a pre-plugin devtronic install left behind. */
const LEGACY = {
  SessionStart: [
    {
      matcher: 'startup',
      hooks: [{ type: 'prompt', prompt: 'Quick project orientation: First check...', model: 'haiku' }],
    },
  ],
  PostToolUse: [
    {
      matcher: 'Write|Edit',
      hooks: [{ type: 'command', command: 'npx eslint --fix --quiet 2>/dev/null || true' }],
    },
  ],
  SubagentStop: [{ hooks: [{ type: 'prompt', prompt: 'A subagent has finished. Based on...' }] }],
};

// ─── Devtronic's own hooks go ─────────────────────────────────────────────────

describe('stripDevtronicHooks — removes what devtronic wrote', () => {
  it('removes the whole legacy set', () => {
    const { settings, removed } = stripDevtronicHooks(withHooks(LEGACY));
    expect(settings.hooks).toBeUndefined();
    expect(removed.sort()).toEqual(['PostToolUse', 'SessionStart', 'SubagentStop']);
  });

  it('removes the plugin-root script hooks', () => {
    const { settings } = stripDevtronicHooks(
      withHooks({
        Stop: [{ hooks: [{ type: 'command', command: '${CLAUDE_PLUGIN_ROOT}/scripts/stop-guard.sh' }] }],
      })
    );
    expect(settings.hooks).toBeUndefined();
  });

  it('removes the standalone script paths', () => {
    const { settings } = stripDevtronicHooks(
      withHooks({
        PreCompact: [{ hooks: [{ type: 'command', command: '.claude/scripts/checkpoint.sh' }] }],
      })
    );
    expect(settings.hooks).toBeUndefined();
  });

  it('leaves the rest of the settings untouched', () => {
    const { settings } = stripDevtronicHooks(withHooks(LEGACY));
    expect(settings.enabledPlugins).toEqual({ 'devtronic@devtronic': true });
  });

  it('is idempotent', () => {
    const once = stripDevtronicHooks(withHooks(LEGACY)).settings;
    const twice = stripDevtronicHooks(once);
    expect(twice.settings).toEqual(once);
    expect(twice.removed).toEqual([]);
  });
});

// ─── The user's hooks stay ────────────────────────────────────────────────────

describe('stripDevtronicHooks — never touches the user', () => {
  it('keeps a hook devtronic did not write', () => {
    const mine = { PostToolUse: [{ matcher: 'Write', hooks: [{ type: 'command', command: 'make fmt' }] }] };
    const { settings, removed } = stripDevtronicHooks(withHooks(mine));
    expect(hooksOf(settings)).toEqual(mine);
    expect(removed).toEqual([]);
  });

  it('keeps the user hook and drops devtronic\'s from the same matcher', () => {
    const { settings, removed } = stripDevtronicHooks(
      withHooks({
        PostToolUse: [
          {
            matcher: 'Write|Edit',
            hooks: [
              { type: 'command', command: 'npx eslint --fix --quiet 2>/dev/null || true' },
              { type: 'command', command: './scripts/notify.sh' },
            ],
          },
        ],
      })
    );
    expect(hooksOf(settings).PostToolUse).toEqual([
      { matcher: 'Write|Edit', hooks: [{ type: 'command', command: './scripts/notify.sh' }] },
    ]);
    expect(removed).toEqual(['PostToolUse']);
  });

  it('keeps a user prompt hook that merely mentions the same words', () => {
    const mine = {
      SessionStart: [{ hooks: [{ type: 'prompt', prompt: 'Remind me about quick project orientation' }] }],
    };
    const { settings, removed } = stripDevtronicHooks(withHooks(mine));
    expect(hooksOf(settings)).toEqual(mine);
    expect(removed).toEqual([]);
  });

  it('keeps a user hook on an event devtronic also used', () => {
    const { settings } = stripDevtronicHooks(
      withHooks({
        SessionStart: [
          { matcher: 'startup', hooks: [{ type: 'prompt', prompt: 'Quick project orientation: ...' }] },
          { matcher: 'resume', hooks: [{ type: 'command', command: 'git fetch' }] },
        ],
      })
    );
    expect(hooksOf(settings).SessionStart).toEqual([
      { matcher: 'resume', hooks: [{ type: 'command', command: 'git fetch' }] },
    ]);
  });
});

// ─── Shapes that must not throw ───────────────────────────────────────────────

describe('stripDevtronicHooks — odd input', () => {
  it('handles settings with no hooks', () => {
    const settings = { enabledPlugins: {} } as ClaudeSettings;
    expect(stripDevtronicHooks(settings)).toEqual({ settings, removed: [] });
  });

  it('handles an empty hooks object', () => {
    const { settings, removed } = stripDevtronicHooks(withHooks({}));
    expect(settings.hooks).toBeUndefined();
    expect(removed).toEqual([]);
  });

  it('keeps an empty matcher array the user left behind', () => {
    // `Stop: []` is not devtronic's to remove, and removing it changes nothing.
    const { settings } = stripDevtronicHooks(withHooks({ Stop: [] }));
    expect(settings.hooks).toBeUndefined();
  });

  it('keeps a matcher whose hooks list is empty', () => {
    const { settings } = stripDevtronicHooks(withHooks({ Stop: [{ hooks: [] }] }));
    expect(hooksOf(settings).Stop).toEqual([{ hooks: [] }]);
  });

  it('leaves a non-array event value alone', () => {
    const { settings } = stripDevtronicHooks(withHooks({ Stop: 'nonsense' }));
    expect(hooksOf(settings).Stop).toBe('nonsense');
  });

  it('ignores a hook entry with neither command nor prompt', () => {
    const mine = { Stop: [{ hooks: [{ type: 'agent', agent: 'reviewer' }] }] };
    const { settings } = stripDevtronicHooks(withHooks(mine));
    expect(hooksOf(settings)).toEqual(mine);
  });
});
