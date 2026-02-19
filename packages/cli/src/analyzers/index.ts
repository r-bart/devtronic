import type { ProjectAnalysis, StackInfo } from '../types.js';
import { hasGitRepo } from '../utils/git.js';
import { detectArchitecture } from './architecture.js';
import { detectExistingConfigs } from './existingConfigs.js';
import {
  detectFramework,
  detectPackageManager,
  detectScripts,
  hasTypescript,
} from './project.js';
import { analyzeStack } from './stack.js';

export function analyzeProject(targetDir: string): ProjectAnalysis {
  const stackAnalysis = analyzeStack(targetDir);

  // Convert DetectedTech[] to string[] for simpler usage
  const stack: StackInfo = {
    stateManagement: stackAnalysis.stateManagement.map((t) => t.name),
    dataFetching: stackAnalysis.dataFetching.map((t) => t.name),
    orm: stackAnalysis.orm.map((t) => t.name),
    testing: stackAnalysis.testing.map((t) => t.name),
    ui: stackAnalysis.ui.map((t) => t.name),
    validation: stackAnalysis.validation.map((t) => t.name),
    api: stackAnalysis.api.map((t) => t.name),
  };

  return {
    packageManager: detectPackageManager(targetDir),
    framework: detectFramework(targetDir),
    architecture: detectArchitecture(targetDir),
    scripts: detectScripts(targetDir),
    existingConfigs: detectExistingConfigs(targetDir),
    stack,
    hasTypescript: hasTypescript(targetDir),
    hasGit: hasGitRepo(targetDir),
  };
}

export * from './architecture.js';
export * from './existingConfigs.js';
export * from './project.js';
export * from './stack.js';
