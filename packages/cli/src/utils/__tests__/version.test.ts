import { describe, it, expect } from 'vitest';
import { compareSemver } from '../version.js';

describe('compareSemver', () => {
  it('returns 0 for equal versions', () => {
    expect(compareSemver('1.0.0', '1.0.0')).toBe(0);
  });

  it('returns 0 for equal two-digit versions', () => {
    expect(compareSemver('2.10.3', '2.10.3')).toBe(0);
  });

  it('returns -1 when a < b (major)', () => {
    expect(compareSemver('1.0.0', '2.0.0')).toBe(-1);
  });

  it('returns -1 when a < b (minor)', () => {
    expect(compareSemver('1.0.0', '1.1.0')).toBe(-1);
  });

  it('returns -1 when a < b (patch)', () => {
    expect(compareSemver('1.0.0', '1.0.1')).toBe(-1);
  });

  it('returns 1 when a > b (major)', () => {
    expect(compareSemver('3.0.0', '2.0.0')).toBe(1);
  });

  it('returns 1 when a > b (minor)', () => {
    expect(compareSemver('1.2.0', '1.1.0')).toBe(1);
  });

  it('returns 1 when a > b (patch)', () => {
    expect(compareSemver('1.0.5', '1.0.3')).toBe(1);
  });

  it('handles pre-release suffixes by parsing only the numeric part', () => {
    // "0-beta" → parseInt("0-beta") → 0
    expect(compareSemver('1.0.0-beta', '1.0.0')).toBe(0);
  });

  it('handles pre-release with numeric prefix', () => {
    // "1-rc.1" → parseInt("1-rc.1") → 1
    expect(compareSemver('1.0.1-rc.1', '1.0.0')).toBe(1);
  });

  it('handles missing patch version', () => {
    expect(compareSemver('1.0', '1.0.0')).toBe(0);
  });

  it('handles single version number', () => {
    expect(compareSemver('2', '1.9.9')).toBe(1);
  });

  it('compares double-digit minor versions correctly', () => {
    expect(compareSemver('1.10.0', '1.9.0')).toBe(1);
  });

  it('compares double-digit patch versions correctly', () => {
    expect(compareSemver('1.0.10', '1.0.9')).toBe(1);
  });
});
