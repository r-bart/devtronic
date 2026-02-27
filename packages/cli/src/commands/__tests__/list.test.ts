import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  readFileSync,
  readdirSync,
  existsSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'list-test-'));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

describe('skill discovery', () => {
  it('discovers skills from directories with SKILL.md', () => {
    const skillsDir = join(tempDir, 'skills');
    mkdirSync(join(skillsDir, 'brief'), { recursive: true });
    writeFileSync(join(skillsDir, 'brief', 'SKILL.md'), '# Brief\n\nQuick project orientation');

    mkdirSync(join(skillsDir, 'audit'), { recursive: true });
    writeFileSync(join(skillsDir, 'audit', 'SKILL.md'), '# Audit\n\nComprehensive code quality audit');

    const entries = readdirSync(skillsDir, { withFileTypes: true });
    const skills = entries
      .filter((e) => e.isDirectory())
      .map((e) => {
        const skillMd = join(skillsDir, e.name, 'SKILL.md');
        const desc = existsSync(skillMd)
          ? readFileSync(skillMd, 'utf-8').split('\n').find((l, i, arr) => {
              const idx = arr.findIndex((x) => x.trim().startsWith('#'));
              return i > idx && l.trim().length > 0;
            })?.trim() || ''
          : '';
        return { name: e.name, description: desc };
      });

    expect(skills).toHaveLength(2);
    expect(skills.find((s) => s.name === 'brief')!.description).toBe('Quick project orientation');
    expect(skills.find((s) => s.name === 'audit')!.description).toBe('Comprehensive code quality audit');
  });

  it('discovers skills from standalone .md files', () => {
    const skillsDir = join(tempDir, 'skills');
    mkdirSync(skillsDir, { recursive: true });
    writeFileSync(join(skillsDir, 'quick.md'), '# Quick\n\nFast task execution');

    const entries = readdirSync(skillsDir, { withFileTypes: true });
    const mdFiles = entries.filter((e) => e.isFile() && e.name.endsWith('.md'));

    expect(mdFiles).toHaveLength(1);
    expect(mdFiles[0].name).toBe('quick.md');
  });

  it('handles empty skills directory', () => {
    const skillsDir = join(tempDir, 'skills');
    mkdirSync(skillsDir, { recursive: true });

    const entries = readdirSync(skillsDir, { withFileTypes: true });
    const skills = entries.filter((e) => e.isDirectory());

    expect(skills).toHaveLength(0);
  });
});

describe('agent discovery', () => {
  it('discovers agents from .md files', () => {
    const agentsDir = join(tempDir, 'agents');
    mkdirSync(agentsDir, { recursive: true });
    writeFileSync(join(agentsDir, 'code-reviewer.md'), '# Code Reviewer\n\nThorough PR review');
    writeFileSync(join(agentsDir, 'quality-runner.md'), '# Quality Runner\n\nRun tests and lint');

    const entries = readdirSync(agentsDir, { withFileTypes: true });
    const agents = entries.filter((e) => e.isFile() && e.name.endsWith('.md'));

    expect(agents).toHaveLength(2);
  });

  it('ignores non-md files in agents directory', () => {
    const agentsDir = join(tempDir, 'agents');
    mkdirSync(agentsDir, { recursive: true });
    writeFileSync(join(agentsDir, 'code-reviewer.md'), '# Reviewer');
    writeFileSync(join(agentsDir, 'config.json'), '{}');
    writeFileSync(join(agentsDir, '.gitkeep'), '');

    const entries = readdirSync(agentsDir, { withFileTypes: true });
    const agents = entries.filter((e) => e.isFile() && e.name.endsWith('.md'));

    expect(agents).toHaveLength(1);
  });
});

describe('description extraction', () => {
  function extractDescription(filePath: string): string {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      let pastHeading = false;

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('#')) {
          pastHeading = true;
          continue;
        }
        if (pastHeading && trimmed.length > 0) {
          const plain = trimmed
            .replace(/\*\*(.+?)\*\*/g, '$1')
            .replace(/\*(.+?)\*/g, '$1')
            .replace(/`(.+?)`/g, '$1')
            .replace(/\[(.+?)\]\(.+?\)/g, '$1');
          return plain.length > 60 ? plain.slice(0, 57) + '...' : plain;
        }
      }
      return '';
    } catch {
      return '';
    }
  }

  it('extracts first line after heading', () => {
    const file = join(tempDir, 'test.md');
    writeFileSync(file, '# Title\n\nThis is the description');
    expect(extractDescription(file)).toBe('This is the description');
  });

  it('skips empty lines between heading and description', () => {
    const file = join(tempDir, 'test.md');
    writeFileSync(file, '# Title\n\n\n\nActual description');
    expect(extractDescription(file)).toBe('Actual description');
  });

  it('truncates long descriptions to 60 chars', () => {
    const file = join(tempDir, 'test.md');
    const longDesc = 'A'.repeat(80);
    writeFileSync(file, `# Title\n\n${longDesc}`);
    const result = extractDescription(file);
    expect(result.length).toBe(60);
    expect(result.endsWith('...')).toBe(true);
  });

  it('strips markdown bold formatting', () => {
    const file = join(tempDir, 'test.md');
    writeFileSync(file, '# Title\n\nThis is **bold** text');
    expect(extractDescription(file)).toBe('This is bold text');
  });

  it('strips markdown italic formatting', () => {
    const file = join(tempDir, 'test.md');
    writeFileSync(file, '# Title\n\nThis is *italic* text');
    expect(extractDescription(file)).toBe('This is italic text');
  });

  it('strips markdown code formatting', () => {
    const file = join(tempDir, 'test.md');
    writeFileSync(file, '# Title\n\nRun `devtronic init` to start');
    expect(extractDescription(file)).toBe('Run devtronic init to start');
  });

  it('strips markdown link formatting', () => {
    const file = join(tempDir, 'test.md');
    writeFileSync(file, '# Title\n\nSee [documentation](https://example.com) for details');
    expect(extractDescription(file)).toBe('See documentation for details');
  });

  it('returns empty string for file without content after heading', () => {
    const file = join(tempDir, 'test.md');
    writeFileSync(file, '# Title\n');
    expect(extractDescription(file)).toBe('');
  });

  it('returns empty string for non-existent file', () => {
    expect(extractDescription(join(tempDir, 'nonexistent.md'))).toBe('');
  });
});
