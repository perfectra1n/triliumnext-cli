import { describe, it, expect } from 'vitest';
import { setupTriliumTests, createTestClient, getTriliumConfig } from '../setup.js';
import { runCliSuccess, parseJsonOutput } from '../helpers/cli-runner.js';

// Setup Trilium container for all tests in this file
setupTriliumTests();

describe('System commands integration', () => {
  describe('app-info', () => {
    it('retrieves app info via API client', async () => {
      const client = createTestClient();
      const appInfo = await client.getAppInfo();

      expect(appInfo).toBeDefined();
      expect(appInfo).toHaveProperty('appVersion');
      expect(appInfo).toHaveProperty('dbVersion');
      expect(typeof appInfo.appVersion).toBe('string');
    });

    it('retrieves app info via CLI', async () => {
      const config = getTriliumConfig();
      const result = await runCliSuccess(
        ['app-info', '--format', 'json'],
        {
          env: {
            TRILIUM_URL: config.url,
            TRILIUM_TOKEN: config.token,
          },
        }
      );

      const appInfo = parseJsonOutput(result.stdout);
      expect(appInfo).toHaveProperty('appVersion');
      expect(appInfo).toHaveProperty('dbVersion');
    });

    it('displays app info in table format', async () => {
      const config = getTriliumConfig();
      const result = await runCliSuccess(
        ['app-info', '--format', 'table'],
        {
          env: {
            TRILIUM_URL: config.url,
            TRILIUM_TOKEN: config.token,
          },
        }
      );

      // Table format should contain the app version somewhere
      expect(result.stdout).toContain('appVersion');
    });
  });

  describe('backup', () => {
    it('creates a backup via API client', async () => {
      const client = createTestClient();
      const backupName = `test-backup-${Date.now()}`;

      // Should not throw
      await expect(client.createBackup(backupName)).resolves.toBeUndefined();
    });

    it('creates a backup via CLI', async () => {
      const config = getTriliumConfig();
      const backupName = `cli-test-backup-${Date.now()}`;

      const result = await runCliSuccess(
        ['backup', backupName],
        {
          env: {
            TRILIUM_URL: config.url,
            TRILIUM_TOKEN: config.token,
          },
        }
      );

      // Should complete successfully with exit code 0
      expect(result.exitCode).toBe(0);
    });
  });
});
