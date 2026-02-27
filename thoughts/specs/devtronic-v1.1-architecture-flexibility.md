# Spec: Architecture Flexibility (v1.1.0)

## Problem

Devtronic v1.0.0 is opinionated about Clean Architecture + DDD. This hurts OSS adoption — many projects use feature-based, MVC, or no formal architecture. The current system already supports `clean | mvc | feature-based | flat` patterns, but:

1. The init flow doesn't frame this as a conscious choice — it auto-detects and confirms
2. The `flat` option generates near-empty rules ("Document your architecture patterns and rules here")
3. There's no "none — I'll write my own rules" option that skips rule generation entirely
4. Presets are all `clean` — there are no feature-based or minimal presets
5. CLAUDE.md and AGENTS.md generation hardcodes architecture references

## Goal

Make architecture an explicit, first-class choice during init. Users should feel devtronic is useful regardless of their architecture style. The system should be equally valuable for a quick hackathon project (no architecture) and a serious enterprise app (clean + DDD).

---

## Changes Required

### 1. Add `'none'` architecture pattern

**File: `src/types.ts`**

```typescript
// Line 18: Add 'none' to ArchitecturePattern
export type ArchitecturePattern = 'clean' | 'mvc' | 'feature-based' | 'flat' | 'none';
```

`'none'` means: "Don't generate architecture rules. I'll define my own or skip them." Different from `'flat'` which generates generic guidance.

### 2. Update architecture prompt to frame it as a choice

**File: `src/prompts/analysis.ts`**

Replace ARCHITECTURE_OPTIONS (lines 7-12):

```typescript
const ARCHITECTURE_OPTIONS: Array<{ value: ArchitecturePattern; label: string; hint: string }> = [
  { value: 'clean', label: 'Clean Architecture', hint: 'Layered, DDD-friendly, strict boundaries' },
  { value: 'feature-based', label: 'Feature-based', hint: 'Co-located by feature, independent modules' },
  { value: 'mvc', label: 'MVC', hint: 'Model-View-Controller' },
  { value: 'flat', label: 'Minimal', hint: 'Basic guidelines, no strict layers' },
  { value: 'none', label: 'None', hint: 'Skip architecture rules — I\'ll define my own' },
];
```

Changes:
- Reorder: clean first (recommended for serious projects), feature-based second (popular), then MVC, flat, none
- Better hint text — `flat` becomes "Minimal" with clearer description
- `none` is explicitly "skip"

### 3. Skip rule generation when architecture is `'none'`

**File: `src/commands/init.ts`**

Around line 227 where `generateArchitectureRules` is called:

```typescript
// Only generate architecture rules if user chose an architecture
const generatedRules = projectConfig.architecture !== 'none'
  ? generateArchitectureRules(projectConfig)
  : null;
```

And around lines 333-357 where rules are written per IDE:

```typescript
if (generatedRules) {
  for (const ide of selectedIDEs) {
    // ... existing rule writing logic
  }
}
```

### 4. Update `generateArchitectureRules` to handle `'none'`

**File: `src/generators/architectureRules.ts`**

In `generateArchitectureSection` (line 57), add case before default:

```typescript
case 'none':
  return ''; // No architecture section generated
```

This is a safety net — init.ts should skip calling this entirely, but the generator shouldn't crash if called.

### 5. Update `generateClaudeMd` and `generateAgentsMd` for `'none'`

**File: `src/generators/rules.ts`**

When architecture is `'none'`, the CLAUDE.md should omit the architecture line and not reference `.claude/rules/architecture.md`. Instead:

```markdown
## Architecture

No specific architecture rules configured. Run `devtronic config set architecture clean` to add rules later.
```

### 6. Update `config set architecture` to accept `'none'`

**File: `src/commands/config.ts`**

The config command should:
- Accept `none` as a valid architecture value
- When changing FROM an architecture TO `none`: warn that architecture rules will be removed on next regenerate
- When changing FROM `none` TO an architecture: prompt to regenerate rules

### 7. Update `regenerate` to respect `'none'`

**File: `src/commands/regenerate.ts`**

When regenerating rules and architecture is `'none'`:
- Skip architecture rule files (don't generate them)
- Don't delete existing custom rules the user may have written manually

### 8. Add new presets

**File: `src/types.ts`**

Add presets for non-clean architectures:

```typescript
'nextjs-feature': {
  name: 'nextjs-feature',
  description: 'Next.js with feature-based architecture',
  config: {
    framework: 'nextjs',
    architecture: 'feature-based',
    layers: ['features', 'shared'],
    stateManagement: ['Zustand'],
    dataFetching: ['React Query'],
    ui: ['Tailwind CSS'],
    validation: ['Zod'],
  },
},
'minimal': {
  name: 'minimal',
  description: 'Quality checks only, no architecture rules',
  config: {
    architecture: 'none',
    layers: [],
  },
},
```

### 9. Update doctor to handle `'none'`

**File: `src/commands/doctor.ts`**

When architecture is `'none'`, doctor should NOT check for architecture rule files. It should still check quality scripts, manifest validity, etc.

### 10. Update architecture analyzer description

**File: `src/analyzers/architecture.ts`**

`getArchitectureDescription` should handle `'none'`:

```typescript
case 'none':
  return 'None (no architecture rules)';
```

---

## Files Changed

| File | Change |
|------|--------|
| `src/types.ts` | Add `'none'` to ArchitecturePattern, add presets |
| `src/prompts/analysis.ts` | Reorder options, add `'none'`, better hints |
| `src/commands/init.ts` | Conditional rule generation |
| `src/generators/architectureRules.ts` | Handle `'none'` case |
| `src/generators/rules.ts` | Conditional architecture in CLAUDE.md/AGENTS.md |
| `src/commands/config.ts` | Accept `'none'`, warn on architecture change |
| `src/commands/regenerate.ts` | Skip rules when `'none'` |
| `src/commands/doctor.ts` | Skip architecture checks when `'none'` |
| `src/analyzers/architecture.ts` | Add description for `'none'` |

---

## What Does NOT Change

- **Skills**: All 19 skills work regardless of architecture
- **Agents**: All 8 agents work regardless of architecture
- **Hooks**: All hooks work regardless of architecture
- **Quality rules**: Always generated (typecheck + lint)
- **Stack detection**: Still detects frameworks, ORMs, etc.
- **Manifest structure**: `projectConfig.architecture` already exists

---

## Verification

1. `npx devtronic init` → select "None" → no architecture.md generated, CLAUDE.md says "no rules configured"
2. `npx devtronic init --preset minimal` → same result
3. `npx devtronic init --preset nextjs-feature` → feature-based rules
4. `devtronic config set architecture none` → warns about rule removal
5. `devtronic config set architecture clean` → suggests regenerate
6. `devtronic regenerate --rules` with `none` → no architecture files touched
7. `devtronic doctor` with `none` → passes without checking architecture rules
8. All existing tests still pass
9. New tests for `'none'` path in init, config, regenerate, doctor

---

## Non-Goals

- Custom architecture definitions (user-defined patterns) — too complex for v1.1
- Per-layer rule files — one architecture.md per IDE is enough
- Architecture migration tooling — changing from clean to feature-based is a manual refactor
