import type { Argv } from "yargs";
import { getClient, type CliGlobalArgs } from "../config.js";
import { formatOutput, type OutputFormat } from "../output.js";
import { handleError } from "../errors.js";

export function registerAttributesCommands(yargs: Argv) {
    return yargs
        .command(
            "get <attributeId>",
            "Get an attribute by ID",
            (y) =>
                y.positional("attributeId", {
                    type: "string",
                    demandOption: true,
                    description: "Attribute ID",
                }),
            async (argv) => {
                try {
                    const client = getClient(argv as CliGlobalArgs);
                    const result = await client.getAttribute(argv.attributeId as string);
                    formatOutput((argv.format ?? "json") as OutputFormat, result);
                } catch (e) {
                    handleError(e);
                }
            }
        )
        .command(
            "create",
            "Create an attribute",
            (y) =>
                y
                    .option("note", {
                        type: "string",
                        demandOption: true,
                        description: "Note ID to attach the attribute to",
                    })
                    .option("type", {
                        type: "string",
                        choices: ["label", "relation"] as const,
                        demandOption: true,
                        description: "Attribute type",
                    })
                    .option("name", {
                        type: "string",
                        demandOption: true,
                        description: "Attribute name",
                    })
                    .option("value", {
                        type: "string",
                        description: "Attribute value",
                    })
                    .option("inheritable", {
                        type: "boolean",
                        description: "Whether the attribute is inheritable",
                    })
                    .option("position", {
                        type: "number",
                        description: "Attribute position",
                    }),
            async (argv) => {
                try {
                    const client = getClient(argv as CliGlobalArgs);
                    const result = await client.createAttribute({
                        noteId: argv.note,
                        type: argv.type as "label" | "relation",
                        name: argv.name,
                        value: argv.value,
                        isInheritable: argv.inheritable,
                        position: argv.position,
                    });
                    formatOutput((argv.format ?? "json") as OutputFormat, result);
                } catch (e) {
                    handleError(e);
                }
            }
        )
        .command(
            "patch <attributeId>",
            "Update an attribute",
            (y) =>
                y
                    .positional("attributeId", {
                        type: "string",
                        demandOption: true,
                        description: "Attribute ID",
                    })
                    .option("value", {
                        type: "string",
                        description: "New attribute value",
                    })
                    .option("position", {
                        type: "number",
                        description: "New attribute position",
                    }),
            async (argv) => {
                try {
                    const client = getClient(argv as CliGlobalArgs);
                    const result = await client.patchAttribute(argv.attributeId as string, {
                        value: argv.value,
                        position: argv.position,
                    });
                    formatOutput((argv.format ?? "json") as OutputFormat, result);
                } catch (e) {
                    handleError(e);
                }
            }
        )
        .command(
            "delete <attributeId>",
            "Delete an attribute",
            (y) =>
                y.positional("attributeId", {
                    type: "string",
                    demandOption: true,
                    description: "Attribute ID",
                }),
            async (argv) => {
                try {
                    const client = getClient(argv as CliGlobalArgs);
                    await client.deleteAttribute(argv.attributeId as string);
                    formatOutput((argv.format ?? "json") as OutputFormat, { success: true });
                } catch (e) {
                    handleError(e);
                }
            }
        )
        .demandCommand(1, "Please specify an attributes subcommand");
}
