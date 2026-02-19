# Recommended Third-Party Skills

Community and third-party skills that complement this architecture.

---

## How to Install Skills

### From GitHub

```bash
# Clone or download the skill
git clone https://github.com/user/skill-name .claude/skills/skill-name

# Or add as submodule
git submodule add https://github.com/user/skill-name .claude/skills/skill-name
```

### From Skill Registries

```bash
# If using a skill manager (future)
claude skill install skill-name
```

---

## Recommended Skills

### Code Quality

| Skill | Source | Description |
|-------|--------|-------------|
| **vercel-react-best-practices** | [Vercel Engineering](https://github.com/vercel) | 40+ React/Next.js performance rules |
| **web-design-guidelines** | [Anthropic](https://github.com/anthropics/courses/tree/master/prompt_engineering_interactive_tutorial/Anthropic%201P) | UI/UX and accessibility review |
| **claude-code-best-practices** | Community | Best practices for Claude Code usage |

### Email & Communications

| Skill | Source | Description |
|-------|--------|-------------|
| **react-email** | [Resend](https://github.com/resend/react-email) | Email templates with React |
| **email-best-practices** | Community | Deliverability, authentication, compliance |
| **send-email** | Community | Transactional email sending via Resend |

### Documentation

| Skill | Source | Description |
|-------|--------|-------------|
| **find-skills** | Built-in | Discover and install skills |
| **keybindings-help** | Built-in | Customize keyboard shortcuts |

---

## Skill Categories

### Planning & Research

Core skills included in this template:
- `/research` - Codebase investigation (`--deep` for thorough, `--external` for GitHub/Slack)
- `/spec` - Product requirements interview
- `/create-plan` - Implementation planning (`--detailed` for task-level pseudocode)

### Session Management

Core skills included:
- `/checkpoint` - Save session state (auto-suggested by Claude)
- `/backlog` - Issue management

### Quality & Review

Core skills included:
- `/post-review` - Comprehensive code review (`--strict` for senior engineer mode)
- `/investigate` - Deep error analysis
- `/audit` - Codebase audit (architecture, code quality, security)
- `/learn` - Post-task teaching

### Workflow

Core skills included:
- `/scaffold` - Create new projects with guided architecture
- `/setup` - Configure AI assistance in existing projects

---

## Creating Custom Skills

See `.claude/skills/` for examples. Basic structure:

```markdown
---
name: my-skill
description: What this skill does
allowed-tools:
  - Read
  - Write
  - AskUserQuestion
---

# My Skill

## When to Use
[Trigger conditions]

## Process
[Step by step workflow]

## Output
[What gets produced]
```

---

## Skill Discovery

To find more skills:

1. **Built-in**: Use `/find-skills` to search
2. **GitHub**: Search for "claude-code-skill" or "claude-skill"
3. **Community**: Check Claude Code forums and Discord

---

## Contributing Skills

To share a skill with the community:

1. Create a public GitHub repository
2. Include a clear README with usage instructions
3. Add the `claude-code-skill` topic to the repo
4. Submit to community registries (when available)

---

## Evaluation Criteria

When evaluating third-party skills, consider:

- [ ] **Maintained**: Recent updates, responsive maintainer
- [ ] **Documented**: Clear usage instructions
- [ ] **Scoped**: Does one thing well
- [ ] **Safe**: No destructive operations without confirmation
- [ ] **Compatible**: Works with your Claude Code version
