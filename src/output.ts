import fs from "node:fs";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Supported output formats selectable via the `--format` / `-f` flag. */
export type OutputFormat = "json" | "table" | "quiet" | "pretty";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * ID field names recognised across the Trilium ETAPI surface.
 * The order matters: the first match wins when scanning an object in quiet mode.
 */
const ID_FIELDS = [
  "noteId",
  "branchId",
  "attributeId",
  "attachmentId",
  "revisionId",
] as const;

/**
 * Columns that are meaningful in a table view.  When the incoming array
 * contains objects we pick only the keys that appear in this list so the
 * table stays readable in a terminal.
 */
const TABLE_COLUMNS = [
  "noteId",
  "branchId",
  "attributeId",
  "attachmentId",
  "revisionId",
  "title",
  "type",
  "name",
  "value",
  "mime",
  "dateCreated",
  "dateModified",
  "utcDateModified",
] as const;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Return the first recognised ID field name present on `obj`, or `undefined`
 * when none of the known ID fields exist.
 */
function findIdField(obj: Record<string, unknown>): string | undefined {
  return ID_FIELDS.find((field) => field in obj);
}

/**
 * Given an array of objects, return the subset of {@link TABLE_COLUMNS} that
 * actually appear as keys in at least one element.
 */
function selectTableColumns(rows: Record<string, unknown>[]): string[] {
  const present = new Set<string>();
  for (const row of rows) {
    for (const col of TABLE_COLUMNS) {
      if (col in row) {
        present.add(col);
      }
    }
  }
  // Preserve the canonical column ordering defined in TABLE_COLUMNS.
  return TABLE_COLUMNS.filter((col) => present.has(col));
}

// ---------------------------------------------------------------------------
// Format: JSON
// ---------------------------------------------------------------------------

function formatJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

// ---------------------------------------------------------------------------
// Format: table
// ---------------------------------------------------------------------------

function formatTable(data: unknown): void {
  if (Array.isArray(data)) {
    if (data.length === 0) {
      // Nothing to display.
      return;
    }

    // When every element is a plain object we can do smart column selection.
    const allObjects = data.every(
      (item): item is Record<string, unknown> =>
        item !== null && typeof item === "object" && !Array.isArray(item),
    );

    if (allObjects) {
      const columns = selectTableColumns(data);
      if (columns.length > 0) {
        console.table(data, columns);
      } else {
        // No recognised columns -- fall back to default console.table.
        console.table(data);
      }
    } else {
      console.table(data);
    }

    return;
  }

  if (data !== null && typeof data === "object") {
    const record = data as Record<string, unknown>;
    for (const [key, value] of Object.entries(record)) {
      console.log(`${key}: ${value}`);
    }
    return;
  }

  // Primitives or other unexpected shapes -- just stringify.
  console.log(String(data));
}

// ---------------------------------------------------------------------------
// Format: quiet
// ---------------------------------------------------------------------------

function formatQuiet(data: unknown): void {
  if (Array.isArray(data)) {
    for (const item of data) {
      if (item !== null && typeof item === "object" && !Array.isArray(item)) {
        const record = item as Record<string, unknown>;
        const idField = findIdField(record);
        if (idField) {
          console.log(record[idField]);
          continue;
        }
      }
      // Non-object element or no recognised ID field -- fall back to JSON.
      console.log(JSON.stringify(item));
    }
    return;
  }

  if (data !== null && typeof data === "object" && !Array.isArray(data)) {
    const record = data as Record<string, unknown>;
    const idField = findIdField(record);
    if (idField) {
      console.log(record[idField]);
      return;
    }
  }

  // No ID field found -- fall back to JSON.
  formatJson(data);
}

// ---------------------------------------------------------------------------
// Format: pretty
// ---------------------------------------------------------------------------

/**
 * Minimal ANSI helpers. Suppressed automatically when stdout isn't a TTY
 * (or when NO_COLOR is set, per https://no-color.org/) so piped output stays
 * machine-friendly.
 */
function colorize() {
  const useColor = Boolean(process.stdout.isTTY) && !process.env.NO_COLOR;
  const wrap = (code: string) => (s: string) =>
    useColor ? `\x1b[${code}m${s}\x1b[0m` : s;
  return {
    dim: wrap("2"),
    bold: wrap("1"),
    green: wrap("32"),
    cyan: wrap("36"),
    yellow: wrap("33"),
    red: wrap("31"),
  };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

/** `{ note: {...}, branch: {...} }` -- the shape returned by createNote. */
function isCreateResult(v: unknown): v is { note: Record<string, unknown>; branch: Record<string, unknown> } {
  return isRecord(v) && isRecord(v.note) && isRecord(v.branch) && typeof v.note.noteId === "string";
}

/** A single note (getNote / patchNote return shape). */
function isNote(v: unknown): v is Record<string, unknown> {
  return isRecord(v) && typeof v.noteId === "string" && typeof v.title === "string";
}

/** A search response: `{ results: EtapiNote[], debugInfo?: ... }`. */
function isSearchResult(v: unknown): v is { results: Record<string, unknown>[] } {
  return isRecord(v) && Array.isArray(v.results);
}

/** A void-style success acknowledgement, e.g. `{ success: true }`. */
function isSuccess(v: unknown): v is { success: boolean } {
  return isRecord(v) && v.success === true;
}

function pad(label: string, width = 10): string {
  return label.length >= width ? label + " " : label + " ".repeat(width - label.length);
}

function renderKv(entries: ReadonlyArray<readonly [string, unknown]>): void {
  const c = colorize();
  for (const [k, raw] of entries) {
    if (raw === undefined || raw === null || raw === "") continue;
    const v = typeof raw === "string" ? raw : JSON.stringify(raw);
    console.log(`  ${c.dim(pad(k))}${v}`);
  }
}

function renderCreateResult(data: { note: Record<string, unknown>; branch: Record<string, unknown> }): void {
  const c = colorize();
  console.log(c.green("✓ Created note"));
  renderKv([
    ["title", data.note.title],
    ["noteId", data.note.noteId],
    ["type", data.note.type],
    ["mime", data.note.mime],
    ["parent", data.branch.parentNoteId],
    ["branchId", data.branch.branchId],
  ]);
}

function renderNote(note: Record<string, unknown>): void {
  const c = colorize();
  const title = typeof note.title === "string" ? note.title : "(untitled)";
  console.log(c.bold(title));
  renderKv([
    ["noteId", note.noteId],
    ["type", note.type],
    ["mime", note.mime],
    ["created", note.dateCreated],
    ["modified", note.dateModified],
    ["parents", Array.isArray(note.parentNoteIds) ? (note.parentNoteIds as string[]).join(", ") : undefined],
  ]);
}

function renderSearchList(data: { results: Record<string, unknown>[] }): void {
  const c = colorize();
  if (data.results.length === 0) {
    console.log(c.dim("No results."));
    return;
  }
  for (const r of data.results) {
    const id = typeof r.noteId === "string" ? r.noteId : "?";
    const title = typeof r.title === "string" ? r.title : "(untitled)";
    const type = typeof r.type === "string" ? r.type : "";
    console.log(`${c.cyan(id)}  ${c.bold(title)} ${type ? c.dim(`[${type}]`) : ""}`);
  }
  console.log(c.dim(`\n${data.results.length} result${data.results.length === 1 ? "" : "s"}`));
}

function formatPretty(data: unknown): void {
  const c = colorize();
  if (isCreateResult(data)) return renderCreateResult(data);
  if (isSearchResult(data)) return renderSearchList(data);
  if (isNote(data)) return renderNote(data);
  if (isSuccess(data)) {
    console.log(c.green("✓ done"));
    return;
  }
  // Unknown shape -- fall back to JSON so nothing is silently dropped.
  formatJson(data);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Format and print `data` to stdout according to the chosen {@link OutputFormat}.
 *
 * - **pretty** (default) -- human-friendly, colorized when stdout is a TTY.
 * - **json** -- pretty-printed JSON, suitable for piping to `jq`.
 * - **table** -- tabular view with smart column selection.
 * - **quiet** -- print only the primary ID of each item, one per line.
 */
export function formatOutput(format: OutputFormat, data: unknown): void {
  switch (format) {
    case "json":
      formatJson(data);
      break;
    case "table":
      formatTable(data);
      break;
    case "quiet":
      formatQuiet(data);
      break;
    case "pretty":
      formatPretty(data);
      break;
    default: {
      const _exhaustive: never = format;
      throw new Error(`Unknown format: ${_exhaustive}`);
    }
  }
}

/**
 * Write binary data to a file or to stdout.
 *
 * When `outputPath` is provided the buffer is written to that path on disk.
 * Otherwise the raw bytes are written directly to `process.stdout` so the
 * caller can pipe them into another process.
 */
export function outputBinary(data: Buffer, outputPath?: string): void {
  if (outputPath) {
    fs.writeFileSync(outputPath, data);
  } else {
    process.stdout.write(data);
  }
}
