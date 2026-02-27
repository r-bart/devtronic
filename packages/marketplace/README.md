# devtronic-marketplace

Claude Code plugin for AI-assisted development — 19 skills, 8 agents, 5 workflow hooks.

## Installation

```bash
npm install devtronic-marketplace --save-dev
```

Then add to `.claude/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "devtronic-local": {
      "source": { "source": "directory", "path": "./node_modules/devtronic-marketplace" }
    }
  },
  "enabledPlugins": { "devtronic@devtronic-local": true }
}
```

Or use the CLI which handles this automatically:

```bash
npx devtronic init
```

## What's Included

### Skills (19)

| Category | Skills |
|----------|--------|
| Orientation & Research | `/brief`, `/research`, `/opensrc` |
| Planning | `/spec`, `/create-plan` |
| Development | `/scaffold`, `/setup`, `/investigate`, `/worktree` |
| Execution | `/quick`, `/execute-plan` |
| Quality & Review | `/audit`, `/post-review`, `/generate-tests` |
| Session & Meta | `/checkpoint`, `/summary`, `/backlog`, `/learn`, `/create-skill` |

### Agents (8)

| Agent | Purpose |
|-------|---------|
| error-investigator | Quick automatic error diagnosis |
| code-reviewer | Thorough PR review |
| architecture-checker | Validate Clean Architecture compliance |
| quality-runner | Run tests, typecheck, and lint |
| commit-changes | Atomic conventional commits |
| test-generator | Generate unit tests following project patterns |
| dependency-checker | Audit dependencies for vulnerabilities |
| doc-sync | Verify docs match the actual codebase |

### Hooks (5)

Automated workflow hooks for Claude Code (lint-on-save, checkpoint before compaction, etc.).

## Documentation

Full documentation at [github.com/r-bart/devtronic](https://github.com/r-bart/devtronic).

## License

MIT
