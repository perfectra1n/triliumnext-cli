import { vi, type MockInstance } from 'vitest';

export interface ConsoleSpy {
  log: MockInstance;
  error: MockInstance;
  table: MockInstance;
  restore: () => void;
}

/**
 * Spies on console methods without polluting test output
 * Returns object with spies and restore function
 */
export function spyOnConsole(): ConsoleSpy {
  const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  const tableSpy = vi.spyOn(console, 'table').mockImplementation(() => {});

  return {
    log: logSpy,
    error: errorSpy,
    table: tableSpy,
    restore: () => {
      logSpy.mockRestore();
      errorSpy.mockRestore();
      tableSpy.mockRestore();
    },
  };
}
