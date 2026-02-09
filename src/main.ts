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
        choices: ["json", "table", "quiet"] as const,
        default: "json" as const,
        description: "Output format",
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
