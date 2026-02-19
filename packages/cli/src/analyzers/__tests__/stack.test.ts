import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { analyzeStack, getDetectedTechNames, hasAnyTech } from '../stack.js';

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'agentic-test-'));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

function writePackageJson(deps: Record<string, string> = {}, devDeps: Record<string, string> = {}) {
  writeFileSync(
    join(tempDir, 'package.json'),
    JSON.stringify({ dependencies: deps, devDependencies: devDeps })
  );
}

describe('analyzeStack', () => {
  it('detects state management (Zustand)', () => {
    writePackageJson({ zustand: '^4.5.0' });
    const result = analyzeStack(tempDir);
    expect(result.stateManagement).toHaveLength(1);
    expect(result.stateManagement[0].name).toBe('Zustand');
    expect(result.stateManagement[0].version).toBe('4.5.0');
    expect(result.stateManagement[0].confidence).toBe('high');
  });

  it('detects data fetching (React Query)', () => {
    writePackageJson({ '@tanstack/react-query': '^5.0.0' });
    const result = analyzeStack(tempDir);
    expect(result.dataFetching).toHaveLength(1);
    expect(result.dataFetching[0].name).toBe('React Query');
  });

  it('detects ORM (Prisma from devDependencies)', () => {
    writePackageJson({}, { prisma: '^5.0.0' });
    const result = analyzeStack(tempDir);
    expect(result.orm).toHaveLength(1);
    expect(result.orm[0].name).toBe('Prisma');
  });

  it('detects testing frameworks', () => {
    writePackageJson({}, { vitest: '^1.0.0', '@testing-library/react': '^14.0.0' });
    const result = analyzeStack(tempDir);
    expect(result.testing).toHaveLength(2);
    const names = result.testing.map((t) => t.name);
    expect(names).toContain('Vitest');
    expect(names).toContain('Testing Library');
  });

  it('detects UI libraries', () => {
    writePackageJson({ tailwindcss: '^3.4.0' }, {});
    const result = analyzeStack(tempDir);
    expect(result.ui.some((t) => t.name === 'Tailwind CSS')).toBe(true);
  });

  it('detects validation (Zod)', () => {
    writePackageJson({ zod: '^3.22.0' });
    const result = analyzeStack(tempDir);
    expect(result.validation).toHaveLength(1);
    expect(result.validation[0].name).toBe('Zod');
  });

  it('detects API frameworks', () => {
    writePackageJson({ '@nestjs/core': '^10.0.0' });
    const result = analyzeStack(tempDir);
    expect(result.api).toHaveLength(1);
    expect(result.api[0].name).toBe('NestJS');
  });

  it('returns empty categories when no package.json exists', () => {
    const result = analyzeStack(tempDir);
    expect(result.stateManagement).toEqual([]);
    expect(result.dataFetching).toEqual([]);
    expect(result.orm).toEqual([]);
    expect(result.testing).toEqual([]);
    expect(result.ui).toEqual([]);
    expect(result.validation).toEqual([]);
    expect(result.api).toEqual([]);
  });

  it('returns empty categories for empty dependencies', () => {
    writePackageJson();
    const result = analyzeStack(tempDir);
    expect(hasAnyTech(result)).toBe(false);
  });

  it('does not duplicate techs with multiple matching packages', () => {
    writePackageJson({ redux: '^5.0.0', 'react-redux': '^9.0.0' });
    const result = analyzeStack(tempDir);
    expect(result.stateManagement).toHaveLength(1);
    expect(result.stateManagement[0].name).toBe('Redux');
  });

  it('detects multiple techs in same category', () => {
    writePackageJson({ zustand: '^4.0.0', jotai: '^2.0.0' });
    const result = analyzeStack(tempDir);
    expect(result.stateManagement).toHaveLength(2);
  });

  it('strips version prefixes', () => {
    writePackageJson({ zustand: '~4.5.2' });
    const result = analyzeStack(tempDir);
    expect(result.stateManagement[0].version).toBe('4.5.2');
  });
});

describe('getDetectedTechNames', () => {
  it('returns flat list of all tech names', () => {
    writePackageJson({ zustand: '^4.0.0', zod: '^3.0.0' });
    const stack = analyzeStack(tempDir);
    const names = getDetectedTechNames(stack);
    expect(names).toContain('Zustand');
    expect(names).toContain('Zod');
  });

  it('returns empty array for no detections', () => {
    const stack = analyzeStack(tempDir);
    expect(getDetectedTechNames(stack)).toEqual([]);
  });
});

describe('hasAnyTech', () => {
  it('returns true when tech detected', () => {
    writePackageJson({ zustand: '^4.0.0' });
    expect(hasAnyTech(analyzeStack(tempDir))).toBe(true);
  });

  it('returns false when nothing detected', () => {
    writePackageJson({ lodash: '^4.0.0' });
    expect(hasAnyTech(analyzeStack(tempDir))).toBe(false);
  });
});

describe('analyzeStack edge cases', () => {
  it('returns empty categories for malformed package.json', () => {
    writeFileSync(join(tempDir, 'package.json'), 'not valid json');
    const result = analyzeStack(tempDir);
    expect(result.stateManagement).toEqual([]);
    expect(result.orm).toEqual([]);
  });
});
