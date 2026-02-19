import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { ArchitectureInfo, ArchitecturePattern } from '../types.js';

const CLEAN_ARCHITECTURE_DIRS = ['domain', 'application', 'infrastructure', 'presentation'];
const MVC_DIRS = ['models', 'views', 'controllers'];
const FEATURE_DIRS = ['features', 'modules'];
const TEST_DIRS = ['tests', 'test', '__tests__', 'spec', 'specs'];

export function detectArchitecture(targetDir: string): ArchitectureInfo {
  const srcDir = existsSync(join(targetDir, 'src')) ? join(targetDir, 'src') : targetDir;

  // Check for Clean Architecture
  const cleanLayers = CLEAN_ARCHITECTURE_DIRS.filter((dir) =>
    existsSync(join(srcDir, dir))
  );
  if (cleanLayers.length >= 2) {
    return {
      pattern: 'clean',
      layers: cleanLayers,
      hasTests: hasTests(targetDir),
    };
  }

  // Check for MVC
  const mvcLayers = MVC_DIRS.filter((dir) =>
    existsSync(join(srcDir, dir))
  );
  if (mvcLayers.length >= 2) {
    return {
      pattern: 'mvc',
      layers: mvcLayers,
      hasTests: hasTests(targetDir),
    };
  }

  // Check for Feature-based
  const featureDirs = FEATURE_DIRS.filter((dir) =>
    existsSync(join(srcDir, dir))
  );
  if (featureDirs.length > 0) {
    return {
      pattern: 'feature-based',
      layers: featureDirs,
      hasTests: hasTests(targetDir),
    };
  }

  // Default to flat
  return {
    pattern: 'flat',
    layers: [],
    hasTests: hasTests(targetDir),
  };
}

function hasTests(targetDir: string): boolean {
  // Check root level
  for (const dir of TEST_DIRS) {
    if (existsSync(join(targetDir, dir))) {
      return true;
    }
  }
  // Check src level
  const srcDir = join(targetDir, 'src');
  if (existsSync(srcDir)) {
    for (const dir of TEST_DIRS) {
      if (existsSync(join(srcDir, dir))) {
        return true;
      }
    }
  }
  return false;
}

export function getArchitectureDescription(pattern: ArchitecturePattern): string {
  switch (pattern) {
    case 'clean':
      return 'Clean Architecture (Domain-driven)';
    case 'mvc':
      return 'MVC (Model-View-Controller)';
    case 'feature-based':
      return 'Feature-based (Modular)';
    case 'flat':
      return 'Flat (No specific pattern detected)';
  }
}
