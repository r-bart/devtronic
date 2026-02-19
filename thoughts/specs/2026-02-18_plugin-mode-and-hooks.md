# PRD: Plugin Mode para Claude Code + Hooks

**Date**: 2026-02-18
**Status**: draft

---

## Executive Summary

Transformar la instalación de Claude Code para que genere un **plugin nativo** (nombre: `tut-ai`) en vez de copiar archivos standalone a `.claude/`. Los skills pasan a invocarse como `/tut-ai:brief`, `/tut-ai:spec`, etc. Se añaden **hooks de workflow completo** dentro del plugin. Además, se publica un **marketplace npm** (`@tutellus/agentic-marketplace`) para instalación sin CLI. Los otros IDEs (Cursor, Antigravity, Copilot) mantienen el flujo actual. El comando `update` migra automáticamente instalaciones standalone existentes al modo plugin.

> **Research update (2026-02-18)**: Ver `thoughts/research/2026-02-18_plugin-mode-and-hooks.md` para detalles técnicos. Cambios clave respecto al draft inicial:
> - Plugin name: `tut-ai` (no `tut`)
> - Plugin se genera dentro de un **local marketplace** (`.claude-plugins/`) para persistencia entre sesiones
> - Hooks `prompt` consumen tokens (Haiku, ~$0.005/sesión — negligible)
> - Patrón de GSD adoptado: hook de update check en SessionStart, backup de patches del usuario, CommonJS marker

### Contexto: Ecosistema oficial de plugins

El [marketplace oficial de Anthropic](https://github.com/anthropics/claude-plugins-official) contiene actualmente **28 plugins internos + 13 externos**:

**Plugins internos** (Anthropic):
- **LSP** (8): typescript, pyright, rust-analyzer, gopls, clangd, jdtls, kotlin, lua, php, swift — diagnósticos y navegación de código
- **Workflow** (7): commit-commands, code-review, pr-review-toolkit, feature-dev, plugin-dev, hookify, code-simplifier
- **Development** (5): agent-sdk-dev, claude-code-setup, claude-md-management, frontend-design, security-guidance
- **Output styles** (2): explanatory-output-style, learning-output-style
- **Otros** (3): playground, ralph-loop, example-plugin

**Plugins externos** (partners):
- **Integraciones**: github, gitlab, slack, stripe, firebase, supabase, asana, linear
- **Herramientas**: playwright, context7, greptile, serena, laravel-boost

Nuestro plugin `tut-ai` sería el primero enfocado en **arquitectura de proyecto + workflow completo** (14 skills + 3 agents + 5 hooks), una categoría no cubierta por ningún plugin oficial.

---

## Problem Statement

### Current State
- `init` copia 14 skills + 3 agents + 2 rules como archivos sueltos a `.claude/`
- No hay mecanismo de toggle on/off, ni namespacing, ni distribución via marketplace
- No existen hooks de automatización (lint automático, quality gates, checkpoints)
- Las actualizaciones requieren nuestro comando `update` con detección de conflictos manual
- `--dangerously-skip-permissions` es un todo-o-nada; no hay control granular

### Pain Points
- Los archivos copiados se mezclan con customizaciones del usuario en `.claude/`
- No hay forma de distribuir nuestra arquitectura como paquete instalable vía `claude plugin install`
- Falta automatización de calidad (lint post-edición, checks antes de parar)
- Sin checkpoint automático antes de compactación de contexto

---

## Goals & Non-Goals

### Goals
1. **Plugin nativo**: Que `init` genere un plugin `tut` cuando el IDE es Claude Code
2. **Hooks de workflow**: Incluir hooks (SessionStart, PostToolUse, Stop, SubagentStop, PreCompact)
3. **Marketplace npm**: Publicar `@tutellus/agentic-marketplace` para distribución sin CLI
4. **Migración automática**: Que `update` migre instalaciones standalone → plugin
5. **Backwards compatible**: Otros IDEs siguen funcionando igual

### Non-Goals
- No eliminar soporte para otros IDEs (Cursor, Antigravity, Copilot)
- No cambiar la estructura de skills/agents existente (solo el empaquetado)
- No implementar LSP servers ni output styles en esta iteración
- No crear MCP servers dentro del plugin (puede venir después)

---

## User Stories

### US1: Nuevo proyecto con Claude Code
**As a** developer iniciando un proyecto
**I want to** ejecutar `npx @tutellus/agentic-architecture init` y obtener un plugin `tut` funcional
**So that** pueda usar `/tut:brief`, `/tut:spec`, etc. con toggle on/off y sin contaminar `.claude/`

Acceptance Criteria:
- [ ] `init` detecta Claude Code y genera plugin en `.claude-plugins/tut/`
- [ ] El plugin incluye los 14 skills, 3 agents y hooks
- [ ] Se genera `plugin.json` con name `tut` y metadatos
- [ ] Rules (`.claude/rules/`) y CLAUDE.md se generan standalone (los plugins no soportan rules)
- [ ] El output muestra las instrucciones para activar el plugin
- [ ] `/tut:brief`, `/tut:spec`, etc. funcionan correctamente

### US2: Proyecto existente migrando a plugin
**As a** developer con instalación standalone existente
**I want to** ejecutar `update` y que migre automáticamente a plugin
**So that** no tenga que re-inicializar manualmente

Acceptance Criteria:
- [ ] `update` detecta instalación standalone de Claude Code (skills/agents en `.claude/`)
- [ ] Genera el plugin `tut` con los skills/agents actuales
- [ ] Elimina los archivos standalone de skills y agents (NO rules ni CLAUDE.md)
- [ ] Actualiza el manifest con el nuevo modo de instalación
- [ ] Muestra resumen de la migración al usuario

### US3: Instalación via marketplace
**As a** developer de un equipo que ya usa la arquitectura
**I want to** instalar el plugin con `claude plugin install tut@tutellus`
**So that** no necesite el CLI de init para obtener skills y agents

Acceptance Criteria:
- [ ] Existe paquete npm `@tutellus/agentic-marketplace` con `marketplace.json`
- [ ] El marketplace referencia el plugin `tut` con source npm
- [ ] `claude plugin install tut@tutellus` instala skills, agents y hooks
- [ ] La documentación explica cómo añadir el marketplace a `.claude/settings.json`

### US4: Hooks automáticos en el workflow
**As a** developer usando Claude Code con el plugin `tut`
**I want to** que se ejecuten quality gates automáticamente
**So that** no tenga que acordarme de ejecutar lint, tests o checkpoints manualmente

Acceptance Criteria:
- [ ] `SessionStart`: prompt de orientación rápida del proyecto
- [ ] `PostToolUse(Write|Edit)`: auto-lint con el PM detectado
- [ ] `Stop`: verificación de quality checks antes de parar
- [ ] `SubagentStop`: validación del output de subagentes
- [ ] `PreCompact`: checkpoint automático antes de comprimir contexto
- [ ] Los hooks se personalizan según el PM y scripts detectados del proyecto

---

## Functional Requirements

### FR1: Generación del Plugin

**Estructura generada** en el proyecto del usuario:

```
.claude-plugins/tut/
├── .claude-plugin/
│   └── plugin.json
├── skills/
│   ├── audit/
│   │   ├── SKILL.md
│   │   └── report-template.md
│   ├── backlog/SKILL.md
│   ├── brief/SKILL.md
│   ├── checkpoint/SKILL.md
│   ├── create-plan/SKILL.md
│   ├── create-skill/SKILL.md
│   ├── investigate/SKILL.md
│   ├── learn/SKILL.md
│   ├── post-review/SKILL.md
│   ├── research/SKILL.md
│   ├── scaffold/
│   │   ├── SKILL.md
│   │   ├── bootstrap-commands.md
│   │   ├── examples-backend.md
│   │   ├── examples-frontend.md
│   │   ├── examples-tutellus.md
│   │   └── structures.md
│   ├── setup/SKILL.md
│   ├── spec/SKILL.md
│   └── worktree/SKILL.md
├── agents/
│   ├── code-reviewer.md
│   ├── error-investigator.md
│   └── quality-runner.md
├── hooks/
│   └── hooks.json
└── scripts/
    └── checkpoint.sh
```

**plugin.json**:
```json
{
  "name": "tut",
  "version": "<cli-version>",
  "description": "AI Agentic Architecture - 14 skills, 3 agents, full workflow hooks",
  "author": {
    "name": "Tutellus",
    "url": "https://github.com/nicobistolfi/ai-agentic-architecture"
  },
  "repository": "https://github.com/nicobistolfi/ai-agentic-architecture",
  "license": "MIT",
  "keywords": ["agentic", "architecture", "clean-architecture", "ddd", "workflow"]
}
```

**Comportamiento**:
- Los templates de skills y agents se copian tal cual (mismos archivos)
- El plugin.json se genera dinámicamente con la versión del CLI
- Los hooks se generan dinámicamente según el PM y scripts detectados
- El plugin se registra en `.claude/settings.local.json` como `enabledPlugins`

### FR2: Hooks Dinámicos

Los hooks se generan en `hooks/hooks.json` personalizados según el proyecto:

**hooks.json** (ejemplo para proyecto npm con eslint):
```json
{
  "description": "Tutellus Agentic Architecture workflow hooks",
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup",
        "hooks": [
          {
            "type": "prompt",
            "prompt": "Quick project orientation: check git status, recent commits, and any in-progress work. Give a 3-line summary.",
            "model": "haiku"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "npm run lint:fix -- --quiet 2>/dev/null || true",
            "timeout": 30,
            "statusMessage": "Auto-linting..."
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "prompt",
            "prompt": "Before stopping, verify:\n1. Run quality checks (typecheck + lint)\n2. No uncommitted debug code (console.log, debugger)\n3. Changes align with the original task\n4. No broken imports or unused variables\nIf any issue found, fix it before stopping.",
            "timeout": 60
          }
        ]
      }
    ],
    "SubagentStop": [
      {
        "hooks": [
          {
            "type": "prompt",
            "prompt": "Validate the subagent output:\n1. Does the result answer the original question?\n2. Are code suggestions syntactically correct?\n3. Do recommendations follow project architecture rules?\nFlag any issues.",
            "model": "haiku",
            "timeout": 30
          }
        ]
      }
    ],
    "PreCompact": [
      {
        "matcher": "auto",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/scripts/checkpoint.sh",
            "timeout": 30,
            "statusMessage": "Auto-checkpoint before compaction..."
          }
        ]
      }
    ]
  }
}
```

**Personalización por proyecto**:

| Aspecto | Cómo se personaliza |
|---------|-------------------|
| **PM en PostToolUse** | `npm run lint:fix`, `pnpm lint:fix`, `yarn lint:fix`, `bun run lint:fix` |
| **Quality command en Stop** | Usa el `qualityCommand` detectado del proyecto |
| **Scripts en checkpoint** | Adapta el script de checkpoint al PM detectado |

**Script `checkpoint.sh`**:
```bash
#!/bin/bash
# Auto-checkpoint before context compaction
CHECKPOINT_DIR="thoughts/checkpoints"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p "$CHECKPOINT_DIR"

# Save git state
git diff --stat > "$CHECKPOINT_DIR/${TIMESTAMP}_pre-compact.md" 2>/dev/null
git log --oneline -5 >> "$CHECKPOINT_DIR/${TIMESTAMP}_pre-compact.md" 2>/dev/null
echo "Checkpoint saved: $CHECKPOINT_DIR/${TIMESTAMP}_pre-compact.md"
```

### FR3: Cambios en `init`

**Flujo modificado** (solo para Claude Code):

```
Paso actual                    →  Cambio
─────────────────────────────────────────────────────
Copiar .claude/skills/*        →  Generar plugin en .claude-plugins/tut/skills/
Copiar .claude/agents/*        →  Generar plugin en .claude-plugins/tut/agents/
Copiar .claude/rules/*         →  Sin cambio (rules = standalone)
Generar CLAUDE.md              →  Sin cambio (standalone)
Generar AGENTS.md              →  Sin cambio (standalone)
                               →  NUEVO: Generar hooks en plugin
                               →  NUEVO: Generar plugin.json
                               →  NUEVO: Generar scripts/
                               →  NUEVO: Registrar plugin en settings.local.json
```

**Registro automático del plugin**:

Después de generar el plugin, escribir en `.claude/settings.local.json`:
```json
{
  "enabledPlugins": {
    "tut@local": true
  },
  "extraKnownMarketplaces": {}
}
```

O usar `--plugin-dir` approach documentando en el output del init:
```
Plugin generated at .claude-plugins/tut/
To activate: claude --plugin-dir .claude-plugins/tut
Or add to .claude/settings.local.json
```

### FR4: Cambios en `update`

**Detección de instalación standalone**:
- Si el manifest indica IDE `claude-code` Y existen archivos en `.claude/skills/` que coinciden con nuestros templates → instalación legacy

**Flujo de migración**:
1. Generar plugin `tut` en `.claude-plugins/tut/`
2. Eliminar archivos standalone: `.claude/skills/{nuestros-skills}`, `.claude/agents/{nuestros-agents}`
3. Preservar: `.claude/rules/`, `CLAUDE.md`, `AGENTS.md`, archivos custom del usuario
4. Actualizar manifest: añadir campo `installMode: "plugin"` y registrar archivos del plugin
5. Mostrar resumen: qué se migró, qué se preservó

**Seguridad**: Solo eliminar archivos cuyo checksum coincida con el template original (no archivos modificados por el usuario). Los archivos modificados se copian al plugin pero el original se preserva como `.bak`.

### FR5: Marketplace npm

**Paquete `@tutellus/agentic-marketplace`**:

```
packages/marketplace/
├── package.json
├── .claude-plugin/
│   └── marketplace.json
└── plugins/
    └── tut/
        ├── .claude-plugin/
        │   └── plugin.json
        ├── skills/          (same as template)
        ├── agents/          (same as template)
        ├── hooks/
        │   └── hooks.json   (generic, sin personalización de PM)
        └── scripts/
            └── checkpoint.sh
```

**marketplace.json**:
```json
{
  "name": "tutellus",
  "owner": {
    "name": "Tutellus",
    "url": "https://github.com/nicobistolfi/ai-agentic-architecture"
  },
  "plugins": [
    {
      "name": "tut",
      "source": "./plugins/tut",
      "description": "AI Agentic Architecture - 14 skills, 3 agents, workflow hooks"
    }
  ]
}
```

**Instalación por equipos** (en `.claude/settings.json` del proyecto):
```json
{
  "extraKnownMarketplaces": {
    "tutellus": {
      "source": {
        "source": "npm",
        "package": "@tutellus/agentic-marketplace"
      }
    }
  }
}
```

**Diferencia vs init**: El plugin del marketplace tiene hooks genéricos (no personalizados al PM del proyecto). El init genera hooks personalizados. La documentación explica que para máxima personalización se recomienda `init`.

### FR6: Manifest Changes

Añadir al manifest (`.ai-template/manifest.json`):

```typescript
interface Manifest {
  // ... campos existentes
  installMode?: 'standalone' | 'plugin'  // Nuevo: modo de instalación para Claude Code
  pluginPath?: string                     // Nuevo: ruta relativa del plugin generado
}
```

---

## Technical Considerations

### Estructura de código

**Nuevos archivos/módulos**:

| Archivo | Responsabilidad |
|---------|-----------------|
| `src/generators/plugin.ts` | Genera la estructura del plugin (plugin.json, copia skills/agents) |
| `src/generators/hooks.ts` | Genera hooks.json personalizado según ProjectConfig |
| `src/generators/checkpoint-script.ts` | Genera scripts/checkpoint.sh |
| `src/commands/migrate.ts` | Lógica de migración standalone → plugin (usada por update) |
| `packages/marketplace/` | Nuevo paquete del monorepo para el marketplace |

**Archivos modificados**:

| Archivo | Cambio |
|---------|--------|
| `src/commands/init.ts` | Bifurcar flujo: Claude Code → plugin, otros → standalone |
| `src/commands/update.ts` | Añadir detección y migración automática |
| `src/types.ts` | Añadir `installMode`, `pluginPath` al Manifest |
| `src/utils/files.ts` | Funciones para escribir/leer plugin structure |

### Rutas y convenciones

- **Plugin local**: `.claude-plugins/tut/` (en raíz del proyecto)
- **Plugin cache**: `~/.claude/plugins/cache/tut/` (gestionado por Claude Code)
- **Settings**: `.claude/settings.local.json` (gitignored, local al developer)
- **Marketplace**: `packages/marketplace/` (nuevo paquete en monorepo)

### Compatibilidad

- Node.js: Mantener requisitos actuales
- Claude Code: Requiere versión con soporte de plugins (beta desde Oct 2025, estable)
- `--plugin-dir` flag como alternativa a settings.json para desarrollo

### Gitignore

Añadir a las recomendaciones de gitignore del init:
```
.claude/settings.local.json
```

El directorio `.claude-plugins/tut/` **SÍ debe commitearse** para que todo el equipo tenga el plugin disponible.

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Init genera plugin correctamente | 100% de inits con Claude Code producen plugin funcional | Tests e2e |
| Migración sin pérdida de datos | 0 archivos custom eliminados accidentalmente | Tests + checksums |
| Hooks funcionan en Claude Code | 5 hooks ejecutándose correctamente | Test manual con Claude Code |
| Marketplace instalable | `claude plugin install tut@tutellus` funciona | Test manual |
| Skills namespaceados | `/tut:brief` etc. funcionan correctamente | Test manual |

---

## Open Questions

- [ ] ¿`.claude-plugins/tut/` es la ubicación correcta? Claude Code podría esperar una ruta diferente para `--plugin-dir`. Investigar si hay una convención.
- [ ] ¿El registro automático en `settings.local.json` funciona con `enabledPlugins`? O es necesario usar `--plugin-dir` en el CLI.
- [ ] ¿Los hooks `prompt` cuentan contra el contexto/tokens del usuario? ¿Hay impacto en coste?
- [ ] ¿El marketplace npm necesita estructura especial para que `claude plugin install` lo resuelva?
- [ ] ¿Cómo interactúan los hooks del plugin con hooks que el usuario ya tenga configurados? (Se supone que son aditivos, pero verificar.)

---

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Plugin API cambia (aún en beta) | Alto - rompe instalaciones | Pinear versión mínima de Claude Code, monitorear changelogs |
| Hooks agresivos molestan al usuario | Medio - mala UX | Hacer hooks no-bloqueantes donde sea posible, documentar cómo desactivar |
| Namespace `tut:` confunde usuarios acostumbrados a `/brief` | Medio - fricción de adopción | Documentar claramente en init output y CLAUDE.md |
| Migración automática borra archivo custom | Alto - pérdida de datos | Solo eliminar si checksum = original. Archivos modificados → .bak |
| Marketplace npm requiere publicación continua | Bajo - mantenimiento | Automatizar con CI/CD del monorepo |
| `${CLAUDE_PLUGIN_ROOT}` no funciona como esperado | Medio - hooks rotos | Testear scripts con paths absolutos como fallback |
