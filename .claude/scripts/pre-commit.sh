#!/usr/bin/env bash
# pre-commit.sh — Git pre-commit hook for devtronic projects
#
# Install:
#   cp .claude/scripts/pre-commit.sh .git/hooks/pre-commit
#   chmod +x .git/hooks/pre-commit
#
# Or with a symlink:
#   ln -sf ../../.claude/scripts/pre-commit.sh .git/hooks/pre-commit

set -euo pipefail

# Detect package manager from lockfile
detect_pm() {
  if [ -f "pnpm-lock.yaml" ]; then
    echo "pnpm"
  elif [ -f "yarn.lock" ]; then
    echo "yarn"
  elif [ -f "bun.lockb" ] || [ -f "bun.lock" ]; then
    echo "bun"
  else
    echo "npm"
  fi
}

PM=$(detect_pm)

echo "Pre-commit hook running with $PM..."

# Run typecheck
echo "Running typecheck..."
if ! $PM run typecheck; then
  echo ""
  echo "Typecheck failed. Fix type errors before committing."
  exit 1
fi

# Run lint
echo "Running lint..."
if ! $PM run lint; then
  echo ""
  echo "Lint failed. Fix lint errors before committing."
  exit 1
fi

echo "Pre-commit checks passed."
