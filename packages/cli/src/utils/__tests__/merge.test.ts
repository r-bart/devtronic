import { describe, it, expect } from 'vitest';
import { mergeMarkdown, mergeJson, getMergeStrategy, mergeFile } from '../merge.js';

describe('mergeMarkdown', () => {
  it('preserves existing sections and adds new ones from template', () => {
    const existing = '# Title\n\nMy custom content\n\n## Section A\n\nCustomized A';
    const template = '# Title\n\nDefault content\n\n## Section A\n\nDefault A\n\n## Section B\n\nDefault B';

    const result = mergeMarkdown(existing, template);

    expect(result).toContain('My custom content');
    expect(result).toContain('Customized A');
    expect(result).toContain('## Section B');
    expect(result).toContain('Default B');
    // Should NOT replace existing section A with template version
    expect(result).not.toContain('Default A');
  });

  it('returns existing content when template has no new sections', () => {
    const existing = '# Title\n\nContent\n\n## Section A\n\nA content';
    const template = '# Title\n\nOther\n\n## Section A\n\nTemplate A';

    const result = mergeMarkdown(existing, template);

    expect(result).toContain('Content');
    expect(result).toContain('A content');
    expect(result).not.toContain('Template A');
  });

  it('handles empty existing content', () => {
    const existing = '';
    const template = '# Title\n\nContent\n\n## Section A\n\nA content';

    const result = mergeMarkdown(existing, template);

    expect(result).toContain('# Title');
    expect(result).toContain('## Section A');
  });

  it('handles empty template', () => {
    const existing = '# Title\n\nMy content';
    const template = '';

    const result = mergeMarkdown(existing, template);

    expect(result).toContain('My content');
  });

  it('is case-insensitive for section matching', () => {
    const existing = '## My Section\n\nCustom';
    const template = '## my section\n\nDefault';

    const result = mergeMarkdown(existing, template);

    // Should not duplicate the section
    expect(result.match(/my section/gi)?.length).toBe(1);
  });
});

describe('mergeJson', () => {
  it('adds new keys from template', () => {
    const existing = { a: 1 };
    const template = { a: 2, b: 3 };

    const result = mergeJson(existing, template);

    expect(result).toEqual({ a: 1, b: 3 });
  });

  it('preserves existing values over template values', () => {
    const existing = { name: 'custom', version: '2.0' };
    const template = { name: 'default', version: '1.0' };

    const result = mergeJson(existing, template);

    expect(result).toEqual({ name: 'custom', version: '2.0' });
  });

  it('deep merges nested objects', () => {
    const existing = { config: { a: 1 } };
    const template = { config: { a: 2, b: 3 } };

    const result = mergeJson(existing, template);

    expect(result).toEqual({ config: { a: 1, b: 3 } });
  });

  it('does not merge arrays (keeps existing)', () => {
    const existing = { items: [1, 2] };
    const template = { items: [3, 4, 5] };

    const result = mergeJson(existing, template);

    expect(result).toEqual({ items: [1, 2] });
  });

  it('handles empty existing object', () => {
    const existing = {};
    const template = { a: 1, b: { c: 2 } };

    const result = mergeJson(existing, template);

    expect(result).toEqual({ a: 1, b: { c: 2 } });
  });
});

describe('getMergeStrategy', () => {
  it('returns markdown for .md files', () => {
    expect(getMergeStrategy('README.md')).toBe('markdown');
  });

  it('returns markdown for .mdc files', () => {
    expect(getMergeStrategy('rules.mdc')).toBe('markdown');
  });

  it('returns json for .json files', () => {
    expect(getMergeStrategy('package.json')).toBe('json');
  });

  it('returns overwrite for unknown extensions', () => {
    expect(getMergeStrategy('file.txt')).toBe('overwrite');
    expect(getMergeStrategy('script.sh')).toBe('overwrite');
  });
});

describe('mergeFile', () => {
  it('uses markdown strategy for markdown files', () => {
    const existing = '# Title\n\nCustom\n\n## A\n\nContent A';
    const template = '# Title\n\nDefault\n\n## A\n\nDefault A\n\n## B\n\nContent B';

    const result = mergeFile(existing, template, 'markdown');

    expect(result).toContain('Custom');
    expect(result).toContain('Content B');
  });

  it('uses json strategy for json content', () => {
    const existing = JSON.stringify({ a: 1 });
    const template = JSON.stringify({ a: 2, b: 3 });

    const result = mergeFile(existing, template, 'json');
    const parsed = JSON.parse(result);

    expect(parsed).toEqual({ a: 1, b: 3 });
  });

  it('returns template on invalid json', () => {
    const existing = 'not json';
    const template = '{"valid": true}';

    const result = mergeFile(existing, template, 'json');

    expect(result).toBe(template);
  });

  it('returns existing for skip strategy', () => {
    const result = mergeFile('existing', 'template', 'skip');
    expect(result).toBe('existing');
  });

  it('returns template for overwrite strategy', () => {
    const result = mergeFile('existing', 'template', 'overwrite');
    expect(result).toBe('template');
  });
});

describe('mergeMarkdown edge cases', () => {
  it('handles section header with no content', () => {
    const existing = '## Empty Section';
    const template = '## Other\n\nContent';

    const result = mergeMarkdown(existing, template);

    expect(result).toContain('## Empty Section');
    expect(result).toContain('## Other');
    expect(result).toContain('Content');
  });
});
