import type { Argv } from "yargs";
import { type CliGlobalArgs, resolveConfig, saveConfig } from "../config.js";
import { handleError } from "../errors.js";
import { EtapiClient } from "../client/index.js";
import { createInterface } from "node:readline";

const DEFAULT_SERVER_URL = "http://localhost:37740";

/**
 * Prompt the user for input on stdin/stdout. Returns the entered string.
 * The prompt text is written to stdout and the response is read from stdin.
 */
function prompt(question: string): Promise<string> {
    const rl = createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise<string>((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer);
        });
    });
}

export function registerAuthCommands(yargs: Argv) {
    return yargs
        .command(
            "login",
            "Log in to a Trilium server and save the auth token",
            (y) => y,
            async (argv) => {
                try {
                    // Resolve the server URL without requiring an existing token.
                    // resolveConfig() throws when no token is available, so we
                    // determine the server URL manually using the same precedence.
                    const serverUrl =
                        (argv as CliGlobalArgs).server ||
                        process.env.TRILIUM_URL ||
                        DEFAULT_SERVER_URL;

                    const password = await prompt("Password: ");

                    const result = await EtapiClient.login(serverUrl, password);

                    saveConfig({ serverUrl, authToken: result.authToken });

                    console.log(
                        `Login successful. Auth token saved for ${serverUrl}.`
                    );
                } catch (e) {
                    handleError(e);
                }
            }
        )
        .command(
            "logout",
            "Log out and invalidate the current auth token",
            (y) => y,
            async (argv) => {
                try {
                    const { serverUrl, authToken } = resolveConfig(
                        argv as CliGlobalArgs
                    );
                    const client = new EtapiClient(serverUrl, authToken);
                    await client.logout();
                    saveConfig({ serverUrl, authToken: "" });

                    console.log("Logged out successfully.");
                } catch (e) {
                    handleError(e);
                }
            }
        )
        .demandCommand(1, "Please specify an auth subcommand");
}
