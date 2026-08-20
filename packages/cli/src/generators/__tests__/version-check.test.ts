/**
 * The SessionStart version check tells you when a project's devtronic files
 * and the installed CLI have drifted apart.
 *
 * The plumbing to know this has existed since the manifest did — the manifest
 * records the version that wrote the files, and the CLI knows its own — but
 * nothing ran the comparison unless you typed `devtronic info`. So a project
 * sat on 1.3.0 for two minor releases without anything saying so. This one did.
 *
 * The script reports and stops there. `devtronic update` retires files and asks
 * about the ones you made yours, and applying that unattended is how work gets
 * lost; detection is the automatable half.
 */
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { generateHooks, generateVersionCheckScript } from '../hooks.js';

const BUNDLED = resolve(__dirname, '../../../templates/marketplace/version-check.sh');

// ─── The two copies are one text ──────────────────────────────────────────────

describe('the generated and bundled scripts do not drift', () => {
  it('are identical', () => {
    // The same guard as hooks.json, for the same reason: the CLI writes one
    // copy and the marketplace ships the other, and they diverged once before.
    expect(generateVersionCheckScript()).toBe(readFileSync(BUNDLED, 'utf-8'));
  });
});

// ─── The hook is wired in ─────────────────────────────────────────────────────

describe('SessionStart runs the check', () => {
  const hooks = JSON.parse(generateHooks()).hooks;

  it('registers it on startup', () => {
    const commands = hooks.SessionStart.flatMap((m: { hooks: { command?: string }[] }) =>
      m.hooks.map((h) => h.command ?? '')
    );
    expect(commands.some((c: string) => c.includes('version-check.sh'))).toBe(true);
  });

  it('never lets it fail the session', () => {
    const entry = hooks.SessionStart.flatMap((m: { hooks: { command?: string }[] }) => m.hooks).find(
      (h: { command?: string }) => h.command?.includes('version-check.sh')
    );
    expect(entry.command).toContain('|| true');
    expect(entry.timeout).toBeLessThanOrEqual(15);
  });
});

// ─── What the script actually does ────────────────────────────────────────────

function runIn(manifestVersion: string | null, cliVersion: string | null): string {
  const dir = mkdtempSync(join(tmpdir(), 'devtronic-vc-'));

  if (manifestVersion !== null) {
    mkdirSync(join(dir, '.ai-template'), { recursive: true });
    writeFileSync(
      join(dir, '.ai-template', 'manifest.json'),
      JSON.stringify(
        { version: manifestVersion, installMode: 'marketplace', files: { 'CLAUDE.md': { checksum: 'x' } } },
        null,
        2
      )
    );
  }

  // A fake `devtronic` on PATH, so the test never depends on a global install.
  const bin = join(dir, 'bin');
  mkdirSync(bin, { recursive: true });
  if (cliVersion !== null) {
    const fake = join(bin, 'devtronic');
    writeFileSync(fake, `#!/bin/bash\necho "${cliVersion}"\n`);
    chmodSync(fake, 0o755);
  }

  const script = join(dir, 'version-check.sh');
  writeFileSync(script, generateVersionCheckScript());
  chmodSync(script, 0o755);

  return execFileSync('bash', [script], {
    cwd: dir,
    // An empty PATH would break `grep`; prepend the fake bin to a minimal one.
    env: { PATH: `${bin}:/usr/bin:/bin`, HOME: dir },
    encoding: 'utf-8',
  }).trim();
}

describe('version-check.sh', () => {
  it('says nothing when the two agree', () => {
    expect(runIn('1.5.1', '1.5.1')).toBe('');
  });

  it('tells you to update the project when the CLI is ahead', () => {
    const out = runIn('1.3.0', '1.5.1');
    expect(out).toContain('1.3.0');
    expect(out).toContain('1.5.1');
    expect(out).toContain('devtronic update');
  });

  it('tells you to update the CLI when the project is ahead', () => {
    // The case that bit this repo in reverse: a fresh plugin, a stale CLI.
    const out = runIn('1.5.1', '1.4.4');
    expect(out).toContain('npm i -g devtronic@latest');
    expect(out).not.toContain('Run `devtronic update`');
  });

  it('orders versions numerically, not as text', () => {
    // "1.10.0" sorts before "1.9.0" as a string and after it as a version.
    expect(runIn('1.9.0', '1.10.0')).toContain('devtronic update');
    expect(runIn('1.10.0', '1.9.0')).toContain('npm i -g devtronic@latest');
  });

  it('says nothing in a project devtronic never touched', () => {
    expect(runIn(null, '1.5.1')).toBe('');
  });

  it('says nothing when the CLI is not installed', () => {
    // Skills work without the CLI; a missing CLI is not a problem to announce.
    expect(runIn('1.3.0', null)).toBe('');
  });

  it('reads the top-level version, not a per-file entry', () => {
    const dir = mkdtempSync(join(tmpdir(), 'devtronic-vc-'));
    mkdirSync(join(dir, '.ai-template'), { recursive: true });
    writeFileSync(
      join(dir, '.ai-template', 'manifest.json'),
      '{\n  "version": "1.3.0",\n  "files": {\n    "a.md": { "version": "9.9.9" }\n  }\n}'
    );
    const bin = join(dir, 'bin');
    mkdirSync(bin, { recursive: true });
    writeFileSync(join(bin, 'devtronic'), '#!/bin/bash\necho "1.5.1"\n');
    chmodSync(join(bin, 'devtronic'), 0o755);
    const script = join(dir, 'version-check.sh');
    writeFileSync(script, generateVersionCheckScript());

    const out = execFileSync('bash', [script], {
      cwd: dir,
      env: { PATH: `${bin}:/usr/bin:/bin`, HOME: dir },
      encoding: 'utf-8',
    });
    expect(out).toContain('1.3.0');
    expect(out).not.toContain('9.9.9');
  });

  it('always exits 0', () => {
    // Whatever it finds, a session must still start.
    for (const [m, c] of [
      ['1.3.0', '1.5.1'],
      ['1.5.1', '1.5.1'],
      [null, null],
    ] as [string | null, string | null][]) {
      expect(() => runIn(m, c)).not.toThrow();
    }
  });
});
