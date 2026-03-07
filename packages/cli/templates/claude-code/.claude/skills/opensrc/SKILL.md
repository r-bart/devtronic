---
name: opensrc
description: Fetch source code of npm packages or GitHub repos so AI agents have full implementation context, not just type definitions. Uses vercel-labs/opensrc under the hood.
allowed-tools: Bash, Read, Glob, Edit
argument-hint: "<package[@version]|owner/repo[@ref]> [packages...]"
---

# /opensrc

Fetch source code of npm packages or GitHub repositories into `opensrc/` so agents can read real implementation details, not just type signatures.

---

## Usage

```
/opensrc react
/opensrc react react-router-dom zustand
/opensrc react@19.0.0
/opensrc vercel-labs/opensrc
/opensrc github:shadcn-ui/ui@main
```

---

## What it does

1. Reads the lockfile to detect installed versions automatically
2. Downloads source code into `opensrc/<package>/`
3. Updates `.gitignore`, `tsconfig.json`, and `AGENTS.md` (with `--modify`)
4. Generates `opensrc/sources.json` for agent reference

---

## Steps

### 1. Detect package manager and lockfile

```bash
ls pnpm-lock.yaml yarn.lock bun.lockb package-lock.json 2>/dev/null
```

### 2. Run opensrc

For each package/repo in the arguments:

```bash
npx opensrc <package> --modify
```

Use `--modify` so opensrc can update `.gitignore`, `tsconfig.json`, and `AGENTS.md` automatically. If the user previously ran opensrc with `--modify=false`, respect their saved preference (opensrc reads `opensrc/settings.json`).

**Examples by input type:**

| Input | Command |
|-------|---------|
| `react` | `npx opensrc react --modify` |
| `react@19.0.0` | `npx opensrc react@19.0.0 --modify` |
| `vercel-labs/opensrc` | `npx opensrc vercel-labs/opensrc --modify` |
| `https://github.com/org/repo` | `npx opensrc https://github.com/org/repo --modify` |

For multiple packages, run them together:
```bash
npx opensrc react react-router-dom zustand --modify
```

### 3. Verify results

After running:

```bash
npx opensrc list
```

Show the user which packages are now available and their versions.

### 4. Report

Tell the user:
- Which packages were fetched and their resolved versions
- Where the source is: `opensrc/<package>/`
- That agents can now read implementation details from those paths
- If AGENTS.md was updated, confirm it

---

## Removing a source

If the user says `/opensrc remove <package>`:

```bash
npx opensrc remove <package>
```

Then confirm removal.

---

## Notes

- `opensrc/` is gitignored by default (added by `--modify`)
- `opensrc/sources.json` is the machine-readable index agents use for navigation
- Version auto-detection works from `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, and `bun.lockb`
- GitHub repos can be fetched at a specific branch or tag: `owner/repo@v2.0.0` or `owner/repo#main`
