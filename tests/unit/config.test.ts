import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// Mock modules before importing the module under test
vi.mock('node:fs');
vi.mock('node:os', () => ({
  default: {
    homedir: vi.fn(() => '/home/testuser'),
  },
}));

import { resolveConfig, saveConfig, getClient } from '../../src/config.js';

describe('config', () => {
  const mockHomeDir = '/home/testuser';
  const primaryConfigPath = path.join(mockHomeDir, '.config', 'triliumnext-cli', 'config.json');
  const legacyConfigPath = path.join(mockHomeDir, '.trilium-cli.json');

  beforeEach(() => {
    // Reset to default mock implementation
    vi.mocked(os.homedir).mockReturnValue(mockHomeDir);
    vi.mocked(fs.readFileSync).mockImplementation(() => {
      throw new Error('ENOENT: no such file or directory');
    });
    // Clear environment variables
    delete process.env.TRILIUM_URL;
    delete process.env.TRILIUM_TOKEN;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('resolveConfig', () => {
    it('returns default server URL and throws when no token is provided', () => {
      expect(() => resolveConfig({})).toThrow(/Cannot resolve auth token/);
    });

    it('uses CLI flags with highest priority', () => {
      const config = resolveConfig({
        server: 'http://cli-server:8080',
        token: 'cli-token',
      });

      expect(config).toEqual({
        serverUrl: 'http://cli-server:8080',
        authToken: 'cli-token',
      });
    });

    it('falls back to environment variables when CLI flags are not provided', () => {
      process.env.TRILIUM_URL = 'http://env-server:8080';
      process.env.TRILIUM_TOKEN = 'env-token';

      const config = resolveConfig({});

      expect(config).toEqual({
        serverUrl: 'http://env-server:8080',
        authToken: 'env-token',
      });
    });

    it('CLI flags override environment variables', () => {
      process.env.TRILIUM_URL = 'http://env-server:8080';
      process.env.TRILIUM_TOKEN = 'env-token';

      const config = resolveConfig({
        server: 'http://cli-server:8080',
        token: 'cli-token',
      });

      expect(config).toEqual({
        serverUrl: 'http://cli-server:8080',
        authToken: 'cli-token',
      });
    });

    it('reads from primary config file when it exists', () => {
      vi.mocked(fs.readFileSync).mockImplementation((filePath) => {
        if (filePath === primaryConfigPath) {
          return JSON.stringify({
            serverUrl: 'http://file-server:8080',
            authToken: 'file-token',
          });
        }
        throw new Error('ENOENT');
      });

      const config = resolveConfig({});

      expect(config).toEqual({
        serverUrl: 'http://file-server:8080',
        authToken: 'file-token',
      });
    });

    it('falls back to legacy config file when primary does not exist', () => {
      vi.mocked(fs.readFileSync).mockImplementation((filePath) => {
        if (filePath === legacyConfigPath) {
          return JSON.stringify({
            serverUrl: 'http://legacy-server:8080',
            authToken: 'legacy-token',
          });
        }
        throw new Error('ENOENT');
      });

      const config = resolveConfig({});

      expect(config).toEqual({
        serverUrl: 'http://legacy-server:8080',
        authToken: 'legacy-token',
      });
    });

    it('environment variables override config file', () => {
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({
          serverUrl: 'http://file-server:8080',
          authToken: 'file-token',
        })
      );

      process.env.TRILIUM_URL = 'http://env-server:8080';
      process.env.TRILIUM_TOKEN = 'env-token';

      const config = resolveConfig({});

      expect(config).toEqual({
        serverUrl: 'http://env-server:8080',
        authToken: 'env-token',
      });
    });

    it('uses default server URL when no source provides one', () => {
      process.env.TRILIUM_TOKEN = 'token';

      const config = resolveConfig({});

      expect(config.serverUrl).toBe('http://localhost:37740');
      expect(config.authToken).toBe('token');
    });

    it('handles malformed JSON in config file gracefully', () => {
      vi.mocked(fs.readFileSync).mockReturnValue('{ invalid json');

      process.env.TRILIUM_TOKEN = 'env-token';

      const config = resolveConfig({});

      // Should fall back to env vars and default
      expect(config).toEqual({
        serverUrl: 'http://localhost:37740',
        authToken: 'env-token',
      });
    });

    it('ignores config file with empty values', () => {
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({
          serverUrl: '',
          authToken: '',
        })
      );

      expect(() => resolveConfig({})).toThrow(/Cannot resolve auth token/);
    });

    it('throws error with helpful message when no token is available', () => {
      expect(() => resolveConfig({})).toThrow(
        /Cannot resolve auth token.*--token.*TRILIUM_TOKEN.*config file/
      );
    });
  });

  describe('saveConfig', () => {
    beforeEach(() => {
      vi.mocked(fs.mkdirSync).mockReturnValue(undefined);
      vi.mocked(fs.writeFileSync).mockReturnValue(undefined);
    });

    it('creates config directory if it does not exist', () => {
      saveConfig({
        serverUrl: 'http://test-server:8080',
        authToken: 'test-token',
      });

      expect(fs.mkdirSync).toHaveBeenCalledWith(
        path.join(mockHomeDir, '.config', 'triliumnext-cli'),
        { recursive: true }
      );
    });

    it('writes config to primary config path', () => {
      saveConfig({
        serverUrl: 'http://test-server:8080',
        authToken: 'test-token',
      });

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        primaryConfigPath,
        expect.stringContaining('"serverUrl": "http://test-server:8080"'),
        'utf-8'
      );
    });

    it('formats JSON with 2-space indentation', () => {
      saveConfig({
        serverUrl: 'http://test-server:8080',
        authToken: 'test-token',
      });

      const writtenContent = vi.mocked(fs.writeFileSync).mock.calls[0][1] as string;
      expect(writtenContent).toContain('{\n  "serverUrl"');
    });

    it('adds trailing newline to JSON', () => {
      saveConfig({
        serverUrl: 'http://test-server:8080',
        authToken: 'test-token',
      });

      const writtenContent = vi.mocked(fs.writeFileSync).mock.calls[0][1] as string;
      expect(writtenContent).toMatch(/}\n$/);
    });
  });

  describe('getClient', () => {
    it('returns EtapiClient with resolved config', () => {
      const client = getClient({
        server: 'http://test-server:8080',
        token: 'test-token',
      });

      expect(client).toBeDefined();
      expect(client).toHaveProperty('getNote');
      expect(client).toHaveProperty('createNote');
    });

    it('throws when token cannot be resolved', () => {
      expect(() => getClient({})).toThrow(/Cannot resolve auth token/);
    });
  });
});
