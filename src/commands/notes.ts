import type { Argv } from "yargs";
import { readFileSync } from "node:fs";
import { getClient, type CliGlobalArgs } from "../config.js";
import { formatOutput, outputBinary, type OutputFormat } from "../output.js";
import { handleError } from "../errors.js";
import { readStdin } from "../stdin.js";
import { convertToHtml } from "../utils/markdown.js";

export function registerNotesCommands(yargs: Argv) {
    return yargs
        // ── get ────────────────────────────────────────────────────
        .command(
            "get <noteId>",
            "Get a note by ID",
            (y) =>
                y.positional("noteId", {
                    type: "string",
                    demandOption: true,
                    description: "ID of the note to retrieve",
                }),
            async (argv) => {
                try {
                    const client = getClient(argv as CliGlobalArgs);
                    const result = await client.getNote(argv.noteId as string);
                    formatOutput((argv.format ?? "json") as OutputFormat, result);
                } catch (e) {
                    handleError(e);
                }
            },
        )

        // ── search ─────────────────────────────────────────────────
        .command(
            "search <query>",
            "Search notes",
            (y) =>
                y
                    .positional("query", {
                        type: "string",
                        demandOption: true,
                        description: "Search query string",
                    })
                    .option("fast-search", {
                        type: "boolean",
                        description: "Enable fast search (skips content search)",
                    })
                    .option("include-archived", {
                        type: "boolean",
                        description: "Include archived notes in results",
                    })
                    .option("ancestor", {
                        type: "string",
                        description: "Limit search to subtree of this note ID",
                    })
                    .option("ancestor-depth", {
                        type: "string",
                        description: "Depth of ancestor search",
                    })
                    .option("order-by", {
                        type: "string",
                        description: "Property to order results by",
                    })
                    .option("order-direction", {
                        type: "string",
                        choices: ["asc", "desc"] as const,
                        description: "Order direction (asc or desc)",
                    })
                    .option("limit", {
                        type: "number",
                        description: "Maximum number of results",
                    })
                    .option("debug", {
                        type: "boolean",
                        description: "Include debug info in response",
                    }),
            async (argv) => {
                try {
                    const client = getClient(argv as CliGlobalArgs);
                    const result = await client.searchNotes({
                        search: argv.query as string,
                        fastSearch: argv.fastSearch as boolean | undefined,
                        includeArchivedNotes: argv.includeArchived as boolean | undefined,
                        ancestorNoteId: argv.ancestor as string | undefined,
                        ancestorDepth: argv.ancestorDepth as string | undefined,
                        orderBy: argv.orderBy as string | undefined,
                        orderDirection: argv.orderDirection as "asc" | "desc" | undefined,
                        limit: argv.limit as number | undefined,
                        debug: argv.debug as boolean | undefined,
                    });
                    formatOutput((argv.format ?? "json") as OutputFormat, result);
                } catch (e) {
                    handleError(e);
                }
            },
        )

        // ── create ─────────────────────────────────────────────────
        .command(
            "create",
            "Create a new note",
            (y) =>
                y
                    .option("parent", {
                        type: "string",
                        demandOption: true,
                        description: "Parent note ID (parentNoteId)",
                    })
                    .option("title", {
                        type: "string",
                        demandOption: true,
                        description: "Title of the new note",
                    })
                    .option("type", {
                        type: "string",
                        demandOption: true,
                        description: "Note type (text, code, file, image, search, book, relationMap, render)",
                    })
                    .option("content", {
                        type: "string",
                        description: "Note content as a string",
                    })
                    .option("file", {
                        type: "string",
                        description: "Path to file whose contents become the note content",
                    })
                    .option("mime", {
                        type: "string",
                        description: "MIME type of the note",
                    })
                    .option("position", {
                        type: "number",
                        description: "Position in parent (notePosition)",
                    })
                    .option("prefix", {
                        type: "string",
                        description: "Branch-specific title prefix",
                    })
                    .option("expanded", {
                        type: "boolean",
                        description: "Whether note appears expanded in tree (isExpanded)",
                    })
                    .option("note-id", {
                        type: "string",
                        description: "Force a specific note ID",
                    })
                    .option("date-created", {
                        type: "string",
                        description: "Set creation date (local)",
                    })
                    .option("utc-date-created", {
                        type: "string",
                        description: "Set creation date (UTC)",
                    })
                    .option("markdown", {
                        type: "boolean",
                        description: "Treat content as markdown and convert to HTML",
                    })
                    .option("format-content", {
                        type: "string",
                        choices: ["auto", "markdown", "html", "plain"] as const,
                        description: "Content format (auto-detected if not specified)",
                    })
                    .check((a) => {
                        if (a.content && a.file) {
                            throw new Error("Provide only one of --content or --file, not both.");
                        }
                        return true;
                    }),
            async (argv) => {
                try {
                    let noteContent: string;
                    if (argv.file) {
                        noteContent = readFileSync(argv.file as string, "utf-8");
                    } else if (argv.content !== undefined) {
                        noteContent = argv.content as string;
                    } else {
                        const stdinData = await readStdin();
                        noteContent = stdinData !== null ? stdinData.toString("utf-8") : "";
                    }

                    // Convert markdown to HTML if requested or auto-detected
                    if (argv.markdown || argv.formatContent) {
                        const format = argv.formatContent as "auto" | "markdown" | "html" | "plain" | undefined;
                        if (argv.markdown || format === "markdown") {
                            noteContent = convertToHtml(noteContent, "markdown");
                        } else if (format && format !== "html") {
                            noteContent = convertToHtml(noteContent, format === "auto" ? undefined : format);
                        }
                    }

                    const client = getClient(argv as CliGlobalArgs);
                    const result = await client.createNote({
                        parentNoteId: argv.parent as string,
                        title: argv.title as string,
                        type: argv.type as string,
                        content: noteContent,
                        mime: argv.mime as string | undefined,
                        notePosition: argv.position as number | undefined,
                        prefix: argv.prefix as string | undefined,
                        isExpanded: argv.expanded as boolean | undefined,
                        noteId: argv.noteId as string | undefined,
                        dateCreated: argv.dateCreated as string | undefined,
                        utcDateCreated: argv.utcDateCreated as string | undefined,
                    });
                    formatOutput((argv.format ?? "json") as OutputFormat, result);
                } catch (e) {
                    handleError(e);
                }
            },
        )

        // ── patch ──────────────────────────────────────────────────
        .command(
            "patch <noteId>",
            "Update note metadata",
            (y) =>
                y
                    .positional("noteId", {
                        type: "string",
                        demandOption: true,
                        description: "ID of the note to update",
                    })
                    .option("title", {
                        type: "string",
                        description: "New title for the note",
                    })
                    .option("type", {
                        type: "string",
                        description: "New type for the note",
                    })
                    .option("mime", {
                        type: "string",
                        description: "New MIME type for the note",
                    }),
            async (argv) => {
                try {
                    const client = getClient(argv as CliGlobalArgs);
                    const result = await client.patchNote(argv.noteId as string, {
                        title: argv.title as string | undefined,
                        type: argv.type as string | undefined,
                        mime: argv.mime as string | undefined,
                    });
                    formatOutput((argv.format ?? "json") as OutputFormat, result);
                } catch (e) {
                    handleError(e);
                }
            },
        )

        // ── delete ─────────────────────────────────────────────────
        .command(
            "delete <noteId>",
            "Delete a note",
            (y) =>
                y.positional("noteId", {
                    type: "string",
                    demandOption: true,
                    description: "ID of the note to delete",
                }),
            async (argv) => {
                try {
                    const client = getClient(argv as CliGlobalArgs);
                    await client.deleteNote(argv.noteId as string);
                    formatOutput((argv.format ?? "json") as OutputFormat, { success: true });
                } catch (e) {
                    handleError(e);
                }
            },
        )

        // ── get-content ────────────────────────────────────────────
        .command(
            "get-content <noteId>",
            "Get note content (binary-safe)",
            (y) =>
                y
                    .positional("noteId", {
                        type: "string",
                        demandOption: true,
                        description: "ID of the note to get content from",
                    })
                    .option("output", {
                        alias: "o",
                        type: "string",
                        description: "Write content to file instead of stdout",
                    }),
            async (argv) => {
                try {
                    const client = getClient(argv as CliGlobalArgs);
                    const data = await client.getNoteContent(argv.noteId as string);
                    outputBinary(data, argv.output as string | undefined);
                } catch (e) {
                    handleError(e);
                }
            },
        )

        // ── set-content ────────────────────────────────────────────
        .command(
            "set-content <noteId>",
            "Set note content",
            (y) =>
                y
                    .positional("noteId", {
                        type: "string",
                        demandOption: true,
                        description: "ID of the note to update content for",
                    })
                    .option("content", {
                        type: "string",
                        description: "Content as a string",
                    })
                    .option("file", {
                        type: "string",
                        description: "Path to file whose contents will be uploaded",
                    })
                    .option("markdown", {
                        type: "boolean",
                        description: "Treat content as markdown and convert to HTML",
                    })
                    .option("format-content", {
                        type: "string",
                        choices: ["auto", "markdown", "html", "plain"] as const,
                        description: "Content format (auto-detected if not specified)",
                    })
                    .check((a) => {
                        if (a.content && a.file) {
                            throw new Error("Provide only one of --content or --file, not both.");
                        }
                        return true;
                    }),
            async (argv) => {
                try {
                    let body: string | Buffer;
                    if (argv.file) {
                        body = readFileSync(argv.file as string);
                    } else if (argv.content !== undefined) {
                        body = argv.content as string;
                    } else {
                        const stdinData = await readStdin();
                        if (stdinData !== null) {
                            body = stdinData;
                        } else {
                            throw new Error("Provide --content, --file, or pipe data via stdin");
                        }
                    }

                    // Convert markdown to HTML if requested
                    if ((argv.markdown || argv.formatContent) && typeof body === 'string') {
                        const format = argv.formatContent as "auto" | "markdown" | "html" | "plain" | undefined;
                        if (argv.markdown || format === "markdown") {
                            body = convertToHtml(body, "markdown");
                        } else if (format && format !== "html") {
                            body = convertToHtml(body, format === "auto" ? undefined : format);
                        }
                    } else if ((argv.markdown || argv.formatContent) && Buffer.isBuffer(body)) {
                        // Convert Buffer to string for markdown processing
                        let content = body.toString("utf-8");
                        const format = argv.formatContent as "auto" | "markdown" | "html" | "plain" | undefined;
                        if (argv.markdown || format === "markdown") {
                            content = convertToHtml(content, "markdown");
                        } else if (format && format !== "html") {
                            content = convertToHtml(content, format === "auto" ? undefined : format);
                        }
                        body = content;
                    }

                    const client = getClient(argv as CliGlobalArgs);
                    await client.putNoteContent(argv.noteId as string, body);
                    formatOutput((argv.format ?? "json") as OutputFormat, { success: true });
                } catch (e) {
                    handleError(e);
                }
            },
        )

        // ── export ─────────────────────────────────────────────────
        .command(
            "export <noteId>",
            "Export a note subtree as a ZIP file",
            (y) =>
                y
                    .positional("noteId", {
                        type: "string",
                        demandOption: true,
                        description: "ID of the note to export",
                    })
                    .option("export-format", {
                        type: "string",
                        choices: ["html", "markdown"] as const,
                        description: "Export format (html or markdown)",
                    })
                    .option("output", {
                        alias: "o",
                        type: "string",
                        description: "Write export to file instead of stdout",
                    }),
            async (argv) => {
                try {
                    const client = getClient(argv as CliGlobalArgs);
                    const data = await client.exportNote(
                        argv.noteId as string,
                        argv.exportFormat as "html" | "markdown" | undefined,
                    );
                    outputBinary(data, argv.output as string | undefined);
                } catch (e) {
                    handleError(e);
                }
            },
        )

        // ── import ─────────────────────────────────────────────────
        .command(
            "import <noteId>",
            "Import a ZIP file into a note",
            (y) =>
                y
                    .positional("noteId", {
                        type: "string",
                        demandOption: true,
                        description: "ID of the parent note to import into",
                    })
                    .option("file", {
                        type: "string",
                        demandOption: true,
                        description: "Path to ZIP file to import",
                    }),
            async (argv) => {
                try {
                    const zipData = readFileSync(argv.file as string);
                    const client = getClient(argv as CliGlobalArgs);
                    const result = await client.importNote(argv.noteId as string, zipData);
                    formatOutput((argv.format ?? "json") as OutputFormat, result);
                } catch (e) {
                    handleError(e);
                }
            },
        )

        // ── revision ───────────────────────────────────────────────
        .command(
            "revision <noteId>",
            "Create a revision snapshot of a note",
            (y) =>
                y.positional("noteId", {
                    type: "string",
                    demandOption: true,
                    description: "ID of the note to create a revision for",
                }),
            async (argv) => {
                try {
                    const client = getClient(argv as CliGlobalArgs);
                    await client.createRevision(argv.noteId as string);
                    formatOutput((argv.format ?? "json") as OutputFormat, { success: true });
                } catch (e) {
                    handleError(e);
                }
            },
        )

        // ── undelete ───────────────────────────────────────────────
        .command(
            "undelete <noteId>",
            "Restore a deleted note",
            (y) =>
                y.positional("noteId", {
                    type: "string",
                    demandOption: true,
                    description: "ID of the note to restore",
                }),
            async (argv) => {
                try {
                    const client = getClient(argv as CliGlobalArgs);
                    const result = await client.undeleteNote(argv.noteId as string);
                    formatOutput((argv.format ?? "json") as OutputFormat, result);
                } catch (e) {
                    handleError(e);
                }
            },
        )

        // ── history ────────────────────────────────────────────────
        .command(
            "history",
            "Get recent note changes",
            (y) =>
                y.option("ancestor", {
                    type: "string",
                    description: "Limit history to subtree of this note ID",
                }),
            async (argv) => {
                try {
                    const client = getClient(argv as CliGlobalArgs);
                    const result = await client.getNoteHistory(argv.ancestor as string | undefined);
                    formatOutput((argv.format ?? "json") as OutputFormat, result);
                } catch (e) {
                    handleError(e);
                }
            },
        )

        .demandCommand(1, "Please specify a notes subcommand");
}
