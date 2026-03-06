import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { AddonManifest, AddonInfo, AddonName } from '../types.js';
import { ADDONS } from '../types.js';

/**
 * Returns the absolute path to a bundled addon's source directory.
 */
export function getAddonSourceDir(name: AddonName): string {
  // import.meta.dirname works in Node 21+; fallback to __dirname equivalent
  const addonsDir = new URL('.', import.meta.url).pathname;
  return join(addonsDir, name);
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
