/**
 * `retireOrphanPluginScripts()` — the deletion half of retiring a plugin script.
 *
 * The generator stopping is not enough: `detectRemovedFiles()` skips everything
 * under the plugin path, so a script devtronic no longer writes stays on disk and
 * in the manifest with no hook left to run it.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { retireOrphanPluginScripts } from '../update.js';
import type { ManifestFile } from '../../types.js';

const PLUGIN_PATH = '.claude-plugins/devtronic';
const STOP_GUARD = `${PLUGIN_PATH}/scripts/stop-guard.sh`;

/** The manifest's own checksum, so `originalChecksum` really matches the file. */
function entry(content = ''): ManifestFile {
  const checksum = createHash('md5').update(content).digest('hex');
  return { checksum, originalChecksum: checksum, modified: false };
}

describe('retireOrphanPluginScripts', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'retire-scripts-'));
    mkdirSync(join(tempDir, PLUGIN_PATH, 'scripts'), { recursive: true });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('deletes an untouched stop-guard.sh from disk', () => {
    const content = '#!/bin/bash\nexit 0\n';
    writeFileSync(join(tempDir, STOP_GUARD), content);
    const manifest = { files: { [STOP_GUARD]: entry(content) } };

    const retired = retireOrphanPluginScripts(tempDir, PLUGIN_PATH, manifest);

    expect(existsSync(join(tempDir, STOP_GUARD))).toBe(false);
    expect(retired.removed).toEqual([STOP_GUARD]);
    expect(retired.kept).toEqual([]);
  });

  it('drops the manifest entry so update stops tracking it', () => {
    const content = '#!/bin/bash\n';
    writeFileSync(join(tempDir, STOP_GUARD), content);
    const manifest = { files: { [STOP_GUARD]: entry(content) } };

    retireOrphanPluginScripts(tempDir, PLUGIN_PATH, manifest);

    expect(manifest.files[STOP_GUARD]).toBeUndefined();
  });

  it('keeps a script the user edited, and still stops tracking it', () => {
    writeFileSync(join(tempDir, STOP_GUARD), '#!/bin/bash\n# my own gate\n');
    const manifest = { files: { [STOP_GUARD]: entry('#!/bin/bash\n') } };

    const retired = retireOrphanPluginScripts(tempDir, PLUGIN_PATH, manifest);

    expect(existsSync(join(tempDir, STOP_GUARD))).toBe(true);
    expect(readFileSync(join(tempDir, STOP_GUARD), 'utf-8')).toContain('# my own gate');
    expect(retired.kept).toEqual([STOP_GUARD]);
    expect(retired.removed).toEqual([]);
    expect(manifest.files[STOP_GUARD]).toBeUndefined();
  });

  it('deletes a script that has no manifest entry at all', () => {
    writeFileSync(join(tempDir, STOP_GUARD), '#!/bin/bash\n');

    const retired = retireOrphanPluginScripts(tempDir, PLUGIN_PATH, { files: {} });

    expect(existsSync(join(tempDir, STOP_GUARD))).toBe(false);
    expect(retired.removed).toEqual([STOP_GUARD]);
  });

  it('clears a manifest entry left behind after the file is already gone', () => {
    const manifest = { files: { [STOP_GUARD]: entry() } };

    const retired = retireOrphanPluginScripts(tempDir, PLUGIN_PATH, manifest);

    expect(retired.removed).toEqual([STOP_GUARD]);
    expect(manifest.files[STOP_GUARD]).toBeUndefined();
  });

  it('reports nothing on an install that never had the script', () => {
    const manifest = { files: { [`${PLUGIN_PATH}/scripts/auto-lint.sh`]: entry() } };

    const retired = retireOrphanPluginScripts(tempDir, PLUGIN_PATH, manifest);

    expect(retired.removed).toEqual([]);
    expect(retired.kept).toEqual([]);
    expect(manifest.files[`${PLUGIN_PATH}/scripts/auto-lint.sh`]).toBeDefined();
  });

  it('leaves the scripts that still ship untouched', () => {
    for (const script of ['checkpoint.sh', 'auto-lint.sh', 'version-check.sh']) {
      writeFileSync(join(tempDir, PLUGIN_PATH, 'scripts', script), '#!/bin/bash\n');
    }

    retireOrphanPluginScripts(tempDir, PLUGIN_PATH, { files: {} });

    for (const script of ['checkpoint.sh', 'auto-lint.sh', 'version-check.sh']) {
      expect(existsSync(join(tempDir, PLUGIN_PATH, 'scripts', script))).toBe(true);
    }
  });
});
