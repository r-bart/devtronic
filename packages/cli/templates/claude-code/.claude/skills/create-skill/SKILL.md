---
name: create-skill
description: Meta skill to create new skills. Guides through defining purpose, workflow steps, tools, and generates the skill file.
allowed-tools: AskUserQuestion, Write, Read, Glob
argument-hint: "[skill-name]"
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
- Can restrict which tools are available

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

### 2. Determine Tools

```
Which tools does this skill need?

Read/Write:
- [ ] Read - Read files
- [ ] Write - Create/overwrite files
- [ ] Edit - Modify existing files
- [ ] Glob - Find files by pattern
- [ ] Grep - Search file contents

Execution:
- [ ] Bash - Run shell commands
- [ ] Task - Launch sub-agents

Interaction:
- [ ] AskUserQuestion - Ask user questions
- [ ] WebFetch - Fetch web content
- [ ] WebSearch - Search the web
```

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
name: skill-name                    # Recommended: lowercase, hyphens, max 64 chars
description: What it does           # Recommended: one line, Claude uses this to decide when to load
disable-model-invocation: true      # Optional: prevent Claude from auto-loading (use for side-effect skills)
allowed-tools: Tool1, Tool2         # Optional: restrict tools to minimum needed
argument-hint: "[arg1] [--flag]"   # Optional: hint shown during autocomplete
user-invocable: true                # Optional: set false to hide from / menu (default: true)
model: sonnet                       # Optional: sonnet, opus, haiku, or specific model ID
context: fork                       # Optional: run in isolated subagent context
agent: Explore                      # Optional: subagent type when context: fork (Explore, Plan, general-purpose)
---
```

### Skill Template

Generate the skill file based on gathered info:

```markdown
---
name: {name}
description: {description}
allowed-tools: {tools}
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
- Adjust tool permissions
- Add supporting files by converting to directory: `.claude/skills/{name}/SKILL.md`
```

---

## Tips

1. **Start simple** - Add complexity as needed
2. **Be specific** - Vague instructions produce vague results
3. **Include examples** - Show, don't tell
4. **Test iteratively** - Run it, improve it
5. **Restrict tools** - Only allow what's needed
