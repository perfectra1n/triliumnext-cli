import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Argv } from 'yargs';

// Mock dependencies before importing
vi.mock('../../../src/config.js', () => ({
  resolveConfig: vi.fn(),
  saveConfig: vi.fn(),
}));

vi.mock('../../../src/errors.js', () => ({
  handleError: vi.fn(),
}));

// Create mocks inside the factory to avoid hoisting issues
vi.mock('../../../src/client/index.js', () => {
  const mockLogout = vi.fn();
  const mockLogin = vi.fn();

  class MockEtapiClient {
    static login = mockLogin;
    static mockLogout = mockLogout; // Expose for test access
    static mockLogin = mockLogin; // Expose for test access
    logout = mockLogout;
    constructor(public serverUrl: string, public token: string) {}
  }

  return {
    EtapiClient: MockEtapiClient,
  };
});

vi.mock('node:readline', () => ({
  createInterface: vi.fn(() => ({
    question: vi.fn((q: string, cb: (answer: string) => void) => {
      // Automatically answer with 'test-password'
      cb('test-password');
    }),
    close: vi.fn(),
  })),
}));

import { registerAuthCommands } from '../../../src/commands/auth.js';
import { resolveConfig, saveConfig } from '../../../src/config.js';
import { handleError } from '../../../src/errors.js';
import { EtapiClient } from '../../../src/client/index.js';

describe('auth commands', () => {
  let mockYargs: any;
  let commandHandlers: Map<string, Function>;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Spy on console.log
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // Create a mock yargs that captures command handlers
    commandHandlers = new Map();
    mockYargs = {
      command: vi.fn((cmd: string, desc: string, builder: any, handler: Function) => {
        commandHandlers.set(cmd.split(' ')[0], handler);
        return mockYargs;
      }),
      demandCommand: vi.fn(() => mockYargs),
    };

    // Reset mock implementations
    vi.mocked(resolveConfig).mockReturnValue({
      serverUrl: 'http://localhost:8080',
      authToken: 'test-token',
    });

    // Clear mock call history via static properties
    const MockClient = EtapiClient as any;
    if (MockClient.mockLogout) MockClient.mockLogout.mockClear();
    if (MockClient.mockLogin) MockClient.mockLogin.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
    consoleLogSpy.mockRestore();
  });

  describe('login command', () => {
    it('registers login command', () => {
      registerAuthCommands(mockYargs as unknown as Argv);

      expect(mockYargs.command).toHaveBeenCalledWith(
        'login',
        expect.any(String),
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('prompts for password and saves auth token', async () => {
      const MockClient = EtapiClient as any;
      MockClient.mockLogin.mockResolvedValue({
        authToken: 'new-token-123',
        resolvedBaseUrl: 'http://localhost:8080/etapi',
      });

      registerAuthCommands(mockYargs as unknown as Argv);
      const handler = commandHandlers.get('login')!;

      await handler({ server: 'http://localhost:8080' });

      expect(MockClient.mockLogin).toHaveBeenCalledWith(
        'http://localhost:8080',
        'test-password'
      );
      expect(saveConfig).toHaveBeenCalledWith({
        serverUrl: 'http://localhost:8080/etapi',
        authToken: 'new-token-123',
      });
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Login successful')
      );
    });

    it('uses TRILIUM_URL env var when --server not provided', async () => {
      process.env.TRILIUM_URL = 'http://env-server:9090';

      const MockClient = EtapiClient as any;
      MockClient.mockLogin.mockResolvedValue({
        authToken: 'env-token',
        resolvedBaseUrl: 'http://env-server:9090/etapi',
      });

      registerAuthCommands(mockYargs as unknown as Argv);
      const handler = commandHandlers.get('login')!;

      await handler({});

      expect(MockClient.mockLogin).toHaveBeenCalledWith(
        'http://env-server:9090',
        'test-password'
      );

      delete process.env.TRILIUM_URL;
    });

    it('uses default server URL when no server specified', async () => {
      delete process.env.TRILIUM_URL;

      const MockClient = EtapiClient as any;
      MockClient.mockLogin.mockResolvedValue({
        authToken: 'default-token',
        resolvedBaseUrl: 'http://localhost:37740/etapi',
      });

      registerAuthCommands(mockYargs as unknown as Argv);
      const handler = commandHandlers.get('login')!;

      await handler({});

      expect(MockClient.mockLogin).toHaveBeenCalledWith(
        'http://localhost:37740',
        'test-password'
      );
    });

    it('handles login errors', async () => {
      const error = new Error('Invalid password');
      const MockClient = EtapiClient as any;
      MockClient.mockLogin.mockRejectedValue(error);

      registerAuthCommands(mockYargs as unknown as Argv);
      const handler = commandHandlers.get('login')!;

      await handler({});

      expect(handleError).toHaveBeenCalledWith(error);
    });
  });

  describe('logout command', () => {
    it('registers logout command', () => {
      registerAuthCommands(mockYargs as unknown as Argv);

      expect(mockYargs.command).toHaveBeenCalledWith(
        'logout',
        expect.any(String),
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('logs out and clears auth token', async () => {
      const MockClient = EtapiClient as any;
      MockClient.mockLogout.mockResolvedValue(undefined);

      registerAuthCommands(mockYargs as unknown as Argv);
      const handler = commandHandlers.get('logout')!;

      await handler({});

      expect(resolveConfig).toHaveBeenCalled();
      expect(MockClient.mockLogout).toHaveBeenCalled();
      expect(saveConfig).toHaveBeenCalledWith({
        serverUrl: 'http://localhost:8080',
        authToken: '',
      });
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Logged out successfully')
      );
    });

    it('handles logout errors', async () => {
      const error = new Error('Logout failed');
      const MockClient = EtapiClient as any;
      MockClient.mockLogout.mockRejectedValue(error);

      registerAuthCommands(mockYargs as unknown as Argv);
      const handler = commandHandlers.get('logout')!;

      await handler({});

      expect(handleError).toHaveBeenCalledWith(error);
    });
  });

  describe('command registration', () => {
    it('demands at least one subcommand', () => {
      registerAuthCommands(mockYargs as unknown as Argv);

      expect(mockYargs.demandCommand).toHaveBeenCalledWith(
        1,
        expect.stringContaining('subcommand')
      );
    });
  });
});
