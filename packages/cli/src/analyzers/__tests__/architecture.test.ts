import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { detectArchitecture, getArchitectureDescription } from '../architecture.js';

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'agentic-test-'));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

describe('detectArchitecture', () => {
  it('detects clean architecture from src/ subdirectories', () => {
    const srcDir = join(tempDir, 'src');
    mkdirSync(srcDir);
    mkdirSync(join(srcDir, 'domain'));
    mkdirSync(join(srcDir, 'application'));
    mkdirSync(join(srcDir, 'infrastructure'));

    const result = detectArchitecture(tempDir);
    expect(result.pattern).toBe('clean');
    expect(result.layers).toContain('domain');
    expect(result.layers).toContain('application');
    expect(result.layers).toContain('infrastructure');
  });

  it('detects clean architecture with 2 matching layers', () => {
    const srcDir = join(tempDir, 'src');
    mkdirSync(srcDir);
    mkdirSync(join(srcDir, 'domain'));
    mkdirSync(join(srcDir, 'infrastructure'));

    const result = detectArchitecture(tempDir);
    expect(result.pattern).toBe('clean');
  });

  it('detects MVC pattern', () => {
    const srcDir = join(tempDir, 'src');
    mkdirSync(srcDir);
    mkdirSync(join(srcDir, 'models'));
    mkdirSync(join(srcDir, 'views'));
    mkdirSync(join(srcDir, 'controllers'));

    const result = detectArchitecture(tempDir);
    expect(result.pattern).toBe('mvc');
    expect(result.layers).toContain('models');
    expect(result.layers).toContain('views');
  });

  it('detects feature-based structure', () => {
    const srcDir = join(tempDir, 'src');
    mkdirSync(srcDir);
    mkdirSync(join(srcDir, 'features'));

    const result = detectArchitecture(tempDir);
    expect(result.pattern).toBe('feature-based');
    expect(result.layers).toContain('features');
  });

  it('returns flat when no pattern detected', () => {
    const srcDir = join(tempDir, 'src');
    mkdirSync(srcDir);
    mkdirSync(join(srcDir, 'utils'));
    mkdirSync(join(srcDir, 'components'));

    const result = detectArchitecture(tempDir);
    expect(result.pattern).toBe('flat');
    expect(result.layers).toEqual([]);
  });

  it('returns flat for empty directory', () => {
    const result = detectArchitecture(tempDir);
    expect(result.pattern).toBe('flat');
  });

  it('detects tests directory', () => {
    mkdirSync(join(tempDir, '__tests__'));

    const result = detectArchitecture(tempDir);
    expect(result.hasTests).toBe(true);
  });

  it('detects tests in src/', () => {
    const srcDir = join(tempDir, 'src');
    mkdirSync(srcDir);
    mkdirSync(join(srcDir, '__tests__'));

    const result = detectArchitecture(tempDir);
    expect(result.hasTests).toBe(true);
  });

  it('reports no tests when none found', () => {
    const result = detectArchitecture(tempDir);
    expect(result.hasTests).toBe(false);
  });

  it('prioritizes clean architecture over feature-based', () => {
    const srcDir = join(tempDir, 'src');
    mkdirSync(srcDir);
    mkdirSync(join(srcDir, 'domain'));
    mkdirSync(join(srcDir, 'application'));
    mkdirSync(join(srcDir, 'features'));

    const result = detectArchitecture(tempDir);
    expect(result.pattern).toBe('clean');
  });

  it('works without src/ directory (checks root)', () => {
    mkdirSync(join(tempDir, 'domain'));
    mkdirSync(join(tempDir, 'application'));

    const result = detectArchitecture(tempDir);
    expect(result.pattern).toBe('clean');
  });
});

describe('getArchitectureDescription', () => {
  it('returns correct descriptions', () => {
    expect(getArchitectureDescription('clean')).toContain('Clean Architecture');
    expect(getArchitectureDescription('mvc')).toContain('MVC');
    expect(getArchitectureDescription('feature-based')).toContain('Feature-based');
    expect(getArchitectureDescription('flat')).toContain('Flat');
  });
});
