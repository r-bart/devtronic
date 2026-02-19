import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { detectPackageManager, detectFramework, detectScripts, hasTypescript, readPackageJson } from '../project.js';

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'agentic-test-'));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

function writePackageJson(deps: Record<string, string> = {}, devDeps: Record<string, string> = {}, scripts: Record<string, string> = {}) {
  writeFileSync(
    join(tempDir, 'package.json'),
    JSON.stringify({ dependencies: deps, devDependencies: devDeps, scripts })
  );
}

describe('detectPackageManager', () => {
  it('detects npm from package-lock.json', () => {
    writeFileSync(join(tempDir, 'package-lock.json'), '{}');
    expect(detectPackageManager(tempDir)).toBe('npm');
  });

  it('detects pnpm from pnpm-lock.yaml', () => {
    writeFileSync(join(tempDir, 'pnpm-lock.yaml'), '');
    expect(detectPackageManager(tempDir)).toBe('pnpm');
  });

  it('detects yarn from yarn.lock', () => {
    writeFileSync(join(tempDir, 'yarn.lock'), '');
    expect(detectPackageManager(tempDir)).toBe('yarn');
  });

  it('detects bun from bun.lockb', () => {
    writeFileSync(join(tempDir, 'bun.lockb'), '');
    expect(detectPackageManager(tempDir)).toBe('bun');
  });

  it('returns npm when only package.json exists', () => {
    writePackageJson();
    expect(detectPackageManager(tempDir)).toBe('npm');
  });

  it('returns null when no package files exist', () => {
    expect(detectPackageManager(tempDir)).toBeNull();
  });

  it('prioritizes bun over other lockfiles', () => {
    writeFileSync(join(tempDir, 'bun.lockb'), '');
    writeFileSync(join(tempDir, 'package-lock.json'), '{}');
    expect(detectPackageManager(tempDir)).toBe('bun');
  });
});

describe('detectFramework', () => {
  it('detects Next.js', () => {
    writePackageJson({ next: '^14.0.0', react: '^18.0.0' });
    const result = detectFramework(tempDir);
    expect(result.name).toBe('nextjs');
    expect(result.version).toBe('14.0.0');
  });

  it('detects React when Next.js is not present', () => {
    writePackageJson({ react: '^18.2.0' });
    const result = detectFramework(tempDir);
    expect(result.name).toBe('react');
  });

  it('detects NestJS', () => {
    writePackageJson({ '@nestjs/core': '^10.0.0' });
    expect(detectFramework(tempDir).name).toBe('nestjs');
  });

  it('detects Express', () => {
    writePackageJson({ express: '^4.18.0' });
    expect(detectFramework(tempDir).name).toBe('express');
  });

  it('detects Vue', () => {
    writePackageJson({ vue: '^3.3.0' });
    expect(detectFramework(tempDir).name).toBe('vue');
  });

  it('detects Astro', () => {
    writePackageJson({ astro: '^4.0.0' });
    expect(detectFramework(tempDir).name).toBe('astro');
  });

  it('prioritizes meta-frameworks over base frameworks', () => {
    writePackageJson({ next: '^14.0.0', react: '^18.0.0' });
    expect(detectFramework(tempDir).name).toBe('nextjs');
  });

  it('returns unknown when no framework detected', () => {
    writePackageJson({ lodash: '^4.0.0' });
    expect(detectFramework(tempDir).name).toBe('unknown');
  });

  it('returns unknown when no package.json exists', () => {
    expect(detectFramework(tempDir).name).toBe('unknown');
  });

  it('strips ^ and ~ from version', () => {
    writePackageJson({ express: '~4.18.2' });
    expect(detectFramework(tempDir).version).toBe('4.18.2');
  });
});

describe('detectScripts', () => {
  it('detects standard scripts', () => {
    writePackageJson({}, {}, {
      typecheck: 'tsc --noEmit',
      lint: 'eslint src/',
      test: 'vitest run',
      build: 'tsup',
      dev: 'vite',
    });

    const scripts = detectScripts(tempDir);
    expect(scripts.typecheck).toBe('typecheck');
    expect(scripts.lint).toBe('lint');
    expect(scripts.test).toBe('test');
    expect(scripts.build).toBe('build');
    expect(scripts.dev).toBe('dev');
  });

  it('detects alternative script names', () => {
    writePackageJson({}, {}, {
      'type-check': 'tsc',
      eslint: 'eslint .',
      'test:unit': 'jest',
      compile: 'tsc',
      start: 'node dist/index.js',
    });

    const scripts = detectScripts(tempDir);
    expect(scripts.typecheck).toBe('type-check');
    expect(scripts.lint).toBe('eslint');
    expect(scripts.test).toBe('test:unit');
    expect(scripts.build).toBe('compile');
    expect(scripts.dev).toBe('start');
  });

  it('returns null for missing scripts', () => {
    writePackageJson({}, {}, {});
    const scripts = detectScripts(tempDir);
    expect(scripts.typecheck).toBeNull();
    expect(scripts.lint).toBeNull();
    expect(scripts.test).toBeNull();
  });

  it('handles missing package.json', () => {
    const scripts = detectScripts(tempDir);
    expect(scripts.typecheck).toBeNull();
    expect(scripts.build).toBeNull();
  });
});

describe('hasTypescript', () => {
  it('returns true when tsconfig.json exists', () => {
    writeFileSync(join(tempDir, 'tsconfig.json'), '{}');
    expect(hasTypescript(tempDir)).toBe(true);
  });

  it('returns true when tsconfig.base.json exists', () => {
    writeFileSync(join(tempDir, 'tsconfig.base.json'), '{}');
    expect(hasTypescript(tempDir)).toBe(true);
  });

  it('returns false when no tsconfig exists', () => {
    expect(hasTypescript(tempDir)).toBe(false);
  });
});

describe('readPackageJson', () => {
  it('returns null for malformed package.json', () => {
    writeFileSync(join(tempDir, 'package.json'), 'not valid json {{{');
    expect(readPackageJson(tempDir)).toBeNull();
  });
});
