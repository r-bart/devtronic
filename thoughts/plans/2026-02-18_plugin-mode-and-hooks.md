# Implementation Plan: Plugin Mode (tut-ai) + Hooks

**Date**: 2026-02-18
**Status**: Draft
**Spec**: `thoughts/specs/2026-02-18_plugin-mode-and-hooks.md`
**Research**: `thoughts/research/2026-02-18_plugin-mode-and-hooks.md`

---

## Overview

Cuando el usuario selecciona Claude Code como IDE, `init` genera un **plugin nativo `tut-ai`** dentro de un local marketplace (`.claude-plugins/`) en vez de copiar archivos standalone a `.claude/skills/` y `.claude/agents/`. Se incluyen 5 hooks de workflow. El comando `update` migra automáticamente instalaciones standalone existentes. Se crea un paquete `packages/marketplace/` para distribución npm.

## Requirements

- [ ] `init` con claude-code genera plugin `tut-ai` en `.claude-plugins/tut-ai/`
- [ ] Plugin incluye 14 skills, 3 agents, hooks.json, scripts/
- [ ] Marketplace local (`.claude-plugins/.claude-plugin/marketplace.json`)
- [ ] Plugin registrado en `.claude/settings.json` (`enabledPlugins`)
- [ ] Rules (`.claude/rules/`) y CLAUDE.md siguen siendo standalone
- [ ] `update` detecta instalación standalone y migra a plugin
- [ ] Hooks personalizados por PM y scripts del proyecto
- [ ] Paquete npm `@tutellus/agentic-marketplace` para distribución
- [ ] Tests para toda la funcionalidad nueva
- [ ] Otros IDEs (cursor, antigravity, copilot) sin cambios

---

## Approach Analysis

### Option A: Bifurcación en init con generators dedicados

**Description**: Añadir un branch en `init.ts:L232` que, si claude-code está seleccionado, llame a `generatePlugin()` en vez del loop de template copying. Los templates de skills/agents se reutilizan (mismos archivos, diferente destino). Nuevos generators para hooks.json y plugin.json.

**Pros**: Mínimo cambio en el flow existente. Reutiliza templates existentes. Clara separación.
**Cons**: Duplica algo de lógica de copia de archivos.
**Complexity**: Medium

### Option B: Abstracción de "output target" (plugin vs standalone)

**Description**: Refactorizar el loop de templates para usar un "target" abstracto — standalone copia a `.claude/`, plugin copia a `.claude-plugins/tut-ai/`. Misma lógica, diferente destino.

**Pros**: Más elegante, menos código duplicado.
**Cons**: Refactoring mayor del loop existente, más riesgo de regresión para otros IDEs.
**Complexity**: High

### Recommendation

**Option A** porque minimiza el riesgo de regresión en los flujos existentes. La "duplicación" es mínima — solo la copia de archivos del template `claude-code`, que se extrae a una función helper.

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/types.ts` | Modify | Extender Manifest, añadir InstallMode |
| `src/generators/plugin.ts` | Create | Generar estructura del plugin + marketplace |
| `src/generators/hooks.ts` | Create | Generar hooks.json personalizado |
| `src/utils/settings.ts` | Create | Leer/escribir `.claude/settings.json` |
| `src/commands/init.ts` | Modify | Bifurcar flow para plugin mode |
| `src/commands/update.ts` | Modify | Migración standalone → plugin |
| `src/data/removals.ts` | Modify | Registrar archivos standalone como "migrados" |
| `packages/marketplace/` | Create | Paquete npm para marketplace distribuible |
| `src/generators/__tests__/plugin.test.ts` | Create | Tests del plugin generator |
| `src/generators/__tests__/hooks.test.ts` | Create | Tests del hooks generator |

---

## Implementation Phases

### Phase 1: Types & Utilities (foundation)

#### Task 1.1: Extend types

**File**: `packages/cli/src/types.ts`

Añadir después de L112:

```typescript
export type InstallMode = 'standalone' | 'plugin';

export interface Manifest {
  version: string;
  implantedAt: string;
  selectedIDEs: IDE[];
  projectConfig?: ProjectConfig;
  files: Record<string, ManifestFile>;
  /** Install mode for Claude Code (standalone = .claude/, plugin = .claude-plugins/) */
  installMode?: InstallMode;
  /** Relative path to the generated plugin directory */
  pluginPath?: string;
}
```

#### Task 1.2: Create settings.ts utility

**File**: `packages/cli/src/utils/settings.ts`

```typescript
import { join } from 'node:path';
import { fileExists, readFile, writeFile, ensureDir } from './files.js';

const SETTINGS_FILE = '.claude/settings.json';

interface ClaudeSettings {
  extraKnownMarketplaces?: Record<string, {
    source: { source: string; path?: string; package?: string };
  }>;
  enabledPlugins?: Record<string, boolean>;
  [key: string]: unknown;
}

export function readClaudeSettings(targetDir: string): ClaudeSettings {
  const settingsPath = join(targetDir, SETTINGS_FILE);
  if (!fileExists(settingsPath)) return {};
  try {
    return JSON.parse(readFile(settingsPath));
  } catch {
    return {};
  }
}

export function writeClaudeSettings(targetDir: string, settings: ClaudeSettings): void {
  const settingsPath = join(targetDir, SETTINGS_FILE);
  ensureDir(join(targetDir, '.claude'));
  writeFile(settingsPath, JSON.stringify(settings, null, 2));
}

export function registerPlugin(
  targetDir: string,
  pluginName: string,
  marketplaceName: string,
  marketplacePath: string
): void {
  const settings = readClaudeSettings(targetDir);

  // Add marketplace if not present
  if (!settings.extraKnownMarketplaces) {
    settings.extraKnownMarketplaces = {};
  }
  if (!settings.extraKnownMarketplaces[marketplaceName]) {
    settings.extraKnownMarketplaces[marketplaceName] = {
      source: { source: 'directory', path: marketplacePath },
    };
  }

  // Enable plugin if not present
  if (!settings.enabledPlugins) {
    settings.enabledPlugins = {};
  }
  const pluginKey = `${pluginName}@${marketplaceName}`;
  if (settings.enabledPlugins[pluginKey] === undefined) {
    settings.enabledPlugins[pluginKey] = true;
  }

  writeClaudeSettings(targetDir, settings);
}

export function unregisterPlugin(
  targetDir: string,
  pluginName: string,
  marketplaceName: string
): void {
  const settings = readClaudeSettings(targetDir);
  const pluginKey = `${pluginName}@${marketplaceName}`;

  if (settings.enabledPlugins) {
    delete settings.enabledPlugins[pluginKey];
  }

  writeClaudeSettings(targetDir, settings);
}
```

---

### Phase 2: Generators (plugin + hooks)

#### Task 2.1: Create hooks generator

**File**: `packages/cli/src/generators/hooks.ts`

```typescript
import type { ProjectConfig, PackageManager } from '../types.js';

interface HookEntry {
  type: 'command' | 'prompt' | 'agent';
  command?: string;
  prompt?: string;
  model?: string;
  timeout?: number;
  statusMessage?: string;
}

interface HookMatcher {
  matcher?: string;
  hooks: HookEntry[];
}

interface HooksConfig {
  description: string;
  hooks: Record<string, HookMatcher[]>;
}

export function generateHooks(
  config: ProjectConfig,
  packageManager: PackageManager
): string {
  const pm = packageManager || 'npm';
  const run = pm === 'npm' ? 'npm run' : pm;
  const lintFixCmd = buildLintFixCommand(run, config);
  const qualityCmd = config.qualityCommand;

  const hooksConfig: HooksConfig = {
    description: 'Tutellus AI Agentic Architecture — workflow hooks',
    hooks: {
      SessionStart: [
        {
          matcher: 'startup',
          hooks: [
            {
              type: 'prompt',
              prompt:
                'Quick project orientation: check git status, recent commits, and any in-progress work (open branches, uncommitted changes). Give a 3-line summary.',
              model: 'haiku',
              timeout: 30,
            },
          ],
        },
      ],
      PostToolUse: [
        {
          matcher: 'Write|Edit',
          hooks: [
            {
              type: 'command',
              command: `${lintFixCmd} 2>/dev/null || true`,
              timeout: 30,
              statusMessage: 'Auto-linting...',
            },
          ],
        },
      ],
      Stop: [
        {
          hooks: [
            {
              type: 'prompt',
              prompt: [
                'Before stopping, verify:',
                `1. Run quality checks: \`${qualityCmd}\``,
                '2. No uncommitted debug code (console.log, debugger statements)',
                '3. Changes align with the original task',
                '4. No broken imports or unused variables',
                'If any issue found, fix it before stopping.',
              ].join('\n'),
              timeout: 60,
            },
          ],
        },
      ],
      SubagentStop: [
        {
          hooks: [
            {
              type: 'prompt',
              prompt: [
                'Validate the subagent output:',
                '1. Does the result answer the original question?',
                '2. Are code suggestions syntactically correct?',
                '3. Do recommendations follow project architecture rules?',
                'Flag any issues concisely.',
              ].join('\n'),
              model: 'haiku',
              timeout: 30,
            },
          ],
        },
      ],
      PreCompact: [
        {
          matcher: 'auto',
          hooks: [
            {
              type: 'command',
              command: '${CLAUDE_PLUGIN_ROOT}/scripts/checkpoint.sh',
              timeout: 30,
              statusMessage: 'Auto-checkpoint before compaction...',
            },
          ],
        },
      ],
    },
  };

  return JSON.stringify(hooksConfig, null, 2);
}

function buildLintFixCommand(run: string, config: ProjectConfig): string {
  // Try to use lint:fix if quality command includes lint
  if (config.qualityCommand.includes('lint')) {
    return `${run} lint:fix -- --quiet`;
  }
  return `${run} lint --fix --quiet`;
}

export function generateCheckpointScript(): string {
  return `#!/bin/bash
# Auto-checkpoint before context compaction
# Generated by @tutellus/agentic-architecture

CHECKPOINT_DIR="thoughts/checkpoints"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$CHECKPOINT_DIR"

{
  echo "# Auto-checkpoint: $TIMESTAMP"
  echo ""
  echo "## Git Status"
  git diff --stat 2>/dev/null || echo "Not a git repo"
  echo ""
  echo "## Recent Commits"
  git log --oneline -5 2>/dev/null || echo "No commits"
} > "$CHECKPOINT_DIR/\${TIMESTAMP}_pre-compact.md"

echo "Checkpoint saved: $CHECKPOINT_DIR/\${TIMESTAMP}_pre-compact.md"
`;
}
```

#### Task 2.2: Create plugin generator

**File**: `packages/cli/src/generators/plugin.ts`

```typescript
import { join } from 'node:path';
import type { ProjectConfig, PackageManager } from '../types.js';
import {
  ensureDir,
  writeFile,
  getAllFilesRecursive,
  readFile,
  createManifestEntry,
} from '../utils/files.js';
import { generateHooks, generateCheckpointScript } from './hooks.js';
import type { ManifestFile } from '../types.js';

export const PLUGIN_NAME = 'tut-ai';
export const MARKETPLACE_NAME = 'tutellus-local';
export const PLUGIN_DIR = '.claude-plugins';

interface PluginGenerationResult {
  /** Files created with their manifest entries, keyed by relative path from project root */
  files: Record<string, ManifestFile>;
  /** Relative path to the plugin directory */
  pluginPath: string;
}

export function generatePluginJson(cliVersion: string): string {
  return JSON.stringify(
    {
      name: PLUGIN_NAME,
      version: cliVersion,
      description:
        'AI Agentic Architecture — 14 skills, 3 agents, full workflow hooks by Tutellus',
      author: {
        name: 'Tutellus',
        url: 'https://github.com/nicobistolfi/ai-agentic-architecture',
      },
      repository: 'https://github.com/nicobistolfi/ai-agentic-architecture',
      license: 'MIT',
      keywords: [
        'agentic',
        'architecture',
        'clean-architecture',
        'ddd',
        'workflow',
        'skills',
      ],
    },
    null,
    2
  );
}

export function generateMarketplaceJson(): string {
  return JSON.stringify(
    {
      name: MARKETPLACE_NAME,
      owner: {
        name: 'Tutellus',
        url: 'https://github.com/nicobistolfi/ai-agentic-architecture',
      },
      plugins: [
        {
          name: PLUGIN_NAME,
          source: `./${PLUGIN_NAME}`,
          description:
            'AI Agentic Architecture — 14 skills, 3 agents, full workflow hooks',
        },
      ],
    },
    null,
    2
  );
}

/**
 * Generates the complete plugin structure from claude-code templates.
 *
 * Structure:
 * .claude-plugins/
 * ├── .claude-plugin/
 * │   └── marketplace.json
 * └── tut-ai/
 *     ├── .claude-plugin/
 *     │   └── plugin.json
 *     ├── skills/   (copied from templates/claude-code/.claude/skills/)
 *     ├── agents/   (copied from templates/claude-code/.claude/agents/)
 *     ├── hooks/
 *     │   └── hooks.json
 *     └── scripts/
 *         └── checkpoint.sh
 */
export function generatePlugin(
  targetDir: string,
  templatesDir: string,
  cliVersion: string,
  config: ProjectConfig,
  packageManager: PackageManager
): PluginGenerationResult {
  const files: Record<string, ManifestFile> = {};
  const pluginRoot = join(PLUGIN_DIR, PLUGIN_NAME);

  // 1. Create marketplace descriptor
  const marketplaceDir = join(targetDir, PLUGIN_DIR, '.claude-plugin');
  ensureDir(marketplaceDir);
  const marketplaceContent = generateMarketplaceJson();
  writeFile(join(marketplaceDir, 'marketplace.json'), marketplaceContent);
  const marketplaceRelPath = join(PLUGIN_DIR, '.claude-plugin', 'marketplace.json');
  files[marketplaceRelPath] = createManifestEntry(marketplaceContent);

  // 2. Create plugin.json
  const pluginMetaDir = join(targetDir, pluginRoot, '.claude-plugin');
  ensureDir(pluginMetaDir);
  const pluginJsonContent = generatePluginJson(cliVersion);
  writeFile(join(pluginMetaDir, 'plugin.json'), pluginJsonContent);
  const pluginJsonRelPath = join(pluginRoot, '.claude-plugin', 'plugin.json');
  files[pluginJsonRelPath] = createManifestEntry(pluginJsonContent);

  // 3. Copy skills from template
  const templateClaudeDir = join(templatesDir, 'claude-code', '.claude');
  const skillsSource = join(templateClaudeDir, 'skills');
  const skillFiles = getAllFilesRecursive(skillsSource);

  for (const file of skillFiles) {
    const sourceContent = readFile(join(skillsSource, file));
    const destRelPath = join(pluginRoot, 'skills', file);
    const destAbsPath = join(targetDir, destRelPath);
    ensureDir(join(targetDir, pluginRoot, 'skills', ...file.split('/').slice(0, -1)));
    writeFile(destAbsPath, sourceContent);
    files[destRelPath] = createManifestEntry(sourceContent);
  }

  // 4. Copy agents from template
  const agentsSource = join(templateClaudeDir, 'agents');
  const agentFiles = getAllFilesRecursive(agentsSource);

  for (const file of agentFiles) {
    const sourceContent = readFile(join(agentsSource, file));
    const destRelPath = join(pluginRoot, 'agents', file);
    const destAbsPath = join(targetDir, destRelPath);
    ensureDir(join(targetDir, pluginRoot, 'agents'));
    writeFile(destAbsPath, sourceContent);
    files[destRelPath] = createManifestEntry(sourceContent);
  }

  // 5. Generate hooks
  const hooksContent = generateHooks(config, packageManager);
  const hooksDir = join(targetDir, pluginRoot, 'hooks');
  ensureDir(hooksDir);
  writeFile(join(hooksDir, 'hooks.json'), hooksContent);
  const hooksRelPath = join(pluginRoot, 'hooks', 'hooks.json');
  files[hooksRelPath] = createManifestEntry(hooksContent);

  // 6. Generate checkpoint script
  const scriptContent = generateCheckpointScript();
  const scriptsDir = join(targetDir, pluginRoot, 'scripts');
  ensureDir(scriptsDir);
  const scriptPath = join(scriptsDir, 'checkpoint.sh');
  writeFile(scriptPath, scriptContent);
  const scriptRelPath = join(pluginRoot, 'scripts', 'checkpoint.sh');
  files[scriptRelPath] = createManifestEntry(scriptContent);

  // 7. Make script executable (will need chmod in init.ts)

  return { files, pluginPath: pluginRoot };
}
```

---

### Phase 3: Modify init command

#### Task 3.1: Bifurcar init para plugin mode

**File**: `packages/cli/src/commands/init.ts`

**Cambios clave** (pseudocódigo anotado con líneas):

```
Después de L36 (imports):
+ import { generatePlugin, PLUGIN_NAME, MARKETPLACE_NAME, PLUGIN_DIR } from '../generators/plugin.js';
+ import { registerPlugin } from '../utils/settings.js';
+ import { chmodSync } from 'node:fs';

En L218-224 (manifest creation):
+ Añadir installMode y pluginPath condicional

En L231 (antes del loop de templates):
+ if (selectedIDEs.includes('claude-code')) {
+   // PLUGIN MODE: generate plugin instead of copying to .claude/
+   const pluginResult = generatePlugin(
+     targetDir, TEMPLATES_DIR, getCliVersion(),
+     projectConfig, analysis.packageManager
+   );
+
+   // Make checkpoint script executable
+   chmodSync(join(targetDir, pluginResult.pluginPath, 'scripts', 'checkpoint.sh'), 0o755);
+
+   // Register plugin in .claude/settings.json
+   registerPlugin(targetDir, PLUGIN_NAME, MARKETPLACE_NAME, PLUGIN_DIR);
+
+   // Add plugin files to manifest
+   Object.assign(manifest.files, pluginResult.files);
+   manifest.installMode = 'plugin';
+   manifest.pluginPath = pluginResult.pluginPath;
+
+   // Track for output
+   generatedFiles.push(`Plugin ${PLUGIN_NAME} (14 skills, 3 agents, 5 hooks)`);
+
+   // Still need to copy rules (standalone) — handled in existing loop
+   // But SKIP skills and agents in the template loop for claude-code
+ }

En L232-279 (template loop):
  for (const ide of selectedIDEs) {
+   const isPluginMode = ide === 'claude-code' && manifest.installMode === 'plugin';
    ...
    for (const file of files) {
      if (dynamicFiles.includes(file)) continue;
+     // Skip skills and agents if plugin mode — they're in the plugin
+     if (isPluginMode && (file.startsWith('.claude/skills/') || file.startsWith('.claude/agents/'))) {
+       continue;
+     }
      // ... rest of copy logic unchanged
    }
  }

En L380-393 (next steps output):
+ if (manifest.installMode === 'plugin') {
+   console.log('');
+   console.log(chalk.bold('Plugin installed:'));
+   console.log(`  Plugin: ${chalk.cyan('tut-ai')} at .claude-plugins/tut-ai/`);
+   console.log(`  Skills: /tut-ai:brief, /tut-ai:spec, /tut-ai:research, ...`);
+   console.log(`  Hooks: SessionStart, PostToolUse, Stop, SubagentStop, PreCompact`);
+   console.log('');
+   console.log(`  ${chalk.dim('Toggle off: claude --disable-plugin tut-ai@tutellus-local')}`);
+ }
+ console.log('  Add to .gitignore:');
+ console.log(chalk.dim('     .claude/settings.local.json'));
```

#### Task 3.2: Update preview para mostrar plugin mode

En `showPreview()` (L399-504), añadir sección de plugin preview cuando claude-code está seleccionado.

---

### Phase 4: Modify update command (migration)

#### Task 4.1: Detectar y migrar standalone → plugin

**File**: `packages/cli/src/commands/update.ts`

**Cambios clave**:

```
Después de L57 (analysis):
+ // Detect standalone Claude Code installation that should migrate to plugin
+ const shouldMigrate = manifest.selectedIDEs.includes('claude-code')
+   && !manifest.installMode
+   && hasStandaloneSkills(targetDir, manifest);

Después de L77 (stack changes):
+ if (shouldMigrate) {
+   p.note(
+     'Claude Code skills/agents detectados como standalone.\n' +
+     'La nueva versión usa plugin mode (namespace tut-ai:).',
+     'Migration Available'
+   );
+
+   if (!options.check) {
+     const migrate = await p.confirm({
+       message: 'Migrate to plugin mode? (standalone → tut-ai plugin)',
+       initialValue: true,
+     });
+
+     if (!p.isCancel(migrate) && migrate) {
+       await migrateToPlugin(targetDir, manifest, analysis, options.dryRun);
+       return;
+     }
+   }
+ }

Función helper nueva:
+ function hasStandaloneSkills(targetDir: string, manifest: Manifest): boolean {
+   // Check if any manifest files are in .claude/skills/ or .claude/agents/
+   return Object.keys(manifest.files).some(
+     f => f.startsWith('.claude/skills/') || f.startsWith('.claude/agents/')
+   );
+ }

Función migrateToPlugin():
+ async function migrateToPlugin(
+   targetDir: string,
+   manifest: Manifest,
+   analysis: ReturnType<typeof analyzeProject>,
+   dryRun?: boolean
+ ): Promise<void> {
+   if (dryRun) { /* show preview, return */ }
+
+   const spinner = p.spinner();
+   spinner.start('Migrating to plugin mode...');
+
+   const config = manifest.projectConfig || buildDefaultConfig(analysis);
+
+   // 1. Generate plugin
+   const pluginResult = generatePlugin(
+     targetDir, TEMPLATES_DIR, getCliVersion(),
+     config, analysis.packageManager
+   );
+   chmodSync(join(targetDir, pluginResult.pluginPath, 'scripts', 'checkpoint.sh'), 0o755);
+
+   // 2. Register plugin
+   registerPlugin(targetDir, PLUGIN_NAME, MARKETPLACE_NAME, PLUGIN_DIR);
+
+   // 3. Remove standalone skills/agents (only unmodified ones)
+   const removed: string[] = [];
+   const preserved: string[] = [];
+
+   for (const [path, fileInfo] of Object.entries(manifest.files)) {
+     if (!path.startsWith('.claude/skills/') && !path.startsWith('.claude/agents/')) continue;
+     const filePath = join(targetDir, path);
+     if (!fileExists(filePath)) continue;
+
+     const current = calculateChecksum(readFile(filePath));
+     if (current === fileInfo.originalChecksum) {
+       unlinkSync(filePath);
+       delete manifest.files[path];
+       removed.push(path);
+     } else {
+       preserved.push(path);
+     }
+   }
+
+   // 4. Clean empty dirs
+   cleanEmptyDirs(join(targetDir, '.claude/skills'));
+   cleanEmptyDirs(join(targetDir, '.claude/agents'));
+
+   // 5. Update manifest
+   Object.assign(manifest.files, pluginResult.files);
+   manifest.installMode = 'plugin';
+   manifest.pluginPath = pluginResult.pluginPath;
+   manifest.version = getCliVersion();
+   manifest.implantedAt = new Date().toISOString().split('T')[0];
+   writeManifest(targetDir, manifest);
+
+   spinner.stop('Migration complete');
+
+   // 6. Output summary
+   if (removed.length > 0) {
+     p.note(removed.map(f => `  ${chalk.red('✗')} ${f}`).join('\n'), 'Standalone files removed');
+   }
+   if (preserved.length > 0) {
+     p.note(
+       preserved.map(f => `  ${chalk.yellow('●')} ${f} (modified — preserved)`).join('\n'),
+       'User-modified files preserved'
+     );
+   }
+   p.note(
+     `  Plugin: ${chalk.cyan('tut-ai')} at .claude-plugins/tut-ai/\n` +
+     `  Skills: /tut-ai:brief, /tut-ai:spec, ...\n` +
+     `  Hooks: 5 workflow hooks enabled`,
+     'Plugin Generated'
+   );
+
+   p.outro(chalk.green('Migrated to plugin mode!'));
+ }
```

#### Task 4.2: Update también actualiza plugin existente

En el loop de update de archivos (L293-312), añadir manejo de plugin files:

```
+ // Update plugin files if in plugin mode
+ if (manifest.installMode === 'plugin' && manifest.pluginPath) {
+   // Re-generate plugin (re-copies templates, regenerates hooks)
+   const pluginResult = generatePlugin(
+     targetDir, TEMPLATES_DIR, currentVersion,
+     manifest.projectConfig || buildDefaultConfig(analysis),
+     analysis.packageManager
+   );
+
+   // Only overwrite unmodified plugin files
+   for (const [relPath, newEntry] of Object.entries(pluginResult.files)) {
+     const existing = manifest.files[relPath];
+     if (existing && isFileModified(targetDir, relPath, manifest)) {
+       continue; // User modified — skip
+     }
+     updatedManifest.files[relPath] = newEntry;
+   }
+ }
```

---

### Phase 5: Removals registry + manifest normalization

#### Task 5.1: Add standalone files to removals registry

**File**: `packages/cli/src/data/removals.ts`

No necesita cambios para la migración. Los archivos standalone se eliminan por la lógica de migración, no por el removals registry. Pero documentar el cambio de versión:

```typescript
// Nota: En v1.8.0, los archivos .claude/skills/* y .claude/agents/*
// se migran al plugin tut-ai. No se añaden aquí porque la migración
// los maneja directamente en update.ts.
```

#### Task 5.2: Normalize manifest for legacy installs

**File**: `packages/cli/src/utils/files.ts`

En `readManifest()` (L43-61), añadir normalización:

```typescript
return {
  version: raw.version ?? 'unknown',
  implantedAt: raw.implantedAt ?? 'unknown',
  selectedIDEs: raw.selectedIDEs ?? [],
  projectConfig: raw.projectConfig,
  files: raw.files ?? {},
  installMode: raw.installMode,      // ← nuevo (undefined para legacy)
  pluginPath: raw.pluginPath,        // ← nuevo (undefined para legacy)
};
```

---

### Phase 6: Marketplace npm package

#### Task 6.1: Create marketplace package

**Structure**:

```
packages/marketplace/
├── package.json
├── .claude-plugin/
│   └── marketplace.json
└── plugins/
    └── tut-ai/
        ├── .claude-plugin/
        │   └── plugin.json
        ├── skills/          (symlinks o copia del template)
        ├── agents/          (symlinks o copia del template)
        ├── hooks/
        │   └── hooks.json   (genérico, sin PM personalizado)
        └── scripts/
            └── checkpoint.sh
```

**package.json**:
```json
{
  "name": "@tutellus/agentic-marketplace",
  "version": "1.8.0",
  "description": "Tutellus AI Agentic Architecture marketplace for Claude Code",
  "license": "MIT",
  "files": [".claude-plugin", "plugins"],
  "type": "commonjs"
}
```

**Hooks genéricos** (sin personalización de PM):
```json
{
  "description": "Tutellus AI Agentic Architecture — workflow hooks",
  "hooks": {
    "PostToolUse": [{
      "matcher": "Write|Edit",
      "hooks": [{
        "type": "command",
        "command": "npx eslint --fix --quiet 2>/dev/null || true",
        "timeout": 30,
        "statusMessage": "Auto-linting..."
      }]
    }],
    "Stop": [{
      "hooks": [{
        "type": "prompt",
        "prompt": "Before stopping, verify:\n1. Run quality checks\n2. No debug code\n3. Changes match task",
        "timeout": 60
      }]
    }]
  }
}
```

Nota: El marketplace npm tiene hooks simplificados (3 hooks en vez de 5) porque no puede personalizar por PM. Los usuarios que quieran la versión completa usan `init`.

#### Task 6.2: Build script para marketplace

Un script en la raíz o en el CLI que copia los templates al paquete marketplace. Esto se ejecuta en CI antes de publicar.

```bash
# scripts/build-marketplace.sh
#!/bin/bash
DEST=packages/marketplace/plugins/tut-ai

rm -rf $DEST
mkdir -p $DEST/.claude-plugin $DEST/skills $DEST/agents $DEST/hooks $DEST/scripts

# Copy from templates
cp -r packages/cli/templates/claude-code/.claude/skills/* $DEST/skills/
cp -r packages/cli/templates/claude-code/.claude/agents/* $DEST/agents/

# Generate static files
# (plugin.json and marketplace.json are committed, not generated)
```

---

### Phase 7: Tests

#### Task 7.1: Test hooks generator

**File**: `packages/cli/src/generators/__tests__/hooks.test.ts`

Tests:
- Genera JSON válido
- Incluye los 5 hooks (SessionStart, PostToolUse, Stop, SubagentStop, PreCompact)
- Personaliza lint command por PM (npm run lint:fix vs pnpm lint:fix)
- Usa `${CLAUDE_PLUGIN_ROOT}` en checkpoint hook
- Checkpoint script es bash válido

#### Task 7.2: Test plugin generator

**File**: `packages/cli/src/generators/__tests__/plugin.test.ts`

Tests:
- Genera estructura correcta (.claude-plugins/tut-ai/...)
- plugin.json tiene campos requeridos (name, version)
- marketplace.json referencia el plugin
- Copia todos los skills (14) y agents (3)
- Devuelve manifest entries para todos los archivos
- No copia rules (rules son standalone)

#### Task 7.3: Test settings utility

**File**: `packages/cli/src/utils/__tests__/settings.test.ts`

Tests:
- readClaudeSettings() con archivo existente
- readClaudeSettings() sin archivo (retorna {})
- registerPlugin() crea marketplace + enabledPlugins
- registerPlugin() es idempotente (no duplica)
- unregisterPlugin() elimina la entrada

#### Task 7.4: Test init con plugin mode

Tests e2e o integration:
- `init --yes --ide claude-code` genera plugin (no standalone skills)
- `.claude/rules/` sigue existiendo (standalone)
- CLAUDE.md sigue existiendo (standalone)
- `.claude/settings.json` tiene marketplace + enabledPlugins
- Manifest tiene installMode: 'plugin'

#### Task 7.5: Test update migration

Tests:
- Detecta standalone installation correctamente
- Migra: genera plugin + elimina standalone unmodified
- Preserva archivos standalone modificados por el usuario
- Actualiza manifest con installMode: 'plugin'

---

## Risk Analysis

### Edge Cases
- [ ] Proyecto sin `.claude/` directory — init crea todo desde cero (happy path)
- [ ] Re-run init con plugin existente — debe detectar y ofrecer re-generate
- [ ] `.claude/settings.json` con contenido existente del usuario — merge, no overwrite
- [ ] Skill modificado por usuario en standalone — preservar en migración, advertir
- [ ] Plugin + standalone skills coexisten — Claude Code los ve como diferentes (namespaced)

### Technical Risks
- [ ] `${CLAUDE_PLUGIN_ROOT}` podría no resolver correctamente en marketplace local (vs cached)
- [ ] Path relativo en `extraKnownMarketplaces` podría requerir absoluto
- [ ] Bug #17832: plugin no se auto-habilita — nuestro init lo maneja pero update migrations necesitan testear

---

## Testing Strategy

- **Unit tests**: generators/hooks.ts, generators/plugin.ts, utils/settings.ts
- **Integration tests**: init con plugin mode, update migration
- **Manual verification**:
  1. `npx @tutellus/agentic-architecture init --yes --ide claude-code` en proyecto nuevo
  2. Abrir Claude Code, verificar `/tut-ai:brief` funciona
  3. Verificar hooks activos con `/hooks`
  4. Ejecutar `update` en instalación standalone existente, verificar migración

---

## Verification

Detect package manager first (`pnpm-lock.yaml`):

```bash
pnpm run typecheck && pnpm run lint && pnpm test
```

After implementation run `/post-review`.

---

## Phase Summary

| Phase | Tasks | Files | Priority |
|-------|-------|-------|----------|
| 1. Types & Utils | 1.1, 1.2 | types.ts, settings.ts | P0 — foundation |
| 2. Generators | 2.1, 2.2 | hooks.ts, plugin.ts | P0 — core logic |
| 3. Init command | 3.1, 3.2 | init.ts | P0 — main feature |
| 4. Update command | 4.1, 4.2 | update.ts | P0 — migration |
| 5. Removals + manifest | 5.1, 5.2 | removals.ts, files.ts | P1 — polish |
| 6. Marketplace npm | 6.1, 6.2 | packages/marketplace/ | P2 — distribution |
| 7. Tests | 7.1-7.5 | __tests__/*.test.ts | P0 — quality |
