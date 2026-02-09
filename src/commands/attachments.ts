import type { Argv } from "yargs";
import { readFileSync } from "node:fs";
import { getClient, type CliGlobalArgs } from "../config.js";
import { formatOutput, outputBinary, type OutputFormat } from "../output.js";
import { handleError } from "../errors.js";
import { readStdin } from "../stdin.js";

export function registerAttachmentsCommands(yargs: Argv) {
    return yargs
        .command(
            "list <noteId>",
            "List attachments for a note",
            (y) =>
                y.positional("noteId", {
                    type: "string",
                    demandOption: true,
                    description: "ID of the note to list attachments for",
                }),
            async (argv) => {
                try {
                    const client = getClient(argv as CliGlobalArgs);
                    const result = await client.getNoteAttachments(argv.noteId as string);
                    formatOutput((argv.format ?? "json") as OutputFormat, result);
                } catch (e) {
                    handleError(e);
                }
            },
        )
        .command(
            "get <attachmentId>",
            "Get an attachment by ID",
            (y) =>
                y.positional("attachmentId", {
                    type: "string",
                    demandOption: true,
                    description: "ID of the attachment",
                }),
            async (argv) => {
                try {
                    const client = getClient(argv as CliGlobalArgs);
                    const result = await client.getAttachment(argv.attachmentId as string);
                    formatOutput((argv.format ?? "json") as OutputFormat, result);
                } catch (e) {
                    handleError(e);
                }
            },
        )
        .command(
            "create",
            "Create a new attachment",
            (y) =>
                y
                    .option("owner", {
                        type: "string",
                        demandOption: true,
                        description: "Owner note ID",
                    })
                    .option("role", {
                        type: "string",
                        demandOption: true,
                        description: "Attachment role (e.g. 'file', 'image')",
                    })
                    .option("mime", {
                        type: "string",
                        demandOption: true,
                        description: "MIME type (e.g. 'image/png', 'application/pdf')",
                    })
                    .option("title", {
                        type: "string",
                        demandOption: true,
                        description: "Title / filename of the attachment",
                    })
                    .option("content", {
                        type: "string",
                        description: "Content as a string",
                    })
                    .option("file", {
                        type: "string",
                        description: "Path to a file to read as content",
                    })
                    .option("position", {
                        type: "number",
                        description: "Position for ordering",
                    })
                    .check((a) => {
                        if (a.content && a.file) {
                            throw new Error("Provide only one of --content or --file, not both.");
                        }
                        return true;
                    }),
            async (argv) => {
                try {
                    let contentValue: string;
                    if (argv.file) {
                        contentValue = readFileSync(argv.file as string, "utf-8");
                    } else if (argv.content !== undefined) {
                        contentValue = argv.content as string;
                    } else {
                        const stdinData = await readStdin();
                        if (stdinData !== null) {
                            contentValue = stdinData.toString("utf-8");
                        } else {
                            throw new Error("Provide --content, --file, or pipe data via stdin");
                        }
                    }

                    const client = getClient(argv as CliGlobalArgs);
                    const result = await client.createAttachment({
                        ownerId: argv.owner as string,
                        role: argv.role as string,
                        mime: argv.mime as string,
                        title: argv.title as string,
                        content: contentValue,
                        ...(argv.position != null ? { position: argv.position as number } : {}),
                    });
                    formatOutput((argv.format ?? "json") as OutputFormat, result);
                } catch (e) {
                    handleError(e);
                }
            },
        )
        .command(
            "patch <attachmentId>",
            "Update attachment metadata",
            (y) =>
                y
                    .positional("attachmentId", {
                        type: "string",
                        demandOption: true,
                        description: "ID of the attachment to update",
                    })
                    .option("role", {
                        type: "string",
                        description: "New role",
                    })
                    .option("mime", {
                        type: "string",
                        description: "New MIME type",
                    })
                    .option("title", {
                        type: "string",
                        description: "New title",
                    })
                    .option("position", {
                        type: "number",
                        description: "New position",
                    }),
            async (argv) => {
                try {
                    const params: Record<string, string | number> = {};
                    if (argv.role != null) params.role = argv.role as string;
                    if (argv.mime != null) params.mime = argv.mime as string;
                    if (argv.title != null) params.title = argv.title as string;
                    if (argv.position != null) params.position = argv.position as number;

                    const client = getClient(argv as CliGlobalArgs);
                    const result = await client.patchAttachment(argv.attachmentId as string, params);
                    formatOutput((argv.format ?? "json") as OutputFormat, result);
                } catch (e) {
                    handleError(e);
                }
            },
        )
        .command(
            "delete <attachmentId>",
            "Delete an attachment",
            (y) =>
                y.positional("attachmentId", {
                    type: "string",
                    demandOption: true,
                    description: "ID of the attachment to delete",
                }),
            async (argv) => {
                try {
                    const client = getClient(argv as CliGlobalArgs);
                    await client.deleteAttachment(argv.attachmentId as string);
                    formatOutput((argv.format ?? "json") as OutputFormat, { success: true });
                } catch (e) {
                    handleError(e);
                }
            },
        )
        .command(
            "get-content <attachmentId>",
            "Get the binary content of an attachment",
            (y) =>
                y
                    .positional("attachmentId", {
                        type: "string",
                        demandOption: true,
                        description: "ID of the attachment",
                    })
                    .option("output", {
                        alias: "o",
                        type: "string",
                        description: "File path to write the content to",
                    }),
            async (argv) => {
                try {
                    const client = getClient(argv as CliGlobalArgs);
                    const data = await client.getAttachmentContent(argv.attachmentId as string);
                    outputBinary(data, argv.output as string | undefined);
                } catch (e) {
                    handleError(e);
                }
            },
        )
        .command(
            "set-content <attachmentId>",
            "Set the content of an attachment",
            (y) =>
                y
                    .positional("attachmentId", {
                        type: "string",
                        demandOption: true,
                        description: "ID of the attachment",
                    })
                    .option("content", {
                        type: "string",
                        description: "Content as a string",
                    })
                    .option("file", {
                        type: "string",
                        description: "Path to a file to read as content",
                    })
                    .check((a) => {
                        if (a.content && a.file) {
                            throw new Error("Provide only one of --content or --file, not both.");
                        }
                        return true;
                    }),
            async (argv) => {
                try {
                    let contentValue: Buffer;
                    if (argv.file) {
                        contentValue = readFileSync(argv.file as string);
                    } else if (argv.content !== undefined) {
                        contentValue = Buffer.from(argv.content as string, "utf-8");
                    } else {
                        const stdinData = await readStdin();
                        if (stdinData !== null) {
                            contentValue = stdinData;
                        } else {
                            throw new Error("Provide --content, --file, or pipe data via stdin");
                        }
                    }

                    const client = getClient(argv as CliGlobalArgs);
                    await client.putAttachmentContent(argv.attachmentId as string, contentValue);
                    formatOutput((argv.format ?? "json") as OutputFormat, { success: true });
                } catch (e) {
                    handleError(e);
                }
            },
        )
        .demandCommand(1, "Please specify an attachments subcommand");
}
