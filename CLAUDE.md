# AI Agents Guide

**For AI agents working on this codebase.** Keep this concise - only include what Claude can't deduce from code.

---

## Quick Start

> **Tip**: For parallel work, use git worktrees. See `docs/worktrees.md`.

1. Read `CLAUDE.md` for project-specific rules
2. Check existing patterns before creating new ones
3. Follow: brief → spec → create-plan → generate-tests → execute-plan → summary → post-review

---

## Architecture: Clean + DDD

**See `docs/ARCHITECTURE.md`** for project-specific structure.

### Layer Rule

```
Presentation → Application → Domain ← Infrastructure
```

**Dependencies point INWARD only.** Inner layers know nothing about outer layers.

### Quick Reference

| Layer | Contains | Can Import From |
|-------|----------|-----------------|
| Domain | Entities, Value Objects, Repository Interfaces | Nothing external |
| Application | Use Cases, DTOs | Domain |
| Infrastructure | Repository Impls, External Services | Domain, Application |
| Presentation | UI, Controllers | Application, Domain |

### Common Violations

```typescript
// ❌ Domain importing infrastructure
import { prisma } from '../infrastructure/db'

// ❌ UI accessing DB directly
const user = await db.user.findUnique(...)

// ✅ UI calls use case, use case uses repository interface
const user = await getUserUseCase.execute(id)
```

---

## Code Patterns

### State Management
- **UI state**: Zustand stores
- **Server state**: React Query
- **Domain state**: Use cases

### Data Access
- Repository interfaces in `domain/`
- Implementations in `infrastructure/`
- Never access DB from UI

---

## Naming

- **Files**: PascalCase components, camelCase utils
- **Code**: camelCase vars/functions, PascalCase types
- **Unused**: Prefix with `_`

---

## Quality Checks

```bash
npm run typecheck && npm run lint && npm test
```

Run after every change.

---

## Workflow

| Task | Commands |
|------|----------|
| New feature | `/brief` → `/spec` → `/create-plan` → `/generate-tests` → `/execute-plan` → `/summary` → `/post-review` |
| Design (new) | `/brief` → `/design --research` → `/design --define` → `/design --ia` → `/design --wireframe` → `/design-system --define` → `/spec` → `/create-plan` → `/generate-tests` → `/execute-plan` → `/design-review` → `/post-review` |
| Bug fix | `/brief` → fix → test → `/summary` → `/post-review` |
| Refactor | `/brief` → `/create-plan` → implement → `/summary` → `/post-review` |

> **Tip**: `/brief` for session orientation (with pre-flight checks). `/summary` to document changes. `/checkpoint` to save progress.

---

## Model Profiles

Add to your project notes:
```
profile: balanced
```
Options: `quality` (all opus), `balanced` (default, sonnet subagents), `budget` (all haiku).

---

## Self-Improvement

**After every significant correction**, update this file:

```
"Update CLAUDE.md so you don't make that mistake again."
```

Claude is good at writing rules for itself. Iterate until mistake rate drops.

---

## Project Notes

Maintain notes in `thoughts/notes/` updated after every PR:
- Key decisions made
- Patterns discovered
- Gotchas encountered

---

## Open Source

This is an **open source project** (MIT) published to npm:
- `devtronic` (CLI) — `packages/cli/`

### Conventions
- Conventional Commits: `feat:`, `fix:`, `docs:`, `chore:`, `ci:`
- Semantic Versioning via Keep a Changelog
- Branches: `develop` → `main` via PR
- CI: GitHub Actions (Node 18/20/22)
- Security: report via GitHub Security Advisories (`SECURITY.md`)
- Release: tag `v*.*.*` → GitHub Actions publishes to npm
- **Never include `Co-Authored-By:` lines in commit messages**

### Contributing Philosophy
- Encourage **extending via skills/plugins** over core PRs
- PRs for: bug fixes, structural improvements, docs, CI
- Feature ideas → standalone skills or plugins

---

## Prompting Tips

When stuck or getting mediocre results:
- **Re-plan**: "Enter plan mode and re-plan this approach"
- **Elegant fix**: "Knowing everything you know now, scrap this and implement the elegant solution" - Use after multiple iterations leave working but hacky code. Leverages full context of failed approaches and discovered constraints.
- **Challenge**: "Grill me on these changes and don't approve until I pass"
- **Prove it**: "Prove to me this works by diffing behavior between main and this branch"

---

## References

- **CLAUDE.md** - Project rules
- **docs/ARCHITECTURE.md** - Folder structure
- **docs/worktrees.md** - Parallel sessions with git worktrees
- **docs/design-phase.md** - Design phase skills and agents guide
- **.claude/skills/** - Available workflows
- **.claude/agents/** - Specialized helpers
