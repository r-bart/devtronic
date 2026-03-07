import { existsSync, readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AddonManifest, AddonInfo, AddonName } from '../types.js';
import { ADDONS } from '../types.js';

/**
 * Returns the absolute path to the addons directory inside templates/.
 * Uses the same dual-path resolution as TEMPLATES_DIR in init.ts to work
 * both in dev (src/addons/) and in the published npm package (dist/addons/).
 */
function getAddonsDir(): string {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  // When bundled: dist/addons/ → ../templates = templates/ ✓
  // When dev src: src/addons/ → ../../templates = templates/ ✓
  const templatesDir = existsSync(resolve(__dirname, '../templates'))
    ? resolve(__dirname, '../templates')
    : resolve(__dirname, '../../templates');
  return join(templatesDir, 'addons');
}

/**
 * Returns the absolute path to a bundled addon's source directory.
 */
export function getAddonSourceDir(name: AddonName): string {
  return join(getAddonsDir(), name);
}

/**
 * Reads and parses the manifest.json for a bundled addon.
 */
export function getAddonManifest(name: AddonName): AddonManifest {
  const sourceDir = getAddonSourceDir(name);
  const manifestPath = join(sourceDir, 'manifest.json');
  const raw = readFileSync(manifestPath, 'utf-8');
  const manifest: AddonManifest = JSON.parse(raw);

  if (!manifest.name) throw new Error(`Addon manifest missing "name": ${manifestPath}`);
  if (!manifest.version) throw new Error(`Addon manifest missing "version": ${manifestPath}`);
  if (!manifest.files?.skills?.length) throw new Error(`Addon manifest has empty skills: ${manifestPath}`);

  return manifest;
}

/**
 * Parses and validates an addon manifest object.
 * Throws if required fields are missing or invalid.
 */
export function parseAddonManifest(data: Record<string, unknown>): AddonManifest {
  if (!data.name) throw new Error('Addon manifest missing "name"');
  if (!data.version) throw new Error('Addon manifest missing "version"');

  const files = data.files as Record<string, unknown> | undefined;
  if (!files?.skills || !Array.isArray(files.skills) || files.skills.length === 0) {
    throw new Error('Addon manifest has empty or missing skills array');
  }

  return {
    name: data.name as string,
    description: (data.description as string) ?? '',
    version: data.version as string,
    license: (data.license as string) ?? '',
    attribution: data.attribution as string | undefined,
    files: {
      skills: files.skills as string[],
      agents: (files.agents as string[] | undefined) ?? undefined,
      reference: (files.reference as string[] | undefined) ?? undefined,
      rules: (files.rules as string[] | undefined) ?? undefined,
    },
  };
}

/**
 * Returns all available first-party addons.
 */
export function getAvailableAddons(): AddonInfo[] {
  return Object.values(ADDONS);
}
