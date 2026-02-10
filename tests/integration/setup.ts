import { beforeAll, afterAll } from 'vitest';
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';
import { EtapiClient } from '../../src/client/index.js';

let container: StartedTestContainer | null = null;
let triliumUrl: string;
let triliumToken: string;

/**
 * Start Trilium container or connect to external instance
 * Call this in beforeAll() hook
 */
export async function startTriliumContainer(): Promise<void> {
  // Allow using external Trilium instance via env var
  const externalUrl = process.env.TRILIUM_URL;

  if (externalUrl) {
    console.log(`Using external Trilium instance at ${externalUrl}`);
    triliumUrl = externalUrl;
    triliumToken = process.env.TRILIUM_TOKEN || 'secret';

    // Verify external instance is reachable
    const client = new EtapiClient(triliumUrl, triliumToken);
    try {
      await client.getAppInfo();
      console.log('External Trilium instance is reachable');
    } catch (error) {
      throw new Error(
        `Cannot reach external Trilium at ${externalUrl}. Error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
    return;
  }

  // Start Docker container
  console.log('Starting Trilium Docker container...');

  container = await new GenericContainer('triliumnext/notes:latest')
    .withExposedPorts(8080)
    .withEnvironment({
      TRILIUM_DATA_DIR: '/home/node/trilium-data',
      // Use no password for testing
      TRILIUM_NO_PASSWORD: '1',
    })
    .withWaitStrategy(
      Wait.forLogMessage(/HTTP server starting up at port/)
        .withStartupTimeout(120_000) // 2 minutes for initial DB setup
    )
    .start();

  const port = container.getMappedPort(8080);
  triliumUrl = `http://localhost:${port}`;

  // Default token for no-password mode is typically 'secret' or empty
  // We need to discover the actual token by checking the startup
  triliumToken = 'secret';

  console.log(`Trilium started at ${triliumUrl}`);

  // Wait a bit for full initialization
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Verify we can connect
  const client = new EtapiClient(triliumUrl, triliumToken);
  try {
    const appInfo = await client.getAppInfo();
    console.log(`Connected to Trilium version ${appInfo.appVersion}`);
  } catch (error) {
    throw new Error(
      `Container started but cannot connect via ETAPI. Error: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Stop Trilium container
 * Call this in afterAll() hook
 */
export async function stopTriliumContainer(): Promise<void> {
  if (container) {
    console.log('Stopping Trilium container...');
    await container.stop();
    container = null;
  }
}

/**
 * Create an EtapiClient configured for the test instance
 */
export function createTestClient(): EtapiClient {
  if (!triliumUrl || !triliumToken) {
    throw new Error('Trilium container not started. Call startTriliumContainer() first.');
  }
  return new EtapiClient(triliumUrl, triliumToken);
}

/**
 * Get Trilium configuration for CLI tests
 */
export function getTriliumConfig(): { url: string; token: string } {
  if (!triliumUrl || !triliumToken) {
    throw new Error('Trilium container not started. Call startTriliumContainer() first.');
  }
  return { url: triliumUrl, token: triliumToken };
}

/**
 * Setup hooks for integration tests
 * Import and call this in test files that need Trilium
 */
export function setupTriliumTests(): void {
  beforeAll(async () => {
    await startTriliumContainer();
  }, 120_000); // 2 minutes timeout

  afterAll(async () => {
    await stopTriliumContainer();
  });
}
