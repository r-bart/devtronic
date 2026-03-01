import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync, cpSync, readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import type { Manifest, ManifestFile } from '../types.js';

export const MANIFEST_DIR = '.ai-template';
export const MANIFEST_FILE = 'manifest.json';

export function fileExists(path: string): boolean {
  return existsSync(path);
}

export function readFile(path: string): string {
  return readFileSync(path, 'utf-8');
}

export function writeFile(path: string, content: string): void {
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(path, content, 'utf-8');
}

export function copyDir(src: string, dest: string): void {
  cpSync(src, dest, { recursive: true });
}

export function ensureDir(path: string): void {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
}

export function calculateChecksum(content: string): string {
  return createHash('md5').update(content).digest('hex');
}

export function getManifestPath(targetDir: string): string {
  return join(targetDir, MANIFEST_DIR, MANIFEST_FILE);
}

export function readManifest(targetDir: string): Manifest | null {
  const manifestPath = getManifestPath(targetDir);
  if (!fileExists(manifestPath)) {
    return null;
  }
  try {
    const raw = JSON.parse(readFile(manifestPath));
    // Normalize legacy manifests missing fields
    return {
      version: raw.version ?? 'unknown',
      implantedAt: raw.implantedAt ?? 'unknown',
      selectedIDEs: raw.selectedIDEs ?? [],
      projectConfig: raw.projectConfig,
      files: raw.files ?? {},
      installMode: raw.installMode,
      pluginPath: raw.pluginPath,
    };
  } catch {
    return null;
  }
}

export function writeManifest(targetDir: string, manifest: Manifest): void {
  const manifestPath = getManifestPath(targetDir);
  ensureDir(dirname(manifestPath));
  writeFile(manifestPath, JSON.stringify(manifest, null, 2));
}

export function isFileModified(
  targetDir: string,
  relativePath: string,
  manifest: Manifest
): boolean {
  const fileInfo = manifest.files[relativePath];
  if (!fileInfo) {
    return false;
  }
  const filePath = join(targetDir, relativePath);
  if (!fileExists(filePath)) {
    return true;
  }
  const currentChecksum = calculateChecksum(readFile(filePath));
  return currentChecksum !== fileInfo.originalChecksum;
}

export function getAllFilesRecursive(dir: string, baseDir: string = dir): string[] {
  const files: string[] = [];

  if (!existsSync(dir)) {
    return files;
  }

  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getAllFilesRecursive(fullPath, baseDir));
    } else {
      files.push(relative(baseDir, fullPath));
    }
  }

  return files;
}

export function createManifestEntry(content: string): ManifestFile {
  const checksum = calculateChecksum(content);
  return {
    checksum,
    modified: false,
    originalChecksum: checksum,
  };
}

export function getSubdirectories(dir: string): string[] {
  if (!existsSync(dir)) {
    return [];
  }
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}
