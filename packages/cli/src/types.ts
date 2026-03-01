export type PackageManager = 'npm' | 'yarn' | 'pnpm' | 'bun' | null;

export type AddonName = 'orchestration';

export interface AddonInfo {
  name: AddonName;
  label: string;
  description: string;
  skills: string[]; // skill directory names this addon adds
}

export const ADDONS: Record<AddonName, AddonInfo> = {
  orchestration: {
    name: 'orchestration',
    label: 'Orchestration Workflow',
    description: 'briefing → execute-plan (enhanced) → recap → handoff',
    skills: ['briefing', 'recap', 'handoff'],
  },
};

export type FrameworkName =
  | 'nextjs'
  | 'react'
  | 'vue'
  | 'nuxt'
  | 'express'
  | 'nestjs'
  | 'fastify'
  | 'hono'
  | 'astro'
  | 'svelte'
  | 'sveltekit'
  | 'remix'
  | 'unknown';

export type ArchitecturePattern = 'clean' | 'layered' | 'mvc' | 'feature-based' | 'flat' | 'none';

export type IDE =
  | 'claude-code'
  | 'cursor'
  | 'antigravity'
  | 'github-copilot';

export interface FrameworkInfo {
  name: FrameworkName;
  version: string | null;
}

export interface ArchitectureInfo {
  pattern: ArchitecturePattern;
  layers: string[];
  hasTests: boolean;
}

export interface ScriptsInfo {
  typecheck: string | null;
  lint: string | null;
  test: string | null;
  build: string | null;
  dev: string | null;
}

export interface ExistingConfigs {
  'claude-code': boolean;
  cursor: boolean;
  antigravity: boolean;
  'github-copilot': boolean;
}

export interface StackInfo {
  stateManagement: string[];
  dataFetching: string[];
  orm: string[];
  testing: string[];
  ui: string[];
  validation: string[];
  api: string[];
}

export interface ProjectAnalysis {
  packageManager: PackageManager;
  framework: FrameworkInfo;
  architecture: ArchitectureInfo;
  scripts: ScriptsInfo;
  existingConfigs: ExistingConfigs;
  stack: StackInfo;
  hasTypescript: boolean;
  hasGit: boolean;
}

export interface ManifestFile {
  checksum: string;
  modified: boolean;
  originalChecksum: string;
  /** If true, file is ignored during removal detection (user chose to keep it) */
  ignored?: boolean;
}

/** User-confirmed project configuration for generating rules */
export interface ProjectConfig {
  /** Confirmed architecture pattern */
  architecture: ArchitecturePattern;
  /** Confirmed layer names (e.g., ['domain', 'application', 'infrastructure']) */
  layers: string[];
  /** Confirmed state management libraries */
  stateManagement: string[];
  /** Confirmed data fetching libraries */
  dataFetching: string[];
  /** Confirmed ORM/database libraries */
  orm: string[];
  /** Confirmed testing libraries */
  testing: string[];
  /** Confirmed UI libraries */
  ui: string[];
  /** Confirmed validation libraries */
  validation: string[];
  /** Framework name */
  framework: FrameworkName;
  /** Quality check command */
  qualityCommand: string;
  /** Enabled addon names (e.g., ['orchestration']) */
  enabledAddons?: AddonName[];
}

/** Whether Claude Code uses standalone files (.claude/) or a plugin (.claude-plugins/) */
export type InstallMode = 'standalone' | 'plugin';

export interface Manifest {
  version: string;
  implantedAt: string;
  selectedIDEs: IDE[];
  /** User-confirmed project configuration */
  projectConfig?: ProjectConfig;
  files: Record<string, ManifestFile>;
  /** Install mode for Claude Code (standalone = .claude/, plugin = .claude-plugins/) */
  installMode?: InstallMode;
  /** Relative path to the generated plugin directory (e.g. .claude-plugins/devtronic) */
  pluginPath?: string;
}

export interface InitOptions {
  path?: string;
  ide?: string;
  yes?: boolean;
  preview?: boolean;
  preset?: PresetName;
  addon?: string;
}

export interface UpdateOptions {
  path?: string;
  check?: boolean;
  dryRun?: boolean;
}

export interface AddOptions {
  path?: string;
  yes?: boolean;
}

export interface RegenerateOptions {
  path?: string;
  rules?: boolean;
  agents?: boolean;
  claude?: boolean;
  all?: boolean;
  plugin?: boolean;
}

export interface AddonOptions {
  path?: string;
}

export interface UninstallOptions {
  path?: string;
}

export interface DoctorOptions {
  fix?: boolean;
  path?: string;
}

export interface ConfigOptions {
  path?: string;
}

export interface ListOptions {
  path?: string;
}

export interface DoctorCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  fixable?: boolean;
  fix?: () => void;
}

export type ConflictResolution = 'merge' | 'keep' | 'replace';

export type PresetName = 'nextjs-clean' | 'react-clean' | 'monorepo' | 'feature-based' | 'minimal';

export interface Preset {
  name: PresetName;
  description: string;
  config: Partial<ProjectConfig>;
}

export const PRESETS: Record<PresetName, Preset> = {
  'nextjs-clean': {
    name: 'nextjs-clean',
    description: 'Next.js with Clean Architecture',
    config: {
      framework: 'nextjs',
      architecture: 'clean',
      layers: ['domain', 'application', 'infrastructure', 'presentation'],
      stateManagement: ['Zustand'],
      dataFetching: ['React Query'],
      ui: ['Tailwind CSS'],
      validation: ['Zod'],
    },
  },
  'react-clean': {
    name: 'react-clean',
    description: 'React (Vite) with Clean Architecture',
    config: {
      framework: 'react',
      architecture: 'clean',
      layers: ['domain', 'application', 'infrastructure', 'presentation'],
      stateManagement: ['Zustand'],
      dataFetching: ['React Query'],
      ui: ['Tailwind CSS'],
    },
  },
  monorepo: {
    name: 'monorepo',
    description: 'Monorepo with Clean Architecture per app',
    config: {
      architecture: 'clean',
      layers: ['apps', 'packages', 'libs'],
    },
  },
  'feature-based': {
    name: 'feature-based',
    description: 'Feature-based architecture (co-located modules)',
    config: {
      architecture: 'feature-based',
      layers: ['features', 'shared'],
    },
  },
  minimal: {
    name: 'minimal',
    description: 'Quality checks only, no architecture rules',
    config: {
      architecture: 'none',
      layers: [],
    },
  },
};
