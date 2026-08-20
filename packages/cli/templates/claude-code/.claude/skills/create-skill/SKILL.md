---
name: create-skill
description: Meta skill to create new skills. Guides through defining purpose, workflow steps, tools, and generates the skill file.
argument-hint: "[skill-name]"
allowed-tools: Edit(.claude/skills/**)
disable-model-invocation: true
---

# Create Skill - Meta Skill Generator

Conversationally guide through creating a new Claude Code skill. If `$ARGUMENTS` provides a skill name, use it as the starting point; otherwise ask the user.

## When to Use

- Need a new reusable workflow
- Want to automate a repetitive task
- Creating project-specific commands
- Standardizing team processes

---

## What is a Skill?

A skill is a Markdown file in `.claude/skills/` that:
- Defines a reusable workflow or prompt
- Can be invoked with `/skill-name`
- Guides Claude through specific tasks
- Can pre-approve narrow tool grants, or remove tools outright

---

## Workflow

```
┌─────────────────────────────────────────────────────────┐
│                    /create-skill                         │
├─────────────────────────────────────────────────────────┤
│  1. GATHER         → Name, purpose, trigger scenarios   │
│  2. DESIGN         → Workflow steps, tools needed       │
│  3. GENERATE       → Create skill file                  │
│  4. VERIFY         → Review and test                    │
└─────────────────────────────────────────────────────────┘
```

---

## Phase 1: GATHER - Basic Info

Use AskUserQuestion to collect:

### 1. Name

```
What should this skill be called?
(lowercase, hyphens - e.g., "deploy-staging", "generate-api")
```

### 2. Description

```
In one sentence, what does this skill do?
(This becomes the description in frontmatter)
```

### 3. Usage Scenarios

```
Give 2-3 example scenarios where you'd invoke this skill:
- Example 1: ...
- Example 2: ...
```

---

## Phase 2: DESIGN - Workflow & Tools

### 1. Define Steps

```
What are the main steps of this skill? (3-7 steps recommended)

Step 1: [Action] - [Brief description]
Step 2: [Action] - [Brief description]
...
```

### 2. Determine Permissions

Every tool stays available to the skill regardless of what you write here. The
only two questions are which prompts to skip, and which tools to take away.

```
1. Does this skill write files it should never have to ask about?
   → Name the directory, not the tool: Edit(thoughts/**)
   → Answer "no" for a skill that edits source code. Those must prompt.

2. Does it always run the same shell command?
   → Name that command: Bash(npm test *), Bash(git worktree *)
   → Answer "no" for ad-hoc commands. Those must prompt.

3. Must it be unable to modify code?
   → disallowed-tools: Edit, Write, NotebookEdit

4. Would it be harmful for Claude to invoke it unasked?
   → disable-model-invocation: true
```

Reads, greps and globs never prompt inside the workspace, so a read-only skill
usually needs no `allowed-tools` line at all.

### 3. Output (if applicable)

```
Does this skill produce a file output?

1. Yes - saves to thoughts/specs/
2. Yes - saves to thoughts/plans/
3. Yes - saves to thoughts/notes/
4. Yes - saves elsewhere: [specify]
5. No file output - conversation only
```

---

## Phase 3: GENERATE - Create Skill File

### Frontmatter Reference

```yaml
---
name: skill-name                       # Recommended: lowercase, hyphens, max 64 chars
description: What it does              # Recommended: one line, Claude uses this to decide when to load
disable-model-invocation: true         # Optional: only the human can invoke it (use for side-effect skills)
allowed-tools: Edit(thoughts/**)       # Optional: PRE-APPROVES these — see the warning below
disallowed-tools: Edit, Write          # Optional: removes tools while the skill is active
argument-hint: "[arg1] [--flag]"      # Optional: hint shown during autocomplete
user-invocable: true                   # Optional: set false to hide from / menu (default: true)
model: sonnet                          # Optional: sonnet, opus, haiku, or specific model ID
context: fork                          # Optional: run in isolated subagent context
background: false                      # Optional: with context: fork, wait for the result this turn
agent: Explore                         # Optional: subagent type when context: fork
paths: ["src/**/*.ts"]                # Optional: limit automatic activation to matching files
---
```

### `allowed-tools` grants, it does not restrict

**Read this before writing the field.** `allowed-tools` pre-approves the listed
tools so they run without a permission prompt during the invoking turn. It never
limits what the skill can reach.

So `allowed-tools: Read, Write, Edit, Bash` does not mean "this skill uses these
four tools". It means "let this skill run any shell command and write any file
without asking the human". Rules for generating it:

- **Default to omitting it.** Reads, greps and globs never prompt inside the
  workspace, so listing them buys nothing.
- **Scope every grant.** `Edit(thoughts/**)`, not `Write`. `Bash(npm test *)`,
  not `Bash`. A grant with no parentheses is almost always a mistake.
- **Path rules use `Edit(...)` and `Read(...)` only.** `Write(docs/**)` and
  `Glob(docs/**)` are accepted but never consulted, and warn at startup.
- **To restrict, use `disallowed-tools`.** A skill that must not modify code
  declares `disallowed-tools: Edit, Write, NotebookEdit`.

### Skill Template

Generate the skill file based on gathered info:

```markdown
---
name: {name}
description: {description}
{frontmatter-fields}
---

# {Title}

{One paragraph explaining the skill's purpose}

## When to Use

- {Scenario 1}
- {Scenario 2}
- {Scenario 3}

**Skip for:** {When NOT to use}

---

## Workflow

```
┌─────────────────────────────────────────────────────────┐
│                      /{name}                             │
├─────────────────────────────────────────────────────────┤
│  1. {STEP_1}       → {Brief description}                │
│  2. {STEP_2}       → {Brief description}                │
│  3. {STEP_3}       → {Brief description}                │
└─────────────────────────────────────────────────────────┘
```

---

## Step 1: {Step Name}

{Detailed instructions for this step}

---

## Step 2: {Step Name}

{Continue for each step...}

---

## Output (if applicable)

Save to: `{output_path}/{filename_pattern}`

```markdown
{Output template structure}
```

---

## Tips

1. {Tip 1}
2. {Tip 2}
3. {Tip 3}
```

---

## Phase 4: VERIFY - Review & Test

After generating:

1. **Read the generated file** to verify structure
2. **Test invocation** with `/{skill-name}`
3. **Iterate** if adjustments needed

```markdown
## Skill Created

**File**: `.claude/skills/{name}.md` (or `.claude/skills/{name}/SKILL.md` if supporting files needed)
**Invoke**: `/{name}`

### Quick Test

Try running `/{name}` now to verify it works as expected.

### Customization

Edit the skill file to:
- Add more detailed instructions
- Include examples from your codebase
- Tighten the `allowed-tools` grant or add `disallowed-tools`
- Add supporting files by converting to directory: `.claude/skills/{name}/SKILL.md`
```

---

## Tips

1. **Start simple** - Add complexity as needed
2. **Be specific** - Vague instructions produce vague results
3. **Include examples** - Show, don't tell
4. **Test iteratively** - Run it, improve it
5. **Grant nothing you can't name** - A scoped rule or no rule at all
