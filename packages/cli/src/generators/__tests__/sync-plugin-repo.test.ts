/**
 * Runs the real `scripts/sync-plugin-repo.sh` against a fixture that mirrors the
 * published plugin repo, including the stale files a previous release left in it.
 *
 * This is the step that ships hooks to every user. It used to live inline in
 * release.yml, where nothing could run it: it copied each script by name and
 * deleted none, so a retired hook script stayed in the published plugin — and in
 * every user's cache — release after release.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const WORKSPACE = resolve(process.cwd(), '..', '..');
const SYNC_SCRIPT = join(WORKSPACE, 'scripts', 'sync-plugin-repo.sh');

/** The published plugin as of v1.5.1: four scripts, a Stop hook, stale skills. */
function buildFixture(root: string): string {
  const pluginDir = join(root, 'plugins', 'devtronic');
  mkdirSync(join(pluginDir, 'scripts'), { recursive: true });
  mkdirSync(join(pluginDir, 'hooks'), { recursive: true });
  mkdirSync(join(pluginDir, '.claude-plugin'), { recursive: true });
  mkdirSync(join(pluginDir, 'skills', 'retired-skill'), { recursive: true });
  mkdirSync(join(pluginDir, 'agents'), { recursive: true });

  for (const script of ['auto-lint.sh', 'checkpoint.sh', 'version-check.sh', 'stop-guard.sh']) {
    writeFileSync(join(pluginDir, 'scripts', script), '#!/bin/bash\n# stale\n');
  }
  writeFileSync(
    join(pluginDir, 'hooks', 'hooks.json'),
    JSON.stringify({ hooks: { Stop: [{ hooks: [{ type: 'command', command: 'x' }] }] } })
  );
  writeFileSync(join(pluginDir, 'skills', 'retired-skill', 'SKILL.md'), '# gone\n');
  writeFileSync(join(pluginDir, 'agents', 'retired-agent.md'), '# gone\n');
  writeFileSync(join(pluginDir, '.claude-plugin', 'plugin.json'), '{"version":"1.5.1"}');
  return pluginDir;
}

function runSync(root: string, version = '1.5.2'): string {
  return execFileSync('bash', [SYNC_SCRIPT, WORKSPACE, root, version], {
    encoding: 'utf-8',
    stdio: 'pipe',
  });
}

describe('sync-plugin-repo.sh', () => {
  let tempDir: string;
  let pluginDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'sync-plugin-'));
    pluginDir = buildFixture(tempDir);
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('removes a script the templates no longer carry', () => {
    runSync(tempDir);

    expect(existsSync(join(pluginDir, 'scripts', 'stop-guard.sh'))).toBe(false);
  });

  it('ships exactly the scripts the templates carry, and makes them executable', () => {
    runSync(tempDir);

    const shipped = ['auto-lint.sh', 'checkpoint.sh', 'version-check.sh'];
    for (const script of shipped) {
      const path = join(pluginDir, 'scripts', script);
      expect(existsSync(path)).toBe(true);
      // Owner-executable bit.
      expect(statSync(path).mode & 0o100).toBe(0o100);
    }
  });

  it('publishes hooks with no Stop event', () => {
    runSync(tempDir);

    const hooks = JSON.parse(readFileSync(join(pluginDir, 'hooks', 'hooks.json'), 'utf-8'));
    expect(hooks.hooks.Stop).toBeUndefined();
    expect(Object.keys(hooks.hooks).sort()).toEqual([
      'PostToolUse',
      'PreCompact',
      'SessionStart',
      'StopFailure',
      'SubagentStop',
    ]);
  });

  it('leaves no hook pointing at a script it did not ship', () => {
    runSync(tempDir);

    const hooks = readFileSync(join(pluginDir, 'hooks', 'hooks.json'), 'utf-8');
    for (const ref of hooks.match(/scripts\/[A-Za-z0-9_.-]+\.sh/g) ?? []) {
      expect(existsSync(join(pluginDir, ref))).toBe(true);
    }
  });

  it('fails loudly when a hook references a missing script', () => {
    // A throwaway workspace, so the real templates are never touched — other
    // test files read them at the same time.
    const fakeWs = mkdtempSync(join(tmpdir(), 'fake-ws-'));
    const templates = join(fakeWs, 'packages', 'cli', 'templates');
    mkdirSync(join(templates, 'marketplace'), { recursive: true });
    mkdirSync(join(templates, 'claude-code', '.claude', 'skills', 'brief'), { recursive: true });
    mkdirSync(join(templates, 'claude-code', '.claude', 'agents'), { recursive: true });
    writeFileSync(join(templates, 'claude-code', '.claude', 'skills', 'brief', 'SKILL.md'), '# brief\n');
    writeFileSync(join(templates, 'claude-code', '.claude', 'agents', 'a.md'), '# a\n');
    writeFileSync(join(templates, 'marketplace', 'auto-lint.sh'), '#!/bin/bash\n');
    writeFileSync(
      join(templates, 'marketplace', 'hooks.json'),
      JSON.stringify({
        hooks: {
          PostToolUse: [
            { hooks: [{ type: 'command', command: '${CLAUDE_PLUGIN_ROOT}/scripts/ghost-script.sh' }] },
          ],
        },
      })
    );

    try {
      expect(() =>
        execFileSync('bash', [SYNC_SCRIPT, fakeWs, tempDir, '1.5.2'], { encoding: 'utf-8', stdio: 'pipe' })
      ).toThrow();
      expect(existsSync(join(pluginDir, 'scripts', 'ghost-script.sh'))).toBe(false);
    } finally {
      rmSync(fakeWs, { recursive: true, force: true });
    }
  });

  it('mirrors skills and agents instead of merging them', () => {
    runSync(tempDir);

    expect(existsSync(join(pluginDir, 'skills', 'retired-skill'))).toBe(false);
    expect(existsSync(join(pluginDir, 'agents', 'retired-agent.md'))).toBe(false);
    expect(existsSync(join(pluginDir, 'skills', 'brief'))).toBe(true);
  });

  it('stamps the released version and the real skill and agent counts', () => {
    const output = runSync(tempDir, '9.9.9');

    const plugin = JSON.parse(readFileSync(join(pluginDir, '.claude-plugin', 'plugin.json'), 'utf-8'));
    expect(plugin.version).toBe('9.9.9');
    expect(plugin.description).toMatch(/^Agentic development toolkit — \d+ skills, \d+ agents/);
    expect(plugin.description).not.toContain('0 skills');
    expect(output).toContain('9.9.9');
  });

  it('is the script the release workflow actually calls, with the same arguments', () => {
    const workflow = readFileSync(join(WORKSPACE, '.github/workflows/release.yml'), 'utf-8');

    // Argument order is the contract between the workflow and this script.
    expect(workflow).toContain(
      'bash "$GITHUB_WORKSPACE/scripts/sync-plugin-repo.sh" "$GITHUB_WORKSPACE" /tmp/plugin-repo "$VERSION"'
    );
    // The file operations must not creep back into the workflow, where nothing
    // can run them.
    expect(workflow).not.toContain('templates/marketplace/');
    expect(statSync(SYNC_SCRIPT).mode & 0o100).toBe(0o100);
  });

  it('refuses to run against a directory that is not a plugin checkout', () => {
    const empty = mkdtempSync(join(tmpdir(), 'not-a-plugin-'));
    try {
      expect(() => runSync(empty)).toThrow();
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
  });
});
