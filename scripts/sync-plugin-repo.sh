#!/usr/bin/env bash
#
# Mirror the plugin content from the CLI templates into a checkout of the plugin
# marketplace repo (r-bart/devtronic-plugin).
#
# Every file operation the release performs lives here rather than inline in
# .github/workflows/release.yml, so it can be run against a fixture and tested.
# The workflow keeps only what needs credentials: clone, commit, tag, push.
#
# Usage: sync-plugin-repo.sh <cli-workspace> <plugin-repo-checkout> <version>
set -euo pipefail

WORKSPACE="${1:?usage: sync-plugin-repo.sh <cli-workspace> <plugin-repo> <version>}"
REPO="${2:?usage: sync-plugin-repo.sh <cli-workspace> <plugin-repo> <version>}"
VERSION="${3:?usage: sync-plugin-repo.sh <cli-workspace> <plugin-repo> <version>}"

TEMPLATES="$WORKSPACE/packages/cli/templates"
PLUGIN_DIR="$REPO/plugins/devtronic"

for dir in "$TEMPLATES/marketplace" "$TEMPLATES/claude-code/.claude/skills" \
           "$TEMPLATES/claude-code/.claude/agents" "$PLUGIN_DIR"; do
  if [ ! -d "$dir" ]; then
    echo "sync-plugin-repo: missing directory $dir" >&2
    exit 1
  fi
done

# Skills and agents are mirrored, not merged: one that leaves the templates has
# to leave the published plugin too.
rm -rf "$PLUGIN_DIR/skills" "$PLUGIN_DIR/agents"
cp -R "$TEMPLATES/claude-code/.claude/skills" "$PLUGIN_DIR/"
cp -R "$TEMPLATES/claude-code/.claude/agents" "$PLUGIN_DIR/"

mkdir -p "$PLUGIN_DIR/hooks" "$PLUGIN_DIR/scripts" "$PLUGIN_DIR/.claude-plugin"
cp "$TEMPLATES/marketplace/hooks.json" "$PLUGIN_DIR/hooks/"

# Scripts are mirrored for the same reason, and it is the reason this file
# exists: the release used to copy each script by name and delete none, so a
# retired hook script stayed in the published plugin — and in every user's
# cache — for good.
rm -f "$PLUGIN_DIR/scripts/"*.sh
cp "$TEMPLATES/marketplace/"*.sh "$PLUGIN_DIR/scripts/"
chmod +x "$PLUGIN_DIR/scripts/"*.sh

# A hook pointing at a script we did not ship fails in every user's session.
# Fail the release here instead, where nobody is watching a broken hook.
MISSING=0
for script in $(grep -o 'scripts/[A-Za-z0-9_.-]*\.sh' "$PLUGIN_DIR/hooks/hooks.json" | sort -u); do
  if [ ! -f "$PLUGIN_DIR/$script" ]; then
    echo "sync-plugin-repo: hooks.json references $script, which the plugin does not ship" >&2
    MISSING=1
  fi
done
[ "$MISSING" -eq 0 ] || exit 1

SKILL_COUNT=$(find "$PLUGIN_DIR/skills" -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')
AGENT_COUNT=$(find "$PLUGIN_DIR/agents" -name '*.md' | wc -l | tr -d ' ')

jq -n \
  --arg version "$VERSION" \
  --arg desc "Agentic development toolkit — ${SKILL_COUNT} skills, ${AGENT_COUNT} agents, workflow hooks" \
  '{
    name: "devtronic",
    version: $version,
    description: $desc,
    author: {
      name: "r-bart",
      url: "https://github.com/r-bart/devtronic"
    },
    homepage: "https://github.com/r-bart/devtronic",
    repository: "https://github.com/r-bart/devtronic-plugin",
    license: "MIT"
  }' > "$PLUGIN_DIR/.claude-plugin/plugin.json"

echo "sync-plugin-repo: v${VERSION} — ${SKILL_COUNT} skills, ${AGENT_COUNT} agents, $(ls -1 "$PLUGIN_DIR/scripts" | wc -l | tr -d ' ') scripts"
