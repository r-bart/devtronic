# Implementation Plan: Design Phase — Skills & Subagents

**Date**: 2026-03-04
**Branch**: feat/design
**Status**: Approved

---

## Overview

Add a structured design phase to the devtronic workflow. This introduces 11 skills and 7 specialized subagents covering the full UX/UI design process — desde research y síntesis hasta wireframing, design systems, y QA de implementación. Tool-agnostic by design; Paper Design MCP y Figma MCP son opt-in.

**Patrón arquitectural clave**: skills complejas usan el patrón dispatcher — un router fino (~50 líneas) que delega a skills especializadas. Así ningún archivo supera las 500 líneas y cada skill puede invocarse directamente.

---

## Updated Workflow

```
/brief → /spec → /design → /create-plan → /generate-tests → /execute-plan → /design:review → /post-review
```

Where `/design` orchestrates:

```
/design:research  →  /design:define  →  /design:ia  →  /design:wireframe
                                                              ↓
                                              /design:system (tokens, components)
```

And at implementation time:

```
/design:spec  →  developer handoff
/design:review  →  QA implementación vs diseño
/design:audit  →  heurística UX + accesibilidad
```

---

## Files to Create

### Skills (11)

Skills con `*` son dispatchers — routers finos que delegan a las skills especializadas.

| File | Skill name | Tipo | Purpose |
|------|-----------|------|---------|
| `.claude/skills/design/SKILL.md` | `design` | dispatcher* | Router de la fase de diseño completa |
| `.claude/skills/design-research/SKILL.md` | `design:research` | skill | Discovery, benchmark, análisis competitivo |
| `.claude/skills/design-define/SKILL.md` | `design:define` | skill | Personas, user journeys, problem statements |
| `.claude/skills/design-ia/SKILL.md` | `design:ia` | skill | Arquitectura de información, navigation flows |
| `.claude/skills/design-wireframe/SKILL.md` | `design:wireframe` | skill | Especificación estructurada de wireframes |
| `.claude/skills/design-system/SKILL.md` | `design:system` | dispatcher* | Router de design system (--define, --audit, --sync) |
| `.claude/skills/design-system-define/SKILL.md` | `design:system-define` | skill | Crea/extrae design system interactivamente |
| `.claude/skills/design-system-audit/SKILL.md` | `design:system-audit` | skill | Inventario, drift, cobertura de tokens |
| `.claude/skills/design-system-sync/SKILL.md` | `design:system-sync` | skill | Sincronización recurrente diseño ↔ código |
| `.claude/skills/design-audit/SKILL.md` | `design:audit` | skill | Evaluación heurística + accesibilidad WCAG |
| `.claude/skills/design-review/SKILL.md` | `design:review` | skill | QA visual implementación vs diseño |
| `.claude/skills/design-spec/SKILL.md` | `design:spec` | skill | Genera spec de diseño para devs |

### Agents (7)

| File | Model | Purpose |
|------|-------|---------|
| `.claude/agents/ux-researcher.md` | sonnet | Síntesis de research, personas, journeys |
| `.claude/agents/ia-architect.md` | sonnet | Estructura navegación, user flows |
| `.claude/agents/design-critic.md` | sonnet | Evaluación heurística (Nielsen's 10) |
| `.claude/agents/a11y-auditor.md` | haiku | Validación WCAG, contraste, touch targets |
| `.claude/agents/design-token-extractor.md` | haiku | Extrae y normaliza design tokens de cualquier fuente |
| `.claude/agents/design-system-guardian.md` | haiku | Detecta drift en design system (invocado desde /post-review) |
| `.claude/agents/visual-qa.md` | sonnet | Compara screenshot diseño vs implementación |

### Docs

| File | Purpose |
|------|---------|
| `docs/design-phase.md` | Documentación de la fase de diseño para usuarios |

### CLAUDE.md update

Añadir la fase `/design` a la tabla de workflows.

---

## Phases

### Phase 1: Core orchestrator + design-critic (Foundation)

**Objetivo**: El skill `/design` existe y funciona en modo mínimo. El agente `design-critic` puede usarse independientemente.

#### Task 1.1: Skill `/design` (dispatcher)

**File**: `.claude/skills/design/SKILL.md`
**~50 líneas** — router fino, no lógica de negocio.

Detecta contexto y delega a la sub-skill correspondiente:

```
sin args o --start    → /design:research (o :define si ya hay research)
--define              → /design:define
--ia                  → /design:ia
--wireframe           → /design:wireframe
--system [flags]      → /design:system (que a su vez dispatcha)
--audit               → /design:audit
--review              → /design:review
--spec                → /design:spec
sin flag + contexto   → detecta estado de thoughts/design/ y propone siguiente paso
```

Output: `thoughts/design/design.md` con decisions log, estado de la fase.

**allowed-tools**: `Task, Read, Glob, AskUserQuestion, Write`

#### Task 1.2: Agente `design-critic`

**File**: `.claude/agents/design-critic.md`
**Model**: sonnet

Evalúa diseños (texto, wireframes, screenshots) contra Nielsen's 10 heurísticas:
1. Visibility of system status
2. Match between system and real world
3. User control and freedom
4. Consistency and standards
5. Error prevention
6. Recognition rather than recall
7. Flexibility and efficiency of use
8. Aesthetic and minimalist design
9. Help users recognize, diagnose, and recover from errors
10. Help and documentation

Output: severidad (blocker/warning/suggestion) + heurística violada + recomendación.

---

### Phase 2: Research & Define

**Objetivo**: El flujo discovery → síntesis → personas/journeys funciona end-to-end. Los artefactos se persisten en `thoughts/design/`.

#### Task 2.1: Skill `/design:research`

**File**: `.claude/skills/design-research/SKILL.md`

Proceso:
1. Si hay spec (`thoughts/specs/`), la extrae como input base
2. Pide al usuario: URLs de competidores, target audience, contexto de negocio
3. Invoca `ux-researcher` para análisis de competidores y generación de preguntas de investigación
4. Persiste en `thoughts/design/research.md`

**allowed-tools**: `Task, Read, Glob, AskUserQuestion, Write, WebFetch`

#### Task 2.2: Skill `/design:define`

**File**: `.claude/skills/design-define/SKILL.md`

Proceso:
1. Lee `thoughts/design/research.md` (si existe)
2. Invoca `ux-researcher` para generar: 2-3 personas, user journey maps, problem statements, HMW questions
3. Persiste en `thoughts/design/define.md`
4. Imprime resumen ejecutivo

**allowed-tools**: `Task, Read, Write, AskUserQuestion`

#### Task 2.3: Agente `ux-researcher`

**File**: `.claude/agents/ux-researcher.md`
**Model**: sonnet

Capacidades:
- Analizar competidores desde URLs o descripciones textuales
- Generar personas realistas desde research o requisitos
- Mapear user journeys con touchpoints, pain points, oportunidades
- Articular problem statements en formato "¿Cómo podríamos...?"

---

### Phase 3: IA & Wireframe

**Objetivo**: Pasar de personas/journeys a estructura de navegación y especificación de wireframes.

#### Task 3.1: Skill `/design:ia`

**File**: `.claude/skills/design-ia/SKILL.md`

Proceso:
1. Lee `thoughts/design/define.md`
2. Invoca `ia-architect` para proponer: sitemap, navigation structure, content hierarchy
3. Genera user flows en formato texto (diagramas ASCII o Mermaid)
4. Persiste en `thoughts/design/ia.md`

**allowed-tools**: `Task, Read, Write, AskUserQuestion`

#### Task 3.2: Skill `/design:wireframe`

**File**: `.claude/skills/design-wireframe/SKILL.md`

Proceso:
1. Lee `thoughts/design/ia.md` y `thoughts/design/define.md`
2. Para cada pantalla identificada: genera especificación estructurada (componentes, layout, jerarquía, copy placeholder)
3. Formato: texto estructurado + ASCII layout cuando aplique — NO genera código, es herramienta-agnóstico
4. Persiste en `thoughts/design/wireframes.md`
5. Si hay Paper MCP activo: menciona que puede materializar con `/design:system`

**allowed-tools**: `Task, Read, Write, AskUserQuestion`

#### Task 3.3: Agente `ia-architect`

**File**: `.claude/agents/ia-architect.md`
**Model**: sonnet

Capacidades:
- Proponer estructura de navegación desde personas y journeys
- Generar sitemaps en texto estructurado
- Identificar content hierarchy por pantalla
- Detectar inconsistencias en flujos (¿el usuario puede volver atrás? ¿hay dead-ends?)

---

### Phase 4: Design System

**Objetivo**: Definir, auditar y mantener el sistema de diseño. Patrón dispatcher: `/design:system` es el router, las tres skills especializadas hacen el trabajo real.

```
/design:system --define  →  /design:system-define
/design:system --audit   →  /design:system-audit
/design:system --sync    →  /design:system-sync
```

#### Task 4.1: Skill `/design:system` (dispatcher)

**File**: `.claude/skills/design-system/SKILL.md`
**~50 líneas** — solo routing.

```
--define    → /design:system-define
--audit     → /design:system-audit
--sync      → /design:system-sync
sin flag    → AskUserQuestion: ¿qué quieres hacer?
```

**allowed-tools**: `Task, AskUserQuestion`

#### Task 4.2: Skill `/design:system-define`

**File**: `.claude/skills/design-system-define/SKILL.md`

Dos modos de entrada:
- **Desde cero** (interactivo): paleta de color, tipografía, spacing scale, radii, shadows, motion
- **Desde fuente existente** (`--extract`): lee CSS, Tailwind config, o archivo de diseño y normaliza

Invoca `design-token-extractor` para extracción y normalización.
Output: `thoughts/design/design-system.md` en formato agnóstico.

**allowed-tools**: `Task, Read, Write, Edit, AskUserQuestion, Bash, Glob`

#### Task 4.3: Skill `/design:system-audit`

**File**: `.claude/skills/design-system-audit/SKILL.md`

Analiza el codebase contra `thoughts/design/design-system.md`:
- Busca valores hardcodeados que deberían ser tokens (hex colors, px values sin variable)
- Detecta tokens definidos pero nunca usados en el código
- Inventario de componentes: ¿usan el design system o crean estilos propios?
- Cobertura: % del código que usa tokens vs valores arbitrarios
- Duplicados: tokens con valores idénticos o casi idénticos

Invoca `design-system-guardian` para el análisis.
Output: `thoughts/design/design-system-audit.md` con severidad por hallazgo.

**allowed-tools**: `Task, Read, Glob, Grep, Write, Bash`

#### Task 4.4: Skill `/design:system-sync`

**File**: `.claude/skills/design-system-sync/SKILL.md`

Sincronización recurrente — para ejecutar cuando cambian tokens en diseño o código:
1. Lee `thoughts/design/design-system.md` como source of truth
2. Compara con archivos de config del proyecto (tailwind.config, CSS vars, tokens.json)
3. Propone diff de cambios necesarios
4. Aplica con confirmación del usuario

Invoca `design-token-extractor` para extracción del estado actual del código.
Output: archivos de config del proyecto actualizados.

**allowed-tools**: `Task, Read, Write, Edit, Glob, Bash, AskUserQuestion`

#### Task 4.5: Agente `design-token-extractor`

**File**: `.claude/agents/design-token-extractor.md`
**Model**: haiku

Capacidades:
- Extraer tokens de CSS existente (custom properties, Tailwind config)
- Normalizar a formato agnóstico: `{ color.primary: '#...', spacing.md: '16px', ... }`
- Mapear a estructura del proyecto (Tailwind, CSS vars, Style Dictionary)
- Detectar inconsistencias (colores similares no unificados, espaciados sin escala)

#### Task 4.6: Agente `design-system-guardian`

**File**: `.claude/agents/design-system-guardian.md`
**Model**: haiku

Guardián del design system — análogo a `architecture-checker` pero para la capa visual.

Se invoca desde:
- `/design:system-audit` (análisis completo)
- `/post-review` (check automático sobre archivos modificados)

Checks sobre archivos modificados:
- ¿Se introdujeron hex values que deberían ser tokens?
- ¿Se usaron px/rem hardcodeados para spacing que tiene variable?
- ¿El componente nuevo sigue los patrones del design system?

Output: lista de violaciones con archivo:línea + token correcto a usar. Read-only — nunca modifica código.

**disallowedTools**: `Edit, Write`

---

### Phase 5: Validación & QA

**Objetivo**: Auditar diseños y validar implementación contra diseño.

#### Task 5.1: Skill `/design:audit`

**File**: `.claude/skills/design-audit/SKILL.md`

Proceso:
1. Lee `thoughts/design/` para contexto
2. Invoca `design-critic` (heurísticas) + `a11y-auditor` (accesibilidad)
3. Genera reporte consolidado con severidad
4. Persiste en `thoughts/design/audit.md`

Ámbito: puede auditar wireframes (texto), mockups (screenshots), o implementación (código).

**allowed-tools**: `Task, Read, Glob, Write, Bash`

#### Task 5.2: Skill `/design:review`

**File**: `.claude/skills/design-review/SKILL.md`

QA visual post-implementación:
1. Lee `thoughts/design/wireframes.md` y `thoughts/design/design-system.md` como ground truth
2. Para cada componente/pantalla: compara implementación vs spec
3. Invoca `visual-qa` si hay screenshots disponibles
4. Output: lista de desviaciones con severidad (blocker/warning) y sugerencia de fix

**allowed-tools**: `Task, Read, Glob, Bash, Write`

#### Task 5.3: Agente `a11y-auditor`

**File**: `.claude/agents/a11y-auditor.md`
**Model**: haiku

Checks WCAG 2.1 AA:
- Contraste de color (4.5:1 texto normal, 3:1 texto grande)
- Touch targets mínimo 44x44px
- Alt text en imágenes
- Labels en formularios
- Keyboard navigation (focus order, skip links)
- ARIA roles cuando aplique
- Reduced motion support

Analiza: código HTML/JSX, CSS, o descripción textual de wireframes.

#### Task 5.4: Agente `visual-qa`

**File**: `.claude/agents/visual-qa.md`
**Model**: sonnet

Compara:
- Screenshot de diseño vs screenshot de implementación
- Spec textual vs código implementado
- Design tokens esperados vs tokens en uso

Output: tabla de desviaciones con columnas: elemento | esperado | encontrado | severidad | acción.

---

### Phase 6: Handoff & Docs

**Objetivo**: Generar artefactos de handoff y documentar la fase.

#### Task 6.1: Skill `/design:spec`

**File**: `.claude/skills/design-spec/SKILL.md`

Genera design spec para desarrolladores desde `thoughts/design/`:
- Pantallas con layout especificado
- Componentes con props y estados
- Design tokens a usar
- Interacciones y animaciones
- Edge cases visuales

Formato: Markdown estructurado, consumible por `/create-plan`.

**allowed-tools**: `Task, Read, Write, Glob`

#### Task 6.2: Documentación `docs/design-phase.md`

Guía de usuario explicando:
- Qué es la fase de diseño en devtronic
- Cuándo usar cada skill
- Los artefactos que genera
- Integración con herramientas (Paper, Figma)

#### Task 6.3: Actualizar `CLAUDE.md`

Añadir a la tabla de workflows:
```
| Design (nuevo) | /brief → /spec → /design → /create-plan → /design:review → /post-review |
```

Y añadir referencia a `docs/design-phase.md`.

---

## Artefactos persistidos en `thoughts/design/`

```
thoughts/design/
├── design.md              ← /design (log de decisiones, estado fase)
├── research.md            ← /design:research
├── define.md              ← /design:define (personas, journeys, HMW)
├── ia.md                  ← /design:ia (sitemap, flows)
├── wireframes.md          ← /design:wireframe (specs por pantalla)
├── design-system.md       ← /design:system-define (tokens, componentes — source of truth)
├── design-system-audit.md ← /design:system-audit (drift, cobertura, inventario)
└── audit.md               ← /design:audit (heurísticas + a11y)
```

---

## Verificación

```bash
npm run typecheck && npm run lint
```

No hay código TypeScript nuevo — solo archivos `.md`. Verificar:
- [ ] Todos los SKILL.md tienen frontmatter válido
- [ ] Todos los agentes tienen `model` definido
- [ ] Los dispatchers (`/design`, `/design:system`) no superan 50 líneas
- [ ] Ningún skill supera 500 líneas
- [ ] `design-system-guardian` tiene `disallowedTools: Edit, Write`
- [ ] El flujo de orquestación del skill `/design` es coherente
- [ ] `CLAUDE.md` actualizado
- [ ] `docs/design-phase.md` creado

---

## Notas de implementación

- **Naming de carpetas**: colón no es válido en algunos filesystems. Usar `design-research/` para la carpeta, `design:research` en el frontmatter `name`.
- **Herramientas opcionales**: ningún skill debe *requerir* Paper o Figma. Son enhancement paths mencionados pero nunca bloqueantes.
- **Acumulación de contexto**: cada skill lee los artefactos previos de `thoughts/design/` — el orden importa pero la fase es re-entrant (puedes empezar desde cualquier punto si ya tienes artefactos anteriores).
- **El skill `/design` como entry point único**: siempre detecta estado actual y propone el siguiente paso. No fuerza el flujo completo.
