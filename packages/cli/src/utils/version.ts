import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Reads the CLI version from its own package.json.
 * Works both from src/ (dev) and dist/ (bundled).
 */
export function getCliVersion(): string {
  // From dist/ → ../package.json, from src/utils/ → ../../package.json
  const paths = [
    resolve(__dirname, '../package.json'),
    resolve(__dirname, '../../package.json'),
  ];
  for (const p of paths) {
    try {
      const pkg = JSON.parse(readFileSync(p, 'utf-8'));
      if (pkg.name === 'devtronic' && pkg.version) {
        return pkg.version;
      }
    } catch {
      // try next path
    }
  }
  return '1.0.0';
}

/**
 * Fetches the latest published version from the npm registry.
 * Non-blocking with a 3-second timeout. Returns null on failure.
 */
export async function getLatestVersion(packageName: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(`https://registry.npmjs.org/${packageName}/latest`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });

    clearTimeout(timeout);

    if (!response.ok) return null;

    const data = (await response.json()) as { version?: string };
    return data.version ?? null;
  } catch {
    return null;
  }
}

/** Parse a semver segment, stripping pre-release suffixes (e.g. "0-beta" → 0) */
function parseSegment(s: string): number {
  const n = parseInt(s, 10);
  return isNaN(n) ? 0 : n;
}

/**
 * Compares two semver strings.
 * Returns:
 *  -1 if a < b
 *   0 if a === b
 *   1 if a > b
 */
export function compareSemver(a: string, b: string): -1 | 0 | 1 {
  const pa = a.split('.').map(parseSegment);
  const pb = b.split('.').map(parseSegment);

  for (let i = 0; i < 3; i++) {
    const va = pa[i] ?? 0;
    const vb = pb[i] ?? 0;
    if (va > vb) return 1;
    if (va < vb) return -1;
  }
  return 0;
}
