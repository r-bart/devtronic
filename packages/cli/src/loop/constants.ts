/**
 * Dependency-free shared constants for the loop harness.
 *
 * Kept separate from `ownership.ts` (which pulls in node:fs / node:child_process)
 * so pure consumers — including the bash generator in `generators/hooks.ts` — can
 * import these without depending on an infra module.
 */

/** Staleness threshold (seconds). A sentinel older than this is treated as a
 *  crashed loop and reclaimed. Mirrored into generated + template bash. */
export const STALE_SECS = 900;

/** Sentinel path relative to the worktree root. The ambient bash hooks read this
 *  exact relative path from their cwd, so the TS side must resolve to the same
 *  location relative to the same root (see ownership.sentinelPath). */
export const SENTINEL_REL = '.claude/.loop-owner';
