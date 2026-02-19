# Research: Plugin Mode + Hooks Implementation

**Date**: 2026-02-18
**Question**: ¿Cómo implementar el modo plugin para Claude Code y qué patrones adoptar de GSD?
**Status**: draft

---

## Summary

La investigación resuelve las open questions del PRD y aporta cambios de diseño significativos basados en el análisis de GSD y las limitaciones reales del sistema de plugins de Claude Code.

**Hallazgo principal**: El sistema de plugins de Claude Code tiene bugs conocidos y limitaciones que afectan nuestra estrategia. La aproximación más robusta es un **enfoque híbrido**: generar el plugin como directorio local + registrar los hooks directamente en `settings.json` (como hace GSD) + ofrecer marketplace npm para distribución sin CLI.

---

## Resolución de Open Questions

### OQ1: ¿Dónde vive el plugin local?

**Respuesta**: No existe convención `.claude-plugins/`. Dos opciones viables:

| Approach | Persistencia | Registro | Complejidad |
|----------|-------------|----------|-------------|
| **`--plugin-dir`** | Solo sesión actual | Flag en CLI | Baja |
| **Local marketplace** | Persistente | `extraKnownMarketplaces` + `enabledPlugins` | Alta |

**Decisión recomendada**: Generar el plugin en `.claude-plugins/tut-ai/` (convención nuestra) y registrarlo como **local marketplace** en `.claude/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "tutellus-local": {
      "source": {
        "source": "directory",
        "path": ".claude-plugins"
      }
    }
  },
  "enabledPlugins": {
    "tut-ai@tutellus-local": true
  }
}
```

Esto requiere que `.claude-plugins/` tenga estructura de marketplace:

```
.claude-plugins/
├── .claude-plugin/
│   └── marketplace.json        ← marketplace descriptor
└── tut-ai/                     ← el plugin
    ├── .claude-plugin/
    │   └── plugin.json
    ├── skills/
    ├── agents/
    ├── hooks/
    │   └── hooks.json
    └── scripts/
```

**marketplace.json**:
```json
{
  "name": "tutellus-local",
  "owner": { "name": "Tutellus" },
  "plugins": [
    {
      "name": "tut-ai",
      "source": "./tut-ai",
      "description": "AI Agentic Architecture - 14 skills, 3 agents, workflow hooks"
    }
  ]
}
```

### OQ2: ¿Cómo registrar el plugin en settings?

**Respuesta**: El formato exacto es `"plugin-name@marketplace-name": true` en `enabledPlugins`.

**Bug conocido (issue #17832)**: Los plugins de directory marketplace NO se auto-habilitan tras instalación. Hay que escribir `enabledPlugins` manualmente. Nuestro `init` haría esto automáticamente.

**Bug conocido (issue #19893)**: Los hooks de plugins deshabilitados en `settings.local.json` siguen ejecutándose. Esto no nos afecta directamente, pero es bueno saberlo.

### OQ3: ¿Impacto en tokens de hooks prompt?

**Respuesta**: Sí, los hooks `type: "prompt"` consumen tokens y se facturan. Detalles:

| Hook type | Coste | Modelo default |
|-----------|-------|----------------|
| `command` | Gratis (shell) | N/A |
| `prompt` | Tokens facturados | Haiku (fast model) |
| `agent` | Tokens facturados (multi-turn) | Haiku (fast model) |

**Impacto en nuestros hooks**:

| Hook | Type | Frecuencia | Coste estimado |
|------|------|-----------|----------------|
| SessionStart | prompt (haiku) | 1x por sesión | ~$0.001 |
| PostToolUse | command | Cada Write/Edit | Gratis |
| Stop | prompt | 1x por sesión | ~$0.002 |
| SubagentStop | prompt (haiku) | Por subagente | ~$0.001 cada |
| PreCompact | command | Raro | Gratis |

**Total estimado**: ~$0.005 por sesión. Negligible.

### OQ4: ¿Cómo resuelve `claude plugin install` fuentes npm?

**Respuesta**: El marketplace se registra con source `npm`:

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

Luego: `claude plugin install tut-ai@tutellus`

### OQ5: ¿Cómo interactúan hooks de plugin con hooks existentes?

**Respuesta**: **Aditivos**. Todos los hooks que matchean un evento se ejecutan en paralelo. Hooks idénticos se deduplican automáticamente. No hay prioridad documentada entre fuentes.

---

## Análisis de GSD (get-shit-done)

### Patrones a adoptar

| # | Patrón GSD | Aplicación en nuestro proyecto | Prioridad |
|---|-----------|-------------------------------|-----------|
| 1 | **Hook registration en settings.json** | Registrar hooks en `.claude/settings.json` además de dentro del plugin. Doble vía: plugin hooks + settings hooks como fallback | Alta |
| 2 | **File manifest con SHA256** | Ya tenemos MD5 checksums. Considerar migrar a SHA256 para consistencia con GSD, pero no es crítico | Baja |
| 3 | **Background update check hook** | Añadir SessionStart hook que checkea npm por nueva versión (como `gsd-check-update.js`) | Media |
| 4 | **Statusline hook** | Mostrar info útil en la barra de estado (contexto, tarea actual). Investigar si vale la pena | Baja |
| 5 | **`gsd-tools.cjs` - CLI utility para skills** | Centralizar operaciones repetitivas de nuestros skills en un script Node.js que los skills llaman via Bash | Media |
| 6 | **Backup de patches del usuario** | Antes de sobrescribir archivos modificados, guardar en `gsd-local-patches/`. Nosotros haríamos `.ai-template/patches/` | Media |
| 7 | **CommonJS marker** | Escribir `{"type":"commonjs"}` en directorio del plugin para evitar problemas ESM | Alta |

### Patrones que NO adoptamos

| Patrón GSD | Razón para NO adoptar |
|-----------|----------------------|
| 30+ slash commands | Nuestra filosofía es menos comandos, más cohesivos (14 skills) |
| Sin `disable-model-invocation` | Nuestros skills con side effects lo necesitan |
| Monolítico `install.js` (1815 líneas) | Preferimos estructura modular (commands/, generators/, utils/) |
| Sin plugin.json | Nosotros sí usamos el sistema de plugins nativo |
| Archivos directamente en `.claude/` | Nosotros los empaquetamos como plugin con namespace |

### Patrón GSD más interesante: Tres capas Command → Workflow → Agent

GSD separa:
1. **Commands** (`commands/gsd/*.md`): Entry points finos con frontmatter
2. **Workflows** (`get-shit-done/workflows/*.md`): Lógica detallada referenciada con `@`
3. **Agents** (`agents/*.md`): Subagentes especializados

Nosotros tenemos skills (1+2 combinados) + agents (3). Para skills complejos como `scaffold` y `audit`, considerar separar la lógica en archivos de workflow referenciados. **No para esta iteración** — lo evaluaremos después.

---

## Architecture

### Component Diagram

```
init command
├── [claude-code selected?]
│   ├── YES → generatePlugin()
│   │   ├── Copy skills/ to .claude-plugins/tut-ai/skills/
│   │   ├── Copy agents/ to .claude-plugins/tut-ai/agents/
│   │   ├── Generate plugin.json
│   │   ├── Generate hooks/hooks.json (personalized by PM)
│   │   ├── Generate scripts/checkpoint.sh
│   │   ├── Generate marketplace.json
│   │   ├── Register in .claude/settings.json (marketplace + enabledPlugins)
│   │   └── Generate .claude/rules/* (standalone, unchanged)
│   └── NO → [current flow unchanged]
│       └── Copy templates to .claude/ as before
├── Generate CLAUDE.md (standalone, unchanged)
├── Generate AGENTS.md (optional, unchanged)
└── Write manifest (extended with installMode + pluginPath)

update command
├── Read manifest
├── [installMode === 'plugin'?]
│   ├── YES → updatePlugin()
│   │   ├── Compare plugin files vs template
│   │   ├── Update unchanged files
│   │   ├── Backup modified files to .ai-template/patches/
│   │   └── Update manifest
│   └── NO + [claude-code in selectedIDEs?]
│       ├── YES → migrateToPlugin()
│       │   ├── Generate plugin structure
│       │   ├── Remove standalone .claude/skills/ and .claude/agents/
│       │   ├── Preserve .claude/rules/ and CLAUDE.md
│       │   ├── Register marketplace + plugin
│       │   └── Update manifest (installMode: 'plugin')
│       └── NO → [current update flow unchanged]
└── [Other IDEs: current flow unchanged]
```

### Data Flow

```
1. User runs `npx @tutellus/agentic-architecture init`
   → packages/cli/src/commands/init.ts:L140

2. Project analysis detects PM, framework, scripts
   → packages/cli/src/analyzers/project.ts

3. IDE selection includes 'claude-code'
   → init.ts:L155-164

4. NEW: Bifurcation — plugin mode for claude-code
   → init.ts:L232 (before template loop)
   → NEW: generators/plugin.ts:generatePlugin()

5. Plugin generator copies templates + generates dynamic files
   → templates/claude-code/.claude/skills/* → .claude-plugins/tut-ai/skills/*
   → templates/claude-code/.claude/agents/* → .claude-plugins/tut-ai/agents/*
   → NEW: generators/hooks.ts:generateHooks(config) → hooks/hooks.json
   → NEW: generators/plugin.ts:generatePluginJson() → plugin.json
   → NEW: generators/plugin.ts:generateMarketplaceJson() → marketplace.json

6. Plugin registered in settings
   → NEW: utils/settings.ts:registerPlugin() → .claude/settings.json

7. Rules generated standalone (unchanged)
   → generators/architectureRules.ts → .claude/rules/architecture.md

8. Manifest written with new fields
   → utils/files.ts:writeManifest() → .ai-template/manifest.json
```

---

## Relevant Files

### Core (must modify)

| File | Line(s) | Change |
|------|---------|--------|
| `packages/cli/src/commands/init.ts` | L232-306 | Bifurcar: claude-code → plugin, otros → standalone |
| `packages/cli/src/commands/update.ts` | L58-77 | Añadir detección de plugin mode y migración |
| `packages/cli/src/types.ts` | L105-112 | Extender Manifest con `installMode`, `pluginPath` |
| `packages/cli/src/utils/files.ts` | L86-114 | Añadir funciones para plugin structure |

### New (must create)

| File | Purpose |
|------|---------|
| `packages/cli/src/generators/plugin.ts` | Genera plugin.json, marketplace.json, copia skills/agents |
| `packages/cli/src/generators/hooks.ts` | Genera hooks.json personalizado por PM y scripts |
| `packages/cli/src/generators/scripts.ts` | Genera checkpoint.sh y otros scripts de hooks |
| `packages/cli/src/utils/settings.ts` | Lee/escribe `.claude/settings.json` para registrar plugins |
| `packages/marketplace/` | Paquete npm para marketplace distribuible |

### Reference (patterns to follow)

| File | Pattern |
|------|---------|
| `packages/cli/src/generators/architectureRules.ts` | Patrón de generator con formateo por IDE |
| `packages/cli/src/generators/rules.ts` | Patrón de generación dinámica con config |
| `packages/cli/src/data/removals.ts` | Patrón de tracking de archivos eliminados |

---

## Code Patterns

### Pattern: Generator with config personalization

**Used in**: `packages/cli/src/generators/architectureRules.ts`

```typescript
export function generateArchitectureRules(config: ProjectConfig): GeneratedRules {
  const content = generateRulesContent(config);
  return {
    claudeCode: generateClaudeCodeFormat(content),
    cursor: generateCursorFormat(content),
    // ...
  };
}
```

Seguir este patrón para `generators/hooks.ts`:

```typescript
export function generateHooks(config: ProjectConfig): string {
  const pm = detectPM(config); // npm, pnpm, yarn, bun
  const lintCmd = buildLintCommand(pm, config);
  const qualityCmd = config.qualityCommand;

  return JSON.stringify({
    description: "Tutellus Agentic Architecture workflow hooks",
    hooks: {
      SessionStart: [buildSessionStartHook()],
      PostToolUse: [buildPostToolUseHook(lintCmd)],
      Stop: [buildStopHook(qualityCmd)],
      SubagentStop: [buildSubagentStopHook()],
      PreCompact: [buildPreCompactHook()],
    }
  }, null, 2);
}
```

### Pattern: Settings.json safe modification (from GSD)

GSD's `install.js` pattern for modifying settings.json safely:

```javascript
// 1. Read existing settings (preserve user content)
const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));

// 2. Check for existing hook before adding (idempotent)
const hasOurHook = settings.hooks?.SessionStart?.some(
  h => h.hooks?.some(hh => hh.command?.includes('tut-ai'))
);

// 3. Add only if not present
if (!hasOurHook) {
  settings.hooks = settings.hooks || {};
  settings.hooks.SessionStart = settings.hooks.SessionStart || [];
  settings.hooks.SessionStart.push(ourHook);
}

// 4. Write back
fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
```

---

## Decisions Made

| Question | Decision | Notes |
|----------|----------|-------|
| Plugin location | `.claude-plugins/tut-ai/` dentro de un local marketplace | Persistente, no requiere `--plugin-dir` cada sesión |
| Hook registration | Dentro del plugin (`hooks/hooks.json`) | Los hooks del plugin se cargan automáticamente al habilitarlo |
| Update check hook | SÍ adoptar (patrón GSD) | SessionStart hook que checkea npm en background |
| tools.cjs utility | NO en esta iteración | Evaluar después si los skills lo necesitan |
| Marketplace npm | SÍ crear | `@tutellus/agentic-marketplace` con source npm |
| CommonJS marker | SÍ adoptar | `package.json` con `{"type":"commonjs"}` en dir del plugin |
| Plugin name | `tut-ai` | Namespace: `/tut-ai:brief`, `/tut-ai:spec`, etc. |
| SHA256 vs MD5 | Mantener MD5 | No hay beneficio práctico en cambiar |
| User patches backup | SÍ adoptar | `.ai-template/patches/` antes de sobrescribir modificados |

---

## Open Questions

- [ ] ¿El path relativo en `source.path` de `extraKnownMarketplaces` funciona? O necesita absoluto? Testear con Claude Code real.
- [ ] ¿Los hooks del plugin se registran automáticamente al habilitar el plugin? O hay que reiniciar la sesión?
- [ ] ¿El `${CLAUDE_PLUGIN_ROOT}` funciona en hooks de un plugin registrado via marketplace local? Testear.
- [ ] ¿Cómo afecta el namespace `tut-ai:` a los skills que hacen referencia cruzada? (ej: `/tut-ai:brief` recomendando `/tut-ai:spec`)

---

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Plugin API en beta — puede cambiar | Alto | Monitorear changelog. Mantener standalone como fallback en update. |
| Bug #19893: hooks de plugins deshabilitados siguen ejecutándose | Bajo | No nos afecta si el plugin está habilitado. Documentar workaround. |
| Bug #17832: plugins no se auto-habilitan | Medio | Nuestro init escribe `enabledPlugins` explícitamente. |
| Local marketplace con path relativo puede no funcionar | Alto | Testear antes de implementar. Fallback: path absoluto con detección de home dir. |
| GSD tiene 15k stars — si adoptan plugins nativos, podrían ser competencia directa | Bajo | Nuestro foco es arquitectura + multi-IDE. GSD es workflow puro. Complementarios. |
