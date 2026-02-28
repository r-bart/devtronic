import * as p from '@clack/prompts';
import chalk from 'chalk';
import type { ConflictResolution, ExistingConfigs, IDE } from '../types.js';
import { getExistingConfigsList } from '../analyzers/existingConfigs.js';

const IDE_OPTIONS: Array<{ value: IDE; label: string; hint?: string }> = [
  { value: 'claude-code', label: 'Claude Code', hint: 'CLI + Skills + Agents' },
  { value: 'cursor', label: 'Cursor', hint: 'Rules (.mdc)' },
  { value: 'antigravity', label: 'Google Antigravity', hint: 'Rules (.md)' },
  { value: 'github-copilot', label: 'GitHub Copilot', hint: 'Instructions' },
];

export async function promptForIDEs(
  existingConfigs: ExistingConfigs
): Promise<IDE[] | symbol> {
  const existingList = getExistingConfigsList(existingConfigs);

  const result = await p.multiselect({
    message: 'Which IDEs do you want to configure?',
    options: IDE_OPTIONS.map((opt) => ({
      value: opt.value,
      label: opt.label,
      hint: existingList.includes(opt.value)
        ? `${opt.hint} ${chalk.yellow('(exists)')}`
        : opt.hint,
    })),
    initialValues: ['claude-code'] as IDE[],
    required: true,
  });

  return result;
}

export async function promptForConflictResolution(
  ide: IDE
): Promise<ConflictResolution | symbol> {
  const result = await p.select({
    message: `${ide} config already exists. How should we handle it?`,
    options: [
      {
        value: 'merge' as const,
        label: 'Merge intelligently',
        hint: 'Add new sections, keep existing customizations',
      },
      {
        value: 'keep' as const,
        label: 'Keep existing',
        hint: 'Skip files that already exist',
      },
      {
        value: 'replace' as const,
        label: 'Replace',
        hint: 'Overwrite with template files',
      },
    ],
  });

  return result;
}

export async function promptForConfirmation(
  message: string
): Promise<boolean | symbol> {
  return p.confirm({
    message,
    initialValue: true,
  });
}

export async function promptForThoughtsDir(): Promise<boolean | symbol> {
  return p.confirm({
    message: 'Create thoughts/ directory for AI documents?',
    initialValue: true,
  });
}

export async function promptForAgentsMd(): Promise<boolean | symbol> {
  return p.confirm({
    message: 'Create AGENTS.md (universal AI context file)?',
    initialValue: true,
  });
}

export async function promptForOrchestration(): Promise<boolean | symbol> {
  return p.confirm({
    message: 'Enable orchestration workflow? (briefing \u2192 execute-plan \u2192 recap \u2192 handoff)',
    initialValue: false,
  });
}
