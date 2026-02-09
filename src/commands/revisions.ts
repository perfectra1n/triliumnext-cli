import type { Argv } from "yargs";
import { getClient, type CliGlobalArgs } from "../config.js";
import { formatOutput, outputBinary, type OutputFormat } from "../output.js";
import { handleError } from "../errors.js";

export function registerRevisionsCommands(yargs: Argv) {
    return yargs
        .command(
            "list <noteId>",
            "List all revisions for a note",
            (y) =>
                y.positional("noteId", {
                    type: "string",
                    demandOption: true,
                    description: "ID of the note to list revisions for",
                }),
            async (argv) => {
                try {
                    const client = getClient(argv as CliGlobalArgs);
                    const result = await client.getNoteRevisions(argv.noteId as string);
                    formatOutput((argv.format ?? "json") as OutputFormat, result);
                } catch (e) {
                    handleError(e);
                }
            }
        )
        .command(
            "get <revisionId>",
            "Get metadata for a specific revision",
            (y) =>
                y.positional("revisionId", {
                    type: "string",
                    demandOption: true,
                    description: "ID of the revision to retrieve",
                }),
            async (argv) => {
                try {
                    const client = getClient(argv as CliGlobalArgs);
                    const result = await client.getRevision(argv.revisionId as string);
                    formatOutput((argv.format ?? "json") as OutputFormat, result);
                } catch (e) {
                    handleError(e);
                }
            }
        )
        .command(
            "content <revisionId>",
            "Download revision content",
            (y) =>
                y
                    .positional("revisionId", {
                        type: "string",
                        demandOption: true,
                        description: "ID of the revision to download content from",
                    })
                    .option("output", {
                        alias: "o",
                        type: "string",
                        description: "File path to write the content to (stdout if omitted)",
                    }),
            async (argv) => {
                try {
                    const client = getClient(argv as CliGlobalArgs);
                    const data = await client.getRevisionContent(argv.revisionId as string);
                    outputBinary(data, argv.output as string | undefined);
                } catch (e) {
                    handleError(e);
                }
            }
        )
        .demandCommand(1, "Please specify a revisions subcommand");
}
