import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { EtapiClient } from "./client/index.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Global argv shape produced by yargs for flags shared across all commands. */
export interface CliGlobalArgs {
  server?: string;
  token?: string;
  format?: string;
}

/** Persisted configuration stored in the config file. */
interface ConfigFile {
  serverUrl: string;
  authToken: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_SERVER_URL = "http://localhost:37740";

const CONFIG_DIR = path.join(os.homedir(), ".config", "triliumnext-cli");
const CONFIG_PATH_PRIMARY = path.join(CONFIG_DIR, "config.json");
const CONFIG_PATH_LEGACY = path.join(os.homedir(), ".trilium-cli.json");

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Attempt to read and parse a JSON config file at the given path.
 * Returns `undefined` when the file does not exist or cannot be parsed.
 */
function readConfigFile(filePath: string): ConfigFile | undefined {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw) as Partial<ConfigFile>;

    // Only return if the file contained at least one useful key.
    if (parsed.serverUrl || parsed.authToken) {
      return {
        serverUrl: parsed.serverUrl ?? "",
        authToken: parsed.authToken ?? "",
      };
    }
    return undefined;
  } catch {
    // File missing or malformed -- not an error, just no config from this source.
    return undefined;
  }
}

/**
 * Load the first available config file using the priority order:
 *   1. ~/.config/triliumnext-cli/config.json
 *   2. ~/.trilium-cli.json
 */
function loadConfigFile(): ConfigFile | undefined {
  return readConfigFile(CONFIG_PATH_PRIMARY) ?? readConfigFile(CONFIG_PATH_LEGACY);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Resolve the effective configuration by merging the three tiers
 * (highest precedence first):
 *
 *   1. CLI flags (`--server`, `--token`)
 *   2. Environment variables (`TRILIUM_URL`, `TRILIUM_TOKEN`)
 *   3. Config file (`~/.config/triliumnext-cli/config.json` or `~/.trilium-cli.json`)
 *
 * The server URL falls back to `http://localhost:37740` when no source
 * provides a value. If the auth token cannot be resolved from any source an
 * error is thrown so the caller receives a clear diagnostic.
 */
export function resolveConfig(argv: CliGlobalArgs): {
  serverUrl: string;
  authToken: string;
} {
  const fileConfig = loadConfigFile();

  // --- serverUrl (flag > env > file > default) ---
  const serverUrl =
    argv.server ||
    process.env.TRILIUM_URL ||
    fileConfig?.serverUrl ||
    DEFAULT_SERVER_URL;

  // --- authToken (flag > env > file) ---
  // Check each source explicitly to allow empty string tokens (for no-auth mode)
  let authToken: string | undefined;
  if (argv.token !== undefined) {
    authToken = argv.token;
  } else if (process.env.TRILIUM_TOKEN !== undefined) {
    authToken = process.env.TRILIUM_TOKEN;
  } else if (fileConfig?.authToken !== undefined) {
    authToken = fileConfig.authToken;
  }

  // Only throw error if token is completely missing (not just empty)
  if (authToken === undefined) {
    throw new Error(
      "Cannot resolve auth token. " +
        "Provide it via --token, the TRILIUM_TOKEN environment variable, or a config file " +
        `(${CONFIG_PATH_PRIMARY}). Use --token=\"\" for no-auth mode.`
    );
  }

  return { serverUrl, authToken };
}

/**
 * Persist the given configuration to `~/.config/triliumnext-cli/config.json`,
 * creating the directory tree when it does not already exist.
 */
export function saveConfig(config: { serverUrl: string; authToken: string }): void {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });

  const payload: ConfigFile = {
    serverUrl: config.serverUrl,
    authToken: config.authToken,
  };

  fs.writeFileSync(CONFIG_PATH_PRIMARY, JSON.stringify(payload, null, 2) + "\n", "utf-8");
}

/**
 * Convenience wrapper that resolves configuration from all tiers and returns a
 * ready-to-use {@link EtapiClient}.
 */
export function getClient(argv: CliGlobalArgs): EtapiClient {
  const { serverUrl, authToken } = resolveConfig(argv);
  return new EtapiClient(serverUrl, authToken);
}
