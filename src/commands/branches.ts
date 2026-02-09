import type { Argv } from "yargs";
import { getClient, type CliGlobalArgs } from "../config.js";
import { formatOutput, type OutputFormat } from "../output.js";
import { handleError } from "../errors.js";

export function registerBranchesCommands(yargs: Argv) {
    return yargs
        .command(
            "get <branchId>",
            "Get a branch by ID",
            (y) =>
                y.positional("branchId", {
                    type: "string",
                    demandOption: true,
                    description: "Branch ID",
                }),
            async (argv) => {
                try {
                    const client = getClient(argv as CliGlobalArgs);
                    const result = await client.getBranch(argv.branchId as string);
                    formatOutput((argv.format ?? "json") as OutputFormat, result);
                } catch (e) {
                    handleError(e);
                }
            }
        )
        .command(
            "create",
            "Create a new branch",
            (y) =>
                y
                    .option("note", {
                        type: "string",
                        demandOption: true,
                        description: "Note ID to place in the branch",
                    })
                    .option("parent", {
                        type: "string",
                        demandOption: true,
                        description: "Parent note ID",
                    })
                    .option("prefix", {
                        type: "string",
                        description: "Branch prefix",
                    })
                    .option("position", {
                        type: "number",
                        description: "Note position within the parent",
                    })
                    .option("expanded", {
                        type: "boolean",
                        description: "Whether the branch is expanded in the tree",
                    }),
            async (argv) => {
                try {
                    const client = getClient(argv as CliGlobalArgs);
                    const result = await client.createBranch({
                        noteId: argv.note as string,
                        parentNoteId: argv.parent as string,
                        prefix: argv.prefix as string | undefined,
                        notePosition: argv.position as number | undefined,
                        isExpanded: argv.expanded as boolean | undefined,
                    });
                    formatOutput((argv.format ?? "json") as OutputFormat, result);
                } catch (e) {
                    handleError(e);
                }
            }
        )
        .command(
            "patch <branchId>",
            "Update an existing branch",
            (y) =>
                y
                    .positional("branchId", {
                        type: "string",
                        demandOption: true,
                        description: "Branch ID to update",
                    })
                    .option("prefix", {
                        type: "string",
                        description: "Branch prefix",
                    })
                    .option("position", {
                        type: "number",
                        description: "Note position within the parent",
                    })
                    .option("expanded", {
                        type: "boolean",
                        description: "Whether the branch is expanded in the tree",
                    }),
            async (argv) => {
                try {
                    const client = getClient(argv as CliGlobalArgs);
                    const result = await client.patchBranch(argv.branchId as string, {
                        prefix: argv.prefix as string | undefined,
                        notePosition: argv.position as number | undefined,
                        isExpanded: argv.expanded as boolean | undefined,
                    });
                    formatOutput((argv.format ?? "json") as OutputFormat, result);
                } catch (e) {
                    handleError(e);
                }
            }
        )
        .command(
            "delete <branchId>",
            "Delete a branch",
            (y) =>
                y.positional("branchId", {
                    type: "string",
                    demandOption: true,
                    description: "Branch ID to delete",
                }),
            async (argv) => {
                try {
                    const client = getClient(argv as CliGlobalArgs);
                    await client.deleteBranch(argv.branchId as string);
                    formatOutput((argv.format ?? "json") as OutputFormat, { success: true });
                } catch (e) {
                    handleError(e);
                }
            }
        )
        .command(
            "refresh-ordering <parentNoteId>",
            "Refresh note ordering for a parent note",
            (y) =>
                y.positional("parentNoteId", {
                    type: "string",
                    demandOption: true,
                    description: "Parent note ID to refresh ordering for",
                }),
            async (argv) => {
                try {
                    const client = getClient(argv as CliGlobalArgs);
                    await client.refreshNoteOrdering(argv.parentNoteId as string);
                    formatOutput((argv.format ?? "json") as OutputFormat, { success: true });
                } catch (e) {
                    handleError(e);
                }
            }
        )
        .demandCommand(1, "Please specify a branches subcommand");
}
