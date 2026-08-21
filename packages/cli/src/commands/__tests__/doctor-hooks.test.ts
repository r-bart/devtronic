/**
 * `checkHookScripts()` — the check that should have caught this whole episode.
 *
 * It reads the plugin's hooks file and verifies every `command` hook points at a
 * script that exists. It walked the JSON wrongly, found zero commands, and
 * reported "pass" on every project — including one whose hook pointed at a
 * script the plugin no longer shipped.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { checkHookScripts } from '../doctor.js';
import type { Manifest } from '../../types.js';

const PLUGIN_PATH = '.claude-plugins/devtronic';

function manifest(): Manifest {
  return {
    version: '1.5.2',
    implantedAt: '2026-08-21',
    selectedIDEs: ['claude-code'],
    installMode: 'plugin',
    pluginPath: PLUGIN_PATH,
    files: {},
  } as Manifest;
}

/** The real nesting: hooks → event → matcher entry → hook entries. */
function hooksFile(commands: string[]) {
  return JSON.stringify({
    description: 'devtronic hooks',
    hooks: {
      PostToolUse: [
        {
          matcher: 'Write|Edit',
          hooks: commands.map((command) => ({ type: 'command', command, timeout: 30 })),
        },
      ],
      SessionStart: [{ hooks: [{ type: 'prompt', prompt: 'orient', model: 'x' }] }],
    },
  });
}

describe('checkHookScripts', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'doctor-hooks-'));
    mkdirSync(join(tempDir, PLUGIN_PATH, 'hooks'), { recursive: true });
    mkdirSync(join(tempDir, PLUGIN_PATH, 'scripts'), { recursive: true });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  function writeHooks(commands: string[]) {
    writeFileSync(join(tempDir, PLUGIN_PATH, 'hooks', 'hooks.json'), hooksFile(commands));
  }

  function writeScript(name: string) {
    writeFileSync(join(tempDir, PLUGIN_PATH, 'scripts', name), '#!/bin/bash\n');
  }

  it('warns when a hook points at a script that is not there', () => {
    writeHooks(['${CLAUDE_PLUGIN_ROOT}/scripts/stop-guard.sh']);

    const result = checkHookScripts(tempDir, manifest());

    expect(result.status).toBe('warn');
    expect(result.message).toContain('0/1');
  });

  it('passes when every referenced script exists', () => {
    writeScript('auto-lint.sh');
    writeHooks(['${CLAUDE_PLUGIN_ROOT}/scripts/auto-lint.sh']);

    const result = checkHookScripts(tempDir, manifest());

    expect(result.status).toBe('pass');
    expect(result.message).toBe('Hook scripts exist');
  });

  it('counts every command in the file, not just the first', () => {
    writeScript('auto-lint.sh');
    writeHooks([
      '${CLAUDE_PLUGIN_ROOT}/scripts/auto-lint.sh',
      '${CLAUDE_PLUGIN_ROOT}/scripts/checkpoint.sh',
      '${CLAUDE_PLUGIN_ROOT}/scripts/version-check.sh',
    ]);

    const result = checkHookScripts(tempDir, manifest());

    expect(result.message).toContain('1/3');
  });

  it('accepts an inline command that references no script', () => {
    writeHooks(['rm -f .claude/.loop-owner; exit 0']);

    const result = checkHookScripts(tempDir, manifest());

    expect(result.status).toBe('pass');
  });

  it('reports nothing to verify when the file has only prompt hooks', () => {
    writeFileSync(
      join(tempDir, PLUGIN_PATH, 'hooks', 'hooks.json'),
      JSON.stringify({ hooks: { SessionStart: [{ hooks: [{ type: 'prompt', prompt: 'hi' }] }] } })
    );

    const result = checkHookScripts(tempDir, manifest());

    expect(result.message).toBe('No hook scripts to verify');
  });
});
