/**
 * `resolveConfigSet` validates `devtronic config set <key> <value>` before the
 * manifest is written.
 *
 * These assertions used to live in a test that reimplemented the parsing inside
 * itself and never imported `config.ts`, so it could not have caught a change
 * in the command.
 */
import { describe, it, expect } from 'vitest';
import { resolveConfigSet } from '../config.js';
import { ADDONS } from '../../types.js';

function ok(key: string, value: string) {
  const result = resolveConfigSet(key, value);
  if (!result.ok) throw new Error(`expected success, got: ${result.error}`);
  return result;
}

function err(key: string, value: string) {
  const result = resolveConfigSet(key, value);
  if (result.ok) throw new Error('expected failure');
  return result.error;
}

// ─── Key validation ───────────────────────────────────────────────────────────

describe('resolveConfigSet — keys', () => {
  const scalarKeys = ['architecture', 'framework', 'qualityCommand'];
  const arrayKeys = [
    'layers',
    'stateManagement',
    'dataFetching',
    'orm',
    'testing',
    'ui',
    'validation',
    'enabledAddons',
  ];

  for (const key of [...scalarKeys, ...arrayKeys]) {
    it(`accepts ${key}`, () => {
      const value = key === 'enabledAddons' ? 'orchestration' : 'x';
      expect(ok(key, value).key).toBe(key);
    });
  }

  it('rejects an unknown key', () => {
    expect(err('nope', 'x')).toContain('Unknown config key: nope');
  });

  it('lists the valid keys when rejecting', () => {
    const message = err('nope', 'x');
    for (const key of [...scalarKeys, ...arrayKeys]) {
      expect(message, `${key} missing from the hint`).toContain(key);
    }
  });

  it('rejects a key that only differs in case', () => {
    expect(err('Architecture', 'clean')).toContain('Unknown config key');
  });
});

// ─── Scalar vs array values ───────────────────────────────────────────────────

describe('resolveConfigSet — values', () => {
  it('keeps a scalar value as a string', () => {
    expect(ok('architecture', 'clean').value).toBe('clean');
  });

  it('does not split a scalar value on commas', () => {
    // A quality command legitimately contains commas and spaces.
    expect(ok('qualityCommand', 'npm run lint, npm test').value).toBe(
      'npm run lint, npm test'
    );
  });

  it('splits an array value on commas', () => {
    expect(ok('layers', 'domain,application,infrastructure').value).toEqual([
      'domain',
      'application',
      'infrastructure',
    ]);
  });

  it('trims whitespace around each entry', () => {
    expect(ok('layers', ' domain , application ').value).toEqual(['domain', 'application']);
  });

  it('drops empty entries', () => {
    expect(ok('layers', 'domain,,application,').value).toEqual(['domain', 'application']);
  });

  it('yields an empty list for an empty value', () => {
    expect(ok('layers', '').value).toEqual([]);
  });

  it('accepts a single entry with no comma', () => {
    expect(ok('ui', 'Tailwind CSS').value).toEqual(['Tailwind CSS']);
  });
});

// ─── Addon names ──────────────────────────────────────────────────────────────

describe('resolveConfigSet — enabledAddons', () => {
  const known = Object.keys(ADDONS);

  for (const addon of known) {
    it(`accepts the ${addon} addon`, () => {
      expect(ok('enabledAddons', addon).value).toEqual([addon]);
    });
  }

  it('accepts every addon at once', () => {
    expect(ok('enabledAddons', known.join(',')).value).toEqual(known);
  });

  it('rejects an unknown addon', () => {
    expect(err('enabledAddons', 'not-an-addon')).toContain('Unknown addon(s): not-an-addon');
  });

  it('names every unknown addon, not just the first', () => {
    const message = err('enabledAddons', 'nope-one,orchestration,nope-two');
    expect(message).toContain('nope-one');
    expect(message).toContain('nope-two');
  });

  it('lists the valid addons when rejecting', () => {
    const message = err('enabledAddons', 'nope');
    for (const addon of known) {
      expect(message).toContain(addon);
    }
  });

  it('validates addon names only for enabledAddons', () => {
    // Any other array key takes free-form values.
    expect(ok('ui', 'not-an-addon').value).toEqual(['not-an-addon']);
  });

  it('clears the list on an empty value without complaining', () => {
    expect(ok('enabledAddons', '').value).toEqual([]);
  });
});
