# Project

Project project with Flat architecture.

## Commands

- **Dev**: `# Add your dev command`
- **Build**: `# Add your build command`
- **Quality**: `# No quality scripts detected - add your commands here`

Run quality checks after every change.

## Code Style

- **Files**: PascalCase components, camelCase utils
- **Code**: camelCase vars/functions, PascalCase types
- **Unused**: Prefix with `_`

## Code Patterns

- Never access DB from UI

## Architecture

Document your architecture patterns. See `docs/ARCHITECTURE.md` for detailed structure.

## Workflow

- **New feature**: `/briefing` → `/spec` → `/create-plan` → `/generate-tests` → `/execute-plan` → `/summary --quick`
- **Bug fix**: `/brief` → fix → test → `/summary`
- **Session start**: `/brief` for orientation
- **Session end**: `/handoff` for clean context rotation

## Available Skills

- `/brief` — Session orientation with pre-flight checks
- `/spec` — Product specification interview (PRD)
- `/research` — Codebase investigation (--deep, --external)
- `/create-plan` — Phased implementation plan with task dependencies
- `/execute-plan` — Parallel phase execution of plans
- `/quick` — Fast ad-hoc tasks: implement, verify, commit
- `/generate-tests` — Failing tests from spec (Tests-as-DoD)
- `/post-review` — Pre-PR review (architecture, quality, requirements)
- `/audit` — Codebase audit (security, complexity, architecture)
- `/summary` — Post-change documentation
- `/checkpoint` — Save session progress for resumption
- `/backlog` — Issue management with BACK-### IDs
- `/investigate` — Deep error and bug analysis
- `/learn` — Post-task teaching breakdown
- `/scaffold` — Create new projects from scratch
- `/setup` — Interactive project configuration
- `/worktree` — Git worktree management
- `/opensrc` — Fetch npm/GitHub source for full context
- `/create-skill` — Generate new custom skills
- `/devtronic-help` — Discover skills, agents, addons, and workflows from the IDE
- `/briefing` — Pre-planning alignment Q&A
- `/summary --quick` — Quick session summary from git activity
- `/handoff` — Context rotation for fresh sessions
- `/devtronic` — Autonomous engineering loop — spec→test→plan→execute→PR
