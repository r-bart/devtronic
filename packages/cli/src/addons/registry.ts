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
 * Returns all available first-party addons.
 */
export function getAvailableAddons(): AddonInfo[] {
  return Object.values(ADDONS);
}
