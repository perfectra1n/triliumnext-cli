import * as fs from 'fs';
import * as path from 'path';
import { EtapiClient } from '../../src/client/index.js';

const STATE_FILE = path.join(__dirname, '.trilium-test-state.json');

interface TriliumTestState {
  url: string;
  token: string;
}

/**
 * Read Trilium state from global setup
 */
function readTestState(): TriliumTestState {
  if (!fs.existsSync(STATE_FILE)) {
    throw new Error(
      'Trilium test state not found. Make sure globalSetup is configured in vitest.integration.config.ts'
    );
  }

  const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8')) as TriliumTestState;
  return state;
}

/**
 * Create an EtapiClient configured for the test instance
 */
export function createTestClient(): EtapiClient {
  const { url, token } = readTestState();
  return new EtapiClient(url, token);
}

/**
 * Get Trilium configuration for CLI tests
 */
export function getTriliumConfig(): { url: string; token: string } {
  return readTestState();
}

/**
 * Setup hooks for integration tests
 * This is now a no-op since the container is managed by global setup
 * But we keep it for backwards compatibility with existing test files
 */
export function setupTriliumTests(): void {
  // No-op: Container managed by global setup
}
