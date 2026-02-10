import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI_PATH = path.resolve(__dirname, '../../../dist/main.js');

export interface CliOptions {
  stdin?: string | Buffer;
  env?: Record<string, string>;
  timeout?: number;
}

export interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Run the CLI as a subprocess and capture output
 */
export async function runCli(args: string[], options: CliOptions = {}): Promise<CliResult> {
  const { stdin, env, timeout = 30000 } = options;

  return new Promise((resolve, reject) => {
    const child = spawn('node', [CLI_PATH, ...args], {
      env: { ...process.env, ...env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
      reject(new Error(`CLI command timed out after ${timeout}ms`));
    }, timeout);

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (exitCode) => {
      clearTimeout(timer);
      if (!timedOut) {
        resolve({
          stdout,
          stderr,
          exitCode: exitCode ?? 0,
        });
      }
    });

    child.on('error', (error) => {
      clearTimeout(timer);
      if (!timedOut) {
        reject(error);
      }
    });

    // Write stdin if provided
    if (stdin) {
      child.stdin.write(stdin);
      child.stdin.end();
    } else {
      child.stdin.end();
    }
  });
}

/**
 * Run CLI and expect success (exit code 0)
 */
export async function runCliSuccess(args: string[], options: CliOptions = {}): Promise<CliResult> {
  const result = await runCli(args, options);
  if (result.exitCode !== 0) {
    throw new Error(
      `CLI command failed with exit code ${result.exitCode}\n` +
      `stdout: ${result.stdout}\n` +
      `stderr: ${result.stderr}`
    );
  }
  return result;
}

/**
 * Run CLI and expect failure (non-zero exit code)
 */
export async function runCliFailure(args: string[], options: CliOptions = {}): Promise<CliResult> {
  const result = await runCli(args, options);
  if (result.exitCode === 0) {
    throw new Error(
      `CLI command succeeded but was expected to fail\n` +
      `stdout: ${result.stdout}\n` +
      `stderr: ${result.stderr}`
    );
  }
  return result;
}

/**
 * Parse JSON from CLI output
 */
export function parseJsonOutput<T = unknown>(output: string): T {
  try {
    return JSON.parse(output) as T;
  } catch (error) {
    throw new Error(
      `Failed to parse CLI output as JSON: ${error instanceof Error ? error.message : String(error)}\n` +
      `Output: ${output}`
    );
  }
}
