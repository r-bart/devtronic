import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { ExistingConfigs, IDE } from '../types.js';

interface ConfigLocation {
  ide: IDE;
  paths: string[];
}

const CONFIG_LOCATIONS: ConfigLocation[] = [
  {
    ide: 'claude-code',
    paths: ['.claude', 'CLAUDE.md'],
  },
  {
    ide: 'cursor',
    paths: ['.cursor', '.cursorrules'],
  },
  {
    // `.agents/rules`, not `.agents` — `.agents/skills` is the shared Agent
    // Skills directory and would otherwise read as an Antigravity install.
    ide: 'antigravity',
    paths: ['.agents/rules', '.agent', '.antigravity'],
  },
  {
    ide: 'github-copilot',
    paths: ['.github/copilot-instructions.md'],
  },
  {
    ide: 'opencode',
    paths: ['opencode.json'],
  },
  {
    ide: 'codex',
    paths: ['.codex'],
  },
];

export function detectExistingConfigs(targetDir: string): ExistingConfigs {
  const result: ExistingConfigs = {
    'claude-code': false,
    cursor: false,
    antigravity: false,
    'github-copilot': false,
    opencode: false,
    codex: false,
  };

  for (const config of CONFIG_LOCATIONS) {
    for (const path of config.paths) {
      if (existsSync(join(targetDir, path))) {
        result[config.ide] = true;
        break;
      }
    }
  }

  return result;
}

export function getExistingConfigsList(configs: ExistingConfigs): IDE[] {
  return (Object.keys(configs) as IDE[]).filter((ide) => configs[ide]);
}

export function hasAnyExistingConfig(configs: ExistingConfigs): boolean {
  return Object.values(configs).some((v) => v);
}
