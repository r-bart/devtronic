# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.8.0] - 2026-02-23

### Added
- `generate-tests` skill: create failing tests from a spec as Definition of Done
- `architecture-checker` subagent: automated Clean Architecture compliance validation
- `pre-commit.sh` script in marketplace for git pre-commit quality gates
- SPA-DDD scaffold examples (React + Vite + DDD + Zustand + Apollo)

### Changed
- Rebranded from `@tutellus/agentic-architecture` to `rbartronic`
- Marketplace package renamed to `agentic-marketplace`
- Plugin namespace changed to `rbartronic:` (e.g. `/rbartronic:spec`)
- `post-review` skill: architecture check now automated via subagent
- `create-plan` skill: spec tests integrated as Done Criteria
- `execute-plan` skill: automatic 3-attempt retry before user escalation
- `spec` skill: references `/generate-tests` as next step after approval
- Replaced tutellus-specific scaffold examples with generic SPA-DDD pattern

### Removed
- Legacy `thoughts/` docs inherited from the fork (backlog, plans, specs, research)
- `examples-tutellus.md` scaffold reference replaced by `examples-spa-ddd.md`

---

*Forked from [ai-agentic-architecture](https://github.com/nicobistolfi/ai-agentic-architecture)*
