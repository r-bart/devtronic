/**
 * `describeMarkdown` picks the one-line description `devtronic list` prints.
 *
 * It used to ignore the frontmatter and show the first prose paragraph instead,
 * so the CLI and the runtime disagreed about what a skill was for. The old test
 * could not catch that: it reimplemented the extraction inside itself and never
 * imported `list.ts`.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describeMarkdown } from '../list.js';

const SKILLS_DIR = resolve(
  __dirname,
  '../../../templates/claude-code/.claude/skills'
);

// ─── Frontmatter wins ─────────────────────────────────────────────────────────

describe('describeMarkdown — frontmatter', () => {
  it('prefers the frontmatter description over the prose', () => {
    const content = [
      '---',
      'name: audit',
      'description: Audits the codebase',
      '---',
      '',
      '# Audit',
      '',
      'Some introductory paragraph nobody wants in a list.',
      '',
    ].join('\n');
    expect(describeMarkdown(content)).toBe('Audits the codebase');
  });

  it('unquotes a description that had to be quoted', () => {
    // A description holding a colon needs quotes in YAML.
    const content = '---\nname: a\ndescription: "Audit: architecture and smells"\n---\n# A\n';
    expect(describeMarkdown(content)).toBe('Audit: architecture and smells');
  });

  it('unquotes single quotes too', () => {
    const content = "---\nname: a\ndescription: 'Quoted description'\n---\n# A\n";
    expect(describeMarkdown(content)).toBe('Quoted description');
  });

  it('leaves an inner quote alone', () => {
    const content = '---\nname: a\ndescription: Say "hello" first\n---\n# A\n';
    expect(describeMarkdown(content)).toBe('Say "hello" first');
  });

  it('ignores a description-like line outside the frontmatter', () => {
    const content = '# A\n\ndescription: not frontmatter\n';
    expect(describeMarkdown(content)).toBe('description: not frontmatter');
  });

  it('is not confused by another field ending in description', () => {
    const content = '---\nname: a\nlong-description: wrong\ndescription: right\n---\n# A\n';
    expect(describeMarkdown(content)).toBe('right');
  });
});

// ─── Fallback for files without frontmatter ───────────────────────────────────

describe('describeMarkdown — prose fallback', () => {
  it('takes the first line after the heading', () => {
    expect(describeMarkdown('# Title\n\nWhat this does.\n')).toBe('What this does.');
  });

  it('skips blank lines between heading and prose', () => {
    expect(describeMarkdown('# Title\n\n\n\nWhat this does.\n')).toBe('What this does.');
  });

  it('skips a subheading to reach the prose', () => {
    expect(describeMarkdown('# Title\n\n## Section\n\nProse here.\n')).toBe('Prose here.');
  });

  it('returns an empty string with no heading', () => {
    expect(describeMarkdown('Just prose, no heading.\n')).toBe('');
  });

  it('returns an empty string for an empty file', () => {
    expect(describeMarkdown('')).toBe('');
  });

  it('returns an empty string for a heading with nothing after it', () => {
    expect(describeMarkdown('# Title\n')).toBe('');
  });
});

// ─── Formatting ───────────────────────────────────────────────────────────────

describe('describeMarkdown — formatting', () => {
  it('strips bold, italic, code and links', () => {
    const content = '# T\n\n**Bold** and *italic* and `code` and [a link](http://x).\n';
    expect(describeMarkdown(content)).toBe('Bold and italic and code and a link.');
  });

  it('truncates a long description to 60 characters', () => {
    const long = 'x'.repeat(200);
    const result = describeMarkdown(`---\nname: a\ndescription: ${long}\n---\n# A\n`);
    expect(result).toHaveLength(60);
    expect(result.endsWith('...')).toBe(true);
  });

  it('leaves a description of exactly 60 characters intact', () => {
    const exact = 'y'.repeat(60);
    expect(describeMarkdown(`---\nname: a\ndescription: ${exact}\n---\n# A\n`)).toBe(exact);
  });
});

// ─── Against the real skills ──────────────────────────────────────────────────

describe('describeMarkdown — every shipped skill', () => {
  const skills = readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);

  it('finds the skill set', () => {
    expect(skills.length).toBeGreaterThan(20);
  });

  for (const skill of skills) {
    it(`${skill} yields a non-empty description from its frontmatter`, () => {
      const content = readFileSync(join(SKILLS_DIR, skill, 'SKILL.md'), 'utf-8');
      const result = describeMarkdown(content);

      expect(result.length).toBeGreaterThan(0);
      expect(result.length).toBeLessThanOrEqual(60);
      // The prose fallback would start with the skill's own H1 text.
      expect(result.startsWith('#')).toBe(false);
    });
  }
});
