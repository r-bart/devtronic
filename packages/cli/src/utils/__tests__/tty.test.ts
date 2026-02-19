import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ensureInteractive } from '../tty.js';

describe('ensureInteractive', () => {
  const originalIsTTY = process.stdout.isTTY;
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    stderrSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.stdout.isTTY = originalIsTTY;
    exitSpy.mockRestore();
    stderrSpy.mockRestore();
  });

  it('does nothing when stdout is a TTY', () => {
    process.stdout.isTTY = true;

    ensureInteractive('init');

    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('exits with error when stdout is not a TTY', () => {
    process.stdout.isTTY = undefined as unknown as boolean;

    ensureInteractive('init');

    expect(stderrSpy).toHaveBeenCalledWith(
      expect.stringContaining('"init" requires an interactive terminal')
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('includes the command name in the error message', () => {
    process.stdout.isTTY = undefined as unknown as boolean;

    ensureInteractive('update');

    expect(stderrSpy).toHaveBeenCalledWith(
      expect.stringContaining('"update"')
    );
  });

  it('mentions --yes as a workaround', () => {
    process.stdout.isTTY = undefined as unknown as boolean;

    ensureInteractive('add');

    expect(stderrSpy).toHaveBeenCalledWith(
      expect.stringContaining('--yes')
    );
  });
});
