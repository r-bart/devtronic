import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileExists, readFile } from '../utils/files.js';
import type { FrameworkInfo, FrameworkName, PackageManager, ScriptsInfo } from '../types.js';

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
}

export function detectPackageManager(targetDir: string): PackageManager {
  if (existsSync(join(targetDir, 'bun.lockb'))) return 'bun';
  if (existsSync(join(targetDir, 'pnpm-lock.yaml'))) return 'pnpm';
  if (existsSync(join(targetDir, 'yarn.lock'))) return 'yarn';
  if (existsSync(join(targetDir, 'package-lock.json'))) return 'npm';
  if (existsSync(join(targetDir, 'package.json'))) return 'npm';
  return null;
}

export function readPackageJson(targetDir: string): PackageJson | null {
  const packageJsonPath = join(targetDir, 'package.json');
  if (!fileExists(packageJsonPath)) {
    return null;
  }
  try {
    return JSON.parse(readFile(packageJsonPath));
  } catch {
    return null;
  }
}

const FRAMEWORK_DETECTORS: Array<{
  name: FrameworkName;
  packages: string[];
  priority: number;
}> = [
  // Meta-frameworks (highest priority)
  { name: 'nextjs', packages: ['next'], priority: 10 },
  { name: 'nuxt', packages: ['nuxt', 'nuxt3'], priority: 10 },
  { name: 'sveltekit', packages: ['@sveltejs/kit'], priority: 10 },
  { name: 'remix', packages: ['@remix-run/react', '@remix-run/node'], priority: 10 },
  { name: 'astro', packages: ['astro'], priority: 10 },

  // Backend frameworks
  { name: 'nestjs', packages: ['@nestjs/core'], priority: 9 },
  { name: 'fastify', packages: ['fastify'], priority: 8 },
  { name: 'hono', packages: ['hono'], priority: 8 },
  { name: 'express', packages: ['express'], priority: 7 },

  // Frontend frameworks
  { name: 'vue', packages: ['vue'], priority: 5 },
  { name: 'svelte', packages: ['svelte'], priority: 5 },
  { name: 'react', packages: ['react'], priority: 4 },
];

export function detectFramework(targetDir: string): FrameworkInfo {
  const packageJson = readPackageJson(targetDir);
  if (!packageJson) {
    return { name: 'unknown', version: null };
  }

  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  // Sort by priority (highest first)
  const sortedDetectors = [...FRAMEWORK_DETECTORS].sort(
    (a, b) => b.priority - a.priority
  );

  for (const detector of sortedDetectors) {
    for (const pkg of detector.packages) {
      if (allDeps[pkg]) {
        return {
          name: detector.name,
          version: allDeps[pkg].replace(/[\^~]/g, ''),
        };
      }
    }
  }

  return { name: 'unknown', version: null };
}

export function detectScripts(targetDir: string): ScriptsInfo {
  const packageJson = readPackageJson(targetDir);
  const scripts = packageJson?.scripts || {};

  return {
    typecheck: findScript(scripts, ['typecheck', 'type-check', 'types', 'tsc']),
    lint: findScript(scripts, ['lint', 'eslint']),
    test: findScript(scripts, ['test', 'test:unit', 'vitest', 'jest']),
    build: findScript(scripts, ['build', 'compile']),
    dev: findScript(scripts, ['dev', 'start', 'serve']),
  };
}

function findScript(
  scripts: Record<string, string>,
  candidates: string[]
): string | null {
  for (const candidate of candidates) {
    if (scripts[candidate]) {
      return candidate;
    }
  }
  return null;
}

export function hasTypescript(targetDir: string): boolean {
  return (
    fileExists(join(targetDir, 'tsconfig.json')) ||
    fileExists(join(targetDir, 'tsconfig.base.json'))
  );
}
