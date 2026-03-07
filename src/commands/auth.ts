import type { Argv } from "yargs";
import { type CliGlobalArgs, resolveConfig, saveConfig } from "../config.js";
import { handleError } from "../errors.js";
import { EtapiClient } from "../client/index.js";
import { read } from "read";

const DEFAULT_SERVER_URL = "http://localhost:37740";

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
                    let serverUrl =
                        (argv as CliGlobalArgs).server ||
                        process.env.TRILIUM_URL ||
                        "";

                    if (!serverUrl) {
                        serverUrl = (await read({ prompt: `Server URL [${DEFAULT_SERVER_URL}]: ` })).trim() || DEFAULT_SERVER_URL;
                    }

                    const password = await read({ prompt: "Password: ", replace: "*" });

                    const result = await EtapiClient.login(serverUrl, password);

                    saveConfig({ serverUrl: result.resolvedBaseUrl, authToken: result.authToken });

                    console.log(
                        `Login successful. Auth token saved for ${result.resolvedBaseUrl}.`
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
