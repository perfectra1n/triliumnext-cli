import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';
import * as fs from 'fs';
import * as path from 'path';

const STATE_FILE = path.join(__dirname, '.trilium-test-state.json');

/**
 * Initialize Trilium database
 */
async function initializeTriliumDatabase(baseUrl: string): Promise<void> {
  const setupUrl = `${baseUrl}/api/setup/new-document`;

  try {
    const response = await fetch(setupUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    if (response.ok) {
      console.log('Trilium database initialized');
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return;
    }

    const text = await response.text();
    console.log(`Database setup response (${response.status}): ${text}`);
  } catch (error) {
    console.log('Database setup request error:', error);
  }
}

/**
 * Global setup - starts container once for all tests
 */
export async function setup(): Promise<() => Promise<void>> {
  // Check if using external Trilium
  if (process.env.TRILIUM_URL) {
    const triliumUrl = process.env.TRILIUM_URL;
    const triliumToken = process.env.TRILIUM_TOKEN || '';

    console.log(`Using external Trilium instance at ${triliumUrl}`);

    // Save state for tests to use
    fs.writeFileSync(
      STATE_FILE,
      JSON.stringify({
        url: triliumUrl,
        token: triliumToken,
      })
    );

    // No teardown needed for external instance
    return async () => {
      fs.unlinkSync(STATE_FILE);
    };
  }

  // Start Docker container
  console.log('Starting Trilium Docker container for all tests...');

  const container = await new GenericContainer('triliumnext/trilium:latest')
    .withExposedPorts(8080)
    .withEnvironment({
      TRILIUM_DATA_DIR: '/home/node/trilium-data',
      TRILIUM_GENERAL_NOAUTHENTICATION: 'true',
    })
    .withWaitStrategy(
      Wait.forHttp('/api/app-info', 8080).forStatusCode(200).withStartupTimeout(120_000)
    )
    .start();

  const host = container.getHost();
  const port = container.getMappedPort(8080);
  const baseUrl = `http://${host}:${port}`;
  const triliumUrl = `${baseUrl}/etapi`;
  const triliumToken = '';

  console.log(`Trilium started at ${triliumUrl}`);

  // Initialize database
  await initializeTriliumDatabase(baseUrl);

  // Save state for tests to use
  fs.writeFileSync(
    STATE_FILE,
    JSON.stringify({
      url: triliumUrl,
      token: triliumToken,
      containerId: container.getId(),
    })
  );

  console.log('Global setup complete');

  // Return teardown function
  return async () => {
    console.log('Stopping Trilium container...');
    await container.stop();
    fs.unlinkSync(STATE_FILE);
    console.log('Global teardown complete');
  };
}
