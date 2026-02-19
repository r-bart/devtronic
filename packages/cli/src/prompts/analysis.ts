import * as p from '@clack/prompts';
import chalk from 'chalk';
import type { ArchitecturePattern, ProjectAnalysis, ProjectConfig } from '../types.js';
import { getArchitectureDescription } from '../analyzers/architecture.js';
import { generateQualityCommands } from '../generators/rules.js';

const ARCHITECTURE_OPTIONS: Array<{ value: ArchitecturePattern; label: string; hint: string }> = [
  { value: 'clean', label: 'Clean Architecture', hint: 'Domain-driven, layered' },
  { value: 'mvc', label: 'MVC', hint: 'Model-View-Controller' },
  { value: 'feature-based', label: 'Feature-based', hint: 'Modular by feature' },
  { value: 'flat', label: 'Flat', hint: 'No specific pattern' },
];

const LAYER_OPTIONS = [
  { value: 'domain', label: 'domain', hint: 'Entities, Value Objects, Repository Interfaces' },
  { value: 'application', label: 'application', hint: 'Use Cases, DTOs, Application Services' },
  { value: 'infrastructure', label: 'infrastructure', hint: 'Repository Implementations, External Services' },
  { value: 'presentation', label: 'presentation', hint: 'UI Components, Controllers' },
  { value: 'ui', label: 'ui', hint: 'User Interface layer' },
  { value: 'api', label: 'api', hint: 'API routes and handlers' },
  { value: 'core', label: 'core', hint: 'Core business logic' },
  { value: 'shared', label: 'shared', hint: 'Shared utilities and types' },
  { value: 'features', label: 'features', hint: 'Feature modules' },
  { value: 'modules', label: 'modules', hint: 'Application modules' },
];

const STATE_MANAGEMENT_OPTIONS = [
  { value: 'Zustand', label: 'Zustand' },
  { value: 'Redux Toolkit', label: 'Redux Toolkit' },
  { value: 'Jotai', label: 'Jotai' },
  { value: 'Recoil', label: 'Recoil' },
  { value: 'MobX', label: 'MobX' },
  { value: 'XState', label: 'XState' },
  { value: 'Context API', label: 'Context API' },
];

const DATA_FETCHING_OPTIONS = [
  { value: 'React Query', label: 'React Query / TanStack Query' },
  { value: 'SWR', label: 'SWR' },
  { value: 'Apollo Client', label: 'Apollo Client' },
  { value: 'tRPC', label: 'tRPC' },
  { value: 'URQL', label: 'URQL' },
  { value: 'Axios', label: 'Axios' },
  { value: 'Fetch', label: 'Native Fetch' },
];

const ORM_OPTIONS = [
  { value: 'Prisma', label: 'Prisma' },
  { value: 'Drizzle', label: 'Drizzle' },
  { value: 'TypeORM', label: 'TypeORM' },
  { value: 'Mongoose', label: 'Mongoose' },
  { value: 'Kysely', label: 'Kysely' },
];

export function displayFullAnalysis(analysis: ProjectAnalysis): void {
  const lines: string[] = [];

  // Framework
  lines.push(`${chalk.bold('Framework:')}        ${analysis.framework.name}${analysis.framework.version ? ` v${analysis.framework.version}` : ''}`);
  lines.push('');

  // Architecture
  lines.push(`${chalk.bold('Architecture:')}     ${getArchitectureDescription(analysis.architecture.pattern)}`);
  if (analysis.architecture.layers.length > 0) {
    lines.push(`${chalk.bold('Layers found:')}     ${analysis.architecture.layers.map((l) => chalk.green(l)).join(', ')}`);
  }
  lines.push('');

  // Stack
  lines.push(chalk.bold('Stack detected:'));
  if (analysis.stack.stateManagement.length > 0) {
    lines.push(`  State:       ${analysis.stack.stateManagement.join(', ')}`);
  }
  if (analysis.stack.dataFetching.length > 0) {
    lines.push(`  Data:        ${analysis.stack.dataFetching.join(', ')}`);
  }
  if (analysis.stack.orm.length > 0) {
    lines.push(`  ORM:         ${analysis.stack.orm.join(', ')}`);
  }
  if (analysis.stack.testing.length > 0) {
    lines.push(`  Testing:     ${analysis.stack.testing.join(', ')}`);
  }
  if (analysis.stack.ui.length > 0) {
    lines.push(`  UI:          ${analysis.stack.ui.join(', ')}`);
  }
  if (analysis.stack.validation.length > 0) {
    lines.push(`  Validation:  ${analysis.stack.validation.join(', ')}`);
  }

  const hasStack = Object.values(analysis.stack).some((arr) => arr.length > 0);
  if (!hasStack) {
    lines.push(`  ${chalk.dim('(no specific libraries detected)')}`);
  }
  lines.push('');

  // Scripts
  lines.push(chalk.bold('Scripts:'));
  lines.push(`  typecheck:   ${analysis.scripts.typecheck || chalk.dim('not found')}`);
  lines.push(`  lint:        ${analysis.scripts.lint || chalk.dim('not found')}`);
  lines.push(`  test:        ${analysis.scripts.test || chalk.dim('not found')}`);
  lines.push(`  build:       ${analysis.scripts.build || chalk.dim('not found')}`);

  p.note(lines.join('\n'), 'Project Analysis');
}

export async function promptForAnalysisConfirmation(): Promise<boolean | symbol> {
  return p.confirm({
    message: 'Is this analysis correct?',
    initialValue: true,
  });
}

export async function promptForArchitecture(
  detected: ArchitecturePattern
): Promise<ArchitecturePattern | symbol> {
  const result = await p.select({
    message: 'What architecture pattern does your project use?',
    options: ARCHITECTURE_OPTIONS.map((opt) => ({
      value: opt.value,
      label: opt.label,
      hint: opt.value === detected ? `${opt.hint} ${chalk.green('(detected)')}` : opt.hint,
    })),
    initialValue: detected,
  });

  return result;
}

export async function promptForLayers(
  detected: string[]
): Promise<string[] | symbol> {
  const result = await p.multiselect({
    message: 'What layers does your project have?',
    options: LAYER_OPTIONS.map((opt) => ({
      value: opt.value,
      label: opt.label,
      hint: detected.includes(opt.value) ? `${opt.hint} ${chalk.green('(detected)')}` : opt.hint,
    })),
    initialValues: detected.length > 0 ? detected : ['domain', 'application', 'infrastructure'],
    required: false,
  });

  return result;
}

export async function promptForStateManagement(
  detected: string[]
): Promise<string[] | symbol> {
  const result = await p.multiselect({
    message: 'What state management do you use?',
    options: STATE_MANAGEMENT_OPTIONS.map((opt) => ({
      value: opt.value,
      label: detected.includes(opt.value) ? `${opt.label} ${chalk.green('(detected)')}` : opt.label,
    })),
    initialValues: detected,
    required: false,
  });

  return result;
}

export async function promptForDataFetching(
  detected: string[]
): Promise<string[] | symbol> {
  const result = await p.multiselect({
    message: 'What data fetching libraries do you use?',
    options: DATA_FETCHING_OPTIONS.map((opt) => ({
      value: opt.value,
      label: detected.includes(opt.value) ? `${opt.label} ${chalk.green('(detected)')}` : opt.label,
    })),
    initialValues: detected,
    required: false,
  });

  return result;
}

export async function promptForOrm(
  detected: string[]
): Promise<string[] | symbol> {
  const result = await p.multiselect({
    message: 'What ORM/database library do you use?',
    options: ORM_OPTIONS.map((opt) => ({
      value: opt.value,
      label: detected.includes(opt.value) ? `${opt.label} ${chalk.green('(detected)')}` : opt.label,
    })),
    initialValues: detected,
    required: false,
  });

  return result;
}

export async function promptForProjectConfig(
  analysis: ProjectAnalysis,
  skipPrompts: boolean
): Promise<ProjectConfig | symbol> {
  // If skipping prompts, use detected values
  if (skipPrompts) {
    return {
      architecture: analysis.architecture.pattern,
      layers: analysis.architecture.layers,
      stateManagement: analysis.stack.stateManagement,
      dataFetching: analysis.stack.dataFetching,
      orm: analysis.stack.orm,
      testing: analysis.stack.testing,
      ui: analysis.stack.ui,
      validation: analysis.stack.validation,
      framework: analysis.framework.name,
      qualityCommand: generateQualityCommands(analysis.scripts, analysis.packageManager),
    };
  }

  // Display full analysis
  displayFullAnalysis(analysis);

  // Ask if correct
  const isCorrect = await promptForAnalysisConfirmation();
  if (p.isCancel(isCorrect)) return isCorrect;

  // If correct, use detected values
  if (isCorrect) {
    return {
      architecture: analysis.architecture.pattern,
      layers: analysis.architecture.layers,
      stateManagement: analysis.stack.stateManagement,
      dataFetching: analysis.stack.dataFetching,
      orm: analysis.stack.orm,
      testing: analysis.stack.testing,
      ui: analysis.stack.ui,
      validation: analysis.stack.validation,
      framework: analysis.framework.name,
      qualityCommand: generateQualityCommands(analysis.scripts, analysis.packageManager),
    };
  }

  // Otherwise, let user adjust
  p.log.info('Let\'s adjust the configuration...');

  const architecture = await promptForArchitecture(analysis.architecture.pattern);
  if (p.isCancel(architecture)) return architecture;

  let layers: string[] = [];
  if (architecture === 'clean' || architecture === 'mvc' || architecture === 'feature-based') {
    const layersResult = await promptForLayers(analysis.architecture.layers);
    if (p.isCancel(layersResult)) return layersResult;
    layers = layersResult;
  }

  const stateManagement = await promptForStateManagement(analysis.stack.stateManagement);
  if (p.isCancel(stateManagement)) return stateManagement;

  const dataFetching = await promptForDataFetching(analysis.stack.dataFetching);
  if (p.isCancel(dataFetching)) return dataFetching;

  const orm = await promptForOrm(analysis.stack.orm);
  if (p.isCancel(orm)) return orm;

  return {
    architecture,
    layers,
    stateManagement,
    dataFetching,
    orm,
    testing: analysis.stack.testing,
    ui: analysis.stack.ui,
    validation: analysis.stack.validation,
    framework: analysis.framework.name,
    qualityCommand: generateQualityCommands(analysis.scripts, analysis.packageManager),
  };
}
