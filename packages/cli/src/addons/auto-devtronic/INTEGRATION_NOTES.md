# Integration Notes — auto-devtronic addon

## Required changes to devtronic core

This addon introduces `agents` as a new category in the addon manifest/file system.
The following core files need updates before auto-devtronic can be installed via `devtronic addon add`.

### 1. `src/types.ts`

Add `'auto-devtronic'` to `AddonName`:

```typescript
export type AddonName = 'orchestration' | 'design-best-practices' | 'auto-devtronic';
```

Add `agents` to `AddonManifest.files`:

```typescript
export interface AddonManifest {
  files: {
    skills: string[];
    agents?: string[];       // ← new
    reference?: string[];
    rules?: string[];
  };
}
```

Register in `ADDONS`:

```typescript
'auto-devtronic': {
  name: 'auto-devtronic',
  label: 'auto-devtronic — Autonomous Engineering Loop',
  description: 'Runs the full spec→test→plan→execute→PR pipeline autonomously. Self-corrects via failing tests.',
  skills: ['auto-devtronic'],
  agents: ['issue-parser', 'failure-analyst'],
},
```

### 2. `src/generators/addonFiles.ts`

Extend `generateAddonFiles`, `removeAddonFiles`, and `syncAddonFiles` to handle the `agents` directory:

- Source: `<addonSourceDir>/agents/<name>.md`
- Destination: `<targetDir>/.claude/agents/<name>.md`

Follow the same copy/checksum/track pattern as skills.

### 3. `src/commands/addon.ts`

In `addFileBasedAddon`, update the display note to show agents being added (parallel to skills).

---

## Depends on devtronic core skills

`/auto-devtronic` delegates to the same logic as these core skills — they must be installed:

- `/generate-tests`
- `/create-plan`
- `/execute-plan`
- `/post-review`

These are all included in the base devtronic installation. No additional dependencies.

## Requires in the target project

- `gh` CLI authenticated with repo write access (`gh auth status`)
- A test runner script (`npm test` / `pnpm test` / etc.)
- Git repository with a remote origin
