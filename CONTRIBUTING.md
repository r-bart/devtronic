# Contributing to devtronic

Thank you for contributing to devtronic. This guide covers everything you need to get started.

## Development Setup

```bash
git clone https://github.com/r-bart/devtronic.git
cd devtronic
npm install
cd packages/cli && npm run build
```

## Running Tests

```bash
cd packages/cli && npm test
```

Tests use [Vitest](https://vitest.dev/). Run in watch mode during development:

```bash
cd packages/cli && npm run test:watch
```

## Quality Checks

Run all checks before submitting a PR:

```bash
npm run typecheck && npm run lint && npm test
```

- **typecheck** - TypeScript type checking (no `any` to silence errors)
- **lint** - ESLint enforcement
- **test** - Vitest test suite

## Adding a New Skill

Skills are Claude workflow files that live in `.claude/skills/`.

**Single-file skill:**

```
.claude/skills/my-skill.md
```

**Multi-file skill (with supporting assets):**

```
.claude/skills/my-skill/
└── SKILL.md
```

The skill file should describe what the skill does, when to invoke it, and what steps it performs. See existing skills in `.claude/skills/` for reference.

## Adding a New Agent

Agents are specialized Claude helpers that live in `.claude/agents/`.

```
.claude/agents/my-agent.md
```

The agent file should define the agent's role, available tools, and behavior. See existing agents in `.claude/agents/` for reference.

## PR Process

1. Fork the repository
2. Create a branch from `main`: `git checkout -b feat/my-feature`
3. Make your changes
4. Run quality checks: `npm run typecheck && npm run lint && npm test`
5. Commit using [conventional commits](#commit-conventions)
6. Push and open a PR against `main`

Keep PRs focused. One feature or fix per PR makes review faster.

## Commit Conventions

This project uses [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <short description>
```

| Type | When to use |
|------|-------------|
| `feat` | New feature or skill |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `chore` | Build, config, dependency updates |
| `refactor` | Code change that is not a fix or feature |
| `test` | Adding or updating tests |
| `ci` | CI/CD changes |

**Examples:**

```
feat: add /review-pr skill
fix: resolve skill path resolution on Windows
docs: update contributing guide
chore: bump version to 1.10.0
```

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](https://www.contributor-covenant.org/version/2/1/code_of_conduct/). By participating, you agree to uphold it. Report issues to the maintainers via GitHub.
