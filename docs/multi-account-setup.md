# Claude Code: Multiple Account Setup

Use different Claude Code accounts (personal, team, work) from the same machine with simple shell functions.

## How It Works

Claude Code uses the `CLAUDE_CONFIG_DIR` environment variable to determine where to store configuration and credentials. By default, it uses `~/.claude`.

By creating shell functions that override this variable, you can have completely separate configurations for different accounts.

## Setup

### 1. Add the function to your shell config

For **zsh** (default on macOS), add to `~/.zshrc`:

```bash
# Claude Code multi-account
# Personal: claude (uses ~/.claude by default)
# Team: tclaude (uses ~/.claude-team)
tclaude() {
  CLAUDE_CONFIG_DIR="$HOME/.claude-team" command claude "$@"
}
```

For **bash**, add to `~/.bashrc`:

```bash
# Claude Code multi-account
tclaude() {
  CLAUDE_CONFIG_DIR="$HOME/.claude-team" command claude "$@"
}
```

### 2. Reload your shell

```bash
source ~/.zshrc  # or source ~/.bashrc
```

### 3. Authenticate the new profile

```bash
tclaude  # This will prompt you to log in with your team account
```

## Usage

| Command | Config Directory | Account |
|---------|-----------------|---------|
| `claude` | `~/.claude` | Personal (default) |
| `tclaude` | `~/.claude-team` | Team |

Both commands use the same Claude Code binary, just with different configuration directories.

## Multiple Accounts

You can create as many profiles as you need:

```bash
# Personal (default)
# claude → ~/.claude

# Team account
tclaude() {
  CLAUDE_CONFIG_DIR="$HOME/.claude-team" command claude "$@"
}

# Work account
wclaude() {
  CLAUDE_CONFIG_DIR="$HOME/.claude-work" command claude "$@"
}

# Client project
cclaude() {
  CLAUDE_CONFIG_DIR="$HOME/.claude-client" command claude "$@"
}
```

## What Gets Separated

Each config directory maintains its own:

- **Credentials** - Login/authentication tokens
- **Settings** - User preferences and configuration
- **History** - Command history (`history.jsonl`)
- **Projects** - Project-specific settings
- **MCP servers** - Server configurations
- **Cache** - Temporary files

## Tips

- The config directory is created automatically on first run
- You can copy settings between profiles by copying specific files
- Each profile can have different MCP servers configured
- Project-level settings (`.claude/` in repos) are shared across all profiles
