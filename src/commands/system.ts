import type { Argv } from "yargs";
import { getClient, type CliGlobalArgs } from "../config.js";
import { formatOutput, type OutputFormat } from "../output.js";
import { handleError } from "../errors.js";

export function registerSystemCommands(yargs: Argv) {
    return yargs
        .command(
            "info",
            "Show Trilium server information",
            (y) => y,
            async (argv) => {
                try {
                    const client = getClient(argv as CliGlobalArgs);
                    const result = await client.getAppInfo();
                    formatOutput((argv.format ?? "json") as OutputFormat, result);
                } catch (e) {
                    handleError(e);
                }
            }
        )
        .command(
            "backup <name>",
            "Create a database backup",
            (y) =>
                y.positional("name", {
                    type: "string",
                    demandOption: true,
                    description: "Backup name (e.g. 'daily-2024-01-15')",
                }),
            async (argv) => {
                try {
                    const client = getClient(argv as CliGlobalArgs);
                    await client.createBackup(argv.name as string);
                    formatOutput((argv.format ?? "json") as OutputFormat, { success: true });
                } catch (e) {
                    handleError(e);
                }
            }
        )
        .demandCommand(1, "Please specify a system subcommand");
}
