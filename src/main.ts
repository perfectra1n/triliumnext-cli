import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { registerNotesCommands } from "./commands/notes.js";
import { registerBranchesCommands } from "./commands/branches.js";
import { registerAttributesCommands } from "./commands/attributes.js";
import { registerAttachmentsCommands } from "./commands/attachments.js";
import { registerRevisionsCommands } from "./commands/revisions.js";
import { registerCalendarCommands } from "./commands/calendar.js";
import { registerAuthCommands } from "./commands/auth.js";
import { registerSystemCommands } from "./commands/system.js";
import { resolveDefaults } from "./config.js";

const cli = yargs(hideBin(process.argv))
    .scriptName("trilium")
    .usage("$0 <command> [options]")
    .option("server", {
        alias: "s",
        type: "string",
        description: "Trilium server URL",
    })
    .option("token", {
        alias: "t",
        type: "string",
        description: "ETAPI auth token",
    })
    .option("format", {
        alias: "f",
        type: "string",
        choices: ["json", "table", "quiet", "pretty"] as const,
        // No yargs `default` here on purpose: the middleware below applies the
        // user's `defaultFormat` from config (or "pretty" as a final fallback)
        // so config can override the built-in default.
        description: "Output format (default: pretty, or `defaultFormat` from config)",
    })
    .middleware((argv) => {
        if (argv.format === undefined) {
            argv.format = resolveDefaults().defaultFormat ?? "pretty";
        }
    })
    .command("notes", "Manage notes", registerNotesCommands)
    .command("branches", "Manage branches", registerBranchesCommands)
    .command("attributes", "Manage attributes", registerAttributesCommands)
    .command("attachments", "Manage attachments", registerAttachmentsCommands)
    .command("revisions", "Manage revisions", registerRevisionsCommands)
    .command("calendar", "Calendar and journal notes", registerCalendarCommands)
    .command("auth", "Authentication", registerAuthCommands)
    .command("system", "System information and operations", registerSystemCommands)
    .demandCommand(1, "Please specify a command")
    .strict()
    .help()
    .version(false);

await cli.parse();
