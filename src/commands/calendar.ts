import type { Argv } from "yargs";
import { getClient, type CliGlobalArgs } from "../config.js";
import { formatOutput, type OutputFormat } from "../output.js";
import { handleError } from "../errors.js";

export function registerCalendarCommands(yargs: Argv) {
    return yargs
        .command(
            "inbox [date]",
            "Get the inbox note for a given date",
            (y) =>
                y.positional("date", {
                    type: "string",
                    description: "Date in YYYY-MM-DD format (defaults to today)",
                }),
            async (argv) => {
                try {
                    const client = getClient(argv as CliGlobalArgs);
                    const date = (argv.date as string | undefined) ?? new Date().toISOString().slice(0, 10);
                    const result = await client.getInbox(date);
                    formatOutput((argv.format ?? "json") as OutputFormat, result);
                } catch (e) {
                    handleError(e);
                }
            }
        )
        .command(
            "day <date>",
            "Get the day note for a given date",
            (y) =>
                y.positional("date", {
                    type: "string",
                    demandOption: true,
                    description: "Date in YYYY-MM-DD format",
                }),
            async (argv) => {
                try {
                    const client = getClient(argv as CliGlobalArgs);
                    const result = await client.getDayNote(argv.date as string);
                    formatOutput((argv.format ?? "json") as OutputFormat, result);
                } catch (e) {
                    handleError(e);
                }
            }
        )
        .command(
            "week-first-day <date>",
            "Get the note for the first day of the week containing the given date",
            (y) =>
                y.positional("date", {
                    type: "string",
                    demandOption: true,
                    description: "Date in YYYY-MM-DD format",
                }),
            async (argv) => {
                try {
                    const client = getClient(argv as CliGlobalArgs);
                    const result = await client.getWeekFirstDayNote(argv.date as string);
                    formatOutput((argv.format ?? "json") as OutputFormat, result);
                } catch (e) {
                    handleError(e);
                }
            }
        )
        .command(
            "week <week>",
            "Get the week note for a given week",
            (y) =>
                y.positional("week", {
                    type: "string",
                    demandOption: true,
                    description: "Week identifier (e.g. 2024-W03)",
                }),
            async (argv) => {
                try {
                    const client = getClient(argv as CliGlobalArgs);
                    const result = await client.getWeekNote(argv.week as string);
                    formatOutput((argv.format ?? "json") as OutputFormat, result);
                } catch (e) {
                    handleError(e);
                }
            }
        )
        .command(
            "month <month>",
            "Get the month note for a given month",
            (y) =>
                y.positional("month", {
                    type: "string",
                    demandOption: true,
                    description: "Month identifier (e.g. 2024-01)",
                }),
            async (argv) => {
                try {
                    const client = getClient(argv as CliGlobalArgs);
                    const result = await client.getMonthNote(argv.month as string);
                    formatOutput((argv.format ?? "json") as OutputFormat, result);
                } catch (e) {
                    handleError(e);
                }
            }
        )
        .command(
            "year <year>",
            "Get the year note for a given year",
            (y) =>
                y.positional("year", {
                    type: "string",
                    demandOption: true,
                    description: "Year (e.g. 2024)",
                }),
            async (argv) => {
                try {
                    const client = getClient(argv as CliGlobalArgs);
                    const result = await client.getYearNote(argv.year as string);
                    formatOutput((argv.format ?? "json") as OutputFormat, result);
                } catch (e) {
                    handleError(e);
                }
            }
        )
        .demandCommand(1, "Please specify a calendar subcommand");
}
