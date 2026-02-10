import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Argv } from 'yargs';
import { createMockClient } from '../../helpers/mock-client.js';

// Mock dependencies before importing the command module
vi.mock('../../../src/config.js', () => ({
  getClient: vi.fn(),
}));

vi.mock('../../../src/output.js', () => ({
  formatOutput: vi.fn(),
}));

vi.mock('../../../src/errors.js', () => ({
  handleError: vi.fn(),
}));

import { registerSystemCommands } from '../../../src/commands/system.js';
import { getClient } from '../../../src/config.js';
import { formatOutput } from '../../../src/output.js';
import { handleError } from '../../../src/errors.js';

describe('system commands', () => {
  let mockClient: ReturnType<typeof createMockClient>;
  let mockYargs: any;
  let commandHandlers: Map<string, Function>;

  beforeEach(() => {
    mockClient = createMockClient();
    vi.mocked(getClient).mockReturnValue(mockClient as any);

    // Create a mock yargs that captures command handlers
    commandHandlers = new Map();
    mockYargs = {
      command: vi.fn((cmd: string, desc: string, builder: any, handler: Function) => {
        commandHandlers.set(cmd.split(' ')[0], handler);
        return mockYargs;
      }),
      demandCommand: vi.fn(() => mockYargs),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('info command', () => {
    it('registers info command', () => {
      registerSystemCommands(mockYargs as unknown as Argv);

      expect(mockYargs.command).toHaveBeenCalledWith(
        'info',
        expect.any(String),
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('fetches and displays app info', async () => {
      const appInfo = { appVersion: '1.0.0', dbVersion: '220' };
      mockClient.getAppInfo.mockResolvedValue(appInfo);

      registerSystemCommands(mockYargs as unknown as Argv);
      const handler = commandHandlers.get('info')!;

      await handler({ format: 'json' });

      expect(getClient).toHaveBeenCalledWith({ format: 'json' });
      expect(mockClient.getAppInfo).toHaveBeenCalled();
      expect(formatOutput).toHaveBeenCalledWith('json', appInfo);
    });

    it('uses default json format when not specified', async () => {
      const appInfo = { appVersion: '1.0.0', dbVersion: '220' };
      mockClient.getAppInfo.mockResolvedValue(appInfo);

      registerSystemCommands(mockYargs as unknown as Argv);
      const handler = commandHandlers.get('info')!;

      await handler({});

      expect(formatOutput).toHaveBeenCalledWith('json', appInfo);
    });

    it('handles errors', async () => {
      const error = new Error('Connection failed');
      mockClient.getAppInfo.mockRejectedValue(error);

      registerSystemCommands(mockYargs as unknown as Argv);
      const handler = commandHandlers.get('info')!;

      await handler({ format: 'json' });

      expect(handleError).toHaveBeenCalledWith(error);
    });
  });

  describe('backup command', () => {
    it('registers backup command with positional argument', () => {
      registerSystemCommands(mockYargs as unknown as Argv);

      expect(mockYargs.command).toHaveBeenCalledWith(
        'backup <name>',
        expect.any(String),
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('creates backup with specified name', async () => {
      mockClient.createBackup.mockResolvedValue(undefined);

      registerSystemCommands(mockYargs as unknown as Argv);
      const handler = commandHandlers.get('backup')!;

      await handler({ name: 'test-backup', format: 'json' });

      expect(getClient).toHaveBeenCalled();
      expect(mockClient.createBackup).toHaveBeenCalledWith('test-backup');
      expect(formatOutput).toHaveBeenCalledWith('json', { success: true });
    });

    it('handles errors during backup', async () => {
      const error = new Error('Backup failed');
      mockClient.createBackup.mockRejectedValue(error);

      registerSystemCommands(mockYargs as unknown as Argv);
      const handler = commandHandlers.get('backup')!;

      await handler({ name: 'test-backup', format: 'json' });

      expect(handleError).toHaveBeenCalledWith(error);
    });
  });

  describe('command registration', () => {
    it('demands at least one subcommand', () => {
      registerSystemCommands(mockYargs as unknown as Argv);

      expect(mockYargs.demandCommand).toHaveBeenCalledWith(
        1,
        expect.stringContaining('subcommand')
      );
    });
  });
});
