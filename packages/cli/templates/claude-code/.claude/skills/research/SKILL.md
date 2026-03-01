---
name: research
description: Codebase investigation. Quick mode (default) for fast orientation. Deep mode for thorough analysis. External mode for GitHub + user-configured MCPs.
allowed-tools: Read, Grep, Glob, Bash, WebFetch, Task, Write
argument-hint: "[topic] [--deep|--external|--all]"
---

# Research - Codebase Investigation

Investigate `$ARGUMENTS` in the codebase and gather context with multiple modes.

## Modes

| Mode | Command | Creates File | Use When |
|------|---------|--------------|----------|
| **Quick** | `/research [topic]` | No | Starting a session, fast orientation |
| **Deep** | `/research [topic] --deep` | Yes | Before complex features, unfamiliar code |
| **External** | `/research [topic] --external` | Yes | Need GitHub issues, PRs, Slack, Jira context |
| **All** | `/research [topic] --all` | Yes | Maximum coverage (deep + external) |

**Rule of thumb**: Start with quick, escalate as needed.

---

## Quick Mode (Default)

Fast contextual briefing in under 60 seconds. No files created.

### When to Use Quick

- Starting a new session
- Quickly orienting on a feature
- Checking what exists before `/spec` or `/create-plan`
- Resuming after a break

### Model Selection

Before spawning Task subagents, check `thoughts/CONFIG.md` for model profile:

| Profile | Subagent model | Description |
|---------|---------------|-------------|
| quality | opus | Highest quality, most expensive |
| balanced | sonnet | Good balance (default) |
| budget | haiku | Fastest, cheapest |

If no CONFIG.md or no `profile:` line, default to **balanced** (sonnet for subagents).

### Quick Process

```
1. PARSE INPUT
   └── Extract keywords + generate synonyms

2. PARALLEL SCANS (via subagents)
   ├── DOCS: thoughts/specs|plans|checkpoints|research/*keyword*
   ├── CODE: Glob + Grep for key files (max 15)
   └── GIT: Recent commits, branches, PRs

3. SYNTHESIZE
   └── Combine into executive briefing

4. DISPLAY
   └── Show directly (no file created)

5. SUGGEST NEXT STEP
   └── Resume checkpoint, --deep, --external, or implement
```

### Quick Output Format

```markdown
# Research: [Topic]

## Summary

[2-3 sentences: what exists, current state, last activity]

---

## Documentation Found

| Type | File | Last Modified | Summary |
|------|------|---------------|---------|
| Spec | `thoughts/specs/auth-spec.md` | 2024-01-15 | OAuth2 spec |
| Checkpoint | `thoughts/checkpoints/...` | 2024-01-18 | Paused at X |

---

## Key Code Files

| File | Purpose |
|------|---------|
| `src/auth/AuthProvider.tsx` | Main auth context |
| `src/auth/useAuth.ts` | Auth hook |

---

## Git Activity

**Recent commits**: [list]
**Active branches**: [list]
**Open PRs**: [list]

---

## Next Steps

1. **Resume checkpoint**: `thoughts/checkpoints/...`
2. **Need more depth?** `/research [topic] --deep`
3. **Need external context?** `/research [topic] --external`
```

### Quick Limits

| Category | Max Items |
|----------|-----------|
| Docs | 5 |
| Code files | 15 |
| Commits | 15 |

---

## Deep Mode (`--deep`)

Systematic codebase research that produces a reusable document.

### When to Use Deep

- Before starting a complex feature
- Debugging a tricky bug
- Modifying unfamiliar code
- Making architectural decisions

### Deep Process

```
1. DEFINE QUESTION
   └── What are you trying to understand?

2. PARALLEL INVESTIGATION (via subagents)
   ├── Architecture exploration
   ├── Data flow analysis
   ├── Pattern discovery
   └── Related code search

3. SYNTHESIZE FINDINGS
   └── Combine into structured document

4. SAVE DOCUMENT
   └── thoughts/research/YYYY-MM-DD_[topic].md

5. RESOLVE OPEN QUESTIONS
   └── Ask user to clarify decisions
```

### Deep Document Template

Save to: `thoughts/research/YYYY-MM-DD_[topic].md`

```markdown
# Research: [Topic]

**Date**: YYYY-MM-DD
**Question**: [The research question]
**Status**: draft | reviewed

---

## Summary

[2-3 paragraphs answering the research question]

---

## Architecture

### Key Components

| Component | File | Responsibility |
|-----------|------|----------------|
| [Name] | `path/to/file.ts:L##` | [What it does] |

### Component Diagram

```
[Text-based diagram]
```

---

## Data Flow

```
1. User action → path/to/file.ts:##
2. Handler → path/to/handler.ts:##
3. Result → [description]
```

---

## Relevant Files

### Core (must understand)
- `path/to/critical.ts` - [Why it matters]

### Related (may modify)
- `path/to/related.ts` - [Connection]

### Reference (patterns)
- `path/to/example.ts` - [Pattern to follow]

---

## Code Patterns

### Pattern: [Name]

**Used in**: `path/to/file.ts:L##`

```typescript
// Relevant code snippet
```

---

## Open Questions

- [ ] [Question needing clarification]

---

## Decisions Made

| Question | Decision | Notes |
|----------|----------|-------|
| [Question] | [Answer] | [Context] |
```

---

## External Mode (`--external`)

Gather context from external sources beyond the codebase.

### When to Use External

- Starting complex task with external requirements
- Onboarding to a new area
- Gathering requirements from multiple sources
- Preparing for planning session

### External Sources

#### Always Available

| Source | Method | What to Gather |
|--------|--------|----------------|
| **GitHub** | `gh` CLI | Issues, PRs, discussions |
| **Docs** | Read | READMEs, architecture docs |

#### User-Configured MCPs

**IMPORTANT**: Before searching external sources beyond GitHub, ASK the user:

> "Voy a buscar contexto en GitHub (via `gh` CLI).
> ¿Tienes MCPs configurados para otras fuentes externas?
> (ej: Slack, Jira, Linear, Notion, Confluence, otro...)"

Then use whichever MCPs the user specifies. Do NOT assume specific MCPs are available.

**Examples of MCPs users might have**:
- Communication: Slack, Discord, Teams
- Project Management: Jira, Linear, Asana, Trello
- Documentation: Notion, Confluence, Google Docs
- Other: Custom MCPs, internal tools

### External Process

```
1. IDENTIFY TOPIC
   └── What context is needed?

2. ASK USER ABOUT MCPs
   └── "¿Qué MCPs tienes configurados para fuentes externas?"

3. GATHER FROM SOURCES
   ├── GitHub: gh issue list, gh pr list (always)
   ├── Docs: Glob + Read (always)
   └── User MCPs: Use whichever they specified

4. FILTER & PRIORITIZE
   └── Keep only relevant info

5. SYNTHESIZE
   └── Combine into context document

6. SAVE
   └── thoughts/research/YYYY-MM-DD_[topic]_context.md
```

### GitHub Commands

```bash
# Recent issues
gh issue list --search "keyword" --limit 10

# Recent PRs
gh pr list --search "keyword" --state all --limit 10

# Issue details
gh issue view 123

# PR with comments
gh pr view 123 --comments
```

### External Document Template

Save to: `thoughts/research/YYYY-MM-DD_[topic]_context.md`

```markdown
# Context: [Topic]

**Date**: YYYY-MM-DD
**Sources**: GitHub, Slack, Jira, Docs

---

## Summary

[2-3 sentences on overall context]

---

## Requirements

From [source]:
- Requirement 1
- Requirement 2

---

## Current State

**Implementation**: [what exists]
**Issues**: [known problems]
**Recent Changes**: [what changed]

---

## Decisions Made

| Decision | Rationale | Source |
|----------|-----------|--------|
| Use X | Because Y | Issue #123 |

---

## Open Questions

- [ ] Question 1 (from [source])
- [ ] Question 2 (from [source])

---

## Links

- Issue: [url]
- PR: [url]
- Doc: [path]
```

---

## All Mode (`--all`)

Combines deep codebase research with external context gathering.

```bash
/research authentication --all
```

Produces two sections in one document:
1. Codebase analysis (from --deep)
2. External context (from --external)

Save to: `thoughts/research/YYYY-MM-DD_[topic]_full.md`

---

## Edge Cases

### No Results Found

```markdown
# Research: [Topic]

## Summary

No existing documentation, code, or git activity found for "[topic]".

## Next Steps

1. `/spec [topic]` - Define requirements
2. `/research [topic] --external` - Check external sources
3. `/create-plan [topic]` - Create implementation plan
```

### Checkpoint Found

Prioritize it:

```markdown
## Active Checkpoint Found

`thoughts/checkpoints/2024-01-18_auth.md`

**Status**: Work in progress
**Next**: [next step from checkpoint]

**Recommended**: Resume from this checkpoint
```

---

## Examples

```bash
# Quick orientation
/research authentication

# Deep codebase dive
/research payment flow --deep

# External context only
/research user-stories --external

# Full coverage
/research new-feature --all
```

---

## Tips

1. **Start quick, escalate as needed** - Don't over-investigate simple tasks
2. **Check for checkpoints first** - They have actionable next steps
3. **Be specific** - "auth token refresh" beats "authentication"
4. **Use --external for requirements** - When you need issue/ticket context
5. **Document what EXISTS** - Not suggestions or improvements
