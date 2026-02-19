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
    ide: 'antigravity',
    paths: ['.agent', '.antigravity'],
  },
  {
    ide: 'github-copilot',
    paths: ['.github/copilot-instructions.md'],
  },
];

export function detectExistingConfigs(targetDir: string): ExistingConfigs {
  const result: ExistingConfigs = {
    'claude-code': false,
    cursor: false,
    antigravity: false,
    'github-copilot': false,
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
