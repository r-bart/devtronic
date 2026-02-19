import { existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import * as p from '@clack/prompts';
import chalk from 'chalk';
import type { IDE, AddOptions, ConflictResolution } from '../types.js';
import { analyzeProject } from '../analyzers/index.js';
import { promptForConflictResolution } from '../prompts/init.js';
import {
  fileExists,
  readFile,
  writeFile,
  ensureDir,
  getAllFilesRecursive,
  writeManifest,
  createManifestEntry,
  readManifest,
} from '../utils/files.js';
import { getMergeStrategy, mergeFile } from '../utils/merge.js';
import { ensureInteractive } from '../utils/tty.js';
import { generateArchitectureRules } from '../generators/architectureRules.js';
import {
  TEMPLATES_DIR,
  IDE_TEMPLATE_MAP,
  DYNAMIC_RULE_FILES,
  getCliVersion,
} from './init.js';
import { getRuleContentForIDE } from '../utils/rules.js';

const ALL_IDES: { value: IDE; label: string }[] = [
  { value: 'claude-code', label: 'Claude Code' },
  { value: 'cursor', label: 'Cursor' },
  { value: 'antigravity', label: 'Google Antigravity' },
  { value: 'github-copilot', label: 'GitHub Copilot' },
];

export async function addCommand(ide: string | undefined, options: AddOptions): Promise<void> {
  if (!options.yes) {
    ensureInteractive('add');
  }

  const targetDir = resolve(options.path || '.');

  p.intro(chalk.bgCyan.black(' AI Agentic Architecture - Add IDE '));

  // Check for existing manifest
  const manifest = readManifest(targetDir);

  if (!manifest) {
    p.cancel('No installation found. Run `npx @tutellus/agentic-architecture init` first.');
    process.exit(1);
  }

  if (!manifest.projectConfig) {
    p.cancel(
      'Manifest is missing project configuration. Run `npx @tutellus/agentic-architecture init` to reconfigure.'
    );
    process.exit(1);
  }

  // Determine which IDE to add
  let selectedIDE: IDE;

  if (ide) {
    // Validate the IDE name
    const validIDE = ALL_IDES.find((i) => i.value === ide);
    if (!validIDE) {
      p.cancel(
        `Unknown IDE: ${ide}\n\nValid options: ${ALL_IDES.map((i) => i.value).join(', ')}`
      );
      process.exit(1);
    }
    selectedIDE = validIDE.value;
  } else {
    // Interactive selection
    const alreadyInstalled = manifest.selectedIDEs;
    const availableIDEs = ALL_IDES.filter((i) => !alreadyInstalled.includes(i.value));

    if (availableIDEs.length === 0) {
      p.log.success('All IDEs are already configured!');
      p.outro('Nothing to add');
      return;
    }

    const selection = await p.select({
      message: 'Which IDE do you want to add?',
      options: availableIDEs.map((ide) => ({
        value: ide.value,
        label: ide.label,
      })),
    });

    if (p.isCancel(selection)) {
      p.cancel('Operation cancelled');
      process.exit(0);
    }

    selectedIDE = selection as IDE;
  }

  // Check if already installed
  if (manifest.selectedIDEs.includes(selectedIDE)) {
    p.log.warn(`${selectedIDE} is already configured.`);

    if (!options.yes) {
      const proceed = await p.confirm({
        message: 'Reinstall/update configuration?',
        initialValue: false,
      });

      if (p.isCancel(proceed) || !proceed) {
        p.cancel('Operation cancelled');
        process.exit(0);
      }
    }
  }

  // Check for existing config for this IDE
  const analysis = analyzeProject(targetDir);
  const ideConfigExists =
    analysis.existingConfigs[selectedIDE as keyof typeof analysis.existingConfigs];

  let conflictResolution: ConflictResolution = 'replace';

  if (ideConfigExists && !options.yes) {
    const resolution = await promptForConflictResolution(selectedIDE);
    if (p.isCancel(resolution)) {
      p.cancel('Operation cancelled');
      process.exit(0);
    }
    conflictResolution = resolution;
  } else if (ideConfigExists) {
    conflictResolution = 'merge';
  }

  // Apply configuration
  const spinner = p.spinner();
  spinner.start(`Adding ${selectedIDE} configuration...`);

  const appliedFiles: string[] = [];
  const skippedFiles: string[] = [];
  const mergedFiles: string[] = [];
  const generatedFiles: string[] = [];

  // Generate architecture rules
  const generatedRules = generateArchitectureRules(manifest.projectConfig);

  // Copy IDE template files
  const templateName = IDE_TEMPLATE_MAP[selectedIDE];
  const templateDir = join(TEMPLATES_DIR, templateName);

  if (!existsSync(templateDir)) {
    spinner.stop('Error');
    p.cancel(`Template not found: ${templateName}`);
    process.exit(1);
  }

  const files = getAllFilesRecursive(templateDir);
  const dynamicFiles = DYNAMIC_RULE_FILES[selectedIDE] || [];

  for (const file of files) {
    // Skip dynamic rule files - we'll generate them
    if (dynamicFiles.includes(file)) {
      continue;
    }

    const sourcePath = join(templateDir, file);
    const destPath = join(targetDir, file);

    const sourceContent = readFile(sourcePath);

    if (fileExists(destPath)) {
      if (conflictResolution === 'keep') {
        skippedFiles.push(file);
        continue;
      }

      if (conflictResolution === 'merge') {
        const existingContent = readFile(destPath);
        const strategy = getMergeStrategy(file);
        const mergedContent = mergeFile(existingContent, sourceContent, strategy);
        writeFile(destPath, mergedContent);
        mergedFiles.push(file);
        manifest.files[file] = createManifestEntry(mergedContent);
        continue;
      }
    }

    // Overwrite or create new
    ensureDir(dirname(destPath));
    writeFile(destPath, sourceContent);
    appliedFiles.push(file);
    manifest.files[file] = createManifestEntry(sourceContent);
  }

  // Generate dynamic architecture rules
  const ruleContent = getRuleContentForIDE(selectedIDE, generatedRules);
  if (ruleContent) {
    const rulePath = dynamicFiles[0];
    if (rulePath) {
      const destPath = join(targetDir, rulePath);

      if (fileExists(destPath) && conflictResolution === 'keep') {
        skippedFiles.push(rulePath);
      } else if (fileExists(destPath) && conflictResolution === 'merge') {
        const existingContent = readFile(destPath);
        const strategy = getMergeStrategy(rulePath);
        const mergedContent = mergeFile(existingContent, ruleContent, strategy);
        writeFile(destPath, mergedContent);
        mergedFiles.push(rulePath);
        manifest.files[rulePath] = createManifestEntry(mergedContent);
      } else {
        ensureDir(dirname(destPath));
        writeFile(destPath, ruleContent);
        generatedFiles.push(`${rulePath} (personalized)`);
        manifest.files[rulePath] = createManifestEntry(ruleContent);
      }
    }
  }

  // Update manifest
  if (!manifest.selectedIDEs.includes(selectedIDE)) {
    manifest.selectedIDEs.push(selectedIDE);
  }
  manifest.version = getCliVersion();
  writeManifest(targetDir, manifest);

  spinner.stop('Configuration added');

  // Summary
  if (generatedFiles.length > 0) {
    p.note(
      generatedFiles.map((f) => `  ${chalk.magenta('★')} ${f}`).join('\n'),
      'Generated (personalized)'
    );
  }

  if (appliedFiles.length > 0) {
    p.note(
      appliedFiles.map((f) => `  ${chalk.green('✓')} ${f}`).join('\n'),
      'Created/Updated'
    );
  }

  if (mergedFiles.length > 0) {
    p.note(
      mergedFiles.map((f) => `  ${chalk.blue('⚡')} ${f}`).join('\n'),
      'Merged'
    );
  }

  if (skippedFiles.length > 0) {
    p.note(
      skippedFiles.map((f) => `  ${chalk.yellow('⏭')} ${f}`).join('\n'),
      'Skipped (existing)'
    );
  }

  p.outro(chalk.green(`${selectedIDE} configuration added!`));
}
