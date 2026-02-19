/**
 * Markdown merger - combines sections without overwriting customizations
 */

interface MarkdownSection {
  level: number;
  title: string;
  content: string;
}

function parseMarkdownSections(markdown: string): MarkdownSection[] {
  const sections: MarkdownSection[] = [];
  const lines = markdown.split('\n');

  let currentSection: MarkdownSection | null = null;
  let contentLines: string[] = [];

  for (const line of lines) {
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);

    if (headerMatch) {
      // Save previous section
      if (currentSection) {
        currentSection.content = contentLines.join('\n').trim();
        sections.push(currentSection);
      }

      currentSection = {
        level: headerMatch[1].length,
        title: headerMatch[2].trim(),
        content: '',
      };
      contentLines = [];
    } else {
      contentLines.push(line);
    }
  }

  // Save last section
  if (currentSection) {
    currentSection.content = contentLines.join('\n').trim();
    sections.push(currentSection);
  }

  // Handle content before first header
  if (sections.length === 0 && contentLines.length > 0) {
    sections.push({
      level: 0,
      title: '',
      content: contentLines.join('\n').trim(),
    });
  }

  return sections;
}

function sectionToMarkdown(section: MarkdownSection): string {
  if (section.level === 0) {
    return section.content;
  }
  const header = '#'.repeat(section.level) + ' ' + section.title;
  if (section.content) {
    return header + '\n\n' + section.content;
  }
  return header;
}

export function mergeMarkdown(existing: string, template: string): string {
  const existingSections = parseMarkdownSections(existing);
  const templateSections = parseMarkdownSections(template);

  const existingTitles = new Set(
    existingSections.map((s) => s.title.toLowerCase())
  );

  // Start with existing content
  const mergedSections = [...existingSections];

  // Add new sections from template that don't exist
  for (const templateSection of templateSections) {
    if (
      templateSection.title &&
      !existingTitles.has(templateSection.title.toLowerCase())
    ) {
      mergedSections.push(templateSection);
    }
  }

  return mergedSections.map(sectionToMarkdown).join('\n\n');
}

/**
 * Deep merge JSON objects, preserving existing values
 */
export function mergeJson<T extends Record<string, unknown>>(
  existing: T,
  template: T
): T {
  const result = { ...existing } as T;

  for (const key of Object.keys(template) as (keyof T)[]) {
    const templateValue = template[key];
    const existingValue = existing[key];

    if (existingValue === undefined) {
      // Key doesn't exist in existing, add it
      result[key] = templateValue;
    } else if (
      typeof templateValue === 'object' &&
      templateValue !== null &&
      !Array.isArray(templateValue) &&
      typeof existingValue === 'object' &&
      existingValue !== null &&
      !Array.isArray(existingValue)
    ) {
      // Both are objects, merge recursively
      result[key] = mergeJson(
        existingValue as Record<string, unknown>,
        templateValue as Record<string, unknown>
      ) as T[keyof T];
    }
    // Otherwise, keep existing value
  }

  return result;
}

/**
 * Determine merge strategy based on file extension
 */
export type MergeStrategy = 'markdown' | 'json' | 'skip' | 'overwrite';

export function getMergeStrategy(filename: string): MergeStrategy {
  const ext = filename.split('.').pop()?.toLowerCase();

  switch (ext) {
    case 'md':
    case 'mdc':
      return 'markdown';
    case 'json':
      return 'json';
    default:
      return 'overwrite';
  }
}

export function mergeFile(
  existingContent: string,
  templateContent: string,
  strategy: MergeStrategy
): string {
  switch (strategy) {
    case 'markdown':
      return mergeMarkdown(existingContent, templateContent);
    case 'json':
      try {
        const existing = JSON.parse(existingContent);
        const template = JSON.parse(templateContent);
        return JSON.stringify(mergeJson(existing, template), null, 2);
      } catch {
        // If JSON parsing fails, return template
        return templateContent;
      }
    case 'skip':
      return existingContent;
    case 'overwrite':
    default:
      return templateContent;
  }
}
